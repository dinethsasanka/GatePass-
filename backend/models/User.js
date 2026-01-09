const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Keep existing fields for frontend compatibility
    userType: { type: String, enum: ["SLT", "Non-SLT"], required: true },
    userId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    serviceNo: { type: String, required: true },
    name: { type: String, required: true },
    designation: { type: String, required: true },
    section: { type: String, required: true },
    group: { type: String, required: true },
    contactNo: { type: String, required: true },
    email: { type: String, required: true },
    gradeName: { type: String, required: true },
    fingerScanLocation: { type: String, default: null },
    branches: [{ type: String, default: null }],
    role: {
      type: String,
      enum: [
        "User",
        "Approver",
        "Executive",
        "Dispatcher",
        "Pleader",
        "Security Officer",
        "SuperAdmin",
      ],
      default: "User",
    },

    // Azure fields
    azureId: { type: String, unique: true, sparse: true },
    isAzureUser: { type: Boolean, default: false },
    lastAzureSync: { type: Date },

    // Additional API fields (optional, for storing full API data)
    apiData: {
      employeeNumber: String,
      employeeTitle: String,
      employeeFirstName: String,
      employeeInitials: String,
      employeeSurname: String,
      employeeOfficePhone: String,
      employeeMobilePhone: String,
      employeeOfficialEmail: String,
      employeeOfficialAddress: String,
      employeeCostCentreCode: String,
      employeeCostCentreName: String,
      employeeSalaryGrade: String,
      employeeGroupName: String,
      employeeDivision: String,
      employeeSection: String,
      employeePermanentResiAdd: String,
      fingerScanLocation: String,
      employeeImmEsServiceNo: String,
      organizationName: String,
      supervisorName: String,
      supervisorSalaryGrade: String,
      activeAssignmentStatus: String,
      nicNumber: String,
      employeeDob: String,
      orgId: String,
      empSecId: String,
      empSecHeadNo: String,
      empDivId: String,
      empDivHeadNo: String,
      empGrpId: String,
      empGrpHeadNo: String,
      empPersonType: String,
      gender: String,
      leaveAgent: String,
      leavingReason: String,
      leavingDate: String,
      personId: String,
      currentAssignmentStart: String,
      payroll: String,
    },
  },
  { timestamps: true }
);

// Keep existing static methods
userSchema.statics.findByRole = function (role) {
  return this.find({ role: role });
};

userSchema.statics.findByRoleAndBranch = function (role, branch) {
  return this.find({
    role: role,
    branches: { $in: [branch] },
  });
};

module.exports = mongoose.model("User", userSchema);
