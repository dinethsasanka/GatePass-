// Frontend validation utility functions

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address";
  }
  return "";
};

/**
 * Validate Sri Lankan NIC
 * @param {string} nic - NIC to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateNIC = (nic) => {
  if (!nic || !nic.trim()) {
    return "NIC is required";
  }
  // Old format: 9 digits + V/v only (not X)
  // New format: 12 digits
  const nicRegex = /^([0-9]{9}[vV]|[0-9]{12})$/;
  if (!nicRegex.test(nic.trim())) {
    return "Invalid NIC format (use 9 digits+V or 12 digits)";
  }
  return "";
};

/**
 * Keep NIC input limited to digits and V/v only.
 * @param {string} value - Raw input
 * @returns {string} - Sanitized NIC input
 */
export const sanitizeNICInput = (value) => {
  if (!value) return "";
  return String(value).replace(/[^0-9vV]/g, "");
};

/**
 * Keep numeric inputs limited to digits only.
 * @param {string} value - Raw input
 * @returns {string} - Digits-only input
 */
export const sanitizeIntegerInput = (value) => {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
};

/**
 * Keep name input limited to letters and spaces only.
 * @param {string} value - Raw input
 * @returns {string} - Letters-and-spaces-only input
 */
export const sanitizeLettersOnlyInput = (value) => {
  if (!value) return "";
  return String(value).replace(/[^A-Za-z\s]/g, "");
};

/**
 * Keep serial number input limited to supported characters.
 * Allowed: letters, numbers, hyphen, underscore, slash.
 * @param {string} value - Raw input
 * @returns {string} - Sanitized serial number input
 */
export const sanitizeSerialNumberInput = (value) => {
  if (!value) return "";
  return String(value).replace(/[^A-Za-z0-9\-_/]/g, "");
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) {
    return "Contact number is required";
  }
  // Must contain at least 10 digits
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length < 10) {
    return "Contact number must be at least 10 digits";
  }
  return "";
};

/**
 * Validate name
 * @param {string} name - Name to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateName = (name) => {
  if (!name || !name.trim()) {
    return "Name is required";
  }
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }
  // Only allow letters, spaces, hyphens, apostrophes, and dots - no numbers
  const nameRegex = /^[a-zA-Z\s'.-]+$/;
  if (!nameRegex.test(name.trim())) {
    return "Name can only contain letters, spaces, hyphens, apostrophes, and dots";
  }
  return "";
};

/**
 * Validate company name
 * @param {string} companyName - Company name to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateCompanyName = (companyName) => {
  if (!companyName || !companyName.trim()) {
    return "Company name is required";
  }
  const trimmed = companyName.trim();
  if (trimmed.length < 2) {
    return "Company name must be at least 2 characters";
  }
  if (trimmed.length > 100) {
    return "Company name cannot exceed 100 characters";
  }
  // Allow letters, numbers, spaces, and common business characters
  const companyRegex = /^[a-zA-Z0-9\s.,'&()-]+$/;
  if (!companyRegex.test(trimmed)) {
    return "Company name can only contain letters, numbers, spaces, and common business characters (. , ' & - ( ))";
  }
  return "";
};

/**
 * Validate service number
 * @param {string} serviceNo - Service number to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateServiceNumber = (serviceNo) => {
  if (!serviceNo || !serviceNo.trim()) {
    return "Service number is required";
  }
  return "";
};

/**
 * Validate vehicle number (Sri Lankan format)
 * @param {string} vehicleNumber - Vehicle number to validate
 * @returns {string} - Error message or empty string if valid
 * Formats: ABC1234, AB1234, ABC-1234, AB-1234
 */
export const validateVehicleNumber = (vehicleNumber) => {
  if (!vehicleNumber || !vehicleNumber.trim()) {
    return "Vehicle number is required";
  }
  const trimmed = vehicleNumber.trim();
  // Sri Lankan format: 2-3 uppercase letters + optional hyphen + 4 digits
  const vehicleRegex = /^[A-Z]{2,3}-?[0-9]{4}$/i;
  if (!vehicleRegex.test(trimmed)) {
    return "Invalid vehicle number format. Use Sri Lankan format (e.g., ABC1234, QQ6770, ABQ-4931)";
  }
  return "";
};

/**
 * Validate required field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {string} - Error message or empty string if valid
 */
export const validateRequired = (value, fieldName = "This field") => {
  if (!value || (typeof value === "string" && !value.trim())) {
    return `${fieldName} is required`;
  }
  return "";
};

