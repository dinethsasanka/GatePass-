// controllers/approvalController.js
// Executive Officer stage: Pending / Approve / Reject
// Workflow: Requester → Executive → Verifier → Petrol Leader (view-only) → Receiver

const Status = require("../models/Status");
const Request = require("../models/Request");
const User = require("../models/User");
const {
  emitRequestApproval,
  emitRequestRejection,
} = require("../utils/socketEmitter");

// If your project exposes a different path/helper for email, adjust this import:
const { sendEmail } = require("../utils/sendMail"); // async (to, subject, html) => Promise<void>

// ---------- helpers ----------
const pick = (obj, path) =>
  path.split(".").reduce((v, k) => (v && v[k] != null ? v[k] : null), obj);

const parseTime = (v) => {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ciSvc = (svc) =>
  svc ? { $regex: `^${esc(String(svc).trim())}$`, $options: "i" } : undefined;

// newest-first by first existing timestamp key
const sortNewest = (rows, keys) =>
  rows.sort((a, b) => {
    const bt = keys.reduce((acc, k) => acc || parseTime(pick(b, k)), 0);
    const at = keys.reduce((acc, k) => acc || parseTime(pick(a, k)), 0);
    return bt - at;
  });

// Find Verifier by Out-location (sending branch)
async function findVerifierForOutLocation(outLocation) {
  if (!outLocation) return null;
  const verifier = await User.findOne({
    role: "Verifier",
    isActive: true,
    // assuming user.branches (array of branch strings)
    branches: { $in: [outLocation] },
  }).lean();
  return verifier;
}

// Try to resolve the Requester user record from the Request document
async function findRequesterFromRequest(reqDoc) {
  if (!reqDoc) return null;

  // Common field guesses (adapt to your actual Request schema if different)
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

  // If the request itself holds an email field
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

// helpers to avoid role/serviceNo formatting issues
const normalizeRole = (r) =>
  String(r || "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
const normalizeSvc = (s) =>
  String(s || "")
    .trim()
    .toUpperCase();
const ciSvcMatch = (svc) =>
  svc
    ? {
        executiveOfficerServiceNo: {
          $regex: `^${svc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      }
    : {};

// ---------- Executive: lists ----------
/**
 * GET Executive Pending
 * Route styles supported:
 *  - /approve/:id/pending  (id = executive officer serviceNo)
 *  - /approve/pending?serviceNo=E123
 *  - If neither provided and req.user is set: uses req.user.serviceNo
 */

// PENDING
// PENDING (EO)
exports.getPending = async (req, res) => {
  try {
    const isSuper =
      String(req.user?.role || "")
        .replace(/[\s_-]/g, "")
        .toLowerCase() === "superadmin";
    const routeSvc = String(req.params.id || req.query.serviceNo || "").trim();
    const userSvc = String(req.user?.serviceNo || "").trim();
    const svcNo = isSuper ? routeSvc || null : userSvc;

    if (!isSuper && !svcNo)
      return res
        .status(400)
        .json({ message: "serviceNo is required for this role" });

    // Filter on **Status.executiveOfficerServiceNo** + accept number OR string stage codes
    const where = { executiveOfficerStatus: { $in: [1, "1"] } };
    if (svcNo) where.executiveOfficerServiceNo = ciSvc(svcNo);

    const rows = await Status.find(where)
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => s.request && s.request.show !== false);
    return res.json(sortNewest(filtered, ["updatedAt", "createdAt"]));
  } catch (err) {
    console.error("Executive getPending error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// APPROVED (EO)
exports.getApproved = async (req, res) => {
  try {
    const isSuper =
      String(req.user?.role || "")
        .replace(/[\s_-]/g, "")
        .toLowerCase() === "superadmin";
    const routeSvc = String(req.params.id || req.query.serviceNo || "").trim();
    const userSvc = String(req.user?.serviceNo || "").trim();
    const svcNo = isSuper ? routeSvc || null : userSvc;

    if (!isSuper && !svcNo)
      return res
        .status(400)
        .json({ message: "serviceNo is required for this role" });

    const where = { executiveOfficerStatus: { $in: [2, "2"] } };
    if (svcNo) where.executiveOfficerServiceNo = ciSvc(svcNo);

    const rows = await Status.find(where)
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => s.request && s.request.show !== false);
    return res.json(sortNewest(filtered, ["updatedAt", "createdAt"]));
  } catch (err) {
    console.error("Executive getApproved error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// REJECTED (EO)
exports.getRejected = async (req, res) => {
  try {
    const isSuper =
      String(req.user?.role || "")
        .replace(/[\s_-]/g, "")
        .toLowerCase() === "superadmin";
    const routeSvc = String(req.params.id || req.query.serviceNo || "").trim();
    const userSvc = String(req.user?.serviceNo || "").trim();
    const svcNo = isSuper ? routeSvc || null : userSvc;

    if (!isSuper && !svcNo)
      return res
        .status(400)
        .json({ message: "serviceNo is required for this role" });

    const where = { executiveOfficerStatus: { $in: [3, "3"] } };
    if (svcNo) where.executiveOfficerServiceNo = ciSvc(svcNo);

    const rows = await Status.find(where)
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => s.request && s.request.show !== false);
    return res.json(sortNewest(filtered, ["updatedAt", "createdAt"]));
  } catch (err) {
    console.error("Executive getRejected error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------- Executive: actions ----------
/**
 * PUT /approve/:referenceNumber/approve
 * Sets Executive Approved and moves Verifier to PENDING (NOT approved).
 * Sends email to Verifier (based on Out-location).
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

    // Only Executive fields + handoff to Verifier Pending
    status.beforeStatus = status.executiveOfficerStatus || 1;
    status.executiveOfficerStatus = 2; // Approved
    status.executiveOfficerComment = comment || "";
    status.afterStatus = 2;

    // Check if it's a Non-SLT destination
    const isNonSltPlace = status.request.isNonSltPlace === true;

    // The CRITICAL part: Verifier must be PENDING (1), not 2
    status.verifyOfficerStatus = 1;

    // Do not touch receive stage here
    // Keep request visible
    if (status.request && typeof status.request.show === "undefined") {
      status.request.show = true;
      await status.request.save();
    }

    await status.save();

    // Notify verifier for Out-location
    try {
      const outLocation = status.request.outLocation;
      const verifier = await findVerifierForOutLocation(outLocation);
      if (verifier?.serviceNo) {
        status.verifyOfficerServiceNo = String(verifier.serviceNo).trim();
        await status.save(); // make sure it persists before you send mail
      }
      if (verifier && verifier.email) {
        const destinationInfo = isNonSltPlace
          ? `<b>Company:</b> ${status.request.companyName || "-"}<br/>
             <b>Address:</b> ${status.request.companyAddress || "-"}`
          : `<b>In-location (Receiver):</b> ${
              status.request.inLocation || "-"
            }`;

        const subject = `Gate Pass needs verification: ${referenceNumber}`;
        const html = `
          <p>Dear ${verifier.name || "Verifier"},</p>
          <p>A gate pass was <b>approved by the Executive Officer</b> and is awaiting your verification.</p>
          <p><b>Reference:</b> ${referenceNumber}<br/>
             <b>Out-location (Sender):</b> ${outLocation || "-"}<br/>
             ${destinationInfo}<br/>
             <b>Destination Type:</b> ${
               isNonSltPlace ? "Non-SLT Organization" : "SLT Branch"
             }</p>
          <p>Please review it in your <i>Verify – Pending</i> section.</p>
        `;
        await sendEmail(verifier.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Executive→Verifier) failed:", mailErr);
    }

    const fresh = await Status.findById(status._id).populate("request").lean();

    // Emit real-time event for approval
    const io = req.app.get("io");
    if (io && fresh) {
      emitRequestApproval(io, fresh.request, "Approver");
    }

    return res.json(fresh);
  } catch (err) {
    console.error("Executive approve error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * PUT /approve/:referenceNumber/reject
 * Requires a rejection comment.
 * Sets Executive Rejected and notifies Requester by email.
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

    status.beforeStatus = status.executiveOfficerStatus || 1;
    status.executiveOfficerStatus = 3; // Rejected
    status.executiveOfficerComment = comment.trim();
    status.afterStatus = 3;

    await status.save();

    // Notify Requester
    try {
      const requester = await findRequesterFromRequest(status.request);
      if (requester && requester.email) {
        const subject = `Gate Pass rejected by Executive Officer: ${referenceNumber}`;
        const html = `
          <p>Dear ${requester.name || "Requester"},</p>
          <p>Your gate pass request has been <b>rejected by the Executive Officer</b>.</p>
          <p><b>Reference:</b> ${referenceNumber}</p>
          <p><b>Reason:</b> ${status.executiveOfficerComment}</p>
          <p>You can view this under <i>My Requests – Rejected</i>.</p>
        `;
        await sendEmail(requester.email, subject, html);
      }
    } catch (mailErr) {
      console.error("Email (Executive reject→Requester) failed:", mailErr);
    }

    const fresh = await Status.findById(status._id).populate("request").lean();

    // Emit real-time event for rejection
    const io = req.app.get("io");
    if (io && fresh) {
      emitRequestRejection(io, fresh.request, "Approver");
    }

    return res.json(fresh);
  } catch (err) {
    console.error("Executive reject error:", err);
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
            status: "return to Sender", // Changed from 'return to sender' to 'returned'
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
          status: "return to Sender", // Changed status
          returned: true,
          returnedDate: new Date(),
          returnRemarks: remarks || undefined,
        };
      } else if (itemData) {
        // Add new returnable item
        request.returnableItems.push({
          ...itemData.toObject(),
          status: "return to Sender", // Changed status
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
