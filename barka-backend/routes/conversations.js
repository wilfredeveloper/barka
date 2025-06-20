const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const conversationController = require("../controllers/conversationController");
const messageController = require("../controllers/messageController");
const chatController = require("../controllers/chatController");
const { protect, authorize, isAdmin } = require("../middleware/auth");
const { ROLES } = require("../models/User");

// Apply protection to all routes
router.use(protect);

// @route   GET /api/conversations
// @desc    Get all conversations
// @access  Private (Admin or client)
router.get("/", conversationController.getConversations);

// @route   GET /api/conversations/stats
// @desc    Get conversation statistics
// @access  Private (Admin only)
router.get("/stats", isAdmin, conversationController.getConversationStats);

// @route   GET /api/conversations/:id
// @desc    Get single conversation with messages
// @access  Private (Admin or conversation participant)
router.get("/:id", conversationController.getConversation);

// @route   POST /api/conversations
// @desc    Create new conversation
// @access  Private (Admin or client)
router.post(
  "/",
  [
    // Custom validation: clientId is required for clients, optional for admins if organizationId is provided
    check("clientId").custom((value, { req }) => {
      const user = req.user;
      const organizationId = req.body.organizationId;

      // If user is admin and organizationId is provided, clientId is optional
      if (user && (user.role === 'org_admin' || user.role === 'super_admin') && organizationId) {
        return true;
      }

      // For all other cases, clientId is required
      if (!value) {
        throw new Error('Client ID is required');
      }

      return true;
    })
  ],
  conversationController.createConversation
);

// @route   PUT /api/conversations/:id
// @desc    Update conversation
// @access  Private (Admin only)
router.put("/:id", isAdmin, conversationController.updateConversation);

// @route   DELETE /api/conversations/batch
// @desc    Delete multiple conversations
// @access  Private (Admin or conversation owner)
router.delete("/batch", conversationController.batchDeleteConversations);

// @route   DELETE /api/conversations/:id
// @desc    Delete conversation
// @access  Private (Admin or conversation owner)
router.delete("/:id", conversationController.deleteConversation);

// @route   GET /api/conversations/:conversationId/messages
// @desc    Get messages for a conversation
// @access  Private (Admin or conversation participant)
router.get("/:conversationId/messages", messageController.getMessages);

// @route   POST /api/conversations/:conversationId/messages
// @desc    Create new message
// @access  Private (Admin or conversation participant)
router.post(
  "/:conversationId/messages",
  [check("content", "Message content is required").not().isEmpty()],
  messageController.createMessage
);

// @route   POST /api/conversations/:conversationId/chat
// @desc    Send a message and get agent response in one call
// @access  Private (Client only)
router.post(
  "/:conversationId/chat",
  [check("content", "Message content is required").not().isEmpty()],
  chatController.chatWithAgent
);

// @route   POST /api/conversations/generate-title
// @desc    Generate a conversation title using AI
// @access  Private (Client only)
router.post(
  "/generate-title",
  [
    check("conversationId", "Conversation ID is required").not().isEmpty(),
    check("messages", "Messages array is required").isArray()
  ],
  conversationController.generateTitle
);

// @route   POST /api/conversations/suggested-questions
// @desc    Generate suggested questions based on user's last conversation
// @access  Private (Client only)
router.post(
  "/suggested-questions",
  [
    check("clientId", "Client ID is required").not().isEmpty()
  ],
  conversationController.getSuggestedQuestions
);

// @route   POST /api/conversations/suggested-questions-from-messages
// @desc    Generate suggested questions based on actual conversation messages
// @access  Private (Client only)
router.post(
  "/suggested-questions-from-messages",
  [
    check("clientId", "Client ID is required").not().isEmpty(),
    check("messages", "Messages array is required").isArray()
  ],
  conversationController.getSuggestedQuestionsFromMessages
);

module.exports = router;