/**
 * Validate item details for request
 * @param {Object} item - Item object
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
export const validateItem = (item) => {
  const errors = [];

  if (!item.serialNumber || !item.serialNumber.trim()) {
    errors.push("Serial number is required");
  }

  if (!item.itemDescription || !item.itemDescription.trim()) {
    errors.push("Item description is required");
  }

  if (!item.categoryDescription || !item.categoryDescription.trim()) {
    errors.push("Category is required");
  }

  if (item.returnable === "Yes" && !item.returnDate) {
    errors.push("Return date is required for returnable items");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate non-SLT person details
 * @param {Object} person - Person object with name, nic, phone, email
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validateNonSLTPerson = (person) => {
  const errors = {};

  const nameError = validateName(person.name);
  if (nameError) errors.name = nameError;

  if (person.nic) {
    const nicError = validateNIC(person.nic);
    if (nicError) errors.nic = nicError;
  }

  if (person.contactNo || person.phone) {
    const phoneError = validatePhone(person.contactNo || person.phone);
    if (phoneError) errors.contactNo = phoneError;
  }

  if (person.email) {
    const emailError = validateEmail(person.email);
    if (emailError) errors.email = emailError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate request creation form
 * @param {Object} formData - Form data object
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
export const validateRequestForm = (formData) => {
  const errors = [];

  // Check items
  if (!formData.items || formData.items.length === 0) {
    errors.push("Please add at least one item");
  }

  // Check executive officer
  if (!formData.executiveOfficer || !formData.executiveOfficer.trim()) {
    errors.push("Please select an executive officer");
  }

  // Check out location
  if (!formData.outLocation || !formData.outLocation.trim()) {
    errors.push("Please select the dispatching branch (Out Location)");
  }

  // Destination type validation
  if (formData.destinationType === "non-slt") {
    if (!formData.companyName || !formData.companyName.trim()) {
      errors.push("Company name is required for non-SLT destinations");
    }
    if (!formData.companyAddress || !formData.companyAddress.trim()) {
      errors.push("Company address is required for non-SLT destinations");
    }
  } else {
    if (!formData.inLocation || !formData.inLocation.trim()) {
      errors.push("Please select the destination location (In Location)");
    }
  }

  // Transport validation
  if (formData.transportMethod === "Vehicle") {
    if (!formData.transporterType) {
      errors.push("Please select a transporter type");
    }
    if (!formData.vehicleNumber || !formData.vehicleNumber.trim()) {
      errors.push("Vehicle number is required");
    }
    if (!formData.vehicleModel || !formData.vehicleModel.trim()) {
      errors.push("Vehicle model is required");
    }

    if (formData.transporterType === "SLT" && !formData.transporterDetails) {
      errors.push("Please search for a valid SLT transporter");
    }

    if (
      formData.transporterType === "Non-SLT" &&
      (!formData.nonSLTTransporterName || !formData.nonSLTTransporterNIC)
    ) {
      errors.push("Please fill in all required transporter details");
    }
  }

  if (formData.transportMethod === "By Hand") {
    if (!formData.transporterType) {
      errors.push("Please select a carrier type");
    }

    if (formData.transporterType === "SLT" && !formData.transporterDetails) {
      errors.push("Please search for a valid SLT carrier");
    }

    if (
      formData.transporterType === "Non-SLT" &&
      (!formData.nonSLTTransporterName || !formData.nonSLTTransporterNIC)
    ) {
      errors.push("Please fill in all required carrier details");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate rejection comment
 * @param {string} comment - Rejection comment
 * @returns {string} - Error message or empty string if valid
 */
export const validateRejectionComment = (comment) => {
  if (!comment || !comment.trim()) {
    return "Comment is required when rejecting";
  }
  if (comment.trim().length < 10) {
    return "Rejection comment must be at least 10 characters";
  }
  return "";
};

/**
 * Validate serial number
 * @param {string} serialNumber - Serial number to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateSerialNumber = (serialNumber) => {
  if (!serialNumber || !serialNumber.trim()) {
    return "Serial number is required";
  }
  const trimmed = serialNumber.trim();
  // Allow alphanumeric, hyphens, underscores, and slashes
  const serialRegex = /^[a-zA-Z0-9\-_/]+$/;
  if (!serialRegex.test(trimmed)) {
    return "Serial number can only contain letters, numbers, hyphens, underscores, and slashes";
  }
  return "";
};

/**
 * Validate address
 * @param {string} address - Address to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateAddress = (address) => {
  if (!address || !address.trim()) {
    return "Address is required";
  }
  if (address.trim().length < 10) {
    return "Address must be at least 10 characters";
  }
  return "";
};

/**
 * Real-time validation helper - returns error only if field has been touched
 * @param {string} value - Value to validate
 * @param {Function} validator - Validator function
 * @param {boolean} touched - Whether field has been touched
 * @returns {string} - Error message or empty string
 */
export const validateOnBlur = (value, validator, touched = true) => {
  if (!touched) return "";
  return validator(value);
};
