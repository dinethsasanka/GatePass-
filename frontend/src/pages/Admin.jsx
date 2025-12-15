import { useState } from "react";
import { adminService } from "../services/adminService.js";
import {
  FaPlus,
  FaUpload,
  FaMapMarkerAlt,
  FaTag,
  FaFileUpload,
  FaChartBar,
  FaUsers,
  FaHistory,
  FaCog,
} from "react-icons/fa";
import UserManagement from "./UserManagement.jsx";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [locationFile, setLocationFile] = useState(null);
  const [categoryFile, setCategoryFile] = useState(null);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const role = localStorage.getItem("role");

  const handleLocationSubmit = async () => {
    setIsUploading(true);
    await adminService.addLocation(location);
    setLocation("");
    setIsUploading(false);
  };

  const handleCategorySubmit = async () => {
    setIsUploading(true);
    await adminService.addCategory(category);
    setCategory("");
    setIsUploading(false);
  };

  const handleLocationUpload = async () => {
    if (locationFile) {
      setIsUploading(true);
      await adminService.bulkUploadLocations(locationFile);
      setLocationFile(null);
      setIsUploading(false);
    }
  };

  const handleCategoryUpload = async () => {
    if (categoryFile) {
      setIsUploading(true);
      await adminService.bulkUploadCategories(categoryFile);
      setCategoryFile(null);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">SLT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">
                Gate Pass Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Profile and notification elements can go here */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 pr-8">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <h2 className="text-lg font-semibold">Admin Controls</h2>
              </div>
              <nav className="p-2">
                {/* <button
                  onClick={() => setActiveTab("manage")}
                  className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "manage"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <FaTag className="flex-shrink-0" />
                  <span className="font-medium">Manage Data</span>
                </button> */}
                {role === "SuperAdmin" && (
                  <button
                    onClick={() => setActiveTab("users")}
                    className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "users"
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <FaUsers className="flex-shrink-0" />
                    <span className="font-medium">User Management</span>
                  </button>
                )}
              </nav>
            </div>

            <div className="mt-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
              <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
              <p className="text-sm mb-4 opacity-90">
                Access documentation or contact support for assistance
              </p>
              <button className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors py-2 rounded-lg text-sm font-medium text-blue-600">
                View Resources
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {activeTab === "manage" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-5 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Location & Category Management
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Add and manage system locations and categories
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Location Management */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <FaMapMarkerAlt className="text-blue-500" />
                          <h3 className="font-medium">Location Management</h3>
                        </div>

                        <div className="flex space-x-2">
                          <input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Add Location"
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={handleLocationSubmit}
                            disabled={isUploading || !location}
                            className={`px-4 py-2 rounded-lg text-white font-medium flex items-center ${
                              isUploading || !location
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                            }`}
                          >
                            <FaPlus className="mr-2" /> Add
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="flex-1 relative">
                            <input
                              type="file"
                              id="location-file"
                              accept=".csv"
                              onChange={(e) =>
                                setLocationFile(e.target.files[0])
                              }
                              className="sr-only"
                            />
                            <label
                              htmlFor="location-file"
                              className="flex items-center justify-center space-x-2 w-full border border-gray-300 border-dashed rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                            >
                              <FaUpload className="text-gray-400" />
                              <span className="text-sm text-gray-500">
                                {locationFile
                                  ? locationFile.name
                                  : "Choose locations CSV"}
                              </span>
                            </label>
                          </div>
                          <button
                            onClick={handleLocationUpload}
                            disabled={isUploading || !locationFile}
                            className={`px-4 py-2 rounded-lg text-white font-medium ${
                              isUploading || !locationFile
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                            }`}
                          >
                            Upload
                          </button>
                        </div>
                      </div>

                      {/* Category Management */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <FaTag className="text-blue-500" />
                          <h3 className="font-medium">Category Management</h3>
                        </div>

                        <div className="flex space-x-2">
                          <input
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Add Category"
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={handleCategorySubmit}
                            disabled={isUploading || !category}
                            className={`px-4 py-2 rounded-lg text-white font-medium flex items-center ${
                              isUploading || !category
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                            }`}
                          >
                            <FaPlus className="mr-2" /> Add
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="flex-1 relative">
                            <input
                              type="file"
                              id="category-file"
                              accept=".csv"
                              onChange={(e) =>
                                setCategoryFile(e.target.files[0])
                              }
                              className="sr-only"
                            />
                            <label
                              htmlFor="category-file"
                              className="flex items-center justify-center space-x-2 w-full border border-gray-300 border-dashed rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                            >
                              <FaUpload className="text-gray-400" />
                              <span className="text-sm text-gray-500">
                                {categoryFile
                                  ? categoryFile.name
                                  : "Choose categories CSV"}
                              </span>
                            </label>
                          </div>
                          <button
                            onClick={handleCategoryUpload}
                            disabled={isUploading || !categoryFile}
                            className={`px-4 py-2 rounded-lg text-white font-medium ${
                              isUploading || !categoryFile
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                            }`}
                          >
                            Upload
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CSV Format Guide */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FaFileUpload className="text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        CSV File Format Guide
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Ensure your CSV files follow the correct format:
                      </p>
                      <ul className="mt-3 space-y-2">
                        <li className="flex items-start space-x-2">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 flex-shrink-0 text-blue-600 text-xs font-bold">
                            1
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Locations
                            </p>
                            <p className="text-xs text-gray-500">
                              Header should be{" "}
                              <code className="bg-gray-100 px-1 rounded">
                                location
                              </code>
                              , each row contains a location name.
                            </p>
                          </div>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 flex-shrink-0 text-blue-600 text-xs font-bold">
                            2
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Categories
                            </p>
                            <p className="text-xs text-gray-500">
                              Header should be{" "}
                              <code className="bg-gray-100 px-1 rounded">
                                category
                              </code>
                              , each row contains a category name.
                            </p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className={`px-6 py-3 rounded-lg text-white font-medium flex items-center ${
                      isUploading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaPlus className="mr-2" /> Submit Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "users" && <UserManagement />}

            {activeTab !== "manage" && activeTab !== "users" && (
              <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center justify-center h-96">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-4">
                  {activeTab === "analytics" && <FaChartBar size={24} />}
                  {activeTab === "passes" && <FaHistory size={24} />}
                  {activeTab === "settings" && <FaCog size={24} />}
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">
                  {activeTab === "analytics" && "Analytics Dashboard"}
                  {activeTab === "passes" && "Pass History"}
                  {activeTab === "settings" && "System Settings"}
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                  This section is being developed. Check back soon for
                  additional features and functionality.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
