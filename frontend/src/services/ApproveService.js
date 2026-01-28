import axios from "axios";
import axiosInstance from "./axiosConfig";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

// Create a new status
export const createStatus = async (statusData) => {
  try {
    const response = await axiosInstance.post(`/approve/create`, statusData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create status");
  }
};

// Get all pending statuses
export const getPendingStatuses = async (serviceNo, limit = 20, skip = 0) => {
  const url = serviceNo ? `/approve/${serviceNo}/pending?limit=${limit}&skip=${skip}` : `/approve/pending?limit=${limit}&skip=${skip}`; // SUPERADMIN

  const response = await axiosInstance.get(url);
  return response.data;
};

// Get all approved statuses
export const getApprovedStatuses = async (limit = 20, skip = 0) => {
  try {
    const response = await axiosInstance.get(`/approve/approved?limit=${limit}&skip=${skip}`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Get all rejected statuses
export const getRejectedStatuses = async (limit = 20, skip = 0) => {
  try {
    const response = await axiosInstance.get(`/approve/rejected?limit=${limit}&skip=${skip}`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch approved statuses");
  }
};

// Approve a request (update status)
export const approveStatus = async (referenceNumber, comment, branches) => {
  try {
    const response = await axiosInstance.put(
      `/approve/${referenceNumber}/approve`,
      { comment, branches }
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
      `/approve/${referenceNumber}/reject`,
      { comment }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to reject status");
  }
};

export const searchUserByServiceNo = async (serviceNo) => {
  if (!serviceNo) throw new Error("Service number is required");

  try {
    const response = await axiosInstance.get(`/users/${serviceNo}`);
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
