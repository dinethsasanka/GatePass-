const express = require("express");
const router = express.Router();

const adminRequestController = require("../controllers/adminRequestController");
const { protect } = require("../middleware/authMiddleware"); // your existing auth
const requireSuperAdmin = require("../middleware/requireSuperAdmin");

// Global list (paginated, optional filters)
router.get(
  "/requests",
  protect,
  requireSuperAdmin,
  adminRequestController.listAll
);

// By reference number (all stages of that ref)
router.get(
  "/requests/by-ref/:referenceNumber",
  protect,
  requireSuperAdmin,
  adminRequestController.byReference
);

module.exports = router;
