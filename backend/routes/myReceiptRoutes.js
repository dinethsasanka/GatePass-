// Sample code for authRoutes.js
const express = require('express');
const { getReicept } = require('../controllers/myReceiptController');
const router = express.Router();


router.get('/', getReicept);

module.exports = router;