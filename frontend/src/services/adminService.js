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
  },

  getLocations: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/locations`);
    return response.json();
  },

  getCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/categories`);
    return response.json();
  },

  updateLocation: async (id, name) => {
    const response = await fetch(`${API_BASE_URL}/admin/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return response.json();
  },

  deleteLocation: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/locations/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  updateCategory: async (id, name) => {
    const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return response.json();
  },

  deleteCategory: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  deleteInvalidLocations: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/locations/cleanup/invalid`, {
      method: 'DELETE',
    });
    return response.json();
  },

  deleteAllLocations: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/locations/cleanup/all`, {
      method: 'DELETE',
    });
    return response.json();
  },

  deleteAllCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/categories/cleanup/all`, {
      method: 'DELETE',
    });
    return response.json();
  },
};
