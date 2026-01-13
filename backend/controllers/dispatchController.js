const Status = require("../models/Status");
const User = require("../models/User");
const { DISPATCH_ROLES } = require("../utils/roleGroup");
const { sendEmail } = require("../utils/sendMail");
const Request = require("../models/Request");
const {
  emitRequestApproval,
  emitRequestRejection,
} = require("../utils/socketEmitter");

// Helper to find receiver/dispatcher for a location
async function findReceiverForInLocation(inLocation) {
  if (!inLocation) return null;
  return await User.findOne({
    role: "Receiver",
    isActive: true,
    branches: { $in: [inLocation] },
  }).lean();
}

// Import user helpers at the top
const { findRequesterWithERPData } = require('../utils/userHelpers');

// Try to resolve Requester from request doc
// NOW WITH ERP DATA!
async function findRequesterFromRequest(reqDoc) {
  // Use the new helper that automatically enriches with ERP data
  return await findRequesterWithERPData(reqDoc, true);
}

// --- helpers for role/branch matching  ---
const normalizeRole = (r) =>
  String(r || "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toRegexList = (arr = []) =>
  arr.filter(Boolean).map((b) => new RegExp(`^${esc(String(b).trim())}$`, "i"));

// --- dispatch role helpers ---
const isSuperAdmin = (role) => normalizeRole(role) === "superadmin";

const isDispatchRole = (role) =>
  DISPATCH_ROLES.map(normalizeRole).includes(normalizeRole(role));

// Create a new status
const createStatus = async (req, res) => {
  try {
    const { referenceNumber, comment, beforeStatus, afterStatus, request } =
      req.body;
    const newStatus = new Status({
      referenceNumber,
      comment,
      beforeStatus,
      afterStatus,
      request,
    });

    await newStatus.save();
    res
      .status(201)
      .json({ message: "Status created successfully", status: newStatus });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getPending = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role) && !isDispatchRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isSuper = isSuperAdmin(req.user?.role);

    const branches = Array.isArray(req.user?.branches) ? req.user.branches : [];
    const branchRegex = toRegexList(branches);

    const approvedRefs = await Status.find({ afterStatus: 8 }).distinct(
      "referenceNumber"
    );

    const pendingStatuses = await Status.find({
      verifyOfficerStatus: 2,
      referenceNumber: { $nin: approvedRefs },
    })
      .populate({
        path: "request",
        match: isSuper ? {} : { inLocation: { $in: branchRegex } },
      })
      .sort({ updatedAt: -1 })
      .exec();

    const filtered = pendingStatuses.filter(
      (s) => s.request && s.request.show !== false
    );

    return res.status(200).json(filtered);
  } catch (error) {
    console.error("Error fetching pending statuses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getApproved = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const branches = Array.isArray(req.user?.branches) ? req.user.branches : [];
    const branchRegex = toRegexList(branches);

    const approvedRequests = await Status.find({ afterStatus: 8 })
      .populate({
        path: "request",
        match: isSuper ? {} : { inLocation: { $in: branchRegex } },
      })
      .sort({ updatedAt: -1 })
      .exec();

    const filtered = approvedRequests.filter(
      (s) => s.request && (isSuper ? true : s.request.show !== false)
    );
    res.status(200).json(filtered);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getRejected = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const branches = Array.isArray(req.user?.branches) ? req.user.branches : [];
    const branchRegex = toRegexList(branches);

    const rejectedRequests = await Status.find({ afterStatus: 9 })
      .populate({
        path: "request",
        match: isSuper ? {} : { inLocation: { $in: branchRegex } },
      })
      .sort({ updatedAt: -1 })
      .exec();
    const filtered = rejectedRequests.filter(
      (s) => s.request && (isSuper ? true : s.request.show !== false)
    );
    res.status(200).json(filtered);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateApproved = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role) && !isDispatchRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { referenceNumber } = req.params;
    const { comment } = req.body;

    // Always grab the latest status for this reference
    const latest = await Status.findOne({ referenceNumber })
      .populate("request")
      .sort({ updatedAt: -1 });

    if (!latest) {
      return res.status(404).json({ message: "Status not found" });
    }

    // Check if it's a Non-SLT destination
    const isNonSltPlace = latest.request?.isNonSltPlace === true;
    // Check if receiver is available
    const receiverAvailable = latest.request?.receiverAvailable === true;

    // Get the ORIGINAL status document (first one created) to preserve the original createdAt
    const originalStatus = await Status.findOne({ referenceNumber })
      .sort({ createdAt: 1 }) // Sort by oldest first
      .lean();

    // Create a new status row representing Pleader action:
    // 7 = Pleader Pending, 8 = Pleader Approved
    const newStatus = new Status({
      referenceNumber,
      request: latest.request?._id || latest.request,
      // Pleader stage explicit fields
      pleaderStatus: 2, // 2 = Approved by Pleader (Dispatch)
      pleaderServiceNo: req.user?.serviceNo
        ? String(req.user.serviceNo).trim()
        : undefined,

      // Backwards-compatible before/afterStatus fields
      beforeStatus: 7,
      afterStatus: 8,

      comment: comment || "",
      createdAt: originalStatus?.createdAt || new Date(), // Preserve original creation time
    });

    // If Non-SLT destination, mark as final (dispatched) - no receiver step
    if (isNonSltPlace) {
      if (latest.request) {
        latest.request.status = 13; // Dispatched (final status for Non-SLT)
        await latest.request.save();
      }

      await newStatus.save();

      // Emit real-time event for Non-SLT completion
      const io = req.app.get("io");
      if (io && latest.request) {
        emitRequestApproval(io, latest.request, "Pleader");
      }

      // No email needed - this is the final step for Non-SLT
      return res.status(200).json({ ok: true, status: newStatus });
    }

    // For SLT destinations, continue with receiver routing
    // If receiver is not available, route to Receive page (dispatcher user)
    if (!receiverAvailable) {
      newStatus.recieveOfficerStatus = 1; // Pending at dispatcher/receiver

      if (latest.request) {
        latest.request.status = 10; // Ready for dispatcher/receiver
        await latest.request.save();
      }

      await newStatus.save();

      // Send email notification to dispatcher/receiver
      try {
        const receiverUser = await findReceiverForInLocation(
          latest.request.inLocation
        );
        if (receiverUser && receiverUser.email) {
          const subject = `Gate Pass pending dispatcher confirmation: ${referenceNumber}`;
          const html = `
            <p>Dear ${receiverUser.name || "Dispatcher"},</p>
            <p>A gate pass request has been approved by Dispatch and is awaiting your confirmation.</p>
            <p><b>Reference:</b> ${referenceNumber}<br/>
               <b>From:</b> ${latest.request.outLocation || "-"}<br/>
               <b>To:</b> ${latest.request.inLocation || "-"}</p>
            <p><b>Note:</b> No specific receiver was designated. Please confirm dispatch in your <i>Receive – Pending</i> section.</p>
          `;
          await sendEmail(receiverUser.email, subject, html);
        }
      } catch (mailErr) {
        console.error(
          "Email (Dispatch→Dispatcher for no receiver) failed:",
          mailErr
        );
      }

      return res.status(200).json({ ok: true, status: newStatus });
    } else {
      // Receiver is available, route to specific receiver
      newStatus.recieveOfficerStatus = 1; // Pending at receiver

      // Set the specific receiver if available
      if (latest.request?.receiverServiceNo) {
        newStatus.recieveOfficerServiceNumber =
          latest.request.receiverServiceNo;
      }

      if (latest.request) {
        latest.request.status = 10; // Ready for receiver
        await latest.request.save();
      }

      await newStatus.save();

      // Send email notification to receiver
      try {
        const receiverServiceNo = latest.request?.receiverServiceNo;
        if (receiverServiceNo) {
          const receiverUser = await User.findOne({
            serviceNo: String(receiverServiceNo),
            isActive: true,
          }).lean();

          if (receiverUser && receiverUser.email) {
            const subject = `Gate Pass pending your confirmation: ${referenceNumber}`;
            const html = `
              <p>Dear ${receiverUser.name || "Receiver"},</p>
              <p>A gate pass request has been approved by Dispatch and is awaiting your confirmation.</p>
              <p><b>Reference:</b> ${referenceNumber}<br/>
                 <b>From:</b> ${latest.request.outLocation || "-"}<br/>
                 <b>To:</b> ${latest.request.inLocation || "-"}</p>
              <p>Please confirm receipt in your <i>Receive – Pending</i> section.</p>
            `;
            await sendEmail(receiverUser.email, subject, html);
          }
        }
      } catch (mailErr) {
        console.error("Email (Dispatch→Receiver) failed:", mailErr);
      }

      return res.status(200).json({ ok: true, status: newStatus });
    }
  } catch (error) {
    console.error("Pleader approve failed:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateRejected = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role) && !isDispatchRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { referenceNumber } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res
        .status(400)
        .json({ message: "Rejection comment is required." });
    }

    const latest = await Status.findOne({ referenceNumber })
      .populate("request")
      .sort({ updatedAt: -1 });

    if (!latest) {
      return res.status(404).json({ message: "Status not found" });
    }

    // Get the ORIGINAL status document (first one created) to preserve the original createdAt
    const originalStatus = await Status.findOne({ referenceNumber })
      .sort({ createdAt: 1 }) // Sort by oldest first
      .lean();

    const rejectedMeta = {
      rejectedBy: "Pleader",
      rejectedByServiceNo: req.user?.serviceNo || null,
      rejectedAt: new Date(),
      rejectionLevel: 3,
      rejectedByBranch:
        Array.isArray(req.user?.branches) && req.user.branches.length > 0
          ? req.user.branches[0]
          : null,
    };

    // 7 = Pleader Pending, 9 = Pleader Rejected  (as per your getRejected filter)
    const newStatus = new Status({
      referenceNumber,
      request: latest.request?._id || latest.request,
      beforeStatus: 7,
      afterStatus: 9,
      comment: comment.trim(),
      createdAt: originalStatus?.createdAt || new Date(), // Preserve original creation time
      ...rejectedMeta,
    });
    await newStatus.save();

    if (latest.request) {
      latest.request.status = 9; // Pleader Rejected (only if your UI uses this)
      await latest.request.save();
    }

    // Notify requester only (safe)
    try {
      if (latest.request) {
        const requester = await findRequesterFromRequest(latest.request);
        if (requester?.email) {
          const subject = `Gate Pass Rejected: ${referenceNumber}`;
          const html = `
        <p>Dear ${requester.name || "Requester"},</p>
        <p>Your gate pass request has been <b>rejected</b>.</p>
        <p><b>Reference:</b> ${referenceNumber}</p>
        <p><b>Reason:</b> ${comment.trim()}</p>
        <p>You can view this under <i>My Requests – Rejected</i>.</p>
      `;
          await sendEmail(requester.email, subject, html);
        }
      }
    } catch (err) {
      console.error("Email (reject → requester) failed:", err);
    }

    return res.status(200).json({ ok: true, status: newStatus });
  } catch (error) {
    console.error("Pleader reject failed:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const markItemsAsReturned = async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const { serialNumbers, remarks } = req.body;

    console.log("Received request:", {
      referenceNumber,
      serialNumbers,
      remarks,
    });

    // Validation
    if (
      !serialNumbers ||
      !Array.isArray(serialNumbers) ||
      serialNumbers.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Serial numbers are required and must be a non-empty array",
      });
    }

    // Find the request by reference number
    const request = await Request.findOne({ referenceNumber });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found with this reference number",
      });
    }

    let updatedCount = 0;

    // Update items array - change status to "returned"
    if (request.items && Array.isArray(request.items)) {
      request.items = request.items.map((item) => {
        if (serialNumbers.includes(item.serialNo)) {
          updatedCount++;
          return {
            ...item.toObject(),
            status: "return to Out Location Petrol Leader", // Changed from 'return to sender' to 'returned'
            returnDate: new Date(),
            returnRemarks: remarks || undefined,
          };
        }
        return item;
      });
    }

    // Initialize returnableItems array if it doesn't exist
    if (!request.returnableItems) {
      request.returnableItems = [];
    }

    // Update or add to returnableItems
    serialNumbers.forEach((serialNo) => {
      const existingIndex = request.returnableItems.findIndex(
        (ri) => ri.serialNo === serialNo
      );

      const itemData = request.items.find((item) => item.serialNo === serialNo);

      if (existingIndex !== -1) {
        // Update existing returnable item
        request.returnableItems[existingIndex] = {
          ...request.returnableItems[existingIndex].toObject(),
          status: "return to Out Location Petrol Leader", // Changed status
          returned: true,
          returnedDate: new Date(),
          returnRemarks: remarks || undefined,
        };
      } else if (itemData) {
        // Add new returnable item
        request.returnableItems.push({
          ...itemData.toObject(),
          status: "return to Out Location Petrol Leader", // Changed status
          returned: true,
          returnedDate: new Date(),
          returnRemarks: remarks || undefined,
        });
      }
    });

    // Save the updated request
    await request.save();

    console.log(`Successfully marked ${updatedCount} items as returned`);

    try {
      const io = req.app.get("io");
      if (io && request) {
        emitRequestRejection(io, request, "Pleader");
      }
    } catch (e) {
      console.error("Reject socket emit failed:", e);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully marked ${updatedCount} item(s) as returned`,
      updatedCount,
      referenceNumber: request.referenceNumber,
    });
  } catch (error) {
    console.error("Error in markItemsAsReturnedController:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error while marking items as returned",
    });
  }
};

module.exports = {
  createStatus,
  getPending,
  getApproved,
  getRejected,
  updateApproved,
  updateRejected,
  markItemsAsReturned,
};
