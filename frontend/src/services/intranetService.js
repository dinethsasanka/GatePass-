import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Get all item categories
 * @returns {Promise<Array>} List of item categories
 */
export const getItemCategories = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_BASE_URL}/intranet/categories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching item categories:", error);
    throw error;
  }
};

/**
 * Get item details by serial number
 * @param {string} serialNumber - The serial number of the item
 * @returns {Promise<Object>} Item details
 */
export const getItemBySerialNumber = async (serialNumber) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${API_BASE_URL}/intranet/items/${serialNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching item ${serialNumber}:`, error);
    throw error;
  }
};

/**
 * Get holidays for a specific year
 * @param {number} year - The year to get holidays for (default: current year)
 * @returns {Promise<Array>} List of holidays
 */
export const getHolidays = async (year) => {
  try {
    const token = localStorage.getItem("token");
    const currentYear = year || new Date().getFullYear();
    const response = await axios.get(`${API_BASE_URL}/intranet/holidays`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        year: currentYear,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching holidays for ${year}:`, error);
    throw error;
  }
};

/**
 * Sync holidays from intranet API to database
 * @param {number} year - The year to sync holidays for (default: current year)
 * @returns {Promise<Object>} Sync result
 */
export const syncHolidays = async (year) => {
  try {
    const token = localStorage.getItem("token");
    const currentYear = year || new Date().getFullYear();
    const response = await axios.post(
      `${API_BASE_URL}/intranet/holidays/sync`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          year: currentYear,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(`Error syncing holidays for ${year}:`, error);
    throw error;
  }
};
