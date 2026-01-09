const axios = require("axios");

// ERP API Configuration
const ERP_BASE_URL = "https://oneidentitytest.slt.com.lk/ERPAPIs/api/ERPData";
const ERP_CREDENTIALS = {
  username: process.env.ERP_USERNAME || "dpuser",
  password: process.env.ERP_PASSWORD || "dp@123#",
};

console.log("=== ERP Service Initialized ===");
console.log("Base URL:", ERP_BASE_URL);
console.log("Username:", ERP_CREDENTIALS.username);
console.log(
  "Password:",
  ERP_CREDENTIALS.password
    ? "***" + ERP_CREDENTIALS.password.slice(-3)
    : "NOT SET"
);
console.log("==============================");

// Create axios instance with default config
const erpAxios = axios.create({
  baseURL: ERP_BASE_URL,
  headers: {
    accept: "text/plain",
    "Content-Type": "application/json",
    UserName: ERP_CREDENTIALS.username,
    Password: ERP_CREDENTIALS.password,
  },
  timeout: 30000, // 30 seconds timeout
});

/**
 * Get all organizations list
 * @returns {Promise<Array>} List of organizations
 */
const getOrganizationList = async () => {
  try {
    console.log(
      "Fetching organizations from:",
      ERP_BASE_URL + "/GetOrganizationList"
    );
    console.log("Headers:", {
      accept: "text/plain",
      "Content-Type": "application/json",
      UserName: ERP_CREDENTIALS.username,
      Password: "***" + ERP_CREDENTIALS.password.slice(-3),
    });

    const response = await erpAxios.get("/GetOrganizationList");
    console.log("Organizations response status:", response.status);
    console.log("Organizations response data type:", typeof response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching organization list:", error.message);
    console.error("Error response status:", error.response?.status);
    console.error("Error response data:", error.response?.data);
    throw new Error(`Failed to fetch organization list: ${error.message}`);
  }
};

/**
 * Get cost centers for a specific organization
 * @param {string} organizationID - The organization ID
 * @param {string} costCenterCode - The cost center code (optional)
 * @returns {Promise<Array>} List of cost centers
 */
const getCostCentersForOrganization = async (
  organizationID,
  costCenterCode = ""
) => {
  try {
    // Ensure organizationID is a string
    const orgIdString = String(organizationID);
    const payload = {
      organizationID: orgIdString,
      costCenterCode: costCenterCode || "",
    };

    console.log("Fetching cost centers with payload:", payload);
    const response = await erpAxios.post(
      "/GetCostCentersforOrganizations",
      payload
    );
    console.log("Cost centers response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching cost centers:",
      error.response?.data || error.message
    );
    throw new Error(
      `Failed to fetch cost centers: ${error.response?.data || error.message}`
    );
  }
};

/**
 * Get employee list for given organization and cost center
 * @param {string} organizationID - The organization ID
 * @param {string} costCenterCode - The cost center code
 * @returns {Promise<Array>} List of employees
 */
const getEmployeeList = async (organizationID, costCenterCode) => {
  try {
    // Ensure organizationID is a string
    const orgIdString = String(organizationID);
    const payload = {
      organizationID: orgIdString,
      costCenterCode: costCenterCode || "",
    };

    console.log("Fetching employees with payload:", payload);
    const response = await erpAxios.post("/GetEmployeeList", payload);
    console.log("Employees response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching employee list:",
      error.response?.data || error.message
    );
    throw new Error(
      `Failed to fetch employee list: ${error.response?.data || error.message}`
    );
  }
};

/**
 * Get employee hierarchy details
 * @param {string} organizationID - The organization ID (optional)
 * @param {string} costCenterCode - The cost center code (optional)
 * @param {string} employeeNo - The employee number
 * @returns {Promise<Object>} Employee hierarchy details
 */
const getEmployeeDetailsHierarchy = async (
  organizationID = "string",
  costCenterCode = "string",
  employeeNo
) => {
  try {
    const response = await erpAxios.post("/GetEmployeeDetailsHierarchy", {
      organizationID,
      costCenterCode,
      employeeNo,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching employee hierarchy:", error.message);
    throw new Error(`Failed to fetch employee hierarchy: ${error.message}`);
  }
};

const getEmployeeDetails = async (
  organizationID = "string",
  costCenterCode = "string",
  employeeNo
) => {
  try {
    const response = await erpAxios.post("/GetAllEmployeeDetailsForServiceNo", {
      organizationID,
      costCenterCode,
      employeeNo,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching employee hierarchy:", error.message);
    throw new Error(`Failed to fetch employee hierarchy: ${error.message}`);
  }
};

/**
 * Helper function to compare grade levels
 * Assumes grades are in format: "A.1", "A.2", "A.3", "A.4", etc.
 * Lower number = higher grade (e.g., A.1 > A.2)
 * @param {string} grade1 - First grade to compare
 * @param {string} grade2 - Second grade to compare
 * @returns {number} Negative if grade1 > grade2, positive if grade1 < grade2, 0 if equal
 */
const compareGrades = (grade1, grade2) => {
  if (!grade1 || !grade2) return 0;

  // Extract numeric part after the dot (e.g., "A.1" -> 1)
  const extractGradeLevel = (grade) => {
    const match = grade.match(/[A-Z]\.(\d+)/);
    return match ? parseInt(match[1], 10) : 999; // Default to low priority if parsing fails
  };

  const level1 = extractGradeLevel(grade1);
  const level2 = extractGradeLevel(grade2);

  return level1 - level2; // Lower number = higher grade
};

/**
 * Get executive hierarchy for employee with normalized data
 * This method fetches the employee's hierarchy from ERP and:
 * 1. Identifies the logged-in employee's data and grade
 * 2. Identifies the immediate supervisor
 * 3. Filters to include only executives with HIGHER grades
 * 4. Returns normalized array suitable for frontend dropdown
 * 
 * @param {string} employeeNo - The logged-in employee's service number
 * @returns {Promise<Array>} Normalized array of executives with supervisor flag
 */
const getExecutiveHierarchyForEmployee = async (employeeNo) => {
  try {

    const hierarchyData = await getEmployeeDetailsHierarchy(
      "string", // organizationID - optional
      "string", // costCenterCode - optional
      employeeNo
    );

    if (!hierarchyData) {
      throw new Error("No hierarchy data returned from ERP");
    }

    let executives = [];
    let loggedInEmployeeGrade = null;
    let immediateSupervisorNo = null;

    // Extract the actual data array from the ERP response
    // ERP returns: { success: true, message: "Success", data: [...] }
    let dataArray = hierarchyData;
    if (hierarchyData.success && hierarchyData.data) {
      dataArray = hierarchyData.data;
    }

    // Parse hierarchy response (structure may vary, handle both array and object)
    if (Array.isArray(dataArray)) {
      // If response is an array of hierarchy levels
      dataArray.forEach(emp => {
        if (!emp) return;

        const empNumber = emp.employeeNumber || emp.serviceNo || emp.employeeNo;

        // Identify logged-in employee to get their grade
        if (empNumber === employeeNo) {
          loggedInEmployeeGrade = emp.employeeSalaryGrade || emp.grade || emp.gradeName;
          immediateSupervisorNo = emp.employeeSupervisorNumber || emp.supervisorServiceNo;
        }

        // Add all employees to potential executives list
        if (empNumber && (emp.employeeName || emp.name)) {
          executives.push({
            employeeNo: empNumber,
            title: emp.employeeTitle || "MR.",
            name: emp.employeeName || emp.name ||
              `${emp.employeeFirstName || ''} ${emp.employeeSurname || ''}`.trim(),
            designation: emp.designation || emp.designationName || "Executive",
            grade: emp.employeeSalaryGrade || emp.grade || emp.gradeName,
            email: emp.employeeOfficialEmail || emp.email,
            supervisorNo: emp.employeeSupervisorNumber || emp.supervisorServiceNo,
          });
        }
      });
    } else if (typeof dataArray === 'object') {
      // If response is a single object with employee data
      const empNumber = dataArray.employeeNumber || dataArray.serviceNo || dataArray.employeeNo;

      if (empNumber === employeeNo) {
        loggedInEmployeeGrade = dataArray.employeeSalaryGrade || dataArray.grade || dataArray.gradeName;
        immediateSupervisorNo = dataArray.employeeSupervisorNumber || dataArray.supervisorServiceNo ||
          dataArray.employeeImmEsServiceNo;
      }

      // Add immediate supervisor if available
      if (immediateSupervisorNo && dataArray.supervisorName) {
        executives.push({
          employeeNo: immediateSupervisorNo,
          title: dataArray.supervisorTitle || "MR.",
          name: dataArray.supervisorName,
          designation: dataArray.supervisorDesignation || "Supervisor",
          grade: dataArray.supervisorSalaryGrade || dataArray.supervisorGrade,
          email: dataArray.supervisorEmail,
          supervisorNo: null,
        });
      }
    }

    // Filter executives to include:
    // 1. Only those with HIGHER grades than the logged-in employee
    // 2. Exclude the logged-in employee themselves
    const filteredExecutives = executives
      .filter(exec => {
        // Exclude self
        if (exec.employeeNo === employeeNo) return false;

        // If we have grade info, filter by higher grades only
        if (loggedInEmployeeGrade && exec.grade) {
          // Include only if executive has higher grade (lower numeric value)
          return compareGrades(exec.grade, loggedInEmployeeGrade) < 0;
        }

        // If no grade info, include all (fallback)
        return true;
      })
      .map(exec => ({
        employeeNo: exec.employeeNo,
        title: exec.title,
        name: exec.name,
        designation: exec.designation,
        grade: exec.grade,
        email: exec.email,
        isImmediateSupervisor: exec.employeeNo === immediateSupervisorNo,
      }));

    // Remove duplicates based on employeeNo
    const uniqueExecutives = filteredExecutives.filter(
      (exec, index, self) => index === self.findIndex(e => e.employeeNo === exec.employeeNo)
    );

    // Sort: immediate supervisor first, then by grade (higher grades first)
    uniqueExecutives.sort((a, b) => {
      if (a.isImmediateSupervisor) return -1;
      if (b.isImmediateSupervisor) return 1;
      return compareGrades(a.grade, b.grade);
    });

    return {
      executives: uniqueExecutives,
      loggedInEmployeeGrade,
      immediateSupervisor: uniqueExecutives.find(e => e.isImmediateSupervisor) || null,
    };
  } catch (error) {
    console.error("❌ Error in getExecutiveHierarchyForEmployee:", error.message);
    throw error;
  }
};






module.exports = {
  getOrganizationList,
  getCostCentersForOrganization,
  getEmployeeList,
  getEmployeeDetailsHierarchy,
  getEmployeeDetails,
  getExecutiveHierarchyForEmployee,
};
