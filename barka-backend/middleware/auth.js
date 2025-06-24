const jwt = require('jsonwebtoken');
const { User, ROLES } = require('../models/User');

// Middleware to protect routes - verify token
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id);

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // SECURITY: Check if email is verified (except for specific endpoints)
    const exemptPaths = ['/api/auth/verify-email', '/api/auth/resend-verification'];
    if (!user.isEmailVerified && !exemptPaths.includes(req.path)) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required. Please check your email and verify your account.',
        requiresEmailVerification: true,
        userEmail: user.email
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Middleware to restrict access based on roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Middleware to check if user is an admin (org admin or super admin)
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== ROLES.ORG_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Only admins can access this route'
    });
  }
  next();
};

// Middleware to check if user is a super admin
exports.isSuperAdmin = (req, res, next) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Only super admins can access this route'
    });
  }
  next();
};

// Middleware to check if user belongs to the same organization
exports.isSameOrganization = (req, res, next) => {
  // Super admin can access any organization
  if (req.user.role === ROLES.SUPER_ADMIN) {
    return next();
  }

  // Check if the requested organization ID matches the user's organization
  if (req.params.organizationId && req.params.organizationId !== req.user.organization.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your own organization'
    });
  }
  
  next();
};
