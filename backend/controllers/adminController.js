const csvParser = require('csv-parser');
const { Readable } = require('stream');
const Location = require('../models/Location');
const Category = require('../models/Category');


const addLocation = async (req, res) => {
  try {
    const { location } = req.body;
    console.log(location);
    if (!location) return res.status(400).json({ error: 'Location is required' });

    const newLocation = await Location.create({ name: location }); // Save to DB
    res.json({ message: 'Location added successfully', location: newLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const addCategory = async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) return res.status(400).json({ error: 'Category is required' });

    const newCategory = await Category.create({ name: category }); // Save to DB
    res.json({ message: 'Category added successfully', category: newCategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const bulkUploadLocations = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const fileBuffer = req.file.buffer;
    const locationsArray = [];

    Readable.from(fileBuffer)
      .pipe(csvParser())
      .on('data', (row) => {
        // Check all possible ways the location might be stored
        let locationValue = null;

        // Try different key variations
        if (row.location) {
          locationValue = row.location;
        } else if (row['location']) {
          locationValue = row['location'];
        } else if (row.Location) {
          locationValue = row.Location;
        } else {
          // If no location key found, take the first value
          const values = Object.values(row);
          if (values.length > 0) {
            locationValue = values[0];
          }
        }

        if (locationValue && typeof locationValue === 'string' && locationValue.trim()) {
          locationsArray.push({ name: locationValue.trim() });
        }
      })
      .on('end', async () => {
        try {
          if (locationsArray.length === 0) {
            return res.status(400).json({ error: 'No valid locations found in CSV' });
          }

          const result = await Location.insertMany(locationsArray, { ordered: false });
          res.json({ message: 'Locations uploaded successfully', locations: result });
        } catch (dbError) {
          res.status(500).json({ error: dbError.message });
        }
      })
      .on('error', (error) => {
        res.status(500).json({ error: 'CSV parsing failed' });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bulkUploadCategories = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const fileBuffer = req.file.buffer;
    const categoriesArray = [];

    Readable.from(fileBuffer)
      .pipe(csvParser())
      .on('data', (row) => {
        // More robust way to get the category value
        const categoryValue = row.category || row['category'] || Object.values(row)[0];

        if (categoryValue && categoryValue.trim()) {
          categoriesArray.push({ name: categoryValue.trim() });
        }
      })
      .on('end', async () => {
        try {
          if (categoriesArray.length === 0) {
            return res.status(400).json({ error: 'No valid categories found in CSV' });
          }

          const result = await Category.insertMany(categoriesArray, { ordered: false });
          res.json({ message: 'Categories uploaded successfully', categories: result });
        } catch (dbError) {
          res.status(500).json({ error: dbError.message });
        }
      })
      .on('error', (error) => {
        res.status(500).json({ error: 'CSV parsing failed' });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const getLocations = async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
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


module.exports = { addLocation, addCategory, bulkUploadLocations, bulkUploadCategories, getLocations, getCategories };
