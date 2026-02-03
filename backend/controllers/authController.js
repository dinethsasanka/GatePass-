const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { ConfidentialClientApplication } = require("@azure/msal-node");
const EMPLOYEE_API_BASE_URL = process.env.EMPLOYEE_API_BASE_URL;
let apiToken = null;

const mapApiDataToUser = (apiData) => {
  return {
    // Map API fields to your existing model fieldss
    serviceNo: apiData.EMPLOYEE_NUMBER,
    name: `${apiData.EMPLOYEE_TITLE} ${apiData.EMPLOYEE_FIRST_NAME} ${apiData.EMPLOYEE_SURNAME}`.trim(),
    designation: apiData.EMPLOYEE_DESIGNATION,
    section: apiData.EMPLOYEE_SECTION || apiData.EMPLOYEE_DIVISION,
    group: apiData.EMPLOYEE_GROUP_NAME,
    contactNo: apiData.EMPLOYEE_MOBILE_PHONE || apiData.EMPLOYEE_OFFICE_PHONE,
    email: apiData.EMPLOYEE_OFFICIAL_EMAIL,

    // Store full API data for future reference
    apiData: {
      employeeNumber: apiData.EMPLOYEE_NUMBER,
      employeeTitle: apiData.EMPLOYEE_TITLE,
      employeeFirstName: apiData.EMPLOYEE_FIRST_NAME,
      employeeInitials: apiData.EMPLOYEE_INITIALS,
      employeeSurname: apiData.EMPLOYEE_SURNAME,
      employeeOfficePhone: apiData.EMPLOYEE_OFFICE_PHONE,
      employeeMobilePhone: apiData.EMPLOYEE_MOBILE_PHONE,
      employeeOfficialEmail: apiData.EMPLOYEE_OFFICIAL_EMAIL,
      employeeOfficialAddress: apiData.EMPLOYEE_OFFICIAL_ADDRESS,
      employeeCostCentreCode: apiData.EMPLOYEE_COST_CENTRE_CODE,
      employeeCostCentreName: apiData.EMPLOYEE_COST_CENTRE_NAME,
      employeeSalaryGrade: apiData.EMPLOYEE_SALARY_GRADE,
      employeeGroupName: apiData.EMPLOYEE_GROUP_NAME,
      employeeDivision: apiData.EMPLOYEE_DIVISION,
      employeeSection: apiData.EMPLOYEE_SECTION,
      employeePermanentResiAdd: apiData.EMPLOYEE_PERMANENT_RESI_ADD,
      fingerScanLocation: apiData.FINGER_SCAN_LOCATION,
      employeeImmEsServiceNo: apiData.EMPLOYEE_IMM_ES_SERVICE_NO,
      organizationName: apiData.ORGANIZATION_NAME,
      supervisorName: apiData.SUPERVISOR_NAME,
      supervisorSalaryGrade: apiData.SUPERVISOR_SALARY_GRADE,
      activeAssignmentStatus: apiData.ACTIVE_ASSIGNMENT_STATUS,
      nicNumber: apiData.NIC_NUMBER,
      employeeDob: apiData.EMPLOYEE_DOB,
      orgId: apiData.ORG_ID,
      empSecId: apiData.EMP_SEC_ID,
      empSecHeadNo: apiData.EMP_SEC_HEAD_NO,
      empDivId: apiData.EMP_DIV_ID,
      empDivHeadNo: apiData.EMP_DIV_HEAD_NO,
      empGrpId: apiData.EMP_GRP_ID,
      empGrpHeadNo: apiData.EMP_GRP_HEAD_NO,
      empPersonType: apiData.EMP_PERSON_TYPE,
      gender: apiData.GENDER,
      leaveAgent: apiData.LEAVE_AGENT,
      leavingReason: apiData.LEAVING_REASON,
      leavingDate: apiData.LEAVING_DATE,
      personId: apiData.PERSON_ID,
      currentAssignmentStart: apiData.CURRENT_ASSIGNMENT_START,
      payroll: apiData.PAYROLL,
    },
  };
};

