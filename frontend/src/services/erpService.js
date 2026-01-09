import axios from "./axiosConfig";

/**
 * Get all organizations from ERP system
 * @returns {Promise} Promise resolving to organizations list
 */
export const getOrganizations = async () => {
  try {
    const response = await axios.get("/erp/organizations");
    return response.data;
  } catch (error) {
    console.error("Error fetching organizations:", error);
    throw error.response?.data || error;
  }
};

/**
 * Get cost centers for a specific organization
 * @param {string} organizationID - The organization ID
 * @param {string} costCenterCode - The cost center code (optional)
 * @returns {Promise} Promise resolving to cost centers list
 */
export const getCostCenters = async (organizationID, costCenterCode = "") => {
  try {
    // Ensure organizationID is sent as a string
    const payload = {
      organizationID: String(organizationID),
      costCenterCode: costCenterCode || "",
    };
    console.log("getCostCenters payload:", payload);
    const response = await axios.post("/erp/cost-centers", payload);
    return response.data;
  } catch (error) {
    console.error("Error fetching cost centers:", error);
    throw error.response?.data || error;
  }
};

/**
 * Get employee list for given organization and cost center
 * @param {string} organizationID - The organization ID
 * @param {string} costCenterCode - The cost center code
 * @returns {Promise} Promise resolving to employees list
 */
export const getEmployees = async (organizationID, costCenterCode) => {
  try {
    // Ensure organizationID is sent as a string
    const payload = {
      organizationID: String(organizationID),
      costCenterCode: costCenterCode || "",
    };
    console.log("getEmployees payload:", payload);
    const response = await axios.post("/erp/employees", payload);
    return response.data;
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw error.response?.data || error;
  }
};

/**
 * Get employee hierarchy details
 * @param {string} employeeNo - The employee number
 * @param {string} organizationID - The organization ID (optional)
 * @param {string} costCenterCode - The cost center code (optional)
 * @returns {Promise} Promise resolving to employee hierarchy
 */
export const getEmployeeHierarchy = async (
  employeeNo,
  organizationID = "",
  costCenterCode = ""
) => {
  try {
    const response = await axios.post("/erp/employee-hierarchy", {
      employeeNo,
      organizationID: organizationID || "string",
      costCenterCode: costCenterCode || "string",
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching employee hierarchy:", error);
    throw error.response?.data || error;
  }
};

export const getEmployeeDetails = async (
  employeeNo,
  organizationID = "",
  costCenterCode = ""
) => {
  try {
    const response = await axios.post("/erp/employee-details", {
      employeeNo,
      organizationID: organizationID || "string",
      costCenterCode: costCenterCode || "string",
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching employee hierarchy:", error);
    throw error.response?.data || error;
  }
};
export default {
  getOrganizations,
  getCostCenters,
  getEmployees,
  getEmployeeHierarchy,
  getEmployeeDetails,
};
