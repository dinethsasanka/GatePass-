const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');

const {
    createRequest,
    getRequests,
    getRequestImage,
    getRequestByEmployeeServiceNo,
    updateRequest,
    deleteRequest,
    updateRequestStatus,
    getRequestsByStatus,
    getRequestsByItemReturnable,
    getRequestsByReceiverAvailable,
    updateExecutiveOfficer,
    cancelRequest
} = require('../controllers/requestController');

// Configure multer for memory storage
// Files will be stored in req.files as Buffer objects
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
};

// Configure multer with storage, limits, and file filter
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 50 // Maximum 50 files per request
    },
    fileFilter: fileFilter
});

// Routes with updated multer configuration
router.post('/', protect, upload.array('itemPhotos', 50), createRequest);
router.get('/', protect, getRequests);
router.get('/image/:path', protect, getRequestImage);
router.get('/:serviceNo', protect, getRequestByEmployeeServiceNo);
router.put('/:id', protect, upload.array('itemPhotos', 50), updateRequest);
router.delete('/:id', protect, deleteRequest);
router.patch('/:id/status', protect, updateRequestStatus);
router.get('/status/:status', protect, getRequestsByStatus);
router.get('/filter/returnable/:returnable', protect, getRequestsByItemReturnable);
router.get('/filter/receiver/:available', protect, getRequestsByReceiverAvailable);
router.patch('/:id/executive', protect, updateExecutiveOfficer);
router.patch('/:referenceNumber/cancel', cancelRequest);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File is too large. Maximum size is 5MB per file.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                message: 'Too many files. Maximum is 50 files per request.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                message: 'Unexpected field in file upload.'
            });
        }
    }
    
    if (error.message === 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.') {
        return res.status(400).json({
            message: error.message
        });
    }
    
    next(error);
});

module.exports = router;