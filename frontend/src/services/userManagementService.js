// src/services/userManagementService.js
import axiosInstance from "./axiosConfig";

const handleAxios = async (fn, fallbackMessage = "Request failed") => {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || fallbackMessage;
    console.error("[userManagementService]", msg, err?.response || err);
    throw new Error(msg);
  }
};

// Get all users (optionally filter via query params)
export const getAllUsers = async (params = {}) =>
  handleAxios(
    () =>
      axiosInstance.get(`/super-admin/users`, {
        params,
      }),
    "Failed to fetch users"
  );

// Create a new user
export const createUser = async (payload) =>
  handleAxios(
    () =>
      axiosInstance.post(`/super-admin/users`, payload),
    "Failed to create user"
  );

// Update a user (by id)
export const updateUser = async (userId, payload) =>
  handleAxios(
    () =>
      axiosInstance.put(`/super-admin/users/${userId}`, payload),
    "Failed to update user"
  );

// Delete a user (by id)
export const deleteUser = async (userId) =>
  handleAxios(
    () =>
      axiosInstance.delete(`/super-admin/users/${userId}`),
    "Failed to delete user"
  );

// Get user by id
export const getUserById = async (userId) =>
  handleAxios(
    () =>
      axiosInstance.get(`/super-admin/users/${userId}`),
    "Failed to fetch user"
  );

// Get users by type (uses query param to avoid tight backend coupling)
export const getUsersByType = async (userType) =>
  handleAxios(
    () =>
      axiosInstance.get(`/super-admin/users`, {
        params: { userType },
      }),
    "Failed to fetch users by type"
  );

// Get users by role and branch (query params)
export const getUserByRoleAndBranch = async (role, branch) =>
  handleAxios(
    () =>
      axiosInstance.get(`/super-admin/users`, {
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
      axiosInstance.get(`/users/${encodeURIComponent(serviceNo)}`),
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
      axiosInstance.put(`/super-admin/users/${userId}`, body),
    "Failed to update user role"
  );
};

export const assignRoleFromERP = async (payload) =>
  handleAxios(
    () =>
      axiosInstance.post(`/super-admin/users/assign-role`, payload),
    "Failed to assign role"
  );

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
  assignRoleFromERP,
};

export default userManagementService;
