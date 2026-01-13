const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { getAzureUserData } = require('../utils/azureUserCache');
const { generateToken, generateAzureToken } = require('../middleware/authMiddleware');
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

// Validate Azure configuration
if (!process.env.AZURE_CLIENT_SECRET) {
  console.warn(
    "⚠️  AZURE_CLIENT_SECRET is not set - Azure login will not work"
  );
}

const msalInstance = new ConfidentialClientApplication(msalConfig);

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
    console.log("=== AZURE LOGIN WITH ERP API ===" );
    console.log("Azure user info:", JSON.stringify(userInfo, null, 2));

    // Import ERP service and role assignment
    const erpService = require('../services/erpService');
    const { getRoleByGrade } = require('../utils/roleAssignment');

    // Extract email from Azure
    let azureEmail = userInfo.mail || userInfo.userPrincipalName;
    
    // Handle external user format
    if (azureEmail && azureEmail.includes('#EXT#')) {
      const emailPart = azureEmail.split('#EXT#')[0];
      const lastUnderscoreIndex = emailPart.lastIndexOf('_');
      if (lastUnderscoreIndex !== -1) {
        azureEmail = emailPart.substring(0, lastUnderscoreIndex) + '@' + emailPart.substring(lastUnderscoreIndex + 1);
      }
    }
    azureEmail = azureEmail?.toLowerCase();

    console.log("Processed email:", azureEmail);
    console.log("Employee ID from Azure:", userInfo.employeeId);

    // === STEP 1: Fetch employee details from ERP API ===
    let erpEmployeeData = null;
    let employeeServiceNo = userInfo.employeeId || null;
    let assignedRole = 'User'; // Default role
    let branches = [];
    
    // Try to fetch from ERP if we have employee ID
    if (employeeServiceNo) {
      try {
        console.log(`🔍 Fetching employee details from ERP for: ${employeeServiceNo}`);
        
        erpEmployeeData = await erpService.getEmployeeDetails(
          "string", 
          "string", 
          employeeServiceNo
        );

        if (erpEmployeeData) {
          console.log("✅ ERP data retrieved successfully");
          console.log("ERP Employee Data:", JSON.stringify(erpEmployeeData, null, 2));
          
          // Extract salary grade for role assignment
          const salaryGrade = erpEmployeeData.employeeSalaryGrade || 
                             erpEmployeeData.EMPLOYEE_SALARY_GRADE ||
                             erpEmployeeData.salaryGrade;

          if (salaryGrade) {
            assignedRole = getRoleByGrade(salaryGrade);
            console.log(`🎯 Role assigned: ${assignedRole} (Grade: ${salaryGrade})`);
          } else {
            console.warn("⚠️ No salary grade found in ERP data");
          }

          // Extract branch/location
          const fingerScanLocation = erpEmployeeData.fingerScanLocation || 
                                    erpEmployeeData.FINGER_SCAN_LOCATION;
          if (fingerScanLocation) {
            branches = [fingerScanLocation];
            console.log(`📍 Branch assigned: ${fingerScanLocation}`);
          }
        } else {
          console.warn("⚠️ No ERP data returned for employee");
        }
      } catch (erpError) {
        console.error("❌ Error fetching from ERP:", erpError.message);
        console.log("Continuing with default role and Azure data");
      }
    } else {
      console.warn("⚠️ No employee ID provided by Azure, cannot fetch from ERP");
    }

    // === STEP 2: Check if minimal user record exists (for app-specific settings) ===
    let user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${azureEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { azureId: userInfo.id },
        { userId: userInfo.userPrincipalName }
      ]
    });

    if (user) {
      console.log(`👤 Found existing user record: ${user.userId}`);
      
      // Update Azure sync info only
      user.azureId = userInfo.id;
      user.isAzureUser = true;
      user.lastAzureSync = new Date();
      
      // If user doesn't have a role yet, assign based on ERP data
      if (!user.role || user.role === 'User') {
        user.role = assignedRole;
        console.log(`🔄 Updated role to: ${assignedRole}`);
      }
      
      // Update branches if not set
      if ((!user.branches || user.branches.length === 0) && branches.length > 0) {
        user.branches = branches;
        console.log(`🔄 Updated branches: ${branches.join(', ')}`);
      }

      await user.save();
    } else {
      console.log("🆕 Creating minimal user record for app-specific settings");
      
      // Create minimal user record - only store app-specific data
      const tempPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      user = await User.create({
        userType: "SLT",
        userId: userInfo.userPrincipalName,
        password: hashedPassword, // Required field but won't be used
        email: azureEmail,
        name: userInfo.displayName || "Azure User",
        serviceNo: employeeServiceNo || "N/A",
        designation: "N/A", // Will come from ERP
        section: "N/A",
        group: "N/A",
        contactNo: userInfo.mobilePhone || "N/A",
        gradeName: "N/A",
        role: assignedRole, // Auto-assigned from ERP grade
        branches: branches,
        azureId: userInfo.id,
        isAzureUser: true,
        lastAzureSync: new Date(),
      });

      console.log(`✨ Created user with role: ${assignedRole}`);
    }

    // === STEP 3: Build response with ERP data (API-first approach) ===
    const responseData = {
      _id: user.id,
      userType: user.userType,
      userId: user.userId,
      email: azureEmail,
      role: user.role, // From app database
      branches: user.branches, // From app database
      isAzureUser: true,
      token: generateToken(user.id),
    };

    // Add ERP data if available (real-time, not stored in DB)
    if (erpEmployeeData) {
      responseData.serviceNo = erpEmployeeData.employeeNumber || erpEmployeeData.EMPLOYEE_NUMBER || employeeServiceNo;
      responseData.name = `${erpEmployeeData.employeeTitle || ''} ${erpEmployeeData.employeeFirstName || ''} ${erpEmployeeData.employeeSurname || ''}`.trim() || 
                          erpEmployeeData.employeeName || 
                          userInfo.displayName;
      responseData.designation = erpEmployeeData.employeeTitle || erpEmployeeData.EMPLOYEE_DESIGNATION || "N/A";
      responseData.section = erpEmployeeData.employeeSection || erpEmployeeData.EMPLOYEE_SECTION || "N/A";
      responseData.group = erpEmployeeData.employeeGroupName || erpEmployeeData.EMPLOYEE_GROUP_NAME || "N/A";
      responseData.contactNo = erpEmployeeData.employeeMobilePhone || erpEmployeeData.EMPLOYEE_MOBILE_PHONE || 
                              erpEmployeeData.employeeOfficePhone || "N/A";
      responseData.gradeName = erpEmployeeData.employeeSalaryGrade || erpEmployeeData.EMPLOYEE_SALARY_GRADE || "N/A";
      responseData.fingerScanLocation = erpEmployeeData.fingerScanLocation || erpEmployeeData.FINGER_SCAN_LOCATION;
      responseData.dataSource = "ERP API";
    } else {
      // Fallback to Azure data
      responseData.serviceNo = employeeServiceNo || "N/A";
      responseData.name = userInfo.displayName || "Azure User";
      responseData.designation = userInfo.jobTitle || "N/A";
      responseData.section = userInfo.department || "N/A";
      responseData.group = userInfo.companyName || "N/A";
      responseData.contactNo = userInfo.mobilePhone || userInfo.businessPhones?.[0] || "N/A";
      responseData.gradeName = "N/A";
      responseData.dataSource = "Azure AD";
    }

    console.log("=== LOGIN SUCCESSFUL ===");
    console.log(`User: ${responseData.name}`);
    console.log(`Role: ${responseData.role}`);
    console.log(`Grade: ${responseData.gradeName}`);
    console.log(`Data Source: ${responseData.dataSource}`);
    console.log("========================");

    res.json(responseData);
  } catch (error) {
    console.error("❌ Azure login error:", error);
    res.status(500).json({ 
      message: "Azure authentication failed", 
      error: error.message 
    });
  }
};

// Get Azure login URL
const getAzureLoginUrl = async (req, res) => {
  try {
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
