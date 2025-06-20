const { User, ROLES } = require("../models/User");
const Organization = require("../models/Organization");
const { generateAuthResponse } = require("../utils/jwtUtils");
const { validationResult } = require("express-validator");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    console.log("Registration request body:", req.body);
    const { firstName, lastName, email, password, role, organizationId } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // For organization clients, check if organization exists
    // Organization admins can sign up without an organization initially
    if (role === ROLES.ORG_CLIENT && !organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required for organization clients",
      });
    }

    // If organization client, verify organization exists
    if (role === ROLES.ORG_CLIENT && organizationId) {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }
    }

    // Create user with explicit field mapping
    const userData = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
      role: role || ROLES.ORG_CLIENT,
      // Only set organization for org clients or if organizationId is provided
      organization:
        role === ROLES.ORG_CLIENT || organizationId
          ? organizationId
          : undefined,
    };

    console.log("Creating user with data:", userData);
    const user = await User.create(userData);

    // Generate token and send response
    const response = generateAuthResponse(user);
    res.status(201).json(response);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token and send response
    const response = generateAuthResponse(user);
    res.status(200).json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "organization",
      "name"
    );

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Validate admin password for sensitive operations
 * @route   POST /api/auth/validate-password
 * @access  Private (Admin only)
 */
exports.validateAdminPassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { password } = req.body;

    // Check if user is admin
    if (req.user.role !== ROLES.ORG_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Only admins can perform this operation",
      });
    }

    // Get user with password field
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password validated successfully",
    });
  } catch (error) {
    console.error("Password validation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password validation",
      error: error.message,
    });
  }
};
