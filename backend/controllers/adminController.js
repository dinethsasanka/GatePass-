const mongoose = require("mongoose");
const csvParser = require("csv-parser");
const { Readable } = require("stream");
const Location = require("../models/Location");
const Category = require("../models/Category");

const addLocation = async (req, res) => {
  try {
    const { location } = req.body;
    console.log(location);
    if (!location)
      return res.status(400).json({ error: "Location is required" });

    const newLocation = await Location.create({ name: location }); // Save to DB
    res.json({ message: "Location added successfully", location: newLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addCategory = async (req, res) => {
  try {
    const { category } = req.body;
    if (!category)
      return res.status(400).json({ error: "Category is required" });

    const newCategory = await Category.create({ name: category }); // Save to DB
    res.json({ message: "Category added successfully", category: newCategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bulkUploadLocations = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File is required" });

    const fileBuffer = req.file.buffer;
    const locationsArray = [];

    Readable.from(fileBuffer)
      .pipe(csvParser())
      .on("data", (row) => {
        // Check all possible ways the location might be stored
        let locationValue = null;

        // Try different key variations
        if (row.location) {
          locationValue = row.location;
        } else if (row["location"]) {
          locationValue = row["location"];
        } else if (row.Location) {
          locationValue = row.Location;
        } else {
          // If no location key found, take the first value
          const values = Object.values(row);
          if (values.length > 0) {
            locationValue = values[0];
          }
        }

        if (
          locationValue &&
          typeof locationValue === "string" &&
          locationValue.trim()
        ) {
          locationsArray.push({ name: locationValue.trim() });
        }
      })
      .on("end", async () => {
        try {
          if (locationsArray.length === 0) {
            return res
              .status(400)
              .json({ error: "No valid locations found in CSV" });
          }

          const result = await Location.insertMany(locationsArray, {
            ordered: false,
          });
          res.json({
            message: "Locations uploaded successfully",
            locations: result,
          });
        } catch (dbError) {
          res.status(500).json({ error: dbError.message });
        }
      })
      .on("error", (error) => {
        res.status(500).json({ error: "CSV parsing failed" });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bulkUploadCategories = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File is required" });

    const fileBuffer = req.file.buffer;
    const categoriesArray = [];

    Readable.from(fileBuffer)
      .pipe(csvParser())
      .on("data", (row) => {
        // More robust way to get the category value
        const categoryValue =
          row.category || row["category"] || Object.values(row)[0];

        if (categoryValue && categoryValue.trim()) {
          categoriesArray.push({ name: categoryValue.trim() });
        }
      })
      .on("end", async () => {
        try {
          if (categoriesArray.length === 0) {
            return res
              .status(400)
              .json({ error: "No valid categories found in CSV" });
          }

          const result = await Category.insertMany(categoriesArray, {
            ordered: false,
          });
          res.json({
            message: "Categories uploaded successfully",
            categories: result,
          });
        } catch (dbError) {
          res.status(500).json({ error: dbError.message });
        }
      })
      .on("error", (error) => {
        res.status(500).json({ error: "CSV parsing failed" });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLocations = async (req, res) => {
  try {
    console.log("🔄 [Admin] Fetching ONLY from erplocations collection...");

    // Get database connection
    const db = mongoose.connection.db;

    // Get ONLY from erplocations collection - NO FALLBACK
    const erpLocations = await db
      .collection("erplocations") // <-- Changed collection name
      .find({})
      .project({ _id: 1, locationId: 1, fingerscanLocation: 1 })
      .sort({ fingerscanLocation: 1 })
      .toArray();

    console.log(`📊 Found ${erpLocations.length} ERP locations`);

    // If no ERP locations found, return empty array
    if (erpLocations.length === 0) {
      console.warn("⚠️ No data found in erplocations collection!");
      return res.json([]);
    }

    // Transform ERP data
    const locations = erpLocations.map((loc) => ({
      _id: loc._id,
      name: loc.fingerscanLocation || "Unknown Location", // Use fingerscanLocation as name
      locationId: loc.locationId || "N/A",
      fingerscanLocation: loc.fingerscanLocation || "Unknown",
    }));

    // Sort alphabetically
    locations.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Sending ${locations.length} ERP locations`);
    console.log("📍 Sample:", locations[0]);

    res.json(locations);
  } catch (error) {
    console.error("❌ Error fetching from erplocations:", error);
    res.status(500).json({
      error: "Failed to fetch locations from erplocations collection",
      details: error.message,
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name)
      return res.status(400).json({ error: "Location name is required" });

    const updatedLocation = await Location.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json({
      message: "Location updated successfully",
      location: updatedLocation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedLocation = await Location.findByIdAndDelete(id);

    if (!deletedLocation) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json({
      message: "Location deleted successfully",
      location: deletedLocation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name)
      return res.status(400).json({ error: "Category name is required" });

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      message: "Category deleted successfully",
      category: deletedCategory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteInvalidLocations = async (req, res) => {
  try {
    // Delete locations that are only numbers or contain mostly numbers
    const result = await Location.deleteMany({
      $or: [
        { name: { $regex: /^\d+$/ } }, // Only digits
        { name: { $regex: /^\d+\.\d+$/ } }, // Decimal numbers
        { name: { $regex: /^[\d\s,.-]+$/ } }, // Numbers with spaces, commas, dots, dashes
      ],
    });

    res.json({
      message: `Deleted ${result.deletedCount} invalid location entries`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAllLocations = async (req, res) => {
  try {
    const result = await Location.deleteMany({});
    res.json({
      message: `Deleted all locations (${result.deletedCount} entries)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAllCategories = async (req, res) => {
  try {
    const result = await Category.deleteMany({});
    res.json({
      message: `Deleted all categories (${result.deletedCount} entries)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addLocation,
  addCategory,
  bulkUploadLocations,
  bulkUploadCategories,
  getLocations,
  getCategories,
  updateLocation,
  deleteLocation,
  updateCategory,
  deleteCategory,
  deleteInvalidLocations,
  deleteAllLocations,
  deleteAllCategories,
};
