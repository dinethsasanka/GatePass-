const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getOrganizations,
  getCostCenters,
  getEmployees,
  getEmployeeHierarchy,
  getEmployeeDetails,
  getHolidaysByYear,
  getHolidaysByMonth,
  getAllItemCategories,
  getItemsBySerialNo,
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

/**
 * @route   GET /api/erp/erp-locations
 * @desc    Get all ERP locations
 * @access  Private
 */
router.get("/erp-locations", erpLocationController.getErpLocations);

/**
 * @route   GET /api/erp/branch/:locationId
 * @desc    Get branch name by location ID (e.g., L001)
 * @access  Private
 * @param   locationId - Location ID like "L001"
 */
router.get("/branch/:locationId", erpLocationController.getBranchNameByLocationId);

/**
 * @route   POST /api/erp/holidays-by-year
 * @desc    Get SLT holidays for a full year
 * @access  Private
 * @body    { year: number }
 */
router.post("/holidays-by-year", getHolidaysByYear);

/**
 * @route   POST /api/erp/holidays-by-month
 * @desc    Get SLT holidays for a specific year and month
 * @access  Private
 * @body    { year: number, month: number }
 */
router.post("/holidays-by-month", getHolidaysByMonth);

/**
 * @route   POST /api/erp/item-categories
 * @desc    Get all SLT item categories
 * @access  Private
 */
router.post("/item-categories", getAllItemCategories);

/**
 * @route   POST /api/erp/items-by-serial
 * @desc    Get SLT items by serial number
 * @access  Private
 * @body    { serialNo: string }
 */
router.post("/items-by-serial", getItemsBySerialNo);

module.exports = router;
