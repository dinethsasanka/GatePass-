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

/**
 * Get branch name by location ID
 * @param {string} locationId - e.g., "L001"
 * @returns {object} - Branch details with fingerscanLocation
 */
const getBranchNameByLocationId = async (req, res) => {
  try {
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: "Location ID is required",
      });
    }

    const location = await ErpLocation.findOne({ locationId: locationId });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `No branch found for location ID: ${locationId}`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        locationId: location.locationId,
        branchName: location.fingerscanLocation,
      },
    });
  } catch (error) {
    console.error("Error fetching branch name:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch branch name",
      error: error.message,
    });
  }
};

module.exports = {
  getErpLocations,
  getBranchNameByLocationId,
};
