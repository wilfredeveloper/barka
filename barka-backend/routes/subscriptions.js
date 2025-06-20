const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const subscriptionController = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../models/User');

// @route   POST /api/subscriptions
// @desc    Create a new subscription
// @access  Private (Org Admin)
router.post(
  '/',
  [
    protect,
    authorize([ROLES.ORG_ADMIN]),
    check('planId', 'Plan ID is required').not().isEmpty()
  ],
  subscriptionController.createSubscription
);

module.exports = router;
