const mongoose = require("mongoose");

const erpLocationSchema = new mongoose.Schema(
  {
    locationId: {
      type: String,
      required: true,
    },
    fingerscanLocation: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ErpLocation", erpLocationSchema);
