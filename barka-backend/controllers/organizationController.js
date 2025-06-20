const Organization = require("../models/Organization");
const { User, ROLES } = require("../models/User");
const { validationResult } = require("express-validator");

/**
 * @desc    Get all organizations
 * @route   GET /api/organizations
 * @access  Private (Admin only)
 */
exports.getOrganizations = async (req, res) => {
  try {
    let query = {};

    // If org admin, only show their organization
    if (req.user.role === ROLES.ORG_ADMIN) {
      query._id = req.user.organization;
    }

    const organizations = await Organization.find(query);

    res.status(200).json({
      success: true,
      count: organizations.length,
      data: organizations,
    });
  } catch (error) {
    console.error("Get organizations error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single organization
 * @route   GET /api/organizations/:id
 * @access  Private (Admin or member of organization)
 */
exports.getOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user has permission to view this organization
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      req.user.organization.toString() !== req.params.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this organization",
      });
    }

    // Regular users can only view their own organization
    if (
      req.user.role === ROLES.ORG_CLIENT &&
      req.user.organization.toString() !== req.params.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this organization",
      });
    }

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Get organization error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new organization
 * @route   POST /api/organizations
 * @access  Private (Super Admin or Org Admin without organization)
 */
exports.createOrganization = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Create organization
    const organization = await Organization.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Create organization error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Organization with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update organization
 * @route   PUT /api/organizations/:id
 * @access  Private (Super Admin or Org Admin of this organization)
 */
exports.updateOrganization = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user has permission to update this organization
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      req.user.organization.toString() !== req.params.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this organization",
      });
    }

    // Update organization
    organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Update organization error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Organization with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete organization
 * @route   DELETE /api/organizations/:id
 * @access  Private (Super Admin only)
 */
exports.deleteOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if there are users in this organization
    const usersCount = await User.countDocuments({
      organization: req.params.id,
    });
    if (usersCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete organization with existing users",
      });
    }

    await organization.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Delete organization error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create organization during onboarding and update user
 * @route   POST /api/organizations/onboarding
 * @access  Private (Org Admin without organization)
 */
exports.createOrganizationOnboarding = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Get the current user
    const user = await User.findById(req.user.id);

    // Check if user is an org admin
    if (user.role !== ROLES.ORG_ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Only organization admins can create organizations",
      });
    }

    // Check if user already has an organization
    if (user.organization) {
      return res.status(400).json({
        success: false,
        message: "User already belongs to an organization",
      });
    }

    // Extract organization data from request
    const {
      organizationName,
      organizationType,
      otherType,
      teamSize,
      departments,
      customDepartments,
      clientsPerMonth,
      onboardingChallenges,
      otherChallenges,
    } = req.body;

    // Create organization with minimal required data
    const organization = await Organization.create({
      name: organizationName,
      description: `${
        organizationType === "other" ? otherType : organizationType
      } agency`,
      contactEmail: user.email,
      createdBy: user.id,
      // Store additional onboarding data as metadata
      metadata: {
        organizationType,
        otherType,
        teamSize,
        departments,
        customDepartments,
        clientsPerMonth,
        onboardingChallenges,
        otherChallenges,
      },
    });

    // Update user with the new organization
    user.organization = organization._id;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        organization,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          organization: organization._id,
        },
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Organization with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during onboarding",
      error: error.message,
    });
  }
};
