import axios from "axios";
import axiosInstance from "./axiosConfig";

export const API_BASE_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export const getVerifyPending = async () =>
  (
    await axios.get(`${API_BASE_URL}/verify/pending`, {
      headers: authHeaders(),
    })
  ).data;
export const getVerifyApproved = async () =>
  (
    await axios.get(`${API_BASE_URL}/verify/approved`, {
      headers: authHeaders(),
    })
  ).data;
export const getVerifyRejected = async () =>
  (
    await axios.get(`${API_BASE_URL}/verify/rejected`, {
      headers: authHeaders(),
    })
  ).data;



// Create a new status
export const createStatus = async (statusData) => {
  try {
    const response = await axiosInstance.post(`/verify/create`, statusData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create status");
  }
};

// Get all pending statuses
export const getPendingStatuses = async (limit = 20, skip = 0) => {
  try {
    const response = await axiosInstance.get(`/verify/pending?limit=${limit}&skip=${skip}`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch pending statuses");
  }
};

// Get all approved statuses
export const getApprovedStatuses = async (limit = 20, skip = 0) => {
  try {
    const response = await axiosInstance.get(`/verify/approved?limit=${limit}&skip=${skip}`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Get all rejected statuses
export const getRejectedStatuses = async (limit = 20, skip = 0) => {
  try {
    const response = await axiosInstance.get(`/verify/rejected?limit=${limit}&skip=${skip}`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Approve a request (update status)
export const approveStatus = async (
  referenceNumber,
  comment,
  loadingDetails,
  userServiceNumber
) => {
  try {
    const response = await axiosInstance.put(
      `/verify/${referenceNumber}/approve`,
      { comment, loadingDetails, userServiceNumber }
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
      `/verify/${referenceNumber}/reject`,
      { comment }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to reject status");
  }
};

export const searchUserByServiceNo = async (serviceNo) => {
  if (!serviceNo) return null; // no input => no lookup
  try {
    const response = await axios.get(
      `${API_BASE_URL}/users/${encodeURIComponent(serviceNo)}`,
      { headers: authHeaders() } // <-- always send token
    );
    return response.data || null; // if API returns empty, treat as null
  } catch (error) {
    if (error?.response?.status === 404) return null; // non-fatal: no user doc
    console.warn(
      "searchUserByServiceNo failed:",
      serviceNo,
      error?.response?.status || error?.message
    );
    return null; // never throw here
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
      `Calling API: ${API_BASE_URL}/verify/${referenceNumber}/mark-returned`
    );
    console.log("Payload:", payload);

    const response = await axios.put(
      `${API_BASE_URL}/verify/${referenceNumber}/mark-returned`,
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

export const addReturnableItemToRequest = async (referenceNumber, itemData) => {
  const response = await axios.post(`${API_BASE_URL}/receive/${referenceNumber}/items`, itemData);
  return response.data;
};
  