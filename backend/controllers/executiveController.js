const User = require("../models/User");
const { isRestrictedPeriod } = require("../utils/timeRules");
const erpService = require("../services/erpService");

const getExecutiveOfficersForNewRequest = async (req, res) => {
  try {
    // Check time restriction
    const restriction = await isRestrictedPeriod();

    // Base query
    let query = {
      role: "Approver",
    };

    // Apply restriction
    if (restriction.restricted) {
      query.Grade = { $in: ["A.1", "A.2", "A.3"] };
    }

    // Fetch executives
    const officers = await User.find(query)
      .select("serviceNo name designation Grade")
      .sort({ name: 1 })
      .lean();

    // Respond
    return res.json({
      restricted: restriction.restricted,
      reason: restriction.reason,
      officers,
    });
  } catch (error) {
    console.error("❌ Error fetching executive officers:", error);
    return res.status(500).json({
      message: "Failed to fetch executive officers",
    });
  }
};

/**
 * Get executive officers from ERP hierarchy based on logged-in user's employee number
 * @route GET /api/executives/hierarchy
 * @access Private
 */
const getExecutiveOfficersFromHierarchy = async (req, res) => {
  try {
    const employeeNo = req.user?.serviceNo || req.query.employeeNo;

    if (!employeeNo) {
      return res.status(400).json({
        success: false,
        message: "Employee number is required. Please ensure you are logged in.",
      });
    }

  const hierarchyResult = await erpService.getExecutiveHierarchyForEmployee(employeeNo);

    return res.json({
      success: true,
      source: "erp",
      officers: hierarchyResult.executives,
      immediateSupervisor: hierarchyResult.immediateSupervisor,
      loggedInEmployeeGrade: hierarchyResult.loggedInEmployeeGrade,
      employeeNo,
      message: `Found ${hierarchyResult.executives.length} executive(s) in hierarchy`,
    });

  } catch (error) {
    // Fallback to local database on error
    try {

      const restriction = await isRestrictedPeriod();
      let query = { role: "Approver" };

      if (restriction.restricted) {
        query.Grade = { $in: ["A.1", "A.2", "A.3"] };
      }

      const localOfficers = await User.find(query)
        .select("serviceNo name designation Grade email")
        .sort({ name: 1 })
        .lean();

      return res.json({
        success: true,
        source: "local",
        restricted: restriction.restricted,
        reason: restriction.reason,
        officers: localOfficers,
        immediateSupervisor: null, // Cannot determine from local data
        erpError: error.message,
        message: "Using local database due to ERP connection error",
      });
    } catch (fallbackError) {
      console.error("❌ Fallback to local database also failed:", fallbackError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch executive officers from both ERP and local database",
        error: error.message,
      });
    }
  }
};

module.exports = {
  getExecutiveOfficersForNewRequest,
  getExecutiveOfficersFromHierarchy,
};
