const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const clientController = require("../controllers/clientController");
const { protect, authorize, isAdmin } = require("../middleware/auth");
const { ROLES } = require("../models/User");

// Apply protection to all routes
router.use(protect);

// @route   GET /api/clients
// @desc    Get all clients
// @access  Private (Admin only)
router.get("/", isAdmin, clientController.getClients);

// @route   GET /api/clients/me
// @desc    Get client information for the logged in user
// @access  Private (Client only)
router.get(
  "/me",
  authorize(ROLES.ORG_CLIENT),
  clientController.getClientForUser
);

// @route   GET /api/clients/me/meetings
// @desc    Get upcoming meetings for the logged in client
// @access  Private (Client only)
router.get(
  "/me/meetings",
  authorize(ROLES.ORG_CLIENT),
  clientController.getClientMeetings
);

// @route   GET /api/clients/me/meetings/all
// @desc    Get all meetings for the logged in client
// @access  Private (Client only)
router.get(
  "/me/meetings/all",
  authorize(ROLES.ORG_CLIENT),
  clientController.getAllClientMeetings
);

// @route   POST /api/clients/me/refresh-progress
// @desc    Refresh current user's onboarding progress
// @access  Private (Client only)
router.post(
  "/me/refresh-progress",
  authorize(ROLES.ORG_CLIENT),
  clientController.refreshMyProgress
);

// @route   GET /api/clients/me/meetings/:meetingId
// @desc    Get single meeting details for the logged in client
// @access  Private (Client only)
router.get(
  "/me/meetings/:meetingId",
  authorize(ROLES.ORG_CLIENT),
  clientController.getClientMeeting
);

// @route   PUT /api/clients/me/meetings/:meetingId
// @desc    Update meeting for the logged in client
// @access  Private (Client only)
router.put(
  "/me/meetings/:meetingId",
  authorize(ROLES.ORG_CLIENT),
  clientController.updateClientMeeting
);

// @route   DELETE /api/clients/me/meetings/:meetingId
// @desc    Delete meeting for the logged in client
// @access  Private (Client only)
router.delete(
  "/me/meetings/:meetingId",
  authorize(ROLES.ORG_CLIENT),
  clientController.deleteClientMeeting
);

// @route   GET /api/clients/stats
// @desc    Get client statistics
// @access  Private (Admin only)
router.get("/stats", isAdmin, clientController.getClientStats);

// @route   GET /api/clients/:id
// @desc    Get single client
// @access  Private (Admin or same organization)
router.get("/:id", clientController.getClient);

// @route   POST /api/clients
// @desc    Create new client
// @access  Private (Admin only)
router.post(
  "/",
  [
    isAdmin,
    check("userId", "User ID is required").not().isEmpty(),
    check("projectType", "Project type is required").not().isEmpty(),
    check(
      "projectTypeOther",
      "Project type description is required when type is 'other'"
    )
      .if(check("projectType").equals("other"))
      .not()
      .isEmpty(),
  ],
  clientController.createClient
);

// @route   PUT /api/clients/:id
// @desc    Update client
// @access  Private (Admin only)
router.put(
  "/:id",
  [
    isAdmin,
    check("projectType", "Project type is required").optional().not().isEmpty(),
    check(
      "projectTypeOther",
      "Project type description is required when type is 'other'"
    )
      .if(check("projectType").equals("other"))
      .not()
      .isEmpty(),
  ],
  clientController.updateClient
);

// @route   DELETE /api/clients/:id
// @desc    Delete client
// @access  Private (Admin only)
router.delete("/:id", isAdmin, clientController.deleteClient);

// @route   POST /api/clients/:id/refresh-progress
// @desc    Refresh client onboarding progress
// @access  Private (Admin or same client)
router.post("/:id/refresh-progress", clientController.refreshClientProgress);

module.exports = router;
