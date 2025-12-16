import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

export const searchSenderByServiceNo = async (serviceNo) => {
  if (!serviceNo) throw new Error("Service number is required");

  try {
    const response = await axios.get(`${API_BASE_URL}/users/${serviceNo}`);
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
    const response = await axios.get(`${API_BASE_URL}/users/${serviceNo}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Receiver not found");
    }
    throw new Error("Failed to search receiver");
  }
};

export const createGatePassRequest = async (formData) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_BASE_URL}/requests`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
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
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${API_BASE_URL}/requests/${employeeServiceNo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    return []; // Return empty array instead of throwing error
  }
};

/*export const getImageUrl = async (path) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${API_BASE_URL}/requests/image/${encodeURIComponent(path)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.url;
  } catch (error) {
    console.error("Error fetching image URL:", error);
    return null;
  }
};*/
export const getImageUrl = async (imageData) => {
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
};

// ⭐ Alternative synchronous version (recommended for your use case)
export const getImageUrlSync = (imageData) => {
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
};

export const getExecutiveOfficers = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_BASE_URL}/users/role/Approver`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching executive officers:", error);
    return [];
  }
};

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

export const getLocations = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_BASE_URL}/admin/locations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
};

export const getCategories = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_BASE_URL}/admin/categories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const cancelRequest = async (referenceNumber) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.patch(
      `${API_BASE_URL}/requests/${referenceNumber}/cancel`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error canceling request:", error);
    throw error;
  }
};

export const updateReturnableItems = async (referenceNumber, items) => {
  const { data } = await axios.put(
    `${API_BASE_URL}/requests/${referenceNumber}/items`,
    { items } // [{ _id, serialNumber, model }]
  );
  return data;
};
