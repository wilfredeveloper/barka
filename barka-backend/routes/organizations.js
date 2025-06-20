const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const organizationController = require("../controllers/organizationController");
const { protect, authorize } = require("../middleware/auth");
const { ROLES } = require("../models/User");

// @route   GET /api/organizations
// @desc    Get all organizations
// @access  Private (Admin only)
router.get(
  "/",
  protect,
  authorize([ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]),
  organizationController.getOrganizations
);

// @route   GET /api/organizations/:id
// @desc    Get single organization
// @access  Private (Admin or member of organization)
router.get("/:id", protect, organizationController.getOrganization);

// @route   POST /api/organizations
// @desc    Create new organization
// @access  Private (Super Admin only)
router.post(
  "/",
  [
    protect,
    authorize([ROLES.SUPER_ADMIN]),
    check("name", "Name is required").not().isEmpty(),
    check("contactEmail", "Valid contact email is required").isEmail(),
  ],
  organizationController.createOrganization
);

// @route   POST /api/organizations/onboarding
// @desc    Create organization during onboarding
// @access  Private (Org Admin without organization)
router.post(
  "/onboarding",
  [
    protect, // Only check if user is authenticated, don't check role
    check("organizationName", "Organization name is required").not().isEmpty(),
    check("organizationType", "Organization type is required").not().isEmpty(),
  ],
  organizationController.createOrganizationOnboarding
);

// @route   PUT /api/organizations/:id
// @desc    Update organization
// @access  Private (Super Admin or Org Admin of this organization)
router.put(
  "/:id",
  [
    protect,
    authorize([ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]),
    check("name", "Name is required").optional().not().isEmpty(),
    check("contactEmail", "Valid contact email is required")
      .optional()
      .isEmail(),
  ],
  organizationController.updateOrganization
);

// @route   DELETE /api/organizations/:id
// @desc    Delete organization
// @access  Private (Super Admin only)
router.delete(
  "/:id",
  protect,
  authorize([ROLES.SUPER_ADMIN]),
  organizationController.deleteOrganization
);

module.exports = router;
