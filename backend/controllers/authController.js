const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { getAzureUserData } = require("../utils/azureUserCache");
const {
  generateToken,
  generateAzureToken,
} = require("../middleware/authMiddleware");
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
    console.warn(
      "⚠️ Employee API is unavailable - will attempt local authentication"
    );
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
    console.warn(
      "⚠️ Employee API unavailable, will use local database for authentication"
    );
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

// Validate Azure configuration
if (!process.env.AZURE_CLIENT_SECRET) {
  console.warn(
    "⚠️  AZURE_CLIENT_SECRET is not set - Azure login will not work"
  );
}

// Initialize MSAL ConfidentialClientApplication only when credentials are present
let msalInstance = null;
if (!process.env.AZURE_CLIENT_SECRET) {
  // Already warned above — keep msalInstance null so requiring this module
  // doesn't throw during startup in environments without Azure configured.
  msalInstance = null;
} else {
  try {
    msalInstance = new ConfidentialClientApplication(msalConfig);
  } catch (err) {
    console.error(
      "Failed to initialize MSAL ConfidentialClientApplication:",
      err.message
    );
    msalInstance = null;
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

// Azure AD Login - 100% API-Only (No MongoDB!)
const azureLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Access token is required" });
    }

    // Get user info from Microsoft Graph
    const userInfo = await getUserInfoFromGraph(accessToken);
    console.log("=== AZURE LOGIN - 100% API-ONLY MODE ===");
    console.log("Azure User:", userInfo.displayName);

    // Extract email from Azure
    let azureEmail = userInfo.mail || userInfo.userPrincipalName;

    // Handle external user format (#EXT#)
    if (azureEmail && azureEmail.includes("#EXT#")) {
      const emailPart = azureEmail.split("#EXT#")[0];
      const lastUnderscoreIndex = emailPart.lastIndexOf("_");
      if (lastUnderscoreIndex !== -1) {
        azureEmail =
          emailPart.substring(0, lastUnderscoreIndex) +
          "@" +
          emailPart.substring(lastUnderscoreIndex + 1);
      }
    }
    azureEmail = azureEmail?.toLowerCase();

    // Extract service number from Azure profile
    const employeeServiceNo = userInfo.employeeId;

    if (!employeeServiceNo) {
      console.error("❌ No employee ID in Azure profile");
      return res.status(400).json({
        message:
          "Employee ID not found in Azure profile. Please contact IT support.",
      });
    }

    console.log(`📧 Email: ${azureEmail}`);
    console.log(`🔢 Service No: ${employeeServiceNo}`);

    // === Fetch ALL data from ERP API (No MongoDB!) ===
    try {
      console.log(`🔍 Fetching employee data from ERP...`);

      // Get user data from ERP (this automatically caches it for 5 minutes)
      const userData = await getAzureUserData(employeeServiceNo, true);

      console.log(`✅ ERP Data Retrieved:`);
      console.log(`   Name: ${userData.name}`);
      console.log(`   Role: ${userData.role} (Grade: ${userData.gradeName})`);
      console.log(`   Branch: ${userData.branches[0]}`);

      // === Generate JWT token (Azure-only format, no MongoDB ID!) ===
      const token = generateAzureToken({
        serviceNo: employeeServiceNo,
        azureId: userInfo.id,
        email: azureEmail,
      });

      // === Build response with ERP data only ===
      const responseData = {
        token,
        user: {
          serviceNo: userData.serviceNo,
          azureId: userInfo.id,
          isAzureUser: true,

          // Personal info (from ERP)
          name: userData.name,
          email: userData.email,
          contactNo: userData.contactNo,

          // Job details (from ERP)
          designation: userData.designation,
          section: userData.section,
          group: userData.group,
          division: userData.division,
          organization: userData.organization,

          // Role & Access (auto-assigned from ERP grade)
          role: userData.role,
          gradeName: userData.gradeName,
          branches: userData.branches,
          fingerScanLocation: userData.fingerScanLocation,

          // Additional details (from ERP)
          costCenter: userData.costCenter,
          costCenterName: userData.costCenterName,
          supervisorNumber: userData.supervisorNumber,
          sectionHead: userData.sectionHead,
          divisionHead: userData.divisionHead,
          groupHead: userData.groupHead,
          dateOfBirth: userData.dateOfBirth,
          gender: userData.gender,
          officialAddress: userData.officialAddress,

          // Metadata
          _dataSource: "ERP",
          _noDatabase: true, // No MongoDB record!
          _cachedUntil: new Date(Date.now() + 300000).toISOString(), // 5 min from now
        },
      };

      console.log(`\n🎉 Azure Login Successful - 100% API-Only Mode`);
      console.log(`💾 MongoDB: NOT USED ✅`);
      console.log(`📊 Data Source: ERP API`);
      console.log(`⚡ Cache: 5 minutes\n`);

      res.json(responseData);
    } catch (erpError) {
      console.error("❌ Failed to fetch ERP data:", erpError.message);

      return res.status(500).json({
        message: "Unable to fetch employee data from ERP system",
        error: erpError.message,
        hint: "Please ensure your employee ID is registered in the ERP system",
      });
    }
  } catch (error) {
    console.error("❌ Azure login error:", error);
    res.status(500).json({
      message: "Azure login failed",
      error: error.message,
    });
  }
};

// Get Azure login URL
const getAzureLoginUrl = async (req, res) => {
  try {
    if (!msalInstance) {
      console.error(
        "Azure MSAL is not configured. AZURE_CLIENT_SECRET missing."
      );
      return res
        .status(500)
        .json({ message: "Azure login is not configured on this server" });
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

module.exports = { registerUser, loginUser, azureLogin, getAzureLoginUrl };
