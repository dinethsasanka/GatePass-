const express = require('express');
const multer = require('multer');
const { addLocation, addCategory, bulkUploadLocations, bulkUploadCategories, getLocations, getCategories } = require('../controllers/adminController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/locations', addLocation);
router.post('/categories', addCategory);
router.post('/locations/bulk', upload.single('file'), bulkUploadLocations);
router.post('/categories/bulk', upload.single('file'), bulkUploadCategories);
router.get('/locations', getLocations);
router.get('/categories', getCategories);


module.exports = router;
