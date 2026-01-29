const { getHolidays } = require("../services/intranetService");

const DEV_TIME_OVERRIDE = {
  enable: false,
  date: "2025-12-25",
  time: "09:30",
};

const isRestrictedPeriod = async (override = {}) => {
  let now;

  if (DEV_TIME_OVERRIDE.enable) {
    now = new Date(`${DEV_TIME_OVERRIDE.date}T${DEV_TIME_OVERRIDE.time}`);
  } else if (override?.date) {
    now = new Date(`${override.date}T${override.time || "00:00"}`);
  } else {
    now = new Date();
  }

  const todayISO = now.toISOString().split("T")[0];

  // Public Holiday (HIGHEST PRIORITY) - Check via Intranet API
  try {
    const currentYear = now.getFullYear();
    const holidays = await getHolidays(currentYear);

    // Find if today is a holiday
    const todayHoliday = holidays.find((h) => h.dateISO === todayISO);

    if (todayHoliday) {
      return {
        restricted: true,
        reason: "HOLIDAY",
        holidayName: todayHoliday.name,
        date: todayISO,
      };
    }
  } catch (error) {
    console.error("Error fetching holidays from intranet API:", error.message);
    // If API fails, continue to check other restrictions (weekend, off-hours)
    // Don't block the entire flow due to API failure
  }

  // Weekend
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) {
    return {
      restricted: true,
      reason: "WEEKEND",
    };
  }

  // Off-hours (ONLY weekdays)
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const officeStart = 9 * 60; // 09:00
  const officeEnd = 17 * 60; // 17:00

  if (currentTime < officeStart || currentTime >= officeEnd) {
    return {
      restricted: true,
      reason: "OFF_HOURS",
    };
  }

  // Normal working period
  return {
    restricted: false,
    reason: null,
  };
};

module.exports = {
  isRestrictedPeriod,
};
