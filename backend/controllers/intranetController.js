const {
  getItemCategories,
  getItemBySerialNumber,
  getHolidays,
} = require("../services/intranetService");
const Holiday = require("../models/Holiday");

/**
 * Get all item categories
 */
const fetchItemCategories = async (req, res) => {
  try {
    const categories = await getItemCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error in fetchItemCategories:", error.message);
    res.status(500).json({
      message: "Failed to fetch item categories",
      error: error.message,
    });
  }
};

/**
 * Get item by serial number
 */
const fetchItemBySerialNumber = async (req, res) => {
  try {
    const { serialNumber } = req.params;

    if (!serialNumber) {
      return res.status(400).json({
        message: "Serial number is required",
      });
    }

    const item = await getItemBySerialNumber(serialNumber);
    res.status(200).json(item);
  } catch (error) {
    console.error("Error in fetchItemBySerialNumber:", error.message);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        message: error.message,
        found: false,
      });
    }

    res.status(500).json({
      message: "Failed to fetch item",
      error: error.message,
    });
  }
};

/**
 * Get holidays for a year
 */
const fetchHolidays = async (req, res) => {
  try {
    const year = req.query.year
      ? parseInt(req.query.year)
      : new Date().getFullYear();

    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        message: "Invalid year parameter. Year must be between 2000 and 2100",
      });
    }

    const holidays = await getHolidays(year);
    res.status(200).json(holidays);
  } catch (error) {
    console.error("Error in fetchHolidays:", error.message);
    res.status(500).json({
      message: "Failed to fetch holidays",
      error: error.message,
    });
  }
};

/**
 * Sync holidays from intranet API to database
 */
const syncHolidays = async (req, res) => {
  try {
    const year = req.query.year
      ? parseInt(req.query.year)
      : new Date().getFullYear();

    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        message: "Invalid year parameter. Year must be between 2000 and 2100",
      });
    }

    console.log(`Syncing holidays for year ${year}...`);
    const holidays = await getHolidays(year);

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const holiday of holidays) {
      try {
        const existing = await Holiday.findOne({ dateISO: holiday.dateISO });

        if (existing) {
          // Update existing holiday if name changed
          if (existing.name !== holiday.name) {
            existing.name = holiday.name;
            await existing.save();
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          // Create new holiday
          await Holiday.create({
            dateISO: holiday.dateISO,
            name: holiday.name,
          });
          addedCount++;
        }
      } catch (err) {
        console.error(`Error syncing holiday ${holiday.dateISO}:`, err.message);
      }
    }

    res.status(200).json({
      message: "Holidays synced successfully",
      year,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: holidays.length,
    });
  } catch (error) {
    console.error("Error in syncHolidays:", error.message);
    res.status(500).json({
      message: "Failed to sync holidays",
      error: error.message,
    });
  }
};

module.exports = {
  fetchItemCategories,
  fetchItemBySerialNumber,
  fetchHolidays,
  syncHolidays,
};
