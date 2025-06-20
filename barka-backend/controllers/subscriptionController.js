const { User, ROLES } = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * @desc    Create a new subscription
 * @route   POST /api/subscriptions
 * @access  Private (Org Admin)
 */
exports.createSubscription = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { planId } = req.body;

    // Get the current user
    const user = await User.findById(req.user.id);
    
    // Check if user is an org admin
    if (user.role !== ROLES.ORG_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only organization admins can create subscriptions'
      });
    }
    
    // Check if user has an organization
    if (!user.organization) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization to create a subscription'
      });
    }

    // In a real app, this would connect to a payment processor
    // For now, we'll just simulate a successful subscription
    
    // Return success response
    res.status(201).json({
      success: true,
      data: {
        subscriptionId: `sub_${Date.now()}`,
        planId,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      }
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during subscription creation',
      error: error.message
    });
  }
};
