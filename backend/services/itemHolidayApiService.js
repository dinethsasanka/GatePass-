const axios = require("axios");

// Item & Holiday API Configuration
const ITEM_HOLIDAY_API_BASE_URL = process.env.ITEM_HOLIDAY_API_BASE_URL;
const ITEM_HOLIDAY_API_USERNAME = process.env.ITEM_HOLIDAY_API_USERNAME;
const ITEM_HOLIDAY_API_PASSWORD = process.env.ITEM_HOLIDAY_API_PASSWORD;
const ITEM_HOLIDAY_API_TIMEOUT = parseInt(process.env.ITEM_HOLIDAY_API_TIMEOUT) || 30000;

// API Endpoints
const ENDPOINT_GET_CATEGORIES = process.env.ITEM_HOLIDAY_API_GET_CATEGORIES;
const ENDPOINT_GET_ITEM_BY_SERIAL = process.env.ITEM_HOLIDAY_API_GET_ITEM_BY_SERIAL;
const ENDPOINT_GET_HOLIDAYS_BY_YEAR = process.env.ITEM_HOLIDAY_API_GET_HOLIDAYS_BY_YEAR;
const ENDPOINT_GET_HOLIDAYS_BY_MONTH = process.env.ITEM_HOLIDAY_API_GET_HOLIDAYS_BY_MONTH;

// Validate required environment variables
if (!ITEM_HOLIDAY_API_BASE_URL) {
  throw new Error("ITEM_HOLIDAY_API_BASE_URL is not defined in environment variables");
}
if (!ITEM_HOLIDAY_API_USERNAME) {
  throw new Error("ITEM_HOLIDAY_API_USERNAME is not defined in environment variables");
}
if (!ITEM_HOLIDAY_API_PASSWORD) {
  throw new Error("ITEM_HOLIDAY_API_PASSWORD is not defined in environment variables");
}

