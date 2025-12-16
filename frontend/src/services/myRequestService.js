import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

export const markItemsAsReturned = async (referenceNumber, serialNumbers, remarks = null) => {
  try {
    // Build payload
    const payload = { serialNumbers };
    if (remarks) {
      payload.remarks = remarks;
    }

    console.log(`Calling API: ${API_BASE_URL}/myRequest/${referenceNumber}/mark-returned`);
    console.log('Payload:', payload);

    const response = await axios.put(
      `${API_BASE_URL}/myRequest/${referenceNumber}/mark-returned`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log('API Response:', response.data);
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

  if (typeof imageData === 'object' && imageData.url) {
    return `${API_BASE_URL}${imageData.url}`;
  }

  if (typeof imageData === 'string') {
    if (imageData.startsWith('http')) {
      return imageData;
    }
    if (imageData.startsWith('/uploads')) {
      return `${API_BASE_URL}${imageData}`;
    }
    return `${API_BASE_URL}/uploads/images/${imageData}`;
  }

  return null;
};

