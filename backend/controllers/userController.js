const User = require("../models/User");
const erpService = require("../services/erpService");
const { getAzureUserData } = require("../utils/azureUserCache");

const getUserByServiceNo = async (req, res) => {
  try {
    const serviceNo = req.params.serviceNo;

    // Try to fetch from ERP API first (primary source)
    try {
      const erpData = await erpService.getEmployeeDetails(
        "string",
        "string",
        serviceNo,
      );

      if (
        erpData &&
        erpData.success &&
        Array.isArray(erpData.data) &&
        erpData.data.length > 0
      ) {
        const employee = erpData.data[0];

        // Map ERP data to user response format
        const userData = {
          serviceNo: employee.employeeNumber || serviceNo,
          name:
            employee.employeeName ||
            `${employee.employeeTitle || ""} ${employee.employeeFirstName || ""} ${employee.employeeSurname || ""}`.trim(),
          designation: employee.designation || employee.employeeDesignation,
          section: employee.empSection || employee.employeeSection,
          group: employee.empGroup || employee.employeeGroupName,
          contactNo: employee.mobileNo || employee.employeeMobilePhone,
          email: employee.email || employee.employeeOfficialEmail,
          _source: "ERP",
        };

        return res.status(200).json(userData);
      }
    } catch (erpError) {
      console.warn(`⚠️ ERP API failed for ${serviceNo}: ${erpError.message}`);
    }

    // Fallback: Try MongoDB if ERP fails
    const user = await User.findOne({ serviceNo });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in ERP API or MongoDB" });
    }

    // Return MongoDB data with fallback indicator
    const userData = {
      serviceNo: user.serviceNo,
      name: user.name,
      designation: user.designation,
      section: user.section,
      group: user.group,
      contactNo: user.contactNo,
      role: user.role,
      email: user.email,
      branches: user.branches,
      _source: "MongoDB",
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error(`❌ Error fetching user: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getUserByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const users = await User.findByRole(role);

    const usersData = users.map((user) => ({
      serviceNo: user.serviceNo,
      name: user.name,
      designation: user.designation,
      section: user.section,
      group: user.group,
      contactNo: user.contactNo,
      role: user.role,
      email: user.email,
    }));

    res.status(200).json(usersData);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getUserByRoleAndBranch = async (req, res) => {
  try {
    const { branch } = req.params;
    const users = await User.find({
      role: "Pleader",
      branches: { $in: [branch] },
    });

    const usersData = users.map((user) => ({
      serviceNo: user.serviceNo,
      name: user.name,
      designation: user.designation,
      section: user.section,
      group: user.group,
      contactNo: user.contactNo,
      role: user.role,
      email: user.email,
    }));

    res.status(200).json(usersData);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUserByServiceNo,
  getUserByRole,
  getUserByRoleAndBranch,
};
