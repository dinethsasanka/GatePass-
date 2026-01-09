import axiosInstance from "./axiosConfig";
import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

export const searchSenderByServiceNo = async (serviceNo) => {
  if (!serviceNo) throw new Error("Service number is required");

  try {
    const response = await axiosInstance.get(`/users/${serviceNo}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Receiver not found");
    }
    throw new Error("Failed to search receiver");
  }
};

export const searchReceiverByServiceNo = async (serviceNo) => {
  if (!serviceNo) throw new Error("Service number is required");

  try {
    const response = await axiosInstance.get(`/users/${serviceNo}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Receiver not found");
    }
    throw new Error("Failed to search receiver");
  }
};

export const searchEmployeeByServiceNo = async (serviceNo) => {
  if (!serviceNo) throw new Error("Service number is required");

  try {
    const response = await axiosInstance.post("/erp/employee-details", {
      employeeNo: serviceNo,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Search employee error:",
      error.response?.data || error.message
    );

    if (error.response?.status === 404) {
      throw new Error("Employee not found");
    }
    if (error.response?.status === 400) {
      throw new Error("Service number is invalid");
    }
    if (error.response?.status === 401) {
      throw new Error("Please login to continue");
    }

    throw new Error("Failed to search employee");
  }
};

export const getExecutiveOfficers = async () => {
  const response = await axiosInstance.get(`/users/role/Approver`);
  return response.data;
};
// export const getExecutiveOfficersForNewRequest = async () => {
//   const response = await axiosInstance.get("/users/role/Approver");

//   return {
//     restricted: false,
//     reason: null,
//     officers: response.data,
//   };
// };

export const getExecutiveOfficersForNewRequest = async () => {
  const response = await axiosInstance.get(`/executives/for-new-request`);
  return response.data;
};

/**
 * Get executive officers from ERP hierarchy based on logged-in employee
 * This replaces MongoDB-based executive lookup with real-time ERP data
 * @param {string} employeeNo - The logged-in employee's service number
 * @returns {Promise} Hierarchy data with executives and immediate supervisor
 */
export const getExecutiveOfficersFromHierarchy = async (employeeNo) => {
  try {
    const response = await axiosInstance.get(`/executives/hierarchy`, {
      params: { employeeNo },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching hierarchy from ERP:", error);
    throw error;
  }
};

export const createGatePassRequest = async (formData) => {
  try {
    const response = await axiosInstance.post(`/requests`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to create request"
    );
  }
};

export const getGatePassRequest = async (employeeServiceNo) => {
  try {
    const response = await axiosInstance.get(`/requests/${employeeServiceNo}`);
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    return []; // Return empty array instead of throwing error
  }
};

export const getImageUrl = async (imageData) => {
  try {
    // If imageData is null or undefined, return null
    if (!imageData) {
      console.warn("No image data provided");
      return null;
    }

    // If it's an object with a url property (your schema structure)
    if (typeof imageData === "object" && imageData.url) {
      // Return the full URL by prepending the backend URL
      return `${API_BASE_URL}${imageData.url}`;
    }

    // If it's just a string path
    if (typeof imageData === "string") {
      // If it already starts with http, return as is
      if (imageData.startsWith("http")) {
        return imageData;
      }

      // If it starts with /uploads, prepend the backend URL
      if (imageData.startsWith("/uploads")) {
        return `${API_BASE_URL}${imageData}`;
      }

      // Otherwise, assume it's a relative path
      return `${API_BASE_URL}/uploads/images/${imageData}`;
    }

    console.warn("Invalid image data format:", imageData);
    return null;
  } catch (error) {
    console.error("Error getting image URL:", error);
    return null;
  }
};
/*export const getImageUrl = async (imageData) => {
  try {
    // If imageData is null or undefined, return null
    if (!imageData) {
      console.warn('No image data provided');
      return null;
    }

    // If it's an object with a url property (your schema structure)
    if (typeof imageData === 'object' && imageData.url) {
      // ⭐ Return the full URL by prepending the backend URL
      return `${API_BASE_URL}${imageData.url}`;
    }

    // If it's just a string path
    if (typeof imageData === 'string') {
      // If it already starts with http, return as is
      if (imageData.startsWith('http')) {
        return imageData;
      }
      
      // If it starts with /uploads, prepend the backend URL
      if (imageData.startsWith('/uploads')) {
        return `${API_BASE_URL}${imageData}`;
      }
      
      // Otherwise, assume it's a relative path
      return `${API_BASE_URL}/uploads/images/${imageData}`;
    }

    console.warn('Invalid image data format:', imageData);
    return null;
  } catch (error) {
    console.error('Error getting image URL:', error);
    return null;
  }
};*/

// ⭐ Alternative synchronous version (recommended for your use case)
/*export const getImageUrlSync = (imageData) => {
  if (!imageData) {
    return null;
  }

  // If it's an object with a url property (your schema structure)
  if (typeof imageData === 'object' && imageData.url) {
    return `${API_BASE_URL}${imageData.url}`;
  }

  // If it's just a string path
  if (typeof imageData === 'string') {
    if (imageData.startsWith('http')) {
      return imageData;
    }
    
    if (imageData.startsWith('/backend/uploads')) {
      return `${API_BASE_URL}${imageData}`;
    }
    
    return `${API_BASE_URL}/backend/uploads/images/${imageData}`;
  }

  return null;
};*/

// Alternative synchronous version (recommended for your use case)
export const getImageUrlSync = (imageData) => {
  if (!imageData) {
    return null;
  }

  // If it's an object with a url property (your schema structure)
  if (typeof imageData === "object" && imageData.url) {
    return `${API_BASE_URL}${imageData.url}`;
  }

  // If it's just a string path
  if (typeof imageData === "string") {
    if (imageData.startsWith("http")) {
      return imageData;
    }

    if (imageData.startsWith("/backend/uploads")) {
      return `${API_BASE_URL}${imageData}`;
    }

    return `${API_BASE_URL}/backend/uploads/images/${imageData}`;
  }

  return null;
};

/*export const getExecutiveOfficers = async () => {
  try {
    const response = await axiosInstance.get(`/users/role/Approver`);
    return response.data;
  } catch (error) {
    console.error("Error fetching executive officers:", error);
    return [];
  }
};*/

export const updateExecutiveOfficer = async (
  requestId,
  executiveOfficerServiceNo
) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.patch(
      `${API_BASE_URL}/requests/${requestId}/executive`,
      { executiveOfficerServiceNo },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to update executive officer");
  }
};

export const getErpLocations = async () => {
  try {
    const response = await axiosInstance.get("/erp/erp-locations");
    return response.data?.data || [];
  } catch (error) {
    console.error(
      "Error fetching ERP locations:",
      error.response?.data || error.message || error
    );
    return [];
  }
};

export const getCategories = async () => {
  try {
    const response = await axiosInstance.get(`/admin/categories`);
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const cancelRequest = async (referenceNumber) => {
  try {
    const response = await axiosInstance.patch(
      `/requests/${referenceNumber}/cancel`,
      {}
    );
    return response.data;
  } catch (error) {
    console.error("Error canceling request:", error);
    throw error;
  }
};

export const updateReturnableItems = async (referenceNumber, items) => {
  const { data } = await axiosInstance.put(
    `/requests/${referenceNumber}/items`,
    { items } // [{ _id, serialNumber, model }]
  );
  return data;
};
