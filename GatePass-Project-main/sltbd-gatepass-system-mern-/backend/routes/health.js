const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // MongoDB connection check
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected');
    }

    res.status(200).json({
      status: 'ok',
      service: 'Gate-Pass',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
