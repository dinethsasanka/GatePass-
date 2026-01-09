const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getOrganizations,
  getCostCenters,
  getEmployees,
  getEmployeeHierarchy,
  getEmployeeDetails,
} = require("../controllers/erpController");
const erpLocationController = require("../controllers/erpLocationController");

// All routes are protected - require authentication
router.use(protect);

/**
 * @route   GET /api/erp/organizations
 * @desc    Get all organizations from ERP system
 * @access  Private
 */
router.get("/organizations", getOrganizations);

/**
 * @route   POST /api/erp/cost-centers
 * @desc    Get cost centers for a specific organization
 * @access  Private
 * @body    { organizationID: string, costCenterCode?: string }
 */
router.post("/cost-centers", getCostCenters);

/**
 * @route   POST /api/erp/employees
 * @desc    Get employee list for organization and cost center
 * @access  Private
 * @body    { organizationID: string, costCenterCode: string }
 */
router.post("/employees", getEmployees);

/**
 * @route   POST /api/erp/employee-hierarchy
 * @desc    Get employee hierarchy details
 * @access  Private
 * @body    { organizationID?: string, costCenterCode?: string, employeeNo: string }
 */
router.post("/employee-hierarchy", getEmployeeHierarchy);

router.post("/employee-details", getEmployeeDetails);
router.get("/erp-locations", protect, erpLocationController.getErpLocations);

module.exports = router;
