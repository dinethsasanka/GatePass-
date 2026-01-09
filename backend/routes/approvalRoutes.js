// routes/approvalRoutes.js
const express = require("express");
const router = express.Router();

const approvalController = require("../controllers/approvalController");

// Auth middleware must be enabled so we can apply role-based logic
// Auth middleware
const { protect } = require("../middleware/authMiddleware");

// Lists (Executive Officer)
router.get("/pending", protect, approvalController.getPending);
router.get("/:id/pending", protect, approvalController.getPending);

router.get("/approved", protect, approvalController.getApproved);
router.get("/:id/approved", protect, approvalController.getApproved);

router.get("/rejected", protect, approvalController.getRejected);
router.get("/:id/rejected", protect, approvalController.getRejected);

// Actions (Executive Officer)
router.put(
  "/:referenceNumber/approve",
  protect,
  approvalController.updateApproved
);
router.put(
  "/:referenceNumber/reject",
  protect,
  approvalController.updateRejected
);
router.put(
  "/:referenceNumber/mark-returned",
  approvalController.markItemsAsReturned
);

module.exports = router;
