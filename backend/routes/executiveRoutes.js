const express = require("express");
const router = express.Router();
const {
  getExecutiveOfficersForNewRequest,
  getExecutiveOfficersFromHierarchy,
} = require("../controllers/executiveController");
const { protect } = require("../middleware/authMiddleware");

// Get executives from local database (existing endpoint)
router.get("/for-new-request", getExecutiveOfficersForNewRequest);

// Get executives from ERP hierarchy based on logged-in user (NEW endpoint)
router.get("/hierarchy", protect, getExecutiveOfficersFromHierarchy);

module.exports = router;
