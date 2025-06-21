const { validationResult } = require('express-validator');
const Waitlist = require('../models/Waitlist');

/**
 * @desc    Join waitlist
 * @route   POST /api/waitlist
 * @access  Public
 */
exports.joinWaitlist = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, firstName, lastName, company, role, source } = req.body;

    // Extract metadata from request
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.get('Referer'),
    };

    // Check if email already exists
    const existingEntry = await Waitlist.findOne({ email });
    if (existingEntry) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered for waitlist',
        data: {
          email: existingEntry.email,
          joinedAt: existingEntry.createdAt,
        },
      });
    }

    // Create new waitlist entry
    const waitlistEntry = new Waitlist({
      email,
      firstName,
      lastName,
      company,
      role,
      source: source || 'landing_page',
      metadata,
    });

    await waitlistEntry.save();

    // Get current waitlist position (approximate)
    const position = await Waitlist.countDocuments({
      createdAt: { $lte: waitlistEntry.createdAt }
    });

    res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist!',
      data: {
        email: waitlistEntry.email,
        position,
        joinedAt: waitlistEntry.createdAt,
      },
    });

  } catch (error) {
    console.error('Waitlist join error:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered for waitlist',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while joining waitlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get waitlist stats
 * @route   GET /api/waitlist/stats
 * @access  Private (Admin only)
 */
exports.getWaitlistStats = async (req, res) => {
  try {
    const stats = await Waitlist.getStats();
    
    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSignups = await Waitlist.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get signups by source
    const signupsBySource = await Waitlist.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        recentSignups,
        signupsBySource,
      },
    });

  } catch (error) {
    console.error('Waitlist stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching waitlist stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get waitlist entries
 * @route   GET /api/waitlist
 * @access  Private (Admin only)
 */
exports.getWaitlistEntries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const entries = await Waitlist.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-metadata'); // Exclude metadata for privacy

    const total = await Waitlist.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        entries,
        pagination: {
          currentPage: page,
          totalPages,
          totalEntries: total,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });

  } catch (error) {
    console.error('Waitlist entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching waitlist entries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update waitlist entry notification status
 * @route   PUT /api/waitlist/:id/notify
 * @access  Private (Admin only)
 */
exports.updateNotificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isNotified } = req.body;

    const entry = await Waitlist.findByIdAndUpdate(
      id,
      { 
        isNotified,
        notifiedAt: isNotified ? new Date() : null,
      },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification status updated successfully',
      data: entry,
    });

  } catch (error) {
    console.error('Update notification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notification status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
