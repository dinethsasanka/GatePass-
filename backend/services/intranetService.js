const axios = require("axios");

// Intranet API Configuration
const INTRANET_BASE_URL = "http://172.25.41.33:8000";

// Create axios instance with default config
const intranetAxios = axios.create({
  baseURL: INTRANET_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all item categories
 * @returns {Promise<Array>} List of item categories
 */
const getItemCategories = async () => {
  try {
    console.log(
      "Fetching item categories from:",
      INTRANET_BASE_URL + "/items/categories",
    );
    const response = await intranetAxios.get("/items/categories");

    // Handle the response format: { status, data, message }
    if (
      response.data &&
      response.data.status === "success" &&
      Array.isArray(response.data.data)
    ) {
      return response.data.data; // Return the array of category strings
    }

    // Fallback if format is different
    return response.data;
  } catch (error) {
    console.error("Error fetching item categories:", error.message);
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      throw new Error(
        "Intranet API is not reachable. Please check network connectivity.",
      );
    }
    throw new Error(`Failed to fetch item categories: ${error.message}`);
  }
};

/**
 * Get item details by serial number
 * @param {string} serialNumber - The item serial number
 * @returns {Promise<Object>} Item details
 */
const getItemBySerialNumber = async (serialNumber) => {
  try {
    console.log(
      `Fetching item ${serialNumber} from:`,
      INTRANET_BASE_URL + `/items/${serialNumber}`,
    );
    const response = await intranetAxios.get(`/items/${serialNumber}`);

    // Handle the response format: { status, data, message }
    if (response.data && response.data.status === "success") {
      return response.data.data; // Return the item object
    }

    // Fallback if format is different
    return response.data;
  } catch (error) {
    console.error(`Error fetching item ${serialNumber}:`, error.message);
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      throw new Error(
        "Intranet API is not reachable. Please check network connectivity.",
      );
    }
    if (error.response?.status === 404) {
      throw new Error(`Item with serial number ${serialNumber} not found`);
    }
    throw new Error(`Failed to fetch item: ${error.message}`);
  }
};

/**
 * Get holidays for a specific year
 * @param {number} year - The year to get holidays for
 * @returns {Promise<Array>} List of holidays in standard format
 */
const getHolidays = async (year = new Date().getFullYear()) => {
  try {
    console.log(
      `Fetching holidays for year ${year} from:`,
      INTRANET_BASE_URL + `/holidays?year=${year}`,
    );
    const response = await intranetAxios.get(`/holidays`, {
      params: { year },
    });

    // Handle the response format: { status, data, message }
    if (
      response.data &&
      response.data.status === "success" &&
      Array.isArray(response.data.data)
    ) {
      // Transform the data to match our Holiday model format
      return response.data.data.map((holiday) => ({
        dateISO: new Date(holiday.holidayDate).toISOString().split("T")[0], // Convert to YYYY-MM-DD
        name: holiday.holidayName,
        calendarName: holiday.calendarName,
        originalDate: holiday.holidayDate,
      }));
    }

    // Fallback if format is different
    return response.data;
  } catch (error) {
    console.error(`Error fetching holidays for ${year}:`, error.message);
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      throw new Error(
        "Intranet API is not reachable. Please check network connectivity.",
      );
    }
    throw new Error(`Failed to fetch holidays: ${error.message}`);
  }
};

module.exports = {
  getItemCategories,
  getItemBySerialNumber,
  getHolidays,
};
