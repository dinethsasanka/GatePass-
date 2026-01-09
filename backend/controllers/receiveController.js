// controllers/receiveController.js
// Receiver / Collector stage: Pending / Approve / Reject
// Workflow: ... → Verifier (Approved) → Petrol Leader (view-only) + Receiver (Pending)

const Status = require("../models/Status");
const Request = require("../models/Request");
const User = require("../models/User");
const { sendEmail } = require("../utils/sendMail"); // uses EMAIL_USER / EMAIL_PASS from .env
const {
  emitRequestCompletion,
  emitRequestRejection,
} = require("../utils/socketEmitter");

// ------------- helpers -------------
const pick = (obj, path) =>
  path.split(".").reduce((v, k) => (v && v[k] != null ? v[k] : null), obj);

const normalizeRole = (r) =>
  String(r || "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();

const parseTime = (v) => {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

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

async function findPetrolLeaderForInLocation(inLocation) {
  if (!inLocation) return null;
  return await User.findOne({
    role: "Pleader",
    isActive: true,
    branches: { $in: [inLocation] },
  }).lean();
}

// Helper to find executive from request
async function findExecutiveFromRequest(reqDoc) {
  if (!reqDoc || !reqDoc.executiveOfficerServiceNo) return null;

  return await User.findOne({
    serviceNo: String(reqDoc.executiveOfficerServiceNo),
  }).lean();
}

// Helper to find verifier from request (by outLocation)
async function findVerifierFromRequest(reqDoc) {
  if (!reqDoc) return null;

  return await User.findOne({
    role: "Verifier",
    isActive: true,
    branches: { $in: [reqDoc.outLocation] },
  }).lean();
}

// Helper to find dispatcher from request (by inLocation)
async function findDispatcherFromRequest(reqDoc) {
  if (!reqDoc) return null;

  return await User.findOne({
    role: "Dispatcher",
    isActive: true,
    branches: { $in: [reqDoc.inLocation] },
  }).lean();
}

// ------------- create (kept) -------------
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

// ------------- lists -------------
/**
 * GET Receiver Pending
 * - Filters by recieveOfficerStatus: 1
 * - If serviceNo is provided (req.user.serviceNo or ?serviceNo=), only returns items assigned to that receiver.
 */
/*const getPending = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const myServiceNo = isSuper
      ? null
      : req.user?.serviceNo || req.query.serviceNo || null;

    const rows = await Status.find({ recieveOfficerStatus: 1 })
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => {
      if (!s.request) return false;
      if (!isSuper && s.request.show === false) return false;

      // If a specific receiver service number is provided
      if (myServiceNo) {
        // Show if:
        // 1. Assigned to this specific receiver OR
        // 2. No specific receiver assigned (dispatcher can handle any request)
        const assignedToMe =
          String(s.recieveOfficerServiceNumber) === String(myServiceNo);
        const noSpecificReceiver = !s.recieveOfficerServiceNumber;

        return assignedToMe || noSpecificReceiver;
      }

      // No service number filter - show all
      return true;
    });

    res.status(200).json(filtered);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};*/




const getPending = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const myServiceNo = isSuper
      ? null
      : req.user?.serviceNo || req.query.serviceNo || null;

    const rows = await Status.find({
      verifyOfficerStatus: 2,             // verified approved
      recieveOfficerStatus: { $ne: 1 },   // not received yet
    })
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => {
      if (!s.request) return false;

      // hide request if non-super and show=false
      if (!isSuper && s.request.show === false) return false;

      if (myServiceNo) {
        const assignedToMe =
          String(s.recieveOfficerServiceNumber) === String(myServiceNo);
        const unassigned = !s.recieveOfficerServiceNumber;

        return assignedToMe || unassigned;
      }

      return true;
    });

    res.status(200).json(filtered);
  } catch (error) {
    console.error("Error fetching receiver pending:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getApproved = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const myServiceNo = isSuper
      ? null
      : req.user?.serviceNo || req.query.serviceNo || null;

    // Get all reference numbers that have been rejected at any level
    const rejectedRefs = await Status.find({
      rejectedBy: { $exists: true },
    }).distinct("referenceNumber");

    const rows = await Status.find({
      recieveOfficerStatus: 2, // Receiver approved
      referenceNumber: { $nin: rejectedRefs }, // Exclude rejected references
    })
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => {
      if (!s.request) return false;
      if (!isSuper && s.request.show === false) return false;

      // If a specific receiver service number is provided
      if (myServiceNo) {
        // Show if:
        // 1. Assigned to this specific receiver OR
        // 2. No specific receiver assigned (dispatcher can handle any request)
        const assignedToMe =
          String(s.recieveOfficerServiceNumber) === String(myServiceNo);
        const noSpecificReceiver = !s.recieveOfficerServiceNumber;

        return assignedToMe || noSpecificReceiver;
      }

      // No service number filter - show all
      return true;
    });

    res.status(200).json(sortNewest(filtered, ["updatedAt", "createdAt"]));
  } catch (error) {
    console.error("Error fetching approved statuses:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getRejected = async (req, res) => {
  try {
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    const myServiceNo = isSuper
      ? null
      : req.user?.serviceNo || req.query.serviceNo || null;

    const rows = await Status.find({ recieveOfficerStatus: 3 })
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => {
      if (!s.request || s.request.show === false) return false;

      // If a specific receiver service number is provided
      if (myServiceNo) {
        // Show if:
        // 1. Assigned to this specific receiver OR
        // 2. No specific receiver assigned (dispatcher can handle any request)
        const assignedToMe =
          String(s.recieveOfficerServiceNumber) === String(myServiceNo);
        const noSpecificReceiver = !s.recieveOfficerServiceNumber;

        return assignedToMe || noSpecificReceiver;
      }

      // No service number filter - show all
      return true;
    });

    res.status(200).json(sortNewest(filtered, ["updatedAt", "createdAt"]));
  } catch (error) {
    console.error("Error fetching rejected statuses:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------- actions -------------
/**
 * PUT /receive/:referenceNumber/approve
 * Body: { comment, unloadingDetails, userServiceNumber, returnableItems }
 * - Sets recieveOfficerStatus = 2
 * - Saves unloading details & returnable items to Request
 * - Sets request.status = 11 (Completed/Received)
 * - Emails the Requester about completion
 */
const updateApproved = async (req, res) => {
  try {
    const { comment, unloadingDetails, userServiceNumber, returnableItems } =
      req.body;
    const { referenceNumber } = req.params;

    // Update the status (only if currently pending at receiver)
    let statusDoc = await Status.findOneAndUpdate(
      { referenceNumber, recieveOfficerStatus: { $ne: 2 } },
      {
        recieveOfficerStatus: 2,
        recieveOfficerComment: comment || "",
        recieveOfficerServiceNumber: userServiceNumber
          ? String(userServiceNumber)
          : undefined,
      },
      { new: true }
    ).populate("request");

    if (!statusDoc)
      return res.status(404).json({ message: "Status not found" });

    // Update Request document details
    if (statusDoc.request) {
      if (unloadingDetails) {
        statusDoc.request.unLoading = {
          loadingType: "Unloading",
          loadingLocation:
            unloadingDetails.unloadingLocation || statusDoc.request.inLocation,
          loadingTime: new Date(),
          staffType: unloadingDetails.staffType,
          staffServiceNo: unloadingDetails.staffServiceNo,
          nonSLTStaffName: unloadingDetails.nonSLTStaffName,
          nonSLTStaffCompany: unloadingDetails.nonSLTStaffCompany,
          nonSLTStaffNIC: unloadingDetails.nonSLTStaffNIC,
          nonSLTStaffContact: unloadingDetails.nonSLTStaffContact,
          nonSLTStaffEmail: unloadingDetails.nonSLTStaffEmail,
        };
      }

      if (returnableItems) {
        statusDoc.request.returnableItems = returnableItems;
      }

      // Mark request as Completed/Received
      statusDoc.request.status = 11;
      await statusDoc.request.save();
    }

    // Notify Requester of completion
    try {
      const requester = await findRequesterFromRequest(statusDoc.request);
      if (requester && requester.email) {
        const subject = `Gate Pass completed/received: ${referenceNumber}`;
        const html = `
          <p>Dear ${requester.name || "Requester"},</p>
          <p>Your gate pass request has been <b>completed / received</b> by the destination side.</p>
          <p><b>Reference:</b> ${referenceNumber}</p>
          <p>You can view it under your <i>Completed</i> or relevant section.</p>
        `;
        await sendEmail(requester.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Receiver approve→Requester) failed:", mailErr);
    }

    // Emit real-time event for request completion
    const io = req.app.get("io");
    if (io && statusDoc.request) {
      emitRequestCompletion(io, statusDoc.request);
    }

    return res.status(200).json({ updatedStatus: statusDoc });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * PUT /receive/:referenceNumber/reject
 * Body: { comment }
 * - Requires a non-empty comment
 * - Sets recieveOfficerStatus = 3
 * - Sets request.status = 12 (Rejected by Receiver)
 * - Emails Petrol Leader for the inLocation
 */
const updateRejected = async (req, res) => {
  try {
    const { comment } = req.body;
    const { referenceNumber } = req.params;

    console.log("=== RECEIVER REJECTION DEBUG ===");
    console.log(
      "req.user:",
      req.user?.serviceNo,
      "branches:",
      req.user?.branches
    );

    if (!comment || !comment.trim()) {
      return res
        .status(400)
        .json({ message: "Rejection comment is required." });
    }

    // First, get the branch from req.user if available
    let rejectedByBranch = null;
    if (req.user && req.user.branches && req.user.branches.length > 0) {
      rejectedByBranch = req.user.branches[0];
      console.log("Using rejectedByBranch from req.user:", rejectedByBranch);
    }

    let statusDoc = await Status.findOneAndUpdate(
      { referenceNumber },
      {
        recieveOfficerStatus: 3,
        recieveOfficerComment: comment.trim(),
        afterStatus: 12, // CRITICAL: Mark as Receiver Rejected so other levels can see it
        // Track rejection information
        rejectedBy: "Receiver",
        rejectedByServiceNo: req.user?.serviceNo || null,
        rejectedAt: new Date(),
        rejectionLevel: 4, // Receiver level (highest in hierarchy)
        rejectedByBranch: rejectedByBranch, // Set branch immediately
      },
      { new: true }
    ).populate("request");

    if (!statusDoc)
      return res.status(404).json({ message: "Status not found" });

    // Fallback: if branch not set, try to fetch from database
    if (!statusDoc.rejectedByBranch && req.user?.serviceNo) {
      try {
        const receiverUser = await User.findOne({
          serviceNo: req.user.serviceNo,
        }).lean();
        console.log(
          "Receiver User Found (fallback):",
          receiverUser?.serviceNo,
          "Branches:",
          receiverUser?.branches
        );
        if (
          receiverUser &&
          receiverUser.branches &&
          receiverUser.branches.length > 0
        ) {
          statusDoc.rejectedByBranch = receiverUser.branches[0];
          await statusDoc.save();
          console.log(
            "Set rejectedByBranch (fallback):",
            receiverUser.branches[0]
          );
        } else {
          console.log("No branches found for receiver");
        }
      } catch (userErr) {
        console.error("Failed to fetch receiver branch:", userErr);
      }
    } else if (!statusDoc.rejectedByBranch) {
      console.log("No serviceNo in req.user for receiver");
    }

    if (statusDoc.request) {
      statusDoc.request.status = 12;
      await statusDoc.request.save();
    }
    console.log(
      "Receiver rejection saved with rejectedByBranch:",
      statusDoc.rejectedByBranch
    );

    // Notify ALL lower levels in hierarchy about the rejection

    // 1. Notify Requester (User)
    try {
      const requester = await findRequesterFromRequest(statusDoc.request);
      if (requester && requester.email) {
        const subject = `Gate Pass rejected by Receiver: ${referenceNumber}`;
        const html = `
          <p>Dear ${requester.name || "Requester"},</p>
          <p>Your gate pass request has been <b>rejected by the Receiver/Collector</b>.</p>
          <p><b>Reference:</b> ${referenceNumber}</p>
          <p><b>Reason:</b> ${statusDoc.recieveOfficerComment}</p>
          <p>You can view this under <i>My Requests – Rejected</i>.</p>
        `;
        await sendEmail(requester.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Receiver reject→Requester) failed:", mailErr);
    }

    // 2. Notify Executive Officer
    try {
      const executive = await findExecutiveFromRequest(statusDoc.request);
      if (executive && executive.email) {
        const subject = `Gate Pass rejected at Receiver stage: ${referenceNumber}`;
        const html = `
          <p>Dear ${executive.name || "Executive Officer"},</p>
          <p>A gate pass request has been <b>rejected by the Receiver/Collector</b>.</p>
          <p><b>Reference:</b> ${referenceNumber}</p>
          <p><b>Reason:</b> ${statusDoc.recieveOfficerComment}</p>
          <p>This will be visible under your Rejected section for tracking.</p>
        `;
        await sendEmail(executive.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Receiver reject→Executive) failed:", mailErr);
    }

    // 3. Notify Verifier (Petrol Leader 1)
    try {
      const verifier = await findVerifierFromRequest(statusDoc.request);
      if (verifier && verifier.email) {
        const subject = `Gate Pass rejected at Receiver stage: ${referenceNumber}`;
        const html = `
          <p>Dear ${verifier.name || "Verifier"},</p>
          <p>A gate pass request has been <b>rejected by the Receiver/Collector</b>.</p>
          <p><b>Reference:</b> ${referenceNumber}</p>
          <p><b>Reason:</b> ${statusDoc.recieveOfficerComment}</p>
          <p>This will be visible under your Rejected section for tracking.</p>
        `;
        await sendEmail(verifier.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Receiver reject→Verifier) failed:", mailErr);
    }

    // 4. Notify Dispatcher (Petrol Leader 2)
    try {
      const dispatcher = await findDispatcherFromRequest(statusDoc.request);
      if (dispatcher && dispatcher.email) {
        const subject = `Gate Pass rejected at Receiver stage: ${referenceNumber}`;
        const html = `
          <p>Dear ${dispatcher.name || "Dispatcher"},</p>
          <p>A gate pass request has been <b>rejected by the Receiver/Collector</b>.</p>
          <p><b>Reference:</b> ${referenceNumber}</p>
          <p><b>Reason:</b> ${statusDoc.recieveOfficerComment}</p>
          <p>This will be visible under your Rejected section for tracking.</p>
        `;
        await sendEmail(dispatcher.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Receiver reject→Dispatcher) failed:", mailErr);
    }

    // Emit real-time event for rejection
    const io = req.app.get("io");
    if (io && statusDoc.request) {
      emitRequestRejection(io, statusDoc.request, "Receiver");
    }

    return res.status(200).json(statusDoc);
  } catch (error) {
    console.error("Error rejecting status:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * PUT /receive/:referenceNumber/returnable-item
 * Body: { originalSerialNo, itemModel, serialNo }
 * - Updates specific returnable item's model and serial number using original serial number as identifier
 * - Validates that the item exists and the request is in the correct state
 */
const updateReturnableItem = async (req, res) => {
  try {
    const { originalSerialNo, itemModel, serialNo } = req.body;
    const { referenceNumber } = req.params;

    // Validate required fields
    if (!originalSerialNo) {
      return res.status(400).json({
        message: "Original serial number is required to identify the item",
      });
    }

    if (!itemModel && !serialNo) {
      return res.status(400).json({
        message: "At least one field (itemModel or serialNo) must be provided",
      });
    }

    // Find the status document and populate the request
    const statusDoc = await Status.findOne({ referenceNumber }).populate(
      "request"
    );

    if (!statusDoc) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (!statusDoc.request) {
      return res.status(404).json({ message: "Request details not found" });
    }

    // Check if this is an approved request (has returnable items saved)
    if (
      !statusDoc.request.returnableItems ||
      !Array.isArray(statusDoc.request.returnableItems) ||
      statusDoc.request.returnableItems.length === 0
    ) {
      return res.status(400).json({
        message:
          "This request has not been approved yet or no returnable items have been saved. Returnable items can only be edited after the request has been approved and returnable items have been saved to the database.",
        status: statusDoc.recieveOfficerStatus,
        hint: "Edit functionality is only available for approved requests with saved returnable items.",
      });
    }

    console.log(
      "Available returnable items:",
      statusDoc.request.returnableItems.map((item) => ({
        serialNo: item.serialNo,
        itemName: item.itemName,
        itemModel: item.itemModel,
      }))
    );
    console.log("Looking for serial number:", originalSerialNo);

    // Find the item index by original serial number
    const itemIndex = statusDoc.request.returnableItems.findIndex(
      (item) => item.serialNo === originalSerialNo
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        message: "Returnable item not found with the provided serial number",
        availableSerialNumbers: statusDoc.request.returnableItems.map(
          (item) => item.serialNo
        ),
        searchedSerialNumber: originalSerialNo,
      });
    }

    // Update the specific returnable item
    const updatedFields = {};
    if (itemModel !== undefined) updatedFields.itemModel = itemModel;
    if (serialNo !== undefined) updatedFields.serialNo = serialNo;

    // Use MongoDB's array update syntax
    const updateQuery = {};
    Object.keys(updatedFields).forEach((field) => {
      updateQuery[`returnableItems.${itemIndex}.${field}`] =
        updatedFields[field];
    });

    const updatedRequest = await Request.findByIdAndUpdate(
      statusDoc.request._id,
      { $set: updateQuery },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Failed to update request" });
    }

    return res.status(200).json({
      message: "Returnable item updated successfully",
      updatedItem: updatedRequest.returnableItems[itemIndex],
    });
  } catch (error) {
    console.error("Error updating returnable item:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

//Mark returnable items as returned
// Updated with remarks support
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

    // Find the status document by reference number
    const status = await Status.findOne({ referenceNumber });

    if (!status) {
      return res.status(404).json({
        success: false,
        message: "Request not found with this reference number",
      });
    }

    // Check if request is approved
    /*if (status.recieveOfficerStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: "Only approved requests can have items marked as returned"
      });
    }*/

    // Update items in the request
    const request = await Request.findById(status.request);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Associated request not found",
      });
    }

    let updatedCount = 0;

    // Update items array
    if (request.items && Array.isArray(request.items)) {
      request.items = request.items.map((item) => {
        if (serialNumbers.includes(item.serialNo)) {
          updatedCount++;
          return {
            ...item.toObject(),
            status: "return to Petrol Leader",
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
          returned: true,
          returnedDate: new Date(),
          returnRemarks: remarks || undefined,
        };
      } else if (itemData) {
        // Add new returnable item
        request.returnableItems.push({
          ...itemData.toObject(),
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
      referenceNumber: status.referenceNumber,
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


const addReturnableItemToRequest = async (req, res) => {
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

// Update returnable item (model and serial number)
/*const updateReturnableItem = async (
  referenceNumber,
  originalSerialNo,
  itemModel,
  serialNo
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/receive/${referenceNumber}/returnable-item`,
      { originalSerialNo, itemModel, serialNo },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating returnable item:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update returnable item"
    );
  }
};*/
module.exports = {
  createStatus,
  getPending,
  getApproved,
  getRejected,
  updateApproved,
  updateRejected,
  markItemsAsReturned,
  updateReturnableItem,
  addReturnableItemToRequest,
};
