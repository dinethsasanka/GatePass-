import axiosInstance from "./axiosConfig";

// Create a new status
export const createStatus = async (statusData) => {
  try {
    const response = await axiosInstance.post(`/dispatch/create`, statusData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create status");
  }
};

// Get all pending statuses
export const getPendingStatuses = async () => {
  try {
    const response = await axiosInstance.get(`/dispatch/pending`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch pending statuses");
  }
};

// Get all approved statuses
export const getApprovedStatuses = async () => {
  try {
    const response = await axiosInstance.get(`/dispatch/approved`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Get all rejected statuses
export const getRejectedStatuses = async () => {
  try {
    const response = await axiosInstance.get(`/dispatch/rejected`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Approve a request (update status)
export const approveStatus = async (referenceNumber, comment) => {
  try {
    const response = await axiosInstance.put(
      `/dispatch/${referenceNumber}/approve`,
      { comment }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to approve status"
    );
  }
};

// Reject a request (update status)
export const rejectStatus = async (referenceNumber, comment) => {
  try {
    const response = await axiosInstance.put(
      `/dispatch/${referenceNumber}/reject`,
      { comment }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to reject status");
  }
};

export const searchUserByServiceNo = async (serviceNo) => {
  // if (!serviceNo) throw new Error("Service number is required");
  if (!serviceNo) return null;

  try {
    const response = await axiosInstance.get(
      `/users/${encodeURIComponent(serviceNo)}`
    );
    return response.data || null;
  } catch (error) {
    if (error.response?.status === 404) return null; // non-fatal
    console.warn(
      "users lookup failed:",
      serviceNo,
      error.response?.status || error.message
    );
    return null;
  }
};

export const markItemsAsReturned = async (
  referenceNumber,
  serialNumbers,
  remarks = null
) => {
  try {
    // Build payload
    const payload = { serialNumbers };
    if (remarks) {
      payload.remarks = remarks;
    }

    console.log(
      `Calling API: /dispatch/${referenceNumber}/mark-returned`
    );
    console.log("Payload:", payload);

    const response = await axiosInstance.put(
      `/dispatch/${referenceNumber}/mark-returned`,
      payload
    );

    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error marking items as returned:", error);
    console.error("Error details:", error.response?.data);
    throw new Error(
      error.response?.data?.message ||
        "Failed to mark items as returned. Please try again."
    );
  }
};
