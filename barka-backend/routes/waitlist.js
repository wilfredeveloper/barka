const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  joinWaitlist,
  getWaitlistStats,
  getWaitlistEntries,
  updateNotificationStatus,
} = require('../controllers/waitlistController');
const { protect, isAdmin } = require('../middleware/auth');

// Validation middleware for joining waitlist
const joinWaitlistValidator = [
  check('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  check('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  check('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  check('company')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name must be between 1 and 100 characters'),
  check('role')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Role must be between 1 and 100 characters'),
  check('source')
    .optional()
    .isIn(['landing_page', 'referral', 'social_media', 'other'])
    .withMessage('Invalid source value'),
];

// Validation middleware for notification status update
const updateNotificationValidator = [
  check('isNotified')
    .isBoolean()
    .withMessage('isNotified must be a boolean value'),
];

// @route   POST /api/waitlist
// @desc    Join waitlist
// @access  Public
router.post('/', joinWaitlistValidator, joinWaitlist);

// @route   GET /api/waitlist/stats
// @desc    Get waitlist statistics
// @access  Private (Admin only)
router.get('/stats', protect, isAdmin, getWaitlistStats);

// @route   GET /api/waitlist
// @desc    Get waitlist entries with pagination
// @access  Private (Admin only)
router.get('/', protect, isAdmin, getWaitlistEntries);

// @route   PUT /api/waitlist/:id/notify
// @desc    Update notification status for waitlist entry
// @access  Private (Admin only)
router.put('/:id/notify', protect, isAdmin, updateNotificationValidator, updateNotificationStatus);

module.exports = router;
