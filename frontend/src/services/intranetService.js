import axiosInstance from "./axiosConfig";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const unwrapData = (payload) => {
  if (payload && payload.success === true && payload.data !== undefined) {
    return payload.data;
  }

  return payload;
};

const normalizeCategories = (payload) => {
  const level1 = unwrapData(payload);
  const level2 = unwrapData(level1);
  const list = Array.isArray(level2) ? level2 : [];

  return list
    .map((item) => {
      if (typeof item === "string") return item;
      return (
        item?.categoryDescription ||
        item?.itemCategory ||
        item?.category ||
        item?.name ||
        item?.CATEGORY_DESCRIPTION ||
        item?.ITEM_CATEGORY ||
        item?.CATEGORY_NAME ||
        null
      );
    })
    .filter(Boolean);
};

const normalizeItem = (payload) => {
  const level1 = unwrapData(payload);
  const level2 = unwrapData(level1);
  let item = level2;

  if (Array.isArray(level2)) {
    item = level2[0];
  }

  if (!item || typeof item !== "object") {
    return item;
  }

  const itemCode = item.itemCode || item.item_code || item.ITEM_CODE || item.code;
  const itemDescription =
    item.itemDescription ||
    item.itemName ||
    item.description ||
    item.ITEM_DESCRIPTION ||
    item.ITEM_NAME;
  const itemCategory =
    item.itemCategory ||
    item.category ||
    item.ITEM_CATEGORY ||
    item.CATEGORY;
  const categoryDescription =
    item.categoryDescription ||
    item.itemCategoryDescription ||
    item.ITEM_CATEGORY_DESCRIPTION ||
    itemCategory;
  const serialNumber =
    item.serialNumber ||
    item.serialNo ||
    item.SERIAL_NO ||
    item.ITEM_SERIAL_NO;

  return {
    ...item,
    itemCode: itemCode || "",
    itemDescription: itemDescription || "",
    itemCategory: itemCategory || "",
    categoryDescription: categoryDescription || "",
    serialNumber: serialNumber || "",
  };
};

const normalizeHolidays = (payload) => {
  const level1 = unwrapData(payload);
  const level2 = unwrapData(level1);
  const list = Array.isArray(level2) ? level2 : [];

  return list.map((holiday) => {
    const dateISO =
      holiday?.dateISO ||
      holiday?.holidayDate?.split("T")?.[0] ||
      holiday?.HOLIDAY_DATE?.split("T")?.[0] ||
      "";

    return {
      ...holiday,
      dateISO,
      name: holiday?.name || holiday?.holidayName || holiday?.HOLIDAY_NAME || "",
      holidayName:
        holiday?.holidayName || holiday?.name || holiday?.HOLIDAY_NAME || "",
    };
  });
};

/**
 * Get all item categories from ERP GatePassSystem
 * @returns {Promise<Array>} List of item categories
 */
export const getItemCategories = async () => {
  try {
    const response = await axiosInstance.post(
      `${API_BASE_URL}/erp/item-categories`,
      {},
    );

    return normalizeCategories(response.data);
  } catch (error) {
    console.error("Error fetching item categories:", error);
    throw error;
  }
};

/**
 * Get item details by serial number from ERP GatePassSystem
 * @param {string} serialNumber - The serial number of the item
 * @returns {Promise<Object>} Item details
 */
export const getItemBySerialNumber = async (serialNumber) => {
  try {
    const response = await axiosInstance.post(
      `${API_BASE_URL}/erp/items-by-serial`,
      { serialNo: serialNumber },
    );

    const normalizedItem = normalizeItem(response.data);
    if (!normalizedItem) {
      const err = new Error(`Item with serial number ${serialNumber} not found`);
      err.response = { status: 404 };
      throw err;
    }

    return normalizedItem;
  } catch (error) {
    console.error(`Error fetching item ${serialNumber}:`, error);
    throw error;
  }
};

/**
 * Get holidays for a specific year (or month) from ERP GatePassSystem
 * @param {number} year - The year to get holidays for (default: current year)
 * @param {number} month - Optional month (1-12)
 * @returns {Promise<Array>} List of holidays
 */
export const getHolidays = async (year, month) => {
  const targetYear = year ?? new Date().getFullYear();
  const hasValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;

  try {
    const endpoint = hasValidMonth
      ? `${API_BASE_URL}/erp/holidays-by-month`
      : `${API_BASE_URL}/erp/holidays-by-year`;

    const payload = hasValidMonth
      ? { year: targetYear, month }
      : { year: targetYear };

    const response = await axiosInstance.post(endpoint, payload);

    return normalizeHolidays(response.data);
  } catch (error) {
    if (hasValidMonth) {
      console.error(
        `Error fetching holidays for year ${targetYear}, month ${month}:`,
        error,
      );
    } else {
      console.error(`Error fetching holidays for year ${targetYear}:`, error);
    }
    throw error;
  }
};

/**
 * Get holidays for a specific year and month from ERP GatePassSystem
 * @param {number} year - The year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Array>} List of holidays
 */
export const getHolidaysByMonth = async (year, month) => {
  const targetYear = year ?? new Date().getFullYear();
  const targetMonth = month ?? new Date().getMonth() + 1;

  if (
    !Number.isInteger(targetMonth) ||
    targetMonth < 1 ||
    targetMonth > 12
  ) {
    throw new Error(
      `Invalid month "${targetMonth}". Month must be an integer between 1 and 12.`,
    );
  }

  try {
    return await getHolidays(targetYear, targetMonth);
  } catch (error) {
    console.error(
      `Error fetching holidays for year ${targetYear}, month ${targetMonth}:`,
      error,
    );
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
    const currentYear = year || new Date().getFullYear();
    const response = await axiosInstance.post(
      `${API_BASE_URL}/intranet/holidays/sync`,
      {},
      {
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
