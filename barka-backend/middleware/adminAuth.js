const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Admin authentication middleware
 * Ensures the user is authenticated and has admin privileges
 */
const adminAuth = async (req, res, next) => {
  try {
    // Check if user is already authenticated (from auth middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin role
    const validAdminRoles = ['org_admin', 'super_admin'];
    if (!validAdminRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // For org_admin, ensure they can only access their organization's data
    if (req.user.role === 'org_admin') {
      // Check if organizationId is provided in query or body
      const organizationId = req.query.organizationId || req.body.organizationId;
      
      if (organizationId && organizationId !== req.user.organizationId?.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Cannot access other organization data'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

module.exports = adminAuth;
