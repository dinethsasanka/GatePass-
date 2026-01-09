const erpService = require("../services/erpService");

/**
 * @desc    Get all organizations
 * @route   GET /api/erp/organizations
 * @access  Private
 */
const getOrganizations = async (req, res) => {
  try {
    const organizations = await erpService.getOrganizationList();
    res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error("Get Organizations Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch organizations",
      error: error.message,
    });
  }
};

/**
 * @desc    Get cost centers for an organization
 * @route   POST /api/erp/cost-centers
 * @access  Private
 */
const getCostCenters = async (req, res) => {
  try {
    const { organizationID, costCenterCode } = req.body;

    console.log("getCostCenters called with:", {
      organizationID,
      costCenterCode,
      type: typeof organizationID,
    });

    if (!organizationID) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const costCenters = await erpService.getCostCentersForOrganization(
      organizationID,
      costCenterCode || ""
    );

    res.status(200).json({
      success: true,
      data: costCenters,
    });
  } catch (error) {
    console.error("Get Cost Centers Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cost centers",
      error: error.message,
    });
  }
};

/**
 * @desc    Get employees for an organization and cost center
 * @route   POST /api/erp/employees
 * @access  Private
 */
const getEmployees = async (req, res) => {
  try {
    const { organizationID, costCenterCode } = req.body;

    if (!organizationID || !costCenterCode) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and Cost Center Code are required",
      });
    }

    const employees = await erpService.getEmployeeList(
      organizationID,
      costCenterCode
    );

    res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Get Employees Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
};

/**
 * @desc    Get employee hierarchy details
 * @route   POST /api/erp/employee-hierarchy
 * @access  Private
 */
const getEmployeeHierarchy = async (req, res) => {
  try {
    const { organizationID, costCenterCode, employeeNo } = req.body;

    if (!employeeNo) {
      return res.status(400).json({
        success: false,
        message: "Employee number is required",
      });
    }

    const hierarchy = await erpService.getEmployeeDetailsHierarchy(
      organizationID || "string",
      costCenterCode || "string",
      employeeNo
    );

    res.status(200).json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    console.error("Get Employee Hierarchy Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee hierarchy",
      error: error.message,
    });
  }
};

const getEmployeeDetails = async (req, res) => {
  try {
    const { organizationID, costCenterCode, employeeNo } = req.body;

    if (!employeeNo) {
      return res.status(400).json({
        success: false,
        message: "Employee number is required",
      });
    }

    const details = await erpService.getEmployeeDetails(
      organizationID || "string",
      costCenterCode || "string",
      employeeNo
    );

    res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error("Get Employee details Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee details",
      error: error.message,
    });
  }
};
module.exports = {
  getOrganizations,
  getCostCenters,
  getEmployees,
  getEmployeeHierarchy,
  getEmployeeDetails,
};
