const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { protect, authorize, isAdmin } = require("../middleware/auth");
const { ROLES } = require("../models/User");

// Apply protection to all routes
router.use(protect);

// @route   GET /api/messages/stats
// @desc    Get message statistics
// @access  Private (Admin only)
router.get("/stats", isAdmin, messageController.getMessageStats);

// @route   PUT /api/messages/:id
// @desc    Update message (mark as important or read)
// @access  Private (Admin only)
router.put("/:id", isAdmin, messageController.updateMessage);

module.exports = router;