const authenticateWithEmployeeAPI = async (
  username = process.env.EMPLOYEE_API_USERNAME,
  password = process.env.EMPLOYEE_API_PASSWORD
) => {
  try {
    const response = await axios.post(
      `${EMPLOYEE_API_BASE_URL}/common/authenticate`,
      {
        username,
        password,
      }
    );

    if (response.data.isSuccess) {
      apiToken = response.data.dataBundle.token;
      return {
        success: true,
        token: apiToken,
        user: response.data.dataBundle.user,
        expiresIn: response.data.dataBundle.expiresIn,
      };
    }
    throw new Error("API authentication failed");
  } catch (error) {
    console.error("Employee API authentication error:", error);
    console.warn("⚠️ Employee API is unavailable - will attempt local authentication");
    return {
      success: false,
      error: error.message,
    };
  }
};

const getEmployeeFromAPI = async (employeeNumber) => {
  try {
    if (!apiToken) {
      await authenticateWithEmployeeAPI();
    }

    const response = await axios.get(
      `${EMPLOYEE_API_BASE_URL}/employees/GetEmployeeDetails`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        params: {
          queryParameter: "EMPLOYEE_NUMBER",
          queryValue: employeeNumber,
        },
      }
    );

    if (response.data.isSuccess && response.data.dataBundle.length > 0) {
      return response.data.dataBundle[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching employee data:", error);
    // If token expired, try to re-authenticate
    if (error.response && error.response.status === 401) {
      try {
        await authenticateWithEmployeeAPI();
        const retryResponse = await axios.get(
          `${EMPLOYEE_API_BASE_URL}/employees/GetEmployeeDetails`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
            params: {
              queryParameter: "EMPLOYEE_NUMBER",
              queryValue: employeeNumber,
            },
          }
        );

        if (
          retryResponse.data.isSuccess &&
          retryResponse.data.dataBundle.length > 0
        ) {
          return retryResponse.data.dataBundle[0];
        }
      } catch (retryError) {
        console.error("Retry failed:", retryError);
      }
    }
    console.warn("⚠️ Employee API unavailable, will use local database for authentication");
    return null;
  }
};

// Azure AD configuration
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    // Use 'common' to allow personal Microsoft accounts and work/school accounts
    authority: `https://login.microsoftonline.com/common`,
  },
};

// Validate Azure configuration and create MSAL instance only if credentials are available
let msalInstance = null;

if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET) {
  console.warn(
    "⚠️  AZURE_CLIENT_ID or AZURE_CLIENT_SECRET is not set - Azure login will not work"
  );
} else {
  try {
    msalInstance = new ConfidentialClientApplication(msalConfig);
    console.log("✅ Azure MSAL instance initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Azure MSAL instance:", error.message);
  }
}

