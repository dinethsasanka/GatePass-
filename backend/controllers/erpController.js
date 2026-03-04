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
/**
 * @desc    Get SLT holidays for a full year
 * @route   POST /api/erp/holidays-by-year
 * @access  Private
 * @body    { year: number }
 */
const getHolidaysByYear = async (req, res) => {
  try {
    const { year } = req.body;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "year is required",
      });
    }

    const holidays = await erpService.getHolidaysByYear(Number(year));
    res.status(200).json({
      success: true,
      data: holidays,
    });
  } catch (error) {
    console.error("Get Holidays By Year Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch holidays by year",
      error: error.message,
    });
  }
};

/**
 * @desc    Get SLT holidays for a specific year and month
 * @route   POST /api/erp/holidays-by-month
 * @access  Private
 * @body    { year: number, month: number }
 */
const getHolidaysByMonth = async (req, res) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Both year and month are required",
      });
    }

    const holidays = await erpService.getHolidaysByMonth(Number(year), Number(month));
    res.status(200).json({
      success: true,
      data: holidays,
    });
  } catch (error) {
    console.error("Get Holidays By Month Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch holidays by month",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all SLT item categories
 * @route   POST /api/erp/item-categories
 * @access  Private
 */
const getAllItemCategories = async (req, res) => {
  try {
    const categories = await erpService.getAllItemCategories();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get All Item Categories Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch item categories",
      error: error.message,
    });
  }
};

/**
 * @desc    Get SLT items by serial number
 * @route   POST /api/erp/items-by-serial
 * @access  Private
 * @body    { serialNo: string }
 */
const getItemsBySerialNo = async (req, res) => {
  try {
    const { serialNo } = req.body;

    if (!serialNo) {
      return res.status(400).json({
        success: false,
        message: "serialNo is required",
      });
    }

    const items = await erpService.getItemsBySerialNo(serialNo);
    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Get Items By Serial No Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch items by serial number",
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
  getHolidaysByYear,
  getHolidaysByMonth,
  getAllItemCategories,
  getItemsBySerialNo,
};
