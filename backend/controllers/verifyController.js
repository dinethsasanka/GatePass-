// controllers/verifyController.js
// Verifier stage: Pending / Approve / Reject
// Workflow: Requester → Executive → Verifier → Petrol Leader (view-only) → Receiver

const Status = require("../models/Status");
const Request = require("../models/Request");
const User = require("../models/User");
const { DISPATCH_ROLES } = require("../utils/roleGroup");
const { sendEmail } = require("../utils/sendMail"); // uses EMAIL_USER / EMAIL_PASS from .env
const PLeader = require("../models/PLeader");
const SecurityOfficer = require("../models/SecurityOfficer");
const { findAuthoritiesForLocation } = require("../utils/locationRouting");
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

// --- verify role helpers ---
const isSuperAdmin = (role) => normalizeRole(role) === "superadmin";

const isVerifyRole = (role) =>
  DISPATCH_ROLES.map(normalizeRole).includes(normalizeRole(role));

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

// Import user helpers at the top
const { findRequesterWithERPData } = require("../utils/userHelpers");

// Try to resolve the Requester user record from the Request document
// NOW WITH ERP DATA!
async function findRequesterFromRequest(reqDoc) {
  // Use the new helper that automatically enriches with ERP data
  return await findRequesterWithERPData(reqDoc, true);
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
// exports.getPending = async (req, res) => {
//   try {
//     if (!isSuperAdmin(req.user?.role) && !isVerifyRole(req.user?.role)) {
//       return res.status(403).json({ message: "Access denied" });
//     }
//     const isSuper = normalizeRole(req.user?.role) === "superadmin";
//     const branches = Array.isArray(req.user?.branches) ? req.user.branches : [];
//     const branchRegex = toRegexList(branches);

//     const rows = await Status.find({ verifyOfficerStatus: { $in: [1, "1"] } })
//       .populate({
//         path: "request",
//         match: isSuper ? {} : { outLocation: { $in: branchRegex } },
//       })
//       .sort({ updatedAt: -1 })
//       .lean();

//     const filtered = rows.filter((s) => s.request && s.request.show !== false);
//     return res.json(
//       filtered.sort(
//         (a, b) =>
//           new Date(b.updatedAt || b.createdAt) -
//           new Date(a.updatedAt || a.createdAt)
//       )
//     );

//     // Remove duplicates by keeping only the latest Status per referenceNumber
//     const uniqueFiltered = [];
//     const seenReferences = new Set();

//     for (const status of filtered) {
//       if (!seenReferences.has(status.referenceNumber)) {
//         seenReferences.add(status.referenceNumber);
//         uniqueFiltered.push(status);
//       }
//     }

//     return res.json(sortNewest(uniqueFiltered, ["updatedAt", "createdAt"]));
//   } catch (err) {
//     console.error("Verify getPending error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// normalize helper (same rule used in models)
const normBranch = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

exports.getPending = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role) && !isVerifyRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isSuper = normalizeRole(req.user?.role) === "superadmin";

    let allowedBranchesNorm = null;

    if (!isSuper) {
      const empNo = String(req.user?.serviceNo || "").trim();
      if (!empNo) {
        return res.status(400).json({ message: "Missing serviceNo" });
      }

      // ✅ fetch BOTH assignment lists (so PL sees it, SO sees it)
      const [pl, so] = await Promise.all([
        PLeader.findOne({ employeeNumber: empNo })
          .select({ branchesNorm: 1 })
          .lean(),
        SecurityOfficer.findOne({ employeeNumber: empNo })
          .select({ branchesNorm: 1 })
          .lean(),
      ]);

      const combined = [
        ...(pl?.branchesNorm || []),
        ...(so?.branchesNorm || []),
      ];

      // de-dupe
      allowedBranchesNorm = Array.from(new Set(combined));

      if (!allowedBranchesNorm.length) return res.json([]);
    }

    const rows = await Status.find({ verifyOfficerStatus: { $in: [1, "1"] } })
      .populate({ path: "request" })
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => {
      const reqDoc = s.request;
      if (!reqDoc) return false;
      if (reqDoc.show === false) return false;
      if (isSuper) return true;

      const outNorm = normBranch(reqDoc.outLocation);
      return allowedBranchesNorm.includes(outNorm);
    });

    // Remove duplicates by referenceNumber keeping newest
    const unique = [];
    const seen = new Set();
    for (const st of filtered) {
      const ref = st.referenceNumber || st?.request?.referenceNumber;
      if (!ref) {
        unique.push(st);
        continue;
      }
      if (!seen.has(ref)) {
        seen.add(ref);
        unique.push(st);
      }
    }

    return res.json(sortNewest(unique, ["updatedAt", "createdAt"]));
  } catch (err) {
    console.error("Verify getPending error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getApproved = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role) && !isVerifyRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    let allowedBranchesNorm = null;

    if (!isSuper) {
      const empNo = String(req.user?.serviceNo || "").trim();
      if (!empNo) {
        return res.status(400).json({ message: "Missing serviceNo" });
      }

      const [pl, so] = await Promise.all([
        PLeader.findOne({ employeeNumber: empNo })
          .select({ branchesNorm: 1 })
          .lean(),
        SecurityOfficer.findOne({ employeeNumber: empNo })
          .select({ branchesNorm: 1 })
          .lean(),
      ]);

      const combined = [
        ...(pl?.branchesNorm || []),
        ...(so?.branchesNorm || []),
      ];

      allowedBranchesNorm = Array.from(new Set(combined));

      if (!allowedBranchesNorm.length) return res.json([]);
    }

    // Get all reference numbers that have been rejected at any level
    const rejectedRefs = await Status.find({
      rejectedBy: { $exists: true },
    }).distinct("referenceNumber");

    const rows = await Status.find({
      verifyOfficerStatus: 2, // Verifier approved
      referenceNumber: { $nin: rejectedRefs }, // Exclude rejected references
    })
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => {
      const reqDoc = s.request;
      if (!reqDoc) return false;
      if (reqDoc.show === false) return false;
      if (isSuper) return true;

      const outNorm = normBranch(reqDoc.outLocation);
      return allowedBranchesNorm.includes(outNorm);
    });

    // Remove duplicates by keeping only the latest Status per referenceNumber
    const uniqueFiltered = [];
    const seenReferences = new Set();

    for (const status of filtered) {
      if (!seenReferences.has(status.referenceNumber)) {
        seenReferences.add(status.referenceNumber);
        uniqueFiltered.push(status);
      }
    }

    return res.json(sortNewest(uniqueFiltered, ["updatedAt", "createdAt"]));
  } catch (err) {
    console.error("Verify getApproved error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getRejected = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role) && !isVerifyRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const isSuper = normalizeRole(req.user?.role) === "superadmin";
    let allowedBranchesNorm = null;

    if (!isSuper) {
      const empNo = String(req.user?.serviceNo || "").trim();
      if (!empNo) {
        return res.status(400).json({ message: "Missing serviceNo" });
      }

      const [pl, so] = await Promise.all([
        PLeader.findOne({ employeeNumber: empNo })
          .select({ branchesNorm: 1 })
          .lean(),
        SecurityOfficer.findOne({ employeeNumber: empNo })
          .select({ branchesNorm: 1 })
          .lean(),
      ]);

      const combined = [
        ...(pl?.branchesNorm || []),
        ...(so?.branchesNorm || []),
      ];

      allowedBranchesNorm = Array.from(new Set(combined));

      if (!allowedBranchesNorm.length) return res.json([]);
    }

    // Show rejections where Verifier was involved:
    // 1. Verifier rejected it themselves (verifyOfficerStatus: 3)
    // 2. Verifier approved it (verifyOfficerStatus: 2) but it was rejected by higher levels
    // afterStatus: 6 = Verifier Rejected, 9 = Dispatcher Rejected, 12 = Receiver Rejected
    const rows = await Status.find({
      $or: [
        { verifyOfficerStatus: 3 }, // Rejected by Verifier themselves
        {
          verifyOfficerStatus: 2, // Verifier approved it
          afterStatus: { $in: [9, 12] }, // But rejected by Dispatcher or Receiver
        },
      ],
    })
      .populate("request")
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = rows.filter((s) => {
      const reqDoc = s.request;
      if (!reqDoc) return false;
      if (reqDoc.show === false) return false;
      if (isSuper) return true;

      const outNorm = normBranch(reqDoc.outLocation);
      return allowedBranchesNorm.includes(outNorm);
    });
    return res.json(
      filtered.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt),
      ),
    );

    // Remove duplicates by keeping only the latest Status per referenceNumber
    const uniqueFiltered = [];
    const seenReferences = new Set();

    for (const status of filtered) {
      if (!seenReferences.has(status.referenceNumber)) {
        seenReferences.add(status.referenceNumber);
        uniqueFiltered.push(status);
      }
    }

    return res.json(sortNewest(uniqueFiltered, ["updatedAt", "createdAt"]));
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
    if (!isSuperAdmin(req.user?.role) && !isVerifyRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

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
          status.request.outLocation,
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

    // ✅ SLT Branch destination: move to Dispatch Pending (IN-location Pleader + Security)
    const inLocationName = status.request.inLocation;

    // 1) Assign IN-side authorities (Dispatcher side)
    const inAuthorities = await findAuthoritiesForLocation(inLocationName);

    status.inPLeaders = Array.isArray(inAuthorities.pleaders)
      ? inAuthorities.pleaders
      : [];
    status.inSecurity = Array.isArray(inAuthorities.security)
      ? inAuthorities.security
      : [];

    // 2) Receiver should be pending too (selected in New Request screen)
    status.recieveOfficerStatus = 1;
    status.recieveOfficerServiceNumber = readSelectedReceiverServiceNo(
      status.request,
    );

    // 3) Move workflow to Dispatch Pending
    status.beforeStatus = status.afterStatus || 5; // safe
    status.afterStatus = 7; // Dispatch Pending

    if (status.request) {
      status.request.status = 7; // Dispatch Pending
      await status.request.save();
    }

    await status.save();


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
    if (!isSuperAdmin(req.user?.role) && !isVerifyRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { referenceNumber } = req.params;
    const { comment } = req.body;

    console.log("=== VERIFIER REJECTION DEBUG ===");
    console.log(
      "req.user:",
      req.user?.serviceNo,
      "branches:",
      req.user?.branches,
    );
    console.log("req.user full:", JSON.stringify(req.user, null, 2));

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
    status.afterStatus = 6; // FIXED: Verifier Rejected = 6 (not 3)

    // Track rejection information - Use req.user (who actually rejected) instead of assigned officer
    status.rejectedBy = "Verifier";
    status.rejectedByServiceNo =
      req.user?.serviceNo || status.verifyOfficerServiceNumber;
    status.rejectedAt = new Date();
    status.rejectionLevel = 2; // Verifier level (after Executive)

    // Use the logged-in user's branch directly
    if (req.user && req.user.branches && req.user.branches.length > 0) {
      status.rejectedByBranch = req.user.branches[0];
      console.log("Set rejectedByBranch from req.user:", req.user.branches[0]);
    } else {
      // Fallback: try to fetch by serviceNo
      try {
        const verifierUser = await User.findOne({
          serviceNo: req.user?.serviceNo || status.verifyOfficerServiceNumber,
        }).lean();
        console.log(
          "Verifier User Found (fallback):",
          verifierUser?.serviceNo,
          "Branches:",
          verifierUser?.branches,
        );
        if (
          verifierUser &&
          verifierUser.branches &&
          verifierUser.branches.length > 0
        ) {
          status.rejectedByBranch = verifierUser.branches[0];
          console.log(
            "Set rejectedByBranch (fallback):",
            verifierUser.branches[0],
          );
        } else {
          console.log("No branches found for verifier");
        }
      } catch (userErr) {
        console.error("Failed to fetch verifier branch:", userErr);
      }
    }

    await status.save();
    console.log("Saved status with rejectedByBranch:", status.rejectedByBranch);

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
        (ri) => ri.serialNo === serialNo,
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
