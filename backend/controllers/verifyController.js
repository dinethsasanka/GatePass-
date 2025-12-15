// controllers/verifyController.js
// Verifier stage: Pending / Approve / Reject
// Workflow: Requester → Executive → Verifier → Petrol Leader (view-only) → Receiver

const Status = require("../models/Status");
const Request = require("../models/Request");
const User = require("../models/User");
const { sendEmail } = require("../utils/sendMail"); // uses EMAIL_USER / EMAIL_PASS from .env
const {
  emitRequestApproval,
  emitRequestRejection,
} = require("../utils/socketEmitter");

// ---------------- helpers ----------------
const normalizeRole = (r) =>
  String(r || "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toRegexList = (arr = []) =>
  arr.filter(Boolean).map((b) => new RegExp(`^${esc(String(b).trim())}$`, "i"));

const pick = (obj, path) =>
  path.split(".").reduce((v, k) => (v && v[k] != null ? v[k] : null), obj);

const parseTime = (v) => {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

const toSvc = (s) => String(s || "").trim();
const ciSvc = (svc) =>
  svc ? { $regex: `^${esc(svc)}$`, $options: "i" } : undefined;

const sortNewest = (rows, keys) =>
  rows.sort((a, b) => {
    const bt = keys.reduce((acc, k) => acc || parseTime(pick(b, k)), 0);
    const at = keys.reduce((acc, k) => acc || parseTime(pick(a, k)), 0);
    return bt - at;
  });

async function findUserByServiceNo(serviceNo) {
  if (!serviceNo) return null;
  return await User.findOne({
    serviceNo: String(serviceNo),
    isActive: true,
  }).lean();
}

async function findPetrolLeaderForInLocation(inLocation) {
  if (!inLocation) return null;
  return await User.findOne({
    role: "Pleader",
    isActive: true,
    branches: { $in: [inLocation] },
  }).lean();
}

// Fallback: if no specific receiver was selected, try “any Receiver at inLocation”
async function findReceiverForInLocation(inLocation) {
  if (!inLocation) return null;
  return await User.findOne({
    role: "Receiver",
    isActive: true,
    branches: { $in: [inLocation] },
  }).lean();
}

async function findRequesterFromRequest(reqDoc) {
  if (!reqDoc) return null;

  const candidateServiceNos = [
    reqDoc.requesterServiceNo,
    reqDoc.senderServiceNo,
    reqDoc.createdByServiceNo,
    reqDoc.userServiceNo,
    pick(reqDoc, "sender.serviceNo"),
    pick(reqDoc, "requester.serviceNo"),
  ].filter(Boolean);

  for (const svc of candidateServiceNos) {
    const u = await User.findOne({ serviceNo: String(svc) }).lean();
    if (u) return u;
  }

  const candidateEmails = [
    reqDoc.requesterEmail,
    reqDoc.senderEmail,
    pick(reqDoc, "sender.email"),
  ].filter(Boolean);

  if (candidateEmails.length) {
    return { email: candidateEmails[0], name: "Requester" };
  }

  return null;
}

async function findExecutiveFromRequest(reqDoc) {
  if (!reqDoc) return null;
  const svc = reqDoc.executiveOfficerServiceNo;
  if (!svc) return null;
  return await User.findOne({ serviceNo: String(svc) }).lean();
}

// Read the EXACT receiver chosen by the Requester on the Request doc
function readSelectedReceiverServiceNo(reqDoc) {
  const candidates = [
    reqDoc.receiverServiceNo, // preferred
    reqDoc.recieveOfficerServiceNumber, // sometimes stored on Request
    pick(reqDoc, "receiver.serviceNo"),
    reqDoc.collectorServiceNo, // if your schema uses this name
  ].filter(Boolean);

  return candidates.length ? String(candidates[0]) : null;
}

// ---------------- lists ----------------

/**
 * GET /verify/pending
 * Verifier Pending = verifyOfficerStatus: 1
 * Optional filter: ?outLocation=BRANCH
 */
exports.getPending = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const branches = Array.isArray(req.user?.branches) ? req.user.branches : [];
    const branchRegex = toRegexList(branches);

    const rows = await Status.find({ verifyOfficerStatus: { $in: [1, "1"] } })
      .populate({
        path: "request",
        match: isSuper ? {} : { outLocation: { $in: branchRegex } },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => s.request && s.request.show !== false);
    return res.json(
      filtered.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt)
      )
    );
  } catch (err) {
    console.error("Verify getPending error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getApproved = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const branches = Array.isArray(req.user?.branches) ? req.user.branches : [];
    const branchRegex = toRegexList(branches);

    const rows = await Status.find({ verifyOfficerStatus: { $in: [2, "2"] } })
      .populate({
        path: "request",
        match: isSuper ? {} : { outLocation: { $in: branchRegex } },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => s.request && s.request.show !== false);
    return res.json(
      filtered.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt)
      )
    );
  } catch (err) {
    console.error("Verify getApproved error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getRejected = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const branches = Array.isArray(req.user?.branches) ? req.user.branches : [];
    const branchRegex = toRegexList(branches);

    const rows = await Status.find({ verifyOfficerStatus: { $in: [3, "3"] } })
      .populate({
        path: "request",
        match: isSuper ? {} : { outLocation: { $in: branchRegex } },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => s.request && s.request.show !== false);
    return res.json(
      filtered.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt)
      )
    );
  } catch (err) {
    console.error("Verify getRejected error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- actions ----------------

/**
 * PUT /verify/:referenceNumber/approve
 * Sets Verifier Approved, hands off to Receiver (Pending),
 * and notifies Petrol Leader (In-location, view-only) + the EXACT Receiver chosen by the Requester.
 */
exports.updateApproved = async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const { comment } = req.body;

    const status = await Status.findOne({ referenceNumber })
      .populate("request")
      .sort({ updatedAt: -1 });

    if (!status || !status.request) {
      return res.status(404).json({ message: "Status/Request not found" });
    }

    // Check if it's a Non-SLT destination
    const isNonSltPlace = status.request.isNonSltPlace === true;
    // Check if receiver is available
    const receiverAvailable = status.request.receiverAvailable === true;

    // Only Verifier fields
    status.beforeStatus = status.verifyOfficerStatus || 1;
    status.verifyOfficerStatus = 2; // 2 = Approved by Verifier
    status.verifyOfficerComment = comment || "";
    status.afterStatus = 2;

    // record who approved (from JWT)
    if (req.user?.serviceNo) {
      status.verifyOfficerServiceNo = String(req.user.serviceNo).trim();
    }

    // If Non-SLT destination, route to PL2 (Dispatch) at outLocation
    // Non-SLT requests should stop at Dispatch and NOT go to receiver
    if (isNonSltPlace) {
      // Mark as approved by PL1, waiting for Dispatch
      if (status.request) {
        status.request.status = 5; // Verify Approved - waiting for Dispatch
        await status.request.save();
      }

      await status.save();

      // Email Petrol Leader (Dispatch) at out-location for approval
      try {
        const pleader = await findPetrolLeaderForInLocation(
          status.request.outLocation
        );
        if (pleader && pleader.email) {
          const subject = `Non-SLT Gate Pass ready for dispatch: ${referenceNumber}`;
          const html = `
            <p>Dear ${pleader.name || "Petrol Leader (Dispatch)"},</p>
            <p>A Non-SLT gate pass has been <b>verified</b> and is ready for your dispatch approval.</p>
            <p><b>Reference:</b> ${referenceNumber}<br/>
               <b>From:</b> ${status.request.outLocation || "-"}<br/>
               <b>To:</b> ${
                 status.request.companyName ||
                 status.request.inLocation ||
                 "External Organization"
               }</p>
            <p><b>Note:</b> This is a Non-SLT request. After your approval, this will be marked as dispatched (final step).</p>
            <p>Please check your Dispatch page.</p>
          `;
          await sendEmail(pleader.email, subject, html);
        }
      } catch (mailErr) {
        console.error("Email (Verifier→Dispatch for Non-SLT) failed:", mailErr);
      }

      const fresh = await Status.findById(status._id)
        .populate("request")
        .lean();
      return res.json(fresh);
    }

    // For SLT Branch destinations, route to Dispatch (PL2) first
    // The Dispatch officer will then route it to the receiver
    // DO NOT set recieveOfficerStatus here - that's done by Dispatch

    // Just mark as approved by PL1, waiting for Dispatch (PL2)
    if (status.request) {
      status.request.status = 5; // Verify Approved - waiting for Dispatch
      await status.request.save();
    }

    await status.save();

    const inLocation = status.request.inLocation;

    // Email Petrol Leader (Dispatch) at IN-location for dispatch approval
    try {
      const pleader = await findPetrolLeaderForInLocation(inLocation);
      if (pleader && pleader.email) {
        const subject = `Gate Pass ready for dispatch approval: ${referenceNumber}`;
        const html = `
          <p>Dear ${pleader.name || "Petrol Leader (Dispatch)"},</p>
          <p>A gate pass has been <b>verified</b> and is ready for your dispatch approval.</p>
          <p><b>Reference:</b> ${referenceNumber}<br/>
             <b>From:</b> ${status.request.outLocation || "-"}<br/>
             <b>To:</b> ${status.request.inLocation || "-"}</p>
          <p>Please check your Dispatch page to approve and route to the receiver.</p>
        `;
        await sendEmail(pleader.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Verifier→Dispatch) failed:", mailErr);
    }

    const fresh = await Status.findById(status._id).populate("request").lean();

    // Emit real-time event for verification approval
    const io = req.app.get("io");
    if (io && fresh) {
      emitRequestApproval(io, fresh.request, "Verifier");
    }

    return res.json(fresh);
  } catch (err) {
    console.error("Verifier approve error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * PUT /verify/:referenceNumber/reject
 * Requires a rejection comment.
 * Sets Verifier Rejected, notifies Requester and Executive Officer.
 */
exports.updateRejected = async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res
        .status(400)
        .json({ message: "Rejection comment is required." });
    }

    const status = await Status.findOne({ referenceNumber })
      .populate("request")
      .sort({ updatedAt: -1 });

    if (!status || !status.request) {
      return res.status(404).json({ message: "Status/Request not found" });
    }

    status.beforeStatus = status.verifyOfficerStatus || 1;
    status.verifyOfficerStatus = 3; // Rejected by Verifier
    status.verifyOfficerComment = comment.trim();
    status.afterStatus = 3;

    await status.save();

    // Email Requester
    try {
      const requester = await findRequesterFromRequest(status.request);
      if (requester && requester.email) {
        const subject = `Gate Pass rejected by Verifier: ${referenceNumber}`;
        const html = `
          <p>Dear ${requester.name || "Requester"},</p>
          <p>Your gate pass request has been <b>rejected by the Verifier</b>.</p>
          <p><b>Reference:</b> ${referenceNumber}</p>
          <p><b>Reason:</b> ${status.verifyOfficerComment}</p>
          <p>You can view this under <i>My Requests – Rejected</i>.</p>
        `;
        await sendEmail(requester.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Verifier reject→Requester) failed:", mailErr);
    }

    // Email Executive Officer (FYI)
    try {
      const exec = await findExecutiveFromRequest(status.request);
      if (exec && exec.email) {
        const subject = `Gate Pass rejected at Verifier stage: ${referenceNumber}`;
        const html = `
          <p>Dear ${exec.name || "Executive Officer"},</p>
          <p>The following gate pass was <b>rejected by the Verifier</b>.</p>
          <p><b>Reference:</b> ${referenceNumber}</p>
          <p><b>Reason:</b> ${status.verifyOfficerComment}</p>
          <p>This will be visible under your Rejected section for tracking.</p>
        `;
        await sendEmail(exec.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Verifier reject→Executive) failed:", mailErr);
    }

    const fresh = await Status.findById(status._id).populate("request").lean();

    // Emit real-time event for verification rejection
    const io = req.app.get("io");
    if (io && fresh) {
      emitRequestRejection(io, fresh.request, "Verifier");
    }

    return res.json(fresh);
  } catch (err) {
    console.error("Verifier reject error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.markItemsAsReturned = async (req, res) => {
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
            status: "return to Executive Officer", // Changed from 'return to sender' to 'returned'
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
          status: "return to Executive Officer", // Changed status
          returned: true,
          returnedDate: new Date(),
          returnRemarks: remarks || undefined,
        };
      } else if (itemData) {
        // Add new returnable item
        request.returnableItems.push({
          ...itemData.toObject(),
          status: "return to Executive Officer", // Changed status
          returned: true,
          returnedDate: new Date(),
          returnRemarks: remarks || undefined,
        });
      }
    });

    // Save the updated request
    await request.save();

    console.log(`Successfully marked ${updatedCount} items as returned`);

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

exports.addReturnableItemToRequest = async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const itemData = req.body;

    console.log(" Adding new returnable item to:", referenceNumber);
    console.log(" Item Data:", itemData);

    //Find the request document
    const request = await Request.findOne({ referenceNumber });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Create new returnable item data
    const newItem = {
      itemName: itemData.itemName,
      serialNo: itemData.serialNo,
      itemCategory: itemData.itemCategory,
      itemQuantity: itemData.itemQuantity || 1,
      itemModel: itemData.itemModel || "",
      returnDate: itemData.returnDate || null,
      status: "returnable",
      returned: false,
    };

    // 3 Add to both arrays in the same Request document
    request.returnableItems.push(newItem);
    request.items.push(newItem);

    // 4Save changes
    await request.save();

    console.log("Returnable item added successfully!");

    res.status(200).json({
      message: "Returnable item added successfully",
      request,
    });

  } catch (error) {
    console.error("Error adding returnable item:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