const registerUser = async (req, res) => {
  try {
    const {
      userType,
      userId,
      password,
      serviceNo,
      name,
      designation,
      section,
      group,
      contactNo,
      role,
      email,
    } = req.body;

    const userExists = await User.findOne({ userId });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      userType,
      userId,
      password: hashedPassword,
      serviceNo,
      name,
      designation,
      section,
      group,
      contactNo,
      role,
      email,
    });

    res.status(201).json({
      _id: user.id,
      userType: user.userType,
      userId: user.userId,
      serviceNo: user.serviceNo,
      name: user.name,
      designation: user.designation,
      section: user.section,
      group: user.group,
      contactNo: user.contactNo,
      role: user.role,
      email: user.email,
      token: generateToken(user.id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// Updated Login User Function with Employee API fallback

const loginUser = async (req, res) => {
  try {
    const { userId, password, userType } = req.body;

    console.log("Login attempt:", { userId, userType, password });

    // First, try to find user in local database
    let user = await User.findOne({ userId, userType });

    if (user) {
      // User exists in local database - verify password
      if (!(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Optionally sync with API data on login for existing users
      if (user.serviceNo && user.serviceNo !== "API_USER") {
        const employeeData = await getEmployeeFromAPI(user.serviceNo);
        if (employeeData) {
          const mappedData = mapApiDataToUser(employeeData);

          // Update user with latest API data
          user.name = mappedData.name;
          user.designation = mappedData.designation;
          user.section = mappedData.section;
          user.group = mappedData.group;
          user.contactNo = mappedData.contactNo;
          user.email = mappedData.email;
          user.apiData = mappedData.apiData;

          await user.save();
        }
      }

      // Return successful login response
      return res.json({
        _id: user.id,
        userType: user.userType,
        userId: user.userId,
        serviceNo: user.serviceNo,
        name: user.name,
        designation: user.designation,
        section: user.section,
        group: user.group,
        contactNo: user.contactNo,
        role: user.role,
        branches: user.branches,
        email: user.email,
        token: generateToken(user.id),
      });
    }

    // User not found in local database - try Employee API authentication
    console.log(
      "User not found in local database, trying Employee API authentication..."
    );

    // Authenticate with Employee API using provided credentials
    const authResult = await authenticateWithEmployeeAPI(userId, password);

    if (!authResult.success) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Try to get employee details from API using userId as employee number
    let employeeData = await getEmployeeFromAPI("12345");

    // If not found by userId, try to search by email
    if (!employeeData) {
      // You might need to implement a search by email function
      // For now, we'll create a basic user with API auth info
      employeeData = null;
    }

    let mappedData;
    if (employeeData) {
      // Map full employee data
      mappedData = mapApiDataToUser(employeeData);
    } else {
      // Create minimal user data from API auth response
      mappedData = {
        serviceNo: userId, // Use userId as serviceNo if no employee data found
        name: authResult.user.username || userId,
        designation: authResult.user.role || "API User",
        section: "API",
        group: "API Users",
        contactNo: "N/A",
        email: `${userId}@slt.com.lk`,
        apiData: {
          employeeNumber: userId,
          employeeFirstName: authResult.user.username || userId,
          employeeSurname: "",
          employeeOfficialEmail: `${userId}@slt.com.lk`,
          employeeDesignation: authResult.user.role || "API User",
          activeAssignmentStatus: "Active Assignment",
        },
      };
    }

    // Hash a temporary password (user authenticated via API)
    const tempPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create new user with API authentication
    user = await User.create({
      userType: userType || "SLT",
      userId: userId,
      password: hashedPassword, // Temporary password since they use API auth
      role: authResult.user.role === "admin" ? "Admin" : "User",
      isApiUser: true,
      ...mappedData,
    });

    console.log("New user created from Employee API authentication");

    // Return successful login response
    res.json({
      _id: user.id,
      userType: user.userType,
      userId: user.userId,
      serviceNo: user.serviceNo,
      name: user.name,
      designation: user.designation,
      section: user.section,
      group: user.group,
      contactNo: user.contactNo,
      role: user.role,
      branches: user.branches,
      email: user.email,
      isApiUser: true,
      apiToken: authResult.token,
      apiTokenExpiresIn: authResult.expiresIn,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============================================================================
// AZURE LOGIN HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts and normalizes email from Azure user info
 * Handles external user format: email_domain.com#EXT#@tenant.onmicrosoft.com
 * @param {Object} userInfo - Azure user info from Microsoft Graph
 * @returns {string} Normalized email address
 */
const extractAzureEmail = (userInfo) => {
  let azureEmail = userInfo.mail || userInfo.userPrincipalName;

  // Handle Azure B2B external user format
  if (azureEmail && azureEmail.includes('#EXT#')) {
    const emailPart = azureEmail.split('#EXT#')[0];
    const lastUnderscoreIndex = emailPart.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      azureEmail = emailPart.substring(0, lastUnderscoreIndex) + '@' + 
                   emailPart.substring(lastUnderscoreIndex + 1);
    }
  }

  return azureEmail?.toLowerCase();
};

/**
 * Extracts service number from Azure user info
 * Priority: employeeId → userPrincipalName (e.g., 020262@intranet.slt.com.lk)
 * @param {Object} userInfo - Azure user info
 * @returns {string|null} Service number or null
 */
const extractServiceNumber = (userInfo) => {
  // Try employeeId first
  if (userInfo.employeeId) {
    return userInfo.employeeId;
  }

  // Extract from userPrincipalName (format: 020262@intranet.slt.com.lk)
  if (userInfo.userPrincipalName) {
    const match = userInfo.userPrincipalName.match(/^(\d+)@/);
    if (match) {
      return match[1];
    }
  }

  return null;
};

/**
 * Fetches employee data from ERP API
 * @param {string} serviceNo - Employee service number
 * @returns {Promise<Object|null>} ERP data or null if fetch fails
 */
const fetchERPData = async (serviceNo) => {
  if (!serviceNo) {
    return null;
  }

  try {
    const { getAzureUserData } = require('../utils/azureUserCache');
    const erpData = await getAzureUserData(serviceNo, true);
    return erpData;
  } catch (error) {
    console.error(`ERP fetch failed for ${serviceNo}:`, error.message);
    return null;
  }
};

/**
 * Builds user data object for MongoDB based on available data sources
 * Priority: ERP data → Azure AD data → Defaults
 * @param {Object} params - Parameters object
 * @param {Object} params.userInfo - Azure user info
 * @param {string} params.azureEmail - Normalized email
 * @param {Object|null} params.erpData - ERP data (optional)
 * @param {string} params.hashedPassword - Hashed password
 * @returns {Object} User data object for MongoDB
 */
const buildUserData = ({ userInfo, azureEmail, erpData, hashedPassword }) => {
  const baseData = {
    userType: "SLT",
    userId: userInfo.userPrincipalName,
    password: hashedPassword,
    email: azureEmail,
    azureId: userInfo.id,
    isAzureUser: true,
    lastAzureSync: new Date(),
  };

  if (erpData) {
    // Use ERP data (comprehensive employee details)
    console.log('📊 Building user data from ERP');
    return {
      ...baseData,
      name: erpData.name,
      serviceNo: erpData.serviceNo,
      designation: erpData.designation,
      section: erpData.section || "N/A",
      group: erpData.group || "N/A",
      contactNo: erpData.contactNo || "N/A",
      gradeName: erpData.gradeName || "N/A",
      fingerScanLocation: erpData.fingerScanLocation,
      branches: erpData.branches || ["SLT HQ"],
      role: erpData.role || "User",
    };
  } else {
    // Fall back to Azure AD data (limited info)
    console.log('📊 Building user data from Azure AD (no ERP data available)');
    return {
      ...baseData,
      name: userInfo.displayName || "Azure User",
      serviceNo: userInfo.employeeId || "N/A",
      designation: userInfo.jobTitle || "N/A",
      section: userInfo.department || "N/A",
      group: userInfo.companyName || "N/A",
      contactNo: userInfo.mobilePhone || userInfo.businessPhones?.[0] || "N/A",
      gradeName: "N/A",
      role: "User",
    };
  }
};

/**
 * Finds existing user in database using multiple lookup strategies
 * Priority: email → azureId → userId (userPrincipalName)
 * @param {Object} params - Search parameters
 * @param {string} params.azureEmail - Normalized email
 * @param {string} params.azureId - Azure AD user ID
 * @param {string} params.userPrincipalName - Azure UPN
 * @returns {Promise<Object|null>} User document or null
 */
const findExistingUser = async ({ azureEmail, azureId, userPrincipalName }) => {
  console.log('🔍 Searching for existing user...');

  // PRIORITY 1: Email (case-insensitive)
  const emailRegex = new RegExp(`^${azureEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  let user = await User.findOne({ email: { $regex: emailRegex } });
  
  if (user) {
    console.log(`✅ Found user by email: ${user.userId}`);
    return user;
  }

  // PRIORITY 2: Azure ID
  if (azureId) {
    user = await User.findOne({ azureId });
    if (user) {
      console.log(`✅ Found user by Azure ID: ${user.userId}`);
      return user;
    }
  }

  // PRIORITY 3: User Principal Name
  if (userPrincipalName) {
    user = await User.findOne({ userId: userPrincipalName });
    if (user) {
      console.log(`✅ Found user by userPrincipalName: ${user.userId}`);
      return user;
    }
  }

  console.log('ℹ️ No existing user found');
  return null;
};

/**
 * Updates existing user with latest data from ERP/Azure
 * @param {Object} user - Mongoose user document
 * @param {Object} params - Update parameters
 * @param {Object|null} params.erpData - ERP data (optional)
 * @param {Object} params.userInfo - Azure user info
 * @param {string} params.azureEmail - Normalized email
 * @returns {Promise<Object>} Updated user document
 */
const updateExistingUser = async (user, { erpData, userInfo, azureEmail }) => {
  // Handle duplicate Azure ID edge case
  if (user.azureId !== userInfo.id) {
    const duplicateUser = await User.findOne({ azureId: userInfo.id });
    if (duplicateUser && duplicateUser._id.toString() !== user._id.toString()) {
      await User.deleteOne({ _id: duplicateUser._id });
    }
  }

  // Update with ERP data if available
  if (erpData) {
    user.name = erpData.name;
    user.serviceNo = erpData.serviceNo;
    user.designation = erpData.designation;
    user.section = erpData.section || user.section;
    user.group = erpData.group || user.group;
    user.contactNo = erpData.contactNo || user.contactNo;
    user.gradeName = erpData.gradeName || user.gradeName;
    user.fingerScanLocation = erpData.fingerScanLocation || user.fingerScanLocation;
    user.branches = erpData.branches || user.branches;
    user.role = erpData.role || user.role;
  } else {
    // Fall back to Azure AD data
    if (userInfo.displayName) user.name = userInfo.displayName;
    if (userInfo.jobTitle) user.designation = userInfo.jobTitle;
    if (userInfo.department) user.section = userInfo.department;
    if (userInfo.companyName) user.group = userInfo.companyName;
    if (userInfo.mobilePhone || userInfo.businessPhones?.[0]) {
      user.contactNo = userInfo.mobilePhone || userInfo.businessPhones?.[0];
    }
  }

  // Always update these fields
  user.email = azureEmail;
  user.azureId = userInfo.id;
  user.isAzureUser = true;
  user.lastAzureSync = new Date();

  await user.save();
  
  return user;
};

// ============================================================================
// MAIN AZURE LOGIN CONTROLLER
// ============================================================================

/**
 * Azure AD Login - Database-Free Implementation
 * Flow:
 * 1. Validate access token
 * 2. Get user info from Microsoft Graph
 * 3. Extract service number
 * 4. Fetch employee data from ERP (cached)
 * 5. Return JWT token + user data (NO MongoDB operations)
 */
const azureLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    // Step 1: Validate access token
    if (!accessToken) {
      return res.status(400).json({ message: "Access token is required" });
    }

    // Step 2: Get user info from Microsoft Graph
    const userInfo = await getUserInfoFromGraph(accessToken);

    // Step 3: Extract and normalize data
    const azureEmail = extractAzureEmail(userInfo);
    const serviceNo = extractServiceNumber(userInfo);

    // Step 4: Fetch ERP data (REQUIRED for Azure users)
    if (!serviceNo) {
      return res.status(400).json({ 
        message: "Service number not found in Azure profile" 
      });
    }

    const erpData = await fetchERPData(serviceNo);
    
    if (!erpData) {
      return res.status(404).json({ 
        message: "Employee not found in ERP system",
        serviceNo 
      });
    }

    // Step 5: Build user data from ERP (No MongoDB involved!)
    const userData = {
      _id: userInfo.id,                           // Use Azure ID (not MongoDB ID)
      userType: "SLT",
      userId: userInfo.userPrincipalName,
      email: azureEmail,
      serviceNo: erpData.serviceNo,
      name: erpData.name,
      designation: erpData.designation,
      section: erpData.section || "N/A",
      group: erpData.group || "N/A",
      contactNo: erpData.contactNo || "N/A",
      gradeName: erpData.gradeName || "N/A",
      fingerScanLocation: erpData.fingerScanLocation,
      branches: erpData.branches || ["SLT HQ"],
      role: erpData.role || "User",
      isAzureUser: true,
      hasERPData: true
    };

    // Step 6: Generate JWT using Azure ID (not MongoDB ID)
    const token = generateAzureToken(userInfo.id, userData);

    // Step 7: Return response
    res.json({
      ...userData,
      token
    });

  } catch (error) {
    console.error('Azure login error:', error.message);
    res.status(500).json({ 
      message: "Azure authentication failed", 
      error: error.message 
    });
  }
};


// Get Azure login URL
const getAzureLoginUrl = async (req, res) => {
  try {
    if (!msalInstance) {
      return res.status(503).json({ 
        message: "Azure AD is not configured on this server. Please contact the administrator or use local authentication." 
      });
    }

    const authCodeUrlParameters = {
      scopes: ["https://graph.microsoft.com/User.Read"],
      redirectUri: process.env.AZURE_REDIRECT_URI,
    };

    const authUrl = await msalInstance.getAuthCodeUrl(authCodeUrlParameters);
    res.json({ authUrl });
  } catch (error) {
    console.error("Error generating Azure login URL:", error);
    res.status(500).json({ message: "Failed to generate login URL" });
  }
};

// Helper function to get user info from Microsoft Graph
const getUserInfoFromGraph = async (accessToken) => {
  try {
    const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching user info from Graph:", error);
    throw new Error("Failed to fetch user information from Microsoft Graph");
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

/**
 * Generate JWT token for Azure users (database-free)
 * Uses Azure ID instead of MongoDB ID
 */
const generateAzureToken = (azureId, userData) => {
  return jwt.sign(
    {
      id: azureId,                    // Azure AD user ID
      isAzureUser: true,              // Flag to identify Azure tokens
      serviceNo: userData.serviceNo,  // For cache lookups
      role: userData.role,            // User role
      email: userData.email           // User email
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

module.exports = { registerUser, loginUser, azureLogin, getAzureLoginUrl };
