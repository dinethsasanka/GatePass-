// src/services/userManagementService.js
import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleAxios = async (fn, fallbackMessage = "Request failed") => {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    // Optional: surface backend message if present
    const msg = err?.response?.data?.message || err?.message || fallbackMessage;
    console.error("[userManagementService]", msg, err?.response || err);
    throw new Error(msg);
  }
};

// Get all users (optionally filter via query params)
export const getAllUsers = async (params = {}) =>
  handleAxios(
    () =>
      axios.get(`${API_BASE_URL}/super-admin/users`, {
        headers: authHeaders(),
        params,
      }),
    "Failed to fetch users"
  );

// Create a new user
export const createUser = async (payload) =>
  handleAxios(
    () =>
      axios.post(`${API_BASE_URL}/super-admin/users`, payload, {
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      }),
    "Failed to create user"
  );

// Update a user (by id)
export const updateUser = async (userId, payload) =>
  handleAxios(
    () =>
      axios.put(`${API_BASE_URL}/super-admin/users/${userId}`, payload, {
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      }),
    "Failed to update user"
  );

// Delete a user (by id)
export const deleteUser = async (userId) =>
  handleAxios(
    () =>
      axios.delete(`${API_BASE_URL}/super-admin/users/${userId}`, {
        headers: authHeaders(),
      }),
    "Failed to delete user"
  );

// Get user by id
export const getUserById = async (userId) =>
  handleAxios(
    () =>
      axios.get(`${API_BASE_URL}/super-admin/users/${userId}`, {
        headers: authHeaders(),
      }),
    "Failed to fetch user"
  );

// Get users by type (uses query param to avoid tight backend coupling)
export const getUsersByType = async (userType) =>
  handleAxios(
    () =>
      axios.get(`${API_BASE_URL}/super-admin/users`, {
        headers: authHeaders(),
        params: { userType },
      }),
    "Failed to fetch users by type"
  );

// Get users by role and branch (query params)
export const getUserByRoleAndBranch = async (role, branch) =>
  handleAxios(
    () =>
      axios.get(`${API_BASE_URL}/super-admin/users`, {
        headers: authHeaders(),
        params: { role, branch },
      }),
    "Failed to fetch users by role/branch"
  );

/* -------------------------
 * New helpers for Assign Role
 * ------------------------- */

// Lookup by service number (used by “Assign Role” modal search)
export const getUserByServiceNo = async (serviceNo) => {
  if (!serviceNo) throw new Error("serviceNo is required");
  return handleAxios(
    () =>
      axios.get(`${API_BASE_URL}/users/${encodeURIComponent(serviceNo)}`, {
        headers: authHeaders(),
      }),
    "Failed to fetch user by service number"
  );
};

// Update only the role (and optional branches) for a user
export const updateUserRole = async (userId, { role, branches } = {}) => {
  if (!userId) throw new Error("userId is required");
  if (!role) throw new Error("role is required");
  const body = { role };
  if (Array.isArray(branches)) body.branches = branches;

  return handleAxios(
    () =>
      axios.put(`${API_BASE_URL}/super-admin/users/${userId}`, body, {
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      }),
    "Failed to update user role"
  );
};

export const userManagementService = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  getUsersByType,
  getUserByRoleAndBranch,
  getUserByServiceNo, // NEW
  updateUserRole, // NEW
};

export default userManagementService;
