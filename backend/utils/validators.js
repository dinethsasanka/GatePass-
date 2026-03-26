// Utility functions for input validation

/**
 * Validate required fields in an object
 * @param {Object} data - Object containing the data to validate
 * @param {Array<string>} requiredFields - Array of field names that are required
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
const validateRequiredFields = (data, requiredFields) => {
  const errors = [];

  requiredFields.forEach((field) => {
    const value = data[field];
    
    // Check if the field is missing, empty, or only whitespace
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      errors.push(`${field} is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Sri Lankan NIC
 * @param {string} nic - NIC to validate
 * @returns {boolean} - True if valid
 */
const validateNIC = (nic) => {
  if (!nic) return false;
  // Old format: 9 digits + V/X
  // New format: 12 digits
  const nicRegex = /^([0-9]{9}[vV]|[0-9]{12})$/;
  return nicRegex.test(nic.trim());
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
const validatePhone = (phone) => {
  if (!phone) return false;
  // Must contain at least 10 digits
  const phoneRegex = /^[\d\s+()-]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate service number format
 * @param {string} serviceNo - Service number to validate
 * @returns {boolean} - True if valid
 */
const validateServiceNumber = (serviceNo) => {
  if (!serviceNo || typeof serviceNo !== "string") return false;
  return serviceNo.trim().length > 0;
};

/**
 * Validate serial number format
 * @param {string} serialNumber - Serial number to validate
 * @returns {boolean} - True if valid
 */
const validateSerialNumber = (serialNumber) => {
  if (!serialNumber || typeof serialNumber !== "string") return false;
  const trimmed = serialNumber.trim();
  if (!trimmed) return false;
  const serialRegex = /^[A-Za-z0-9\-_/]+$/;
  return serialRegex.test(trimmed);
};

/**
 * Validate Sri Lankan vehicle number
 * @param {string} vehicleNumber - Vehicle number to validate
 * @returns {boolean} - True if valid
 * Formats: ABC1234, AB1234, ABC-1234, AB-1234
 */
const validateVehicleNumber = (vehicleNumber) => {
  if (!vehicleNumber) return false;
  // Sri Lankan format: 2-3 uppercase letters + optional hyphen + 4 digits
  const vehicleRegex = /^[A-Z]{2,3}-?[0-9]{4}$/i;
  return vehicleRegex.test(vehicleNumber.trim());
};

/**
 * Validate company/organization name
 * @param {string} companyName - Company name to validate
 * @returns {boolean} - True if valid
 */
const validateCompanyName = (companyName) => {
  if (!companyName) return false;
  const trimmed = companyName.trim();
  
  // Length validation: 2-100 characters
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  
  // Allow letters, numbers, spaces, and common business characters
  // Allowed: letters, numbers, spaces, dots, hyphens, apostrophes, ampersands, parentheses, commas
  const companyRegex = /^[a-zA-Z0-9\s.,'&()-]+$/;
  return companyRegex.test(trimmed);
};

/**
 * Validate non-SLT person details
 * @param {Object} data - Object containing name, nic, phone, email
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
const validateNonSLTPerson = (data) => {
  const errors = [];

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  } else {
    const nameRegex = /^[a-zA-Z\s'.-]+$/;
    if (!nameRegex.test(data.name.trim())) {
      errors.push("Name can only contain letters, spaces, hyphens, apostrophes, and dots");
    }
  }

  // NIC validation
  if (data.nic && !validateNIC(data.nic)) {
    errors.push("Invalid NIC format (use 9 digits+V or 12 digits)");
  }

  // Phone validation
  if (data.phone && !validatePhone(data.phone)) {
    errors.push("Phone number must be at least 10 digits");
  }

  // Email validation
  if (data.email && !validateEmail(data.email)) {
    errors.push("Invalid email format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate request creation data
 * @param {Object} data - Request data
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
const validateRequestCreation = (data) => {
  const errors = [];

  // Basic required fields
  const basicValidation = validateRequiredFields(data, [
    "outLocation",
    "executiveOfficerServiceNo",
  ]);

  if (!basicValidation.isValid) {
    errors.push(...basicValidation.errors);
  }

  // Items validation
  if (!data.items || !Array.isArray(JSON.parse(data.items)) || JSON.parse(data.items).length === 0) {
    errors.push("At least one item is required");
  } else {
    const parsedItems = JSON.parse(data.items);
    parsedItems.forEach((item, index) => {
      if (!validateSerialNumber(item?.serialNumber)) {
        errors.push(
          `Item ${index + 1}: invalid serial number format (only letters, numbers, -, _, /)`
        );
      }
    });
  }

  // Destination type validation
  if (data.isNonSltPlace === "true" || data.isNonSltPlace === true) {
    // Non-SLT destination validations
    if (!data.companyName || data.companyName.trim() === "") {
      errors.push("Company name is required for non-SLT destinations");
    } else if (!validateCompanyName(data.companyName)) {
      errors.push("Invalid company name format (2-100 characters, letters, numbers, and common business characters only)");
    }
    if (!data.companyAddress || data.companyAddress.trim() === "") {
      errors.push("Company address is required for non-SLT destinations");
    }

    // If receiver details are provided, validate them
    if (data.receiverName || data.receiverNIC || data.receiverContact) {
      const receiverValidation = validateNonSLTPerson({
        name: data.receiverName,
        nic: data.receiverNIC,
        phone: data.receiverContact,
      });
      if (!receiverValidation.isValid) {
        errors.push(...receiverValidation.errors.map(e => `Receiver: ${e}`));
      }
    }
  } else {
    // SLT destination validation
    if (!data.inLocation || data.inLocation.trim() === "") {
      errors.push("Destination location is required for SLT destinations");
    }
  }

  // Transport validation
  if (data.transportMethod) {
    if (data.transportMethod === "Vehicle") {
      if (!data.transporterType) {
        errors.push("Transporter type is required for vehicle transport");
      }
      if (!data.vehicleNumber || data.vehicleNumber.trim() === "") {
        errors.push("Vehicle number is required");
      } else if (!validateVehicleNumber(data.vehicleNumber)) {
        errors.push("Invalid vehicle number format (use format: ABC1234 or ABC-1234)");
      }

      // Validate transporter details
      if (data.transporterType === "SLT" && !data.transporterServiceNo) {
        errors.push("SLT transporter service number is required");
      }

      if (data.transporterType === "Non-SLT") {
        const transporterValidation = validateNonSLTPerson({
          name: data.nonSLTTransporterName,
          nic: data.nonSLTTransporterNIC,
          phone: data.nonSLTTransporterPhone,
          email: data.nonSLTTransporterEmail,
        });
        if (!transporterValidation.isValid) {
          errors.push(...transporterValidation.errors.map(e => `Transporter: ${e}`));
        }
      }
    }

    if (data.transportMethod === "By Hand") {
      if (!data.transporterType) {
        errors.push("Carrier type is required for hand transport");
      }

      if (data.transporterType === "SLT" && !data.transporterServiceNo) {
        errors.push("SLT carrier service number is required");
      }

      if (data.transporterType === "Non-SLT") {
        const carrierValidation = validateNonSLTPerson({
          name: data.nonSLTTransporterName,
          nic: data.nonSLTTransporterNIC,
          phone: data.nonSLTTransporterPhone,
        });
        if (!carrierValidation.isValid) {
          errors.push(...carrierValidation.errors.map(e => `Carrier: ${e}`));
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate approval/rejection data
 * @param {Object} data - Contains comment and action type
 * @param {string} action - 'approve' or 'reject'
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
const validateApprovalAction = (data, action) => {
  const errors = [];

  if (action === "reject") {
    if (!data.comment || data.comment.trim() === "") {
      errors.push("Comment is required when rejecting");
    } else if (data.comment.trim().length < 10) {
      errors.push("Rejection comment must be at least 10 characters");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate serial numbers for dispatch
 * @param {Array} serialNumbers - Array of serial numbers
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
const validateSerialNumbers = (serialNumbers) => {
  const errors = [];

  if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
    errors.push("Serial numbers are required and must be a non-empty array");
  } else {
    serialNumbers.forEach((serialNumber, index) => {
      if (!validateSerialNumber(serialNumber)) {
        errors.push(
          `Invalid serial number at position ${index + 1} (only letters, numbers, -, _, /)`
        );
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate loading/unloading staff details
 * @param {Object} data - Contains staffType and staffServiceNo or non-SLT details
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
const validateStaffDetails = (data) => {
  const errors = [];

  if (!data.staffType) {
    errors.push("Staff type is required");
    return { isValid: false, errors };
  }

  if (data.staffType === "SLT") {
    if (!data.staffServiceNo || data.staffServiceNo.trim() === "") {
      errors.push("SLT staff service number is required");
    }
  } else if (data.staffType === "Non-SLT") {
    const staffValidation = validateNonSLTPerson({
      name: data.name,
      nic: data.nic,
      phone: data.contactNo,
      email: data.email,
    });
    if (!staffValidation.isValid) {
      errors.push(...staffValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateRequiredFields,
  validateEmail,
  validateNIC,
  validatePhone,
  validateServiceNumber,
  validateSerialNumber,
  validateVehicleNumber,
  validateCompanyName,
  validateNonSLTPerson,
  validateRequestCreation,
  validateApprovalAction,
  validateSerialNumbers,
  validateStaffDetails,
};
