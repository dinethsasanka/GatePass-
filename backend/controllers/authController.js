const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { ConfidentialClientApplication } = require("@azure/msal-node");
const EMPLOYEE_API_BASE_URL =
  "https://employee-api-without-category-production.up.railway.app/api";
let apiToken = null;

const mapApiDataToUser = (apiData) => {
  return {
    // Map API fields to your existing model fields
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
  username = "admin",
  password = "password"
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
    clientId:
      process.env.AZURE_CLIENT_ID || "fb3e75a7-554f-41f8-9da3-2b162c255349",
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    // Use 'common' to allow personal Microsoft accounts and work/school accounts
    authority: `https://login.microsoftonline.com/common`,
  },
};

// Validate Azure configuration and create MSAL instance only if credentials are available
let msalInstance = null;

if (!process.env.AZURE_CLIENT_SECRET) {
  console.warn(
    "⚠️  AZURE_CLIENT_SECRET is not set - Azure login will not work"
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

// const loginUser = async (req, res) => {
//     try {
//         const { userId, password, userType } = req.body;
//         const user = await User.findOne({ userId, userType });
//         console.log(user);

//         if (user && (await bcrypt.compare(password, user.password))) {
//             res.json({
//                 _id: user.id,
//                 userType: user.userType,
//                 userId: user.userId,
//                 serviceNo: user.serviceNo,
//                 name: user.name,
//                 designation: user.designation,
//                 section: user.section,
//                 group: user.group,
//                 contactNo: user.contactNo,
//                 role: user.role,
//                 branches: user.branches,
//                 email: user.email,
//                 token: generateToken(user.id)
//             });
//         } else {
//             res.status(401).json({ message: 'Invalid credentials' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// };

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

// Azure AD Login - With ERP Enrichment
const azureLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Access token is required" });
    }

    // Get user info from Microsoft Graph using the access token
    const userInfo = await getUserInfoFromGraph(accessToken);
    console.log("=== AZURE LOGIN DEBUG ===");
    console.log("Azure user info from Graph:", JSON.stringify(userInfo, null, 2));

    // Extract email from Azure response
    // Handle external user format: "email_domain.com#EXT#@tenant.onmicrosoft.com"
    let azureEmail = userInfo.mail || userInfo.userPrincipalName;

    // Convert Azure external user format to actual email
    // Example: yasaslakmina21_outlook.com#EXT#@... -> yasaslakmina21@outlook.com
    if (azureEmail && azureEmail.includes('#EXT#')) {
      const emailPart = azureEmail.split('#EXT#')[0];
      // Replace last underscore with @ to get actual email
      const lastUnderscoreIndex = emailPart.lastIndexOf('_');
      if (lastUnderscoreIndex !== -1) {
        azureEmail = emailPart.substring(0, lastUnderscoreIndex) + '@' + emailPart.substring(lastUnderscoreIndex + 1);
      }
    }

    azureEmail = azureEmail?.toLowerCase();

    console.log("Extracted email:", azureEmail);
    console.log("Original userPrincipalName:", userInfo.userPrincipalName);
    console.log("Employee ID from Azure:", userInfo.employeeId);

    // Extract service number from userPrincipalName if employeeId not available
    // Format: 020262@intranet.slt.com.lk -> 020262
    let serviceNo = userInfo.employeeId;
    if (!serviceNo && userInfo.userPrincipalName) {
      const match = userInfo.userPrincipalName.match(/^(\d+)@/);
      if (match) {
        serviceNo = match[1];
        console.log(`📋 Extracted service number from userPrincipalName: ${serviceNo}`);
      }
    }

    // Try to get ERP data if serviceNo is available
    let erpData = null;
    if (serviceNo) {
      try {
        const { getAzureUserData } = require('../utils/azureUserCache');
        console.log(`🔍 Fetching ERP data for employee: ${serviceNo}`);
        erpData = await getAzureUserData(serviceNo, true);
        console.log("✅ ERP data retrieved successfully");
      } catch (erpError) {
        console.warn(`⚠️ Could not fetch ERP data: ${erpError.message}`);
        // Continue without ERP data - will use Azure info only
      }
    }

    // Debug: Check all users with similar emails
    const allUsers = await User.find({});
    console.log("All users in database:", allUsers.map(u => ({ userId: u.userId, email: u.email })));

    // PRIORITY 1: Try to find user by email first (case-insensitive)
    let user = await User.findOne({
      email: { $regex: new RegExp(`^${azureEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    console.log("Email search result:", user ? `Found: ${user.userId}` : "Not found");

    // PRIORITY 2: If not found by email, try by azureId
    if (!user && userInfo.id) {
      user = await User.findOne({ azureId: userInfo.id });
    }

    // PRIORITY 3: If still not found, try by userId
    if (!user && userInfo.userPrincipalName) {
      user = await User.findOne({ userId: userInfo.userPrincipalName });
    }

    console.log("Azure user lookup result:", {
      azureId: userInfo.id,
      email: azureEmail,
      userPrincipalName: userInfo.userPrincipalName,
      foundUser: user ? `${user.userId} (${user.email})` : "not found",
      hasERPData: !!erpData
    });

    if (!user) {
      console.log("No existing user found - creating new user");

      // Generate a temporary password for Azure users (they won't use it)
      const tempPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      // Use ERP data if available, otherwise fall back to Azure AD data
      const userData = erpData ? {
        userType: "SLT",
        userId: userInfo.userPrincipalName,
        password: hashedPassword,
        email: azureEmail,
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
        azureId: userInfo.id,
        isAzureUser: true,
        lastAzureSync: new Date(),
      } : {
        userType: "SLT",
        userId: userInfo.userPrincipalName,
        password: hashedPassword,
        email: azureEmail,
        name: userInfo.displayName || "Azure User",
        serviceNo: userInfo.employeeId || "N/A",
        designation: userInfo.jobTitle || "N/A",
        section: userInfo.department || "N/A",
        group: userInfo.companyName || "N/A",
        contactNo: userInfo.mobilePhone || userInfo.businessPhones?.[0] || "N/A",
        gradeName: "N/A",
        role: "User",
        azureId: userInfo.id,
        isAzureUser: true,
        lastAzureSync: new Date(),
      };

      // Create new user from ERP/Azure data
      user = await User.create(userData);

      console.log("New user created:", user.userId, "with ERP data:", !!erpData);
    } else {
      console.log("Existing user found - updating with ERP data");

      // Check if another user has this azureId
      if (user.azureId !== userInfo.id) {
        const existingAzureUser = await User.findOne({ azureId: userInfo.id });
        if (existingAzureUser && existingAzureUser._id.toString() !== user._id.toString()) {
          console.log("Removing duplicate Azure user:", existingAzureUser.userId);
          await User.deleteOne({ _id: existingAzureUser._id });
        }
      }

      // Update user with ERP data if available, otherwise use Azure data
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
        console.log("✅ Updated user with ERP data");
      } else {
        // Fall back to Azure AD data
        if (userInfo.displayName) user.name = userInfo.displayName;
        if (userInfo.jobTitle) user.designation = userInfo.jobTitle;
        if (userInfo.department) user.section = userInfo.department;
        if (userInfo.companyName) user.group = userInfo.companyName;
        if (userInfo.mobilePhone || userInfo.businessPhones?.[0]) {
          user.contactNo = userInfo.mobilePhone || userInfo.businessPhones?.[0];
        }
        console.log("⚠️ Updated user with Azure AD data only (no ERP data)");
      }

      // Always update these fields
      user.email = azureEmail;
      user.azureId = userInfo.id;
      user.isAzureUser = true;
      user.lastAzureSync = new Date();

      await user.save();
      console.log("User updated:", user.userId);
    }

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
      gradeName: user.gradeName,
      isAzureUser: true,
      hasERPData: !!erpData,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error("Azure login error:", error);
    res
      .status(500)
      .json({ message: "Azure authentication failed", error: error.message });
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
      redirectUri:
        process.env.AZURE_REDIRECT_URI || "http://localhost:5173/callback",
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

module.exports = { registerUser, loginUser, azureLogin, getAzureLoginUrl };
