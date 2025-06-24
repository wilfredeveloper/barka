const mongoose = require("mongoose");
const { User, ROLES } = require("../models/User");
const Organization = require("../models/Organization");
const { generateAuthResponse } = require("../utils/jwtUtils");
const { validationResult } = require("express-validator");
const {
  generateVerificationToken,
  sendVerificationEmail,
  sendOrganizationSetupCompleteEmail
} = require("../utils/emailVerification");

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
    let response = generateAuthResponse(user);

    // For org_admin users without organization, indicate they need to complete setup
    if (user.role === ROLES.ORG_ADMIN && !user.organization) {
      response.requiresOrganizationSetup = true;
      response.message = "Account created successfully. Please complete organization setup.";
    }

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
 * @desc    Register org_admin with organization creation in single transaction
 * @route   POST /api/auth/register-with-organization
 * @access  Public
 */
exports.registerWithOrganization = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    console.log("Registration with organization request:", req.body);
    const {
      firstName,
      lastName,
      email,
      password,
      organizationName,
      organizationType,
      teamSize,
      clientsPerMonth
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Generate email verification token
    const emailVerificationToken = generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Step 1: Create organization first
    const organizationData = {
      name: organizationName,
      description: `${organizationType} organization`,
      contactEmail: email,
      createdBy: null, // Will be updated after user creation
      metadata: {
        organizationType,
        teamSize,
        clientsPerMonth,
        setupMethod: 'registration_transaction',
        setupDate: new Date(),
      },
    };

    const [organization] = await Organization.create([organizationData], { session });

    // Step 2: Create user with organization
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role: ROLES.ORG_ADMIN,
      organization: organization._id,
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    };

    const [user] = await User.create([userData], { session });

    // Step 3: Update organization with creator
    organization.createdBy = user._id;
    await organization.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    // Send verification email (outside transaction)
    try {
      await sendVerificationEmail(user, emailVerificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the registration if email fails
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: "Account created successfully! Please check your email to verify your account and complete setup.",
      requiresEmailVerification: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: organization._id,
        isEmailVerified: false,
      },
      organization: {
        id: organization._id,
        name: organization.name,
      },
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Registration with organization error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'email'
        ? 'User with this email already exists'
        : field === 'name'
        ? 'Organization with this name already exists'
        : 'Duplicate entry detected';

      return res.status(400).json({
        success: false,
        message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Verify email address
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: "Email and verification token are required",
      });
    }

    // Find user with matching email and token
    const user = await User.findOne({
      email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    }).populate('organization');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send setup completion email
    if (user.organization) {
      try {
        await sendOrganizationSetupCompleteEmail(user, user.organization);
      } catch (emailError) {
        console.error('Failed to send setup complete email:', emailError);
      }
    }

    // Generate auth response
    const response = generateAuthResponse(user);

    res.json({
      success: true,
      message: "Email verified successfully! Your account is now active.",
      ...response,
    });

  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
      error: error.message,
    });
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new verification token
    const emailVerificationToken = generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    // Send verification email
    await sendVerificationEmail(user, emailVerificationToken);

    res.json({
      success: true,
      message: "Verification email sent successfully",
    });

  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while resending verification email",
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

    // For org_admin users without organization, indicate setup is needed
    if (user.role === ROLES.ORG_ADMIN && !user.organization) {
      response.requiresOrganizationSetup = true;
      response.message = "Please complete organization setup to continue.";
    }

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
