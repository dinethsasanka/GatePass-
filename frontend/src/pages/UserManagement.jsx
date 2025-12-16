// src/pages/UserManagement.jsx
import { useState, useEffect } from "react";
import {
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaEye,
  FaTimes,
  FaUserShield,
  FaUser,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";

import { userManagementService } from "../services/userManagementService.js";
import { getLocations } from "../services/RequestService.js";

const UserManagement = () => {
  // Core data
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [locations, setLocations] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterType, setFilterType] = useState("All");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit' | 'view' | 'assignRole'
  const [currentUser, setCurrentUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Create/Edit form
  const [formData, setFormData] = useState({
    userType: "SLT", // SLT | Non-SLT
    userId: "",
    password: "",
    serviceNo: "",
    name: "",
    designation: "",
    section: "",
    group: "",
    contactNo: "",
    email: "",
    role: "User",
    branches: [],
  });

  // Assign Role form (new)
  const [assignForm, setAssignForm] = useState({
    serviceNo: "",
    user: null,
    role: "User",
    branches: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userManagementService.getAllUsers();
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await getLocations();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  // Filters & search
  useEffect(() => {
    let list = [...users];

    if (filterRole !== "All") {
      list = list.filter(
        (u) => (u.role || "").toLowerCase() === filterRole.toLowerCase()
      );
    }
    if (filterType !== "All") {
      list = list.filter(
        (u) => (u.userType || "").toLowerCase() === filterType.toLowerCase()
      );
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((u) => {
        const fields = [
          u.serviceNo,
          u.name,
          u.designation,
          u.section,
          u.group,
          u.email,
          u.contactNo,
          u.role,
        ]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        return fields.some((f) => f.includes(q));
      });
    }
    setFilteredUsers(list);
  }, [users, filterRole, filterType, searchTerm]);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    if (name === "branches") {
      const selectedOptions = Array.from(
        e.target.selectedOptions,
        (option) => option.value
      );
      setFormData((prev) => ({ ...prev, branches: selectedOptions }));
      return;
    }

    if (name === "userType") {
      setFormData((prev) => ({ ...prev, userType: value }));
      return;
    }

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // CRUD modal openers
  const openCreateModal = () => {
    setFormData({
      userType: "SLT",
      userId: "",
      password: "",
      serviceNo: "",
      name: "",
      designation: "",
      section: "",
      group: "",
      contactNo: "",
      email: "",
      role: "User",
      branches: [],
    });
    setModalMode("create");
    setShowModal(true);
    setShowPassword(false);
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setFormData({
      userType: user.userType || "SLT",
      userId: user.userId || "",
      password: "", // do not prefill
      serviceNo: user.serviceNo || "",
      name: user.name || "",
      designation: user.designation || "",
      section: user.section || "",
      group: user.group || "",
      contactNo: user.contactNo || "",
      email: user.email || "",
      role: user.role || "User",
      branches: user.branches || [],
    });
    setModalMode("edit");
    setShowModal(true);
    setShowPassword(false);
  };

  const openViewModal = (user) => {
    setCurrentUser(user);
    setFormData({
      userType: user.userType || "SLT",
      userId: user.userId || "",
      password: "",
      serviceNo: user.serviceNo || "",
      name: user.name || "",
      designation: user.designation || "",
      section: user.section || "",
      group: user.group || "",
      contactNo: user.contactNo || "",
      email: user.email || "",
      role: user.role || "User",
      branches: user.branches || [],
    });
    setModalMode("view");
    setShowModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await userManagementService.deleteUser(userId);
      toast.success("User deleted");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === "create") {
        await userManagementService.createUser(formData);
        toast.success("User created");
      } else if (modalMode === "edit" && currentUser?._id) {
        await userManagementService.updateUser(currentUser._id, formData);
        toast.success("User updated");
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to save user");
    }
  };

  // Assign Role handlers (NEW)
  const handleSearchByServiceNo = async () => {
    if (!assignForm.serviceNo?.trim()) return;
    try {
      setIsSearching(true);
      const u = await userManagementService.getUserByServiceNo(
        assignForm.serviceNo.trim()
      );
      setAssignForm((prev) => ({
        ...prev,
        user: u,
        role: u.role || "User",
        branches: Array.isArray(u.branches) ? u.branches : [],
      }));
    } catch {
      setAssignForm((prev) => ({ ...prev, user: null }));
      toast.error("Employee not found");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssignRoleSave = async (e) => {
    e.preventDefault();
    console.log("✅ handleAssignRoleSave triggered");
    console.log("assignForm.user:", assignForm.user);

    // 🧠 Try to find matching user from main users list
    const foundUser =
      users.find((u) => u.serviceNo === assignForm.user?.serviceNo) || null;

    const userId = foundUser?._id;

    if (!userId) {
      toast.error("Couldn't find this user's record in database (no _id).");
      console.warn("No matching user found for:", assignForm.user?.serviceNo);
      return;
    }

    try {
      setIsSaving(true);

      await userManagementService.updateUserRole(userId, {
        role: assignForm.role,
        branches: assignForm.branches,
      });

      toast.success("Role assigned successfully!");
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error("Assign Role error:", err);
      toast.error(err?.message || "Failed to assign role");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          User Management
        </h1>
        <div className="flex items-center gap-3">
          {/* Changed: Add Role */}
          <button
            onClick={() => {
              setModalMode("assignRole");
              setAssignForm({
                serviceNo: "",
                user: null,
                role: "User",
                branches: [],
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <FaUserShield />
            <span>Add Role</span>
          </button>

          {/* (Optional) Keep Add User around; comment out if not needed)
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
          >
            <FaUserPlus />
            <span>Add User</span>
          </button> */}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 items-center rounded-lg mb-4">
        <div className="flex items-center px-3 py-2 bg-white rounded-md border">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by name, service no, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-500" />
          <select
            className="px-3 py-2 bg-white rounded-md border"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="User">User</option>
            <option value="Executive">Executive</option>
            <option value="Pleader">Pleader</option>
            <option value="Verifier">Verifier</option>
            <option value="Admin">Admin</option>
            <option value="SuperAdmin">SuperAdmin</option>
          </select>

          {/* <select
            className="px-3 py-2 bg-white rounded-md border"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="SLT">SLT</option>
            <option value="Non-SLT">Non-SLT</option>
          </select> */}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No users found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {user.serviceNo}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {user.designation}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {user.role}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {user.userType}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => openViewModal(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      title="View"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  {modalMode === "assignRole" ? (
                    <>
                      <FaUserShield className="mr-3" />
                      Assign Role
                    </>
                  ) : modalMode === "create" ? (
                    <>
                      <FaUserPlus className="mr-3" />
                      Create User
                    </>
                  ) : modalMode === "edit" ? (
                    <>
                      <FaEdit className="mr-3" />
                      Edit User
                    </>
                  ) : (
                    <>
                      <FaUser className="mr-3" />
                      View User
                    </>
                  )}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-gray-100"
                  aria-label="Close"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              {currentUser &&
                modalMode !== "create" &&
                modalMode !== "assignRole" && (
                  <div className="mt-2 text-blue-100">
                    User ID: {currentUser.userId}
                  </div>
                )}
            </div>

            {/* Body */}
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {modalMode === "assignRole" ? (
                <form onSubmit={handleAssignRoleSave}>
                  {/* Receiver-like search panel */}
                  {/* <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-xl mb-4">
                    <h3 className="text-white text-lg font-semibold"></h3>
                  </div> */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter receiver's service number"
                      value={assignForm.serviceNo}
                      onChange={(e) =>
                        setAssignForm((prev) => ({
                          ...prev,
                          serviceNo: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={handleSearchByServiceNo}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      disabled={isSearching}
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </div>

                  {/* Employee details card */}
                  {assignForm.user && (
                    <div className="bg-white rounded-2xl shadow-inner border p-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Name
                          </label>
                          <input
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            disabled
                            value={assignForm.user.name || ""}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Designation
                          </label>
                          <input
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            disabled
                            value={assignForm.user.designation || ""}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Section
                          </label>
                          <input
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            disabled
                            value={assignForm.user.section || ""}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Group
                          </label>
                          <input
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            disabled
                            value={assignForm.user.group || ""}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Contact No
                          </label>
                          <input
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            disabled
                            value={assignForm.user.contactNo || ""}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assign Role */}
                  <div className="bg-blue-50 rounded-xl p-5 mb-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">
                      Assign Role
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-600 mb-1">
                          Role*
                        </label>
                        <select
                          className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          value={assignForm.role}
                          onChange={(e) =>
                            setAssignForm((prev) => ({
                              ...prev,
                              role: e.target.value,
                            }))
                          }
                          required
                        >
                          <option value="User">User</option>
                          <option value="Executive">Executive</option>
                          <option value="Pleader">Pleader</option>
                          <option value="Verifier">Verifier</option>
                          <option value="Admin">Admin</option>
                          <option value="SuperAdmin">SuperAdmin</option>
                        </select>
                      </div>

                      {/* Optional: branches multi-select */}
                      <div>
                        <label className="block text-sm font-medium text-blue-600 mb-1">
                          Branches
                        </label>
                        <select
                          multiple
                          className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 h-32"
                          value={assignForm.branches}
                          onChange={(e) => {
                            const selected = Array.from(
                              e.target.selectedOptions,
                              (o) => o.value
                            );
                            setAssignForm((prev) => ({
                              ...prev,
                              branches: selected,
                            }));
                          }}
                        >
                          {locations.map((l) => (
                            <option key={l._id} value={l.name}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || !assignForm.user}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* User Type & Role */}
                    <div className="md:col-span-2 bg-blue-50 rounded-xl p-5 mb-4">
                      <h3 className="text-lg font-semibold text-blue-800 flex items-center mb-4">
                        <FaUserShield className="mr-2" /> Account Type &
                        Permissions
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-600 mb-1">
                            User Type*
                          </label>
                          <select
                            name="userType"
                            value={formData.userType}
                            onChange={handleInputChange}
                            disabled={modalMode === "view"}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                          >
                            <option value="SLT">SLT</option>
                            <option value="Non-SLT">Non-SLT</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-blue-600 mb-1">
                            Role*
                          </label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            disabled={modalMode === "view"}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                          >
                            <option value="User">User</option>
                            <option value="Executive">Executive</option>
                            <option value="Pleader">Pleader</option>
                            <option value="Verifier">Verifier</option>
                            <option value="Admin">Admin</option>
                            <option value="SuperAdmin">SuperAdmin</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Identity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service No*
                      </label>
                      <input
                        type="text"
                        name="serviceNo"
                        value={formData.serviceNo}
                        onChange={handleInputChange}
                        disabled={modalMode === "view"}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name*
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={modalMode === "view"}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    {/* Work info */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        disabled={modalMode === "view"}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section
                      </label>
                      <input
                        type="text"
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        disabled={modalMode === "view"}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group
                      </label>
                      <input
                        type="text"
                        name="group"
                        value={formData.group}
                        onChange={handleInputChange}
                        disabled={modalMode === "view"}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    {/* Contact */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact No
                      </label>
                      <input
                        type="text"
                        name="contactNo"
                        value={formData.contactNo}
                        onChange={handleInputChange}
                        disabled={modalMode === "view"}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={modalMode === "view"}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    {/* Branches */}
                    <div className="md:col-span-2">
                      <label className=" text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <FaMapMarkerAlt className="mr-2" /> Branches
                      </label>
                      <select
                        name="branches"
                        multiple
                        value={formData.branches}
                        onChange={handleInputChange}
                        disabled={modalMode === "view"}
                        className="w-full px-3 py-2 border rounded-lg h-40"
                      >
                        {locations.map((l) => (
                          <option key={l._id} value={l.name}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Password (create only) */}
                    {modalMode === "create" && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password*
                        </label>
                        <div className="flex items-center">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="ml-3 px-3 py-2 text-sm bg-gray-100 rounded"
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Close
                    </button>
                    {modalMode !== "view" && (
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
