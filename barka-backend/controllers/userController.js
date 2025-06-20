const { User, ROLES } = require("../models/User");
const Organization = require("../models/Organization");
const { validationResult } = require("express-validator");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const emailService = require("../utils/emailService");

/**
 * @desc    Get all users (filtered by organization for org admins)
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
exports.getUsers = async (req, res) => {
  try {
    let query = {};

    // If org admin, only show users from their organization
    if (req.user.role === ROLES.ORG_ADMIN) {
      query.organization = req.user.organization;
    }

    const users = await User.find(query)
      .select("-password")
      .populate("organization", "name");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private (Admin or same user)
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("organization", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has permission to view this user
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      user.organization &&
      user.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this user",
      });
    }

    // Regular users can only view their own profile
    if (req.user.role === ROLES.ORG_CLIENT && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this user",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin or same user)
 */
exports.updateUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has permission to update this user
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      user.organization &&
      user.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this user",
      });
    }

    // Regular users can only update their own profile
    if (req.user.role === ROLES.ORG_CLIENT && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this user",
      });
    }

    // Only admins can change roles
    if (
      req.body.role &&
      req.user.role !== ROLES.SUPER_ADMIN &&
      req.user.role !== ROLES.ORG_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to change user role",
      });
    }

    // Org admins can't promote to super admin
    if (
      req.body.role === ROLES.SUPER_ADMIN &&
      req.user.role !== ROLES.SUPER_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to promote to super admin",
      });
    }

    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has permission to delete this user
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      user.organization &&
      user.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this user",
      });
    }

    // Can't delete yourself
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Can't delete super admin unless you're a super admin
    if (
      user.role === ROLES.SUPER_ADMIN &&
      req.user.role !== ROLES.SUPER_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete a super admin",
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new user (for admins to create client users)
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
exports.createUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, email, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Only admins can create users
    if (
      req.user.role !== ROLES.SUPER_ADMIN &&
      req.user.role !== ROLES.ORG_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create users",
      });
    }

    // Org admins can only create users in their organization
    let organizationId;
    if (req.user.role === ROLES.ORG_ADMIN) {
      organizationId = req.user.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN && req.body.organizationId) {
      // Super admin can specify organization
      organizationId = req.body.organizationId;
    }

    // Verify organization exists
    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }
    }

    // Generate a random password
    const tempPassword = crypto.randomBytes(8).toString("hex");

    // Create user
    const userData = {
      firstName,
      lastName,
      email,
      password: tempPassword,
      role: role || ROLES.ORG_CLIENT,
      organization: organizationId,
    };

    const user = await User.create(userData);

    // Get organization details for the email
    let organization = { name: "Barka" };
    if (organizationId) {
      organization = await Organization.findById(organizationId);
    }

    try {
      // Send welcome email with temporary password
      await emailService.sendClientWelcomeEmail(
        {
          firstName,
          lastName,
          email,
          password: tempPassword,
        },
        organization
      );
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Continue with user creation even if email fails
    }

    // Return user without password
    const userResponse = await User.findById(user._id).select("-password");

    res.status(201).json({
      success: true,
      data: userResponse,
      message:
        "User created successfully. A temporary password has been generated.",
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update user password
 * @route   PUT /api/users/:id/password
 * @access  Private (Same user only)
 */
exports.updatePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Check if user exists
    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has permission to update this password
    if (req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this user's password",
      });
    }

    // Check if current password matches
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
