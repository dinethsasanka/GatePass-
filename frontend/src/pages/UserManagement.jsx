import { useState, useEffect } from "react";
import {
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaEye,
  FaTimes,
  FaEyeSlash,
  FaUserShield,
  FaUser,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { userManagementService } from "../services/userManagementService.js";
import {
  getErpLocations,
  searchEmployeeByServiceNo,
} from "../services/RequestService.js";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // 'create', 'edit', 'view'
  const [currentUser, setCurrentUser] = useState(null);
  const [filterRole, setFilterRole] = useState("All");
  const [showPassword, setShowPassword] = useState(false);
  const [erpLocations, setErpLocations] = useState([]);

  const [formData, setFormData] = useState({
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

  // Assign Role state (NEW)
  const [assignForm, setAssignForm] = useState({
    serviceNo: "",
    user: null,
    role: "User",
    branches: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    fetchErpLocations();
  }, []);

  const fetchErpLocations = async () => {
    try {
      const res = await getErpLocations();
      setErpLocations(res);
    } catch (error) {
      console.error("Failed to fetch ERP locations:", error);
    }
  };

  console.log(erpLocations);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "branches") {
      const selectedOptions = Array.from(
        e.target.selectedOptions,
        (option) => option.value
      );
      setFormData((prev) => ({ ...prev, [name]: selectedOptions }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Apply filters and search
  useEffect(() => {
    let result = [...users];

    // Apply role filter
    if (filterRole !== "All") {
      result = result.filter((user) => user.role === filterRole);
    }

    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(search) ||
          user.userId.toLowerCase().includes(search) ||
          user.serviceNo.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search)
      );
    }

    setFilteredUsers(result);
  }, [users, searchTerm, filterRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userManagementService.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setFormData({
      userType: user.userType,
      userId: user.userId,
      password: "",
      serviceNo: user.serviceNo,
      name: user.name,
      designation: user.designation,
      section: user.section,
      group: user.group,
      contactNo: user.contactNo,
      email: user.email,
      role: user.role,
      branches: user.branches || [],
    });
    setModalMode("edit");
    setShowModal(true);
    setShowPassword(false);
  };

  const openViewModal = (user) => {
    setCurrentUser(user);
    setFormData({
      userType: user.userType,
      userId: user.userId,
      serviceNo: user.serviceNo,
      name: user.name,
      designation: user.designation,
      section: user.section,
      group: user.group,
      contactNo: user.contactNo,
      email: user.email,
      role: user.role,
    });
    setModalMode("view");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === "edit") {
        // For edit, password is optional
        if (!formData.userId || !formData.name || !formData.email) {
          return toast.error("Please fill all required fields");
        }

        // Remove password if empty
        const dataToSend = { ...formData };
        if (!dataToSend.password) delete dataToSend.password;

        await userManagementService.updateUser(currentUser._id, dataToSend);
        toast.success("User updated successfully");
      }

      // Refresh user list and close modal
      fetchUsers();
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
      console.error("Error:", error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await userManagementService.deleteUser(userId);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
      console.error("Error deleting user:", error);
    }
  };

  // const handleSearchByServiceNo = async () => {
  //   if (!assignForm.serviceNo?.trim()) return;

  //   try {
  //     setIsSearching(true);
  //     const u = await userManagementService.getUserByServiceNo(
  //       assignForm.serviceNo.trim()
  //     );

  //     setAssignForm((prev) => ({
  //       ...prev,
  //       user: u,
  //       role: u.role || "User",
  //       branches: Array.isArray(u.branches) ? u.branches : [],
  //     }));
  //   } catch (err) {
  //     setAssignForm((prev) => ({ ...prev, user: null }));
  //     toast.error("Employee not found");
  //   } finally {
  //     setIsSearching(false);
  //   }
  // };

  const handleSearchByServiceNo = async () => {
    if (!assignForm.serviceNo) {
      toast.error("Please enter a service number");
      return;
    }

    try {
      setIsSearching(true);

      // Fetch ERP employee
      const erpResult = await searchEmployeeByServiceNo(assignForm.serviceNo);
      const emp = erpResult.data?.data?.[0];

      if (!emp) {
        throw new Error("Employee not found in ERP");
      }

      // Check MongoDB for existing user
      let existingUser = null;
      try {
        existingUser = await userManagementService.getUserByServiceNo(
          assignForm.serviceNo
        );
      } catch {
        existingUser = null;
      }

      // Populate form
      setAssignForm((prev) => ({
        ...prev,
        user: {
          serviceNo: assignForm.serviceNo,
          name: emp.employeeName || "",
          designation: emp.designation || "",
          section: emp.empSection || "",
          group: emp.empGroup || "",
          contactNo: emp.mobileNo || "",
          email: emp.email || "",
          gradeName: emp.gradeName ?? null,
          fingerScanLocation:
            typeof emp.fingerScanLocation === "string"
              ? emp.fingerScanLocation
              : null,
        },
        role: existingUser?.role || "User",
        branches: existingUser?.branches || [],
      }));
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to search employee");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssignRoleSave = async (e) => {
    e.preventDefault();

    if (!assignForm.user) {
      toast.error("Please search and select an employee first");
      return;
    }

    try {
      setIsSaving(true);

      await userManagementService.assignRoleFromERP({
        serviceNo: assignForm.user.serviceNo,
        name: assignForm.user.name,
        designation: assignForm.user.designation,
        section: assignForm.user.section,
        group: assignForm.user.group,
        contactNo: assignForm.user.contactNo,
        email: assignForm.user.email,
        role: assignForm.role,
        branches: assignForm.branches,
        gradeName: assignForm.user.gradeName ?? null,
        fingerScanLocation: assignForm.user.fingerScanLocation,
      });

      toast.success("Role assigned successfully");
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to assign role");
    } finally {
      setIsSaving(false);
    }
  };

  // const handleAssignRoleSave = async (e) => {
  //   e.preventDefault();

  //   const foundUser =
  //     users.find((u) => u.serviceNo === assignForm.user?.serviceNo) || null;

  //   const userId = foundUser?._id;

  //   if (!userId) {
  //     toast.error("User record not found");
  //     return;
  //   }

  //   try {
  //     setIsSaving(true);

  //     await userManagementService.updateUserRole(userId, {
  //       role: assignForm.role,
  //       branches: assignForm.branches,
  //     });

  //     toast.success("Role assigned successfully");
  //     setShowModal(false);
  //     fetchUsers();
  //   } catch (err) {
  //     toast.error("Failed to assign role");
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "SuperAdmin":
        return "bg-red-100 text-red-800";
      case "Admin":
        return "bg-purple-100 text-purple-800";
      case "Approver":
        return "bg-blue-100 text-blue-800";
      case "Verifier":
        return "bg-green-100 text-green-800";
      case "Dispatcher":
        return "bg-yellow-100 text-yellow-800";
      case "User":
        return "bg-gray-100 text-gray-800";
      case "Pleader":
        return "bg-orange-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <div className="p-5 border-b border-gray-100 flex items-center w-full">
          {/* LEFT */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              User Management
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Add, edit, and manage system users
            </p>
          </div>

          {/* PUSH BUTTON TO RIGHT */}
          <div className="ml-auto">
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <FaUserShield />
              <span>Add Role</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <FaFilter className="text-gray-500" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Roles</option>
            <option value="User">User</option>
            <option value="Approver">Approver</option>
            <option value="Verifier">Verifier</option>
            <option value="Dispatcher">Dispatcher</option>
            <option value="Pleader">Pleader</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            {searchTerm || filterRole !== "All"
              ? "No users match your search criteria"
              : "No users found in the system"}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role & Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.userId}
                        </div>
                        <div className="text-sm text-gray-500">
                          Service No: {user.serviceNo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">
                      {user.contactNo}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.designation}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.section} - {user.group}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openViewModal(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Role"
                    >
                      <FaEdit />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  {modalMode === "assignRole" ? (
                    <>
                      <FaUserShield className="mr-3" /> Assign Role
                    </>
                  ) : modalMode === "edit" ? (
                    <>
                      <FaEdit className="mr-3" /> Edit User
                    </>
                  ) : (
                    <>
                      <FaUser className="mr-3" /> User Details
                    </>
                  )}
                </h2>

                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              {currentUser && modalMode !== "create" && (
                <div className="mt-2 text-blue-100">
                  User ID: {currentUser.userId}
                </div>
              )}
            </div>

            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {modalMode === "assignRole" ? (
                <form onSubmit={handleAssignRoleSave}>
                  {/* ===== ASSIGN ROLE FORM ===== */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      className="flex-1 px-4 py-2 border rounded-lg"
                      placeholder="Enter service number"
                      value={assignForm.serviceNo}
                      onChange={(e) =>
                        setAssignForm((p) => ({
                          ...p,
                          serviceNo: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={handleSearchByServiceNo}
                      disabled={isSearching}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </div>

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
                          Role
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
                          <option value="Approver">Executive</option>
                          <option value="Security Officer">
                            Security Officer
                          </option>
                          <option value="Pleader">Patrol Leader</option>
                          <option value="SuperAdmin">SuperAdmin</option>
                        </select>
                      </div>

                      {/* Optional: branches multi-select */}
                      <div>
                        <label className="block text-sm font-medium text-blue-600 mb-1">
                          Assign Branches
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
                          {erpLocations.map((loc) => (
                            <option key={loc._id} value={loc.locationId}>
                              {loc.fingerscanLocation}
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
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={!assignForm.user || isSaving}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* ===== EDIT / VIEW FORM ===== */}
                  {/* KEEP YOUR EXISTING EDIT / VIEW JSX HERE EXACTLY AS IS */}

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
