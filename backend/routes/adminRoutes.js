const express = require('express');
const multer = require('multer');
const { 
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
  deleteAllCategories
} = require('../controllers/adminController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/locations', addLocation);
router.post('/categories', addCategory);
router.post('/locations/bulk', upload.single('file'), bulkUploadLocations);
router.post('/categories/bulk', upload.single('file'), bulkUploadCategories);
router.get('/locations', getLocations);
router.get('/categories', getCategories);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);
router.delete('/locations/cleanup/invalid', deleteInvalidLocations);
router.delete('/locations/cleanup/all', deleteAllLocations);
router.delete('/categories/cleanup/all', deleteAllCategories);


module.exports = router;
