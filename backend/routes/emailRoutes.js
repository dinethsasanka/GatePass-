const express = require('express');
const { EmailForm } = require('../controllers/emailController');
const router = express.Router();

router.post('/send-email', EmailForm);


module.exports = router;