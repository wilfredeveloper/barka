const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  validateAdminPassword,
  registerWithOrganization,
  verifyEmail,
  resendVerificationEmail
} = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');
const { registerValidator, loginValidator, validatePasswordValidator } = require('../middleware/validators');
const { requireCompleteProfile } = require('../middleware/profileValidation');
const { check } = require('express-validator');

// Register route (legacy - for org_client or simple registration)
router.post('/register', registerValidator, register);

// Register with organization (new secure method for org_admin)
router.post('/register-with-organization', [
  check('firstName', 'First name is required').not().isEmpty(),
  check('lastName', 'Last name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  check('organizationName', 'Organization name is required').not().isEmpty(),
  check('organizationType', 'Organization type is required').not().isEmpty(),
  check('teamSize', 'Team size is required').not().isEmpty(),
  check('clientsPerMonth', 'Clients per month is required').not().isEmpty(),
], registerWithOrganization);

// Email verification routes
router.post('/verify-email', [
  check('email', 'Please include a valid email').isEmail(),
  check('token', 'Verification token is required').not().isEmpty(),
], verifyEmail);

router.post('/resend-verification', [
  check('email', 'Please include a valid email').isEmail(),
], resendVerificationEmail);

// Login route
router.post('/login', loginValidator, login);

// Get current user route (with profile validation)
router.get('/me', protect, requireCompleteProfile, getMe);

// Validate admin password for sensitive operations
router.post('/validate-password', protect, isAdmin, validatePasswordValidator, validateAdminPassword);

module.exports = router;
