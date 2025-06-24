const { ROLES } = require('../models/User');

/**
 * Middleware to ensure user has complete profile before accessing protected resources
 * SECURITY: Prevents users with incomplete profiles from accessing sensitive data
 */
exports.requireCompleteProfile = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if org_admin user has organization assigned
    if (user.role === ROLES.ORG_ADMIN && !user.organization) {
      return res.status(403).json({
        success: false,
        message: "Profile incomplete. Please complete organization setup to access this resource.",
        requiresOrganizationSetup: true,
        redirectTo: "/onboarding/organization",
      });
    }

    // Check if org_client user has organization assigned
    if (user.role === ROLES.ORG_CLIENT && !user.organization) {
      return res.status(403).json({
        success: false,
        message: "Profile incomplete. Please contact your organization administrator.",
        requiresOrganizationSetup: true,
      });
    }

    // Check if user email is verified (if email verification is enabled)
    if (user.isEmailVerified === false) {
      return res.status(403).json({
        success: false,
        message: "Email verification required. Please check your email and verify your account.",
        requiresEmailVerification: true,
        redirectTo: "/auth/verify-email",
      });
    }

    // All checks passed
    next();
  } catch (error) {
    console.error('Profile validation error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error during profile validation",
    });
  }
};

/**
 * Middleware specifically for organization-scoped resources
 * More strict validation for sensitive operations
 */
exports.requireOrganizationAccess = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Super admin can access any organization
    if (user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // All other users must have organization
    if (!user.organization) {
      return res.status(403).json({
        success: false,
        message: "Organization access required. Please complete your profile setup.",
        requiresOrganizationSetup: true,
        redirectTo: "/onboarding/organization",
      });
    }

    next();
  } catch (error) {
    console.error('Organization access validation error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error during organization validation",
    });
  }
};

/**
 * Middleware to check if user can create organizations
 * Only allows org_admin users without existing organization
 */
exports.canCreateOrganization = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Super admin can always create organizations
    if (user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Org admin can create organization only if they don't have one
    if (user.role === ROLES.ORG_ADMIN) {
      if (user.organization) {
        return res.status(403).json({
          success: false,
          message: "You already belong to an organization. Contact support if you need to create a new one.",
        });
      }
      return next();
    }

    // Other roles cannot create organizations
    return res.status(403).json({
      success: false,
      message: "Only organization administrators can create organizations.",
    });
  } catch (error) {
    console.error('Organization creation validation error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error during organization creation validation",
    });
  }
};