// Create axios instance with default config
const itemHolidayApiAxios = axios.create({
  baseURL: ITEM_HOLIDAY_API_BASE_URL,
  timeout: ITEM_HOLIDAY_API_TIMEOUT,
  headers: {
    accept: "text/plain",
    "Content-Type": "application/json",
    UserName: ITEM_HOLIDAY_API_USERNAME,
    Password: ITEM_HOLIDAY_API_PASSWORD,
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
      ITEM_HOLIDAY_API_BASE_URL + ENDPOINT_GET_CATEGORIES,
    );
    const response = await itemHolidayApiAxios.post(ENDPOINT_GET_CATEGORIES);

    console.log("Raw API Response:", JSON.stringify(response.data, null, 2));

    // Handle the response - assuming it returns an array or object with data
    if (response.data) {
      let categories = [];

      // If response is array
      if (Array.isArray(response.data)) {
        categories = response.data;
      }
      // If response has a data property
      else if (response.data.data && Array.isArray(response.data.data)) {
        categories = response.data.data;
      }
      // If response has categories property
      else if (
        response.data.categories &&
        Array.isArray(response.data.categories)
      ) {
        categories = response.data.categories;
      }
      // Single object response
      else {
        categories = [response.data];
      }

      // Transform categories - handle both strings and objects
      const transformedCategories = categories
        .map((category) => {
          // If it's already a string, return it
          if (typeof category === "string") {
            return category;
          }
          // If it's an object, try to extract the category name
          // ERP API uses iteM_CATEGORY property (odd capitalization from API)
          return (
            category.iteM_CATEGORY ||
            category.itemCategory ||
            category.item_category ||
            category.category ||
            category.categoryName ||
            category.categoryDescription ||
            category.name ||
            category.description ||
            null
          );
        })
        .filter((cat) => cat && typeof cat === "string"); // Remove nulls and non-strings

      // Return unique categories only
      return [...new Set(transformedCategories)];
    }

    return [];
  } catch (error) {
    console.error("Error fetching item categories:", error.message);
    console.warn(
      "⚠️ Item & Holiday API not available, using fallback categories",
    );

    // Return comprehensive hardcoded categories as fallback
    return [
      "Network Equipment.Switches, Routers & Gateways",
      "Electro Mechanical Equipment.Machinery",
      "Power.UPS",
      "Vehicle.SUV",
      "Customer Premises Equipment.Data",
      "Miscellaneous.R&D Equipment",
      "Customer Premises Equipment.STB Accessories",
      "Network Equipment.MSAN",
      "Electrical Equipment.Household Appliance",
      "IT Equipment.Mobile/Smart Device",
      "Network Equipment.Data Communication",
      "Customer Premises Equipment.Router",
      "Network Equipment.Wi-Fi & Wi-Max",
      "Air Conditioner.AC Plant",
      "Electronic Equipment.Audio Visual",
      "Office Equipment.Printer",
      "IT Equipment.Storage",
      "Office Equipment.Multimedia",
      "Power.Battery & Rectifier",
      "Vehicle.Miscellaneous",
      "Network Equipment.SFP",
      "Customer Premises Equipment.FTTH",
      "Customer Premises Equipment.Router Accessories",
      "Electro Mechanical Equipment.Pump",
      "Network Equipment.PABX",
      "Network Equipment.Core Network",
      "Miscellaneous",
      "Customer Premises Equipment.LTE Accessories",
      "Enterprise Sales.Equipment",
      "IT Equipment.CPU",
      "Network Equipment.Transmission",
      "Office Equipment.Miscellaneous",
      "Vehicle.Bicycle",
      "Vehicle.Motor Cycle",
      "Customer Premises Equipment.Smart Device",
      "Printed Material.Miscellaneous",
      "Network Equipment.LTE",
      "IT Equipment.Accessories",
      "IT Equipment.Monitors & Displays",
      "Power.Generator",
      "IT Equipment.Server",
      "Office Equipment.Fax Machine",
      "Network Equipment.Miscellaneous",
      "Network Equipment.LTE Accessories",
      "Customer Premises Equipment.LTE",
      "Network Equipment.Accessories",
      "IT Equipment.Laptop",
      "Network Equipment.Ethernet Access",
      "Office Equipment.Photocopy",
      "Office Equipment.Scanner",
      "Customer Premises Equipment.STB",
      "Customer Premises Equipment.PSTN",
      "Customer Premises Equipment.Cordless Phone",
      "Customer Premises Equipment.PSTN Accessories",
    ];
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
      ITEM_HOLIDAY_API_BASE_URL + ENDPOINT_GET_ITEM_BY_SERIAL,
    );
    const response = await itemHolidayApiAxios.post(
      ENDPOINT_GET_ITEM_BY_SERIAL,
      {
        serialNo: serialNumber,
      },
    );

    console.log(
      `Raw API Response for ${serialNumber}:`,
      JSON.stringify(response.data, null, 2),
    );

    // Handle the response
    if (response.data) {
      let itemData = response.data;

      // If response has a data property
      if (response.data.data) {
        itemData = response.data.data;
      }

      // If itemData is an array, take the first item
      if (Array.isArray(itemData) && itemData.length > 0) {
        itemData = itemData[0];
      }

      // Transform the response to match expected format
      // Handle ERP API's weird capitalization
      const transformedItem = {
        serialNumber:
          itemData.seriaL_NUMBER ||
          itemData.serialNumber ||
          itemData.serial_number ||
          serialNumber,
        itemCode:
          itemData.iteM_CODE ||
          itemData.itemCode ||
          itemData.item_code ||
          "",
        itemDescription:
          itemData.iteM_DESCRIPTION ||
          itemData.itemDescription ||
          itemData.item_description ||
          itemData.description ||
          "",
        itemCategory:
          itemData.iteM_CATEGORY ||
          itemData.itemCategory ||
          itemData.item_category ||
          "",
        categoryDescription:
          itemData.categorY_DESCRIPTION ||
          itemData.categoryDescription ||
          itemData.category_description ||
          itemData.iteM_CATEGORY ||
          itemData.itemCategory ||
          "",
      };

      console.log("Transformed item data:", transformedItem);
      return transformedItem;
    }

    throw new Error(`Item with serial number ${serialNumber} not found`);
  } catch (error) {
    console.error(`Error fetching item ${serialNumber}:`, error.message);
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      throw new Error(
        "Item & Holiday API is not reachable. Please check network connectivity.",
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
 * @param {number} month - Optional month (0 for all months)
 * @returns {Promise<Array>} List of holidays in standard format
 */
const getHolidaysByYear = async (year = new Date().getFullYear()) => {
  try {
    console.log(
      `Fetching holidays for year ${year} from:`,
      ITEM_HOLIDAY_API_BASE_URL + ENDPOINT_GET_HOLIDAYS_BY_YEAR,
    );
    const response = await itemHolidayApiAxios.post(ENDPOINT_GET_HOLIDAYS_BY_YEAR, {
      year: year,
      month: 0, // 0 means all months
      serialNo: "string",
    });

    // Log raw response for debugging
    console.log(`Raw API Response for holidays ${year}:`, JSON.stringify(response.data, null, 2));

    // Handle the response
    if (response.data) {
      let holidays = response.data;

      // If response has a data property
      if (response.data.data && Array.isArray(response.data.data)) {
        holidays = response.data.data;
      } else if (Array.isArray(response.data)) {
        holidays = response.data;
      }

      // Transform the data to match our Holiday model format
      // Assuming the API returns objects with date and name properties
      if (Array.isArray(holidays)) {
        const transformedHolidays = [];
        
        for (const holiday of holidays) {
          try {
            // Handle different possible date field names
            const dateField =
              holiday.date ||
              holiday.holidayDate ||
              holiday.Date ||
              holiday.HolidayDate ||
              holiday.holidaY_DATE || // Handle weird capitalization like ERP API
              holiday.holida__DATE;
              
            const nameField =
              holiday.name ||
              holiday.holidayName ||
              holiday.Name ||
              holiday.HolidayName ||
              holiday.holidaY_NAME || // Handle weird capitalization
              holiday.holida__NAME;
              
            const calendarField =
              holiday.calendarName || 
              holiday.CalendarName || 
              holiday.calendaR_NAME || // Handle weird capitalization
              "SLT Calendar";

            if (!dateField) {
              console.warn('Skipping holiday with no date field:', holiday);
              continue;
            }

            // Parse date without timezone issues
            // API returns dates like "1/15/2026 12:00:00 AM"
            let holidayDate;
            let dateISO;
            
            try {
              // Try to parse the date string
              if (typeof dateField === 'string' && dateField.includes('/')) {
                // Manual parsing for M/D/YYYY format to avoid timezone issues
                const dateParts = dateField.split(' ')[0].split('/'); // Get "1/15/2026" part
                if (dateParts.length === 3) {
                  const month = dateParts[0].padStart(2, '0');
                  const day = dateParts[1].padStart(2, '0');
                  const year = dateParts[2];
                  dateISO = `${year}-${month}-${day}`;
                  holidayDate = new Date(dateISO + 'T00:00:00'); // Force midnight local time
                } else {
                  holidayDate = new Date(dateField);
                  dateISO = holidayDate.toISOString().split("T")[0];
                }
              } else {
                holidayDate = new Date(dateField);
                dateISO = holidayDate.toISOString().split("T")[0];
              }
            } catch (err) {
              console.warn(`Error parsing date: ${dateField}`, err);
              holidayDate = new Date(dateField);
              dateISO = holidayDate.toISOString().split("T")[0];
            }
            
            // Check if date is valid
            if (isNaN(holidayDate.getTime())) {
              console.warn(`Skipping holiday with invalid date: ${dateField}`, holiday);
              continue;
            }

            transformedHolidays.push({
              dateISO: dateISO, // Use manually parsed date to avoid timezone issues
              name: nameField || "Unknown Holiday",
              calendarName: calendarField,
              originalDate: dateField,
            });
          } catch (err) {
            console.warn(`Error transforming holiday:`, err.message, holiday);
          }
        }
        
        return transformedHolidays;
      }
    }

    return [];
  } catch (error) {
    console.error(`Error fetching holidays for ${year}:`, error.message);
    if (error.response) {
      console.error('API Response Error:', error.response.status, error.response.data);
    }
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      throw new Error(
        "Item & Holiday API is not reachable. Please check network connectivity.",
      );
    }
    throw new Error(`Failed to fetch holidays: ${error.message}`);
  }
};

/**
 * Get holidays for a specific year and month
 * @param {number} year - The year to get holidays for
 * @param {number} month - The month (1-12)
 * @returns {Promise<Array>} List of holidays in standard format
 */
const getHolidaysByMonth = async (
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
) => {
  try {
    console.log(
      `Fetching holidays for ${year}-${month} from:`,
      ITEM_HOLIDAY_API_BASE_URL + ENDPOINT_GET_HOLIDAYS_BY_MONTH,
    );
    const response = await itemHolidayApiAxios.post(ENDPOINT_GET_HOLIDAYS_BY_MONTH, {
      year: year,
      month: month,
      serialNo: "string",
    });

    // Handle the response
    if (response.data) {
      let holidays = response.data;

      // If response has a data property
      if (response.data.data && Array.isArray(response.data.data)) {
        holidays = response.data.data;
      } else if (Array.isArray(response.data)) {
        holidays = response.data;
      }

      // Transform the data to match our Holiday model format
      if (Array.isArray(holidays)) {
        return holidays.map((holiday) => {
          // Handle different possible date field names
          const dateField =
            holiday.date ||
            holiday.holidayDate ||
            holiday.Date ||
            holiday.HolidayDate;
          const nameField =
            holiday.name ||
            holiday.holidayName ||
            holiday.Name ||
            holiday.HolidayName;
          const calendarField =
            holiday.calendarName || holiday.CalendarName || "SLT Calendar";

          const holidayDate = new Date(dateField);
          return {
            dateISO: holidayDate.toISOString().split("T")[0], // Convert to YYYY-MM-DD
            name: nameField,
            calendarName: calendarField,
            originalDate: dateField,
          };
        });
      }
    }

    return [];
  } catch (error) {
    console.error(
      `Error fetching holidays for ${year}-${month}:`,
      error.message,
    );
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      throw new Error(
        "Item & Holiday API is not reachable. Please check network connectivity.",
      );
    }
    throw new Error(`Failed to fetch holidays: ${error.message}`);
  }
};

// Alias for backward compatibility
const getHolidays = getHolidaysByYear;

module.exports = {
  getItemCategories,
  getItemBySerialNumber,
  getHolidays,
  getHolidaysByYear,
  getHolidaysByMonth,
};
