// Sample code for authRoutes.js
const express = require('express');
const { GetItemForTracking } = require('../controllers/Itemtracking');
//const { registerUser, loginUser } = require('../controllers/authController');
const router = express.Router();
// router.post('/register', registerUser);
router.post('/getItemForTrack', GetItemForTracking);
module.exports = router;