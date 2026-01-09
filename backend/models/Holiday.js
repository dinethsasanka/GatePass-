// models/Holiday.js
const mongoose = require("mongoose");

const HolidaySchema = new mongoose.Schema(
  {
    dateISO: { type: String, required: true, unique: true }, // "YYYY-MM-DD" (Asia/Colombo)
    name: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Holiday", HolidaySchema);
