const express = require('express');
const router = express.Router();
const { register, login, getMe, validateAdminPassword } = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');
const { registerValidator, loginValidator, validatePasswordValidator } = require('../middleware/validators');

// Register route
router.post('/register', registerValidator, register);

// Login route
router.post('/login', loginValidator, login);

// Get current user route
router.get('/me', protect, getMe);

// Validate admin password for sensitive operations
router.post('/validate-password', protect, isAdmin, validatePasswordValidator, validateAdminPassword);

module.exports = router;
