const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  fetchItemCategories,
  fetchItemBySerialNumber,
  fetchHolidays,
  syncHolidays,
} = require("../controllers/intranetController");

// Item categories route
router.get("/categories", protect, fetchItemCategories);

// Item by serial number route
router.get("/items/:serialNumber", protect, fetchItemBySerialNumber);

// Holidays route
router.get("/holidays", protect, fetchHolidays);

// Sync holidays to database
router.post("/holidays/sync", protect, syncHolidays);

module.exports = router;
