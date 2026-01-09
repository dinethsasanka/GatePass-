const ErpLocation = require("../models/ErpLocation");

const getErpLocations = async (req, res) => {
  try {
    const locations = await ErpLocation.find().sort({
      fingerscanLocation: 1,
    });

    res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch ERP locations",
      error: error.message,
    });
  }
};

module.exports = {
  getErpLocations,
};
