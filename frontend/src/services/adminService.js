export const API_BASE_URL = import.meta.env.VITE_API_URL;

export const adminService = {
  addLocation: async (location) => {
    const response = await fetch(`${API_BASE_URL}/admin/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
    });
    return response.json();
  },

  addCategory: async (category) => {
    const response = await fetch(`${API_BASE_URL}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    return response.json();
  },

  bulkUploadLocations: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/admin/locations/bulk`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  bulkUploadCategories: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/admin/categories/bulk`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }
};
