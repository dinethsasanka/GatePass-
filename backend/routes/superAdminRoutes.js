const express = require('express');
const { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getUserById,
  getUsersByType
} = require('../controllers/superAdminController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(superAdmin);

// User management routes
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/users/type/:userType', getUsersByType);

module.exports = router;
