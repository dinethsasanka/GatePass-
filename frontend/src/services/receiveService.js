// src/services/ReceiveService.js
import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

// Helper: GET with optional query params
const getWithParams = async (url, params) => {
  const response = await axios.get(url, { params, headers: authHeaders() });
  return response.data;
};

// Create a new status
export const createStatus = async (statusData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/receive/create`,
      statusData,
      { headers: authHeaders() }
    );

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create status");
  }
};

// Get Receiver → Pending (optionally filtered by serviceNo)
export const getPendingStatuses = async (serviceNo) => {
  const response = await axios.get(`${API_BASE_URL}/receive/pending`, {
    params: serviceNo ? { serviceNo } : undefined,
    headers: authHeaders(),
  });
  return response.data;
};

// Get Receiver → Approved (optionally filtered by serviceNo)
export const getApprovedStatuses = async (serviceNo) => {
  try {
    return await getWithParams(
      `${API_BASE_URL}/receive/approved`,
      serviceNo ? { serviceNo } : undefined
    );
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Get Receiver → Rejected (optionally filtered by serviceNo)
export const getRejectedStatuses = async (serviceNo) => {
  try {
    return await getWithParams(
      `${API_BASE_URL}/receive/rejected`,
      serviceNo ? { serviceNo } : undefined
    );
  } catch (error) {
    throw new Error("Failed to fetch rejected statuses");
  }
};

// Approve a request (Receiver action)
export const approveStatus = async (
  referenceNumber,
  comment,
  unloadingDetails,
  userServiceNumber,
  returnableItems
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/receive/${referenceNumber}/approve`,
      { comment, unloadingDetails, userServiceNumber, returnableItems },
      { headers: authHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error("Error approving status:", error);
    throw new Error(
      error.response?.data?.message || "Failed to approve status"
    );
  }
};

// Reject a request (Receiver action)
export const rejectStatus = async (referenceNumber, comment) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/receive/${referenceNumber}/reject`,
      { comment },
      { headers: authHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to reject status");
  }
};

// Lookup user by service number (used to confirm the receiver identity if needed)
export const searchUserByServiceNo = async (serviceNo) => {
  if (!serviceNo) return null;

  try {
    const response = await axios.get(
      `${API_BASE_URL}/users/${encodeURIComponent(serviceNo)}`,
      { headers: authHeaders() }
    );
    return response.data || null;
  } catch (error) {
    if (error.response?.status === 404) return null; // non-fatal
    console.warn(
      "searchUserByServiceNo failed:",
      serviceNo,
      error.response?.status || error.message
    );
    return null;
  }
};

// Update returnable item (model and serial number)
/*export const updateReturnableItem = async (
  referenceNumber,
  originalSerialNo,
  itemModel,
  serialNo
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/receive/${referenceNumber}/returnable-item`,
      { originalSerialNo, itemModel, serialNo }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update returnable item"
    );
  }
};*/

// Mark returnable items as returned
/*export const markItemsAsReturned = async (referenceNumber, serialNumbers) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/receive/${referenceNumber}/mark-returned`,
      { serialNumbers },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error marking items as returned:", error);
    throw new Error(
      error.response?.data?.message ||
        "Failed to mark items as returned. Please try again."
    );
  }
};*/

// Update returnable item (model and serial number)
/*export const updateReturnableItem = async (
  referenceNumber,
  originalSerialNo,
  itemModel,
  serialNo
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/receive/${referenceNumber}/returnable-item`,
      { originalSerialNo, itemModel, serialNo }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update returnable item"
    );
  }
};*/
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
      `Calling API: ${API_BASE_URL}/receive/${referenceNumber}/mark-returned`
    );
    console.log("Payload:", payload);

    const response = await axios.put(
      `${API_BASE_URL}/receive/${referenceNumber}/mark-returned`,
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

// Update returnable item (model and serial number)
export const updateReturnableItem = async (
  referenceNumber,
  originalSerialNo,
  itemModel,
  serialNo
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/receive/${referenceNumber}/returnable-item`,
      { originalSerialNo, itemModel, serialNo },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating returnable item:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update returnable item"
    );
  }
};

export const addReturnableItemToRequest = async (referenceNumber, itemData) => {
  const response = await axios.post(`${API_BASE_URL}/receive/${referenceNumber}/items`, itemData);
  return response.data;
};

