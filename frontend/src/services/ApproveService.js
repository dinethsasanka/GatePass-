import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

// Create a new status
export const createStatus = async (statusData) => {
  try {
    // const response = await axios.post(`${API_BASE_URL}/approve/create`, statusData);
    const response = await axios.post(
      `${API_BASE_URL}/approve/create`,
      statusData,
      { headers: authHeaders() }
    );

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create status");
  }
};

// Get all pending statuses
// export const getPendingStatuses = async (serviceNo) => {
export const getPendingStatuses = async () => {
  try {
    // const response = await axios.get(`${API_BASE_URL}/approve/${serviceNo}/pending`);
    const response = await axios.get(`${API_BASE_URL}/approve/pending`, {
      headers: authHeaders(),
    });

    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch pending statuses");
  }
};

// Get all approved statuses
export const getApprovedStatuses = async () => {
  try {
    // const response = await axios.get(`${API_BASE_URL}/approve/approved`);
    const response = await axios.get(`${API_BASE_URL}/approve/approved`, {
      headers: authHeaders(),
    });

    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Get all rejected statuses
export const getRejectedStatuses = async () => {
  try {
    // const response = await axios.get(`${API_BASE_URL}/approve/rejected`);
    const response = await axios.get(`${API_BASE_URL}/approve/rejected`, {
      headers: authHeaders(),
    });

    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Approve a request (update status)
export const approveStatus = async (referenceNumber, comment, branches) => {
  try {
    // const response = await axios.put(`${API_BASE_URL}/approve/${referenceNumber}/approve`, { comment, branches });
    const response = await axios.put(
      `${API_BASE_URL}/approve/${referenceNumber}/approve`,
      { comment, branches },
      { headers: authHeaders() }
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
    // const response = await axios.put(`${API_BASE_URL}/approve/${referenceNumber}/reject`, { comment });
    const response = await axios.put(
      `${API_BASE_URL}/approve/${referenceNumber}/reject`,
      { comment },
      { headers: authHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to reject status");
  }
};

export const searchUserByServiceNo = async (serviceNo) => {
  if (!serviceNo) throw new Error("Service number is required");

  try {
    const response = await axios.get(`${API_BASE_URL}/users/${serviceNo}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("User not found");
    }
    throw new Error("Failed to search user");
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
      `Calling API: ${API_BASE_URL}/approve/${referenceNumber}/mark-returned`
    );
    console.log("Payload:", payload);

    const response = await axios.put(
      `${API_BASE_URL}/approve/${referenceNumber}/mark-returned`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
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



