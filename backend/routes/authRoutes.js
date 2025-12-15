const express = require('express');
const { registerUser, loginUser, azureLogin, getAzureLoginUrl } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/azure-login', azureLogin);
router.get('/azure-login-url', getAzureLoginUrl);

module.exports = router;
