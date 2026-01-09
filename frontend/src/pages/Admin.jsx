import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService.js';
import { FaPlus, FaUpload, FaMapMarkerAlt, FaTag, FaFileUpload, FaChartBar, FaUsers, FaHistory, FaCog, FaCloud, FaEdit, FaTrash, FaExclamationCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import UserManagement from './UserManagement.jsx';
import ErpEmployeeImport from '../components/ErpEmployeeImport.jsx';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [locationFile, setLocationFile] = useState(null);
  const [categoryFile, setCategoryFile] = useState(null);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editLocationValue, setEditLocationValue] = useState('');
  const [editCategoryValue, setEditCategoryValue] = useState('');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ message: '', onConfirm: null, type: '' });

  const role = localStorage.getItem("role");

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchLocations();
      fetchCategories();
    }
  }, [activeTab]);

  const fetchLocations = async () => {
    try {
      const data = await adminService.getLocations();
      setLocations(data);
    } catch (error) {
      toast.error('Failed to fetch locations');
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await adminService.getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    }
  };

  const showConfirm = (message, onConfirm, type = 'add') => {
    setConfirmConfig({ message, onConfirm, type });
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmConfig.onConfirm) {
      confirmConfig.onConfirm();
    }
    setShowConfirmModal(false);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  const handleLocationSubmit = async () => {
    showConfirm(
      `Are you sure you want to add "${location}" as a new location?`,
      async () => {
        setIsUploading(true);
        try {
          await adminService.addLocation(location);
          setLocation('');
          toast.success('Location added successfully');
          fetchLocations();
        } catch (error) {
          toast.error('Failed to add location');
        }
        setIsUploading(false);
      },
      'add'
    );
  };

  const handleCategorySubmit = async () => {
    showConfirm(
      `Are you sure you want to add "${category}" as a new category?`,
      async () => {
        setIsUploading(true);
        try {
          await adminService.addCategory(category);
          setCategory('');
          toast.success('Category added successfully');
          fetchCategories();
        } catch (error) {
          toast.error('Failed to add category');
        }
        setIsUploading(false);
      },
      'add'
    );
  };

  const handleLocationUpload = async () => {
    if (locationFile) {
      setIsUploading(true);
      try {
        await adminService.bulkUploadLocations(locationFile);
        setLocationFile(null);
        toast.success('Locations uploaded successfully');
        fetchLocations();
      } catch (error) {
        toast.error('Failed to upload locations');
      }
      setIsUploading(false);
    }
  };

  const handleCategoryUpload = async () => {
    if (categoryFile) {
      setIsUploading(true);
      try {
        await adminService.bulkUploadCategories(categoryFile);
        setCategoryFile(null);
        toast.success('Categories uploaded successfully');
        fetchCategories();
      } catch (error) {
        toast.error('Failed to upload categories');
      }
      setIsUploading(false);
    }
  };

  const handleUpdateLocation = async (id) => {
    try {
      await adminService.updateLocation(id, editLocationValue);
      toast.success('Location updated successfully');
      setEditingLocation(null);
      setEditLocationValue('');
      fetchLocations();
    } catch (error) {
      toast.error('Failed to update location');
    }
  };

  const handleDeleteLocation = async (id) => {
    const locationToDelete = locations.find(l => l._id === id);
    showConfirm(
      `Are you sure you want to delete "${locationToDelete?.name}"?`,
      async () => {
        try {
          await adminService.deleteLocation(id);
          toast.success('Location deleted successfully');
          fetchLocations();
        } catch (error) {
          toast.error('Failed to delete location');
        }
      },
      'delete'
    );
  };

  const handleUpdateCategory = async (id) => {
    try {
      await adminService.updateCategory(id, editCategoryValue);
      toast.success('Category updated successfully');
      setEditingCategory(null);
      setEditCategoryValue('');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id) => {
    const categoryToDelete = categories.find(c => c._id === id);
    showConfirm(
      `Are you sure you want to delete "${categoryToDelete?.name}"?`,
      async () => {
        try {
          await adminService.deleteCategory(id);
          toast.success('Category deleted successfully');
          fetchCategories();
        } catch (error) {
          toast.error('Failed to delete category');
        }
      },
      'delete'
    );
  };

  const startEditLocation = (loc) => {
    setEditingLocation(loc._id);
    setEditLocationValue(loc.name);
  };

  const startEditCategory = (cat) => {
    setEditingCategory(cat._id);
    setEditCategoryValue(cat.name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 shrink-0">
            <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-8">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <h2 className="text-lg font-semibold">Admin Controls</h2>
              </div>
              </div>
              </div>
              

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'manage' && (
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

                    {/* Locations List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <FaMapMarkerAlt className="text-blue-500 mr-2" />
                          Existing Locations ({locations.length})
                        </h3>
                        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                          {locations.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No locations added yet</div>
                          ) : (
                            <ul className="divide-y divide-gray-200">
                              {locations.map((loc) => (
                                <li key={loc._id} className="p-3 hover:bg-gray-50 transition-colors">
                                  {editingLocation === loc._id ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        value={editLocationValue}
                                        onChange={(e) => setEditLocationValue(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleUpdateLocation(loc._id)}
                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingLocation(null);
                                          setEditLocationValue('');
                                        }}
                                        className="px-3 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-800">{loc.name}</span>
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => startEditLocation(loc)}
                                          className="text-blue-600 hover:text-blue-800 p-1"
                                          title="Edit location"
                                        >
                                          <FaEdit />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLocation(loc._id)}
                                          className="text-red-600 hover:text-red-800 p-1"
                                          title="Delete location"
                                        >
                                          <FaTrash />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Categories List */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <FaTag className="text-blue-500 mr-2" />
                          Existing Categories ({categories.length})
                        </h3>
                        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                          {categories.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No categories added yet</div>
                          ) : (
                            <ul className="divide-y divide-gray-200">
                              {categories.map((cat) => (
                                <li key={cat._id} className="p-3 hover:bg-gray-50 transition-colors">
                                  {editingCategory === cat._id ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        value={editCategoryValue}
                                        onChange={(e) => setEditCategoryValue(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleUpdateCategory(cat._id)}
                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingCategory(null);
                                          setEditCategoryValue('');
                                        }}
                                        className="px-3 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-800">{cat.name}</span>
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => startEditCategory(cat)}
                                          className="text-blue-600 hover:text-blue-800 p-1"
                                          title="Edit category"
                                        >
                                          <FaEdit />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteCategory(cat._id)}
                                          className="text-red-600 hover:text-red-800 p-1"
                                          title="Delete category"
                                        >
                                          <FaTrash />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'users' && <UserManagement />}
            
            {activeTab === 'erp' && <ErpEmployeeImport />}
            
            {activeTab !== 'manage' && activeTab !== 'users' && activeTab !== 'erp' && (
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

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-fadeIn">
            <div className={`p-6 rounded-t-xl ${confirmConfig.type === 'delete' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-full ${confirmConfig.type === 'delete' ? 'bg-red-100' : 'bg-blue-100'}`}>
                  <FaExclamationCircle className={`text-2xl ${confirmConfig.type === 'delete' ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {confirmConfig.type === 'delete' ? 'Confirm Deletion' : 'Confirm Action'}
                </h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 text-lg mb-6">{confirmConfig.message}</p>
              
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 text-white rounded-lg font-medium transition-colors ${
                    confirmConfig.type === 'delete' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {confirmConfig.type === 'delete' ? 'Delete' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
  }


export default AdminDashboard;
