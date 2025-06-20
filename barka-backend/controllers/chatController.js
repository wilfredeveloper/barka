const { ROLES } = require("../models/User");
const Client = require("../models/Client");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * @desc    Process a user message and get agent response in one transaction
 * @route   POST /api/conversations/:conversationId/chat
 * @access  Private (Client only)
 */
exports.chatWithAgent = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const conversationId = req.params.conversationId;
    const { content } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID format",
      });
    }

    // Get the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to chat in this conversation
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to chat in this conversation",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (!client || client._id.toString() !== conversation.client.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to chat in this conversation",
        });
      }
    }

    // Check for duplicate messages within the last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recentUserMessages = await Message.find({
      conversation: conversationId,
      sender: "user",
      content: content,
      createdAt: { $gte: fiveSecondsAgo },
    })
      .sort({ createdAt: -1 })
      .limit(1);

    let userMessage;

    if (recentUserMessages.length > 0) {
      // Use the existing message instead of creating a duplicate
      logger.info(
        `Found duplicate user message in conversation ${conversationId}, using existing message`
      );
      userMessage = recentUserMessages[0];
    } else {
      // Save the user message
      userMessage = await Message.create({
        conversation: conversationId,
        sender: "user",
        content: content,
      });
    }

    // Update conversation lastMessageAt
    conversation.lastMessageAt = Date.now();
    await conversation.save();

    // Process the message with the AI agent
    let agentResponse;

    // NOTE: This endpoint is deprecated in favor of ovara-agent WebSocket integration
    // The frontend now connects directly to ovara-agent via WebSocket for real-time chat
    // This endpoint is kept for backward compatibility but should redirect to ovara-agent

    logger.info(`Agent chat request for conversation ${conversationId} - redirecting to ovara-agent`, {
      clientId: conversation.client.toString(),
      organizationId: conversation.organization.toString(),
      messageId: userMessage._id,
      messageContent:
        content.substring(0, 50) + (content.length > 50 ? "..." : ""),
    });

    agentResponse = `Hello! I'm Barka, your AI onboarding assistant.

This API endpoint has been migrated to use ovara-agent for better real-time performance.

Please use the WebSocket connection to ovara-agent instead:
- WebSocket URL: ws://localhost:8000/ws/{client_id}
- Authentication: JWT token as query parameter
- Real-time streaming responses

Your message was: "${content}"

For the best experience, please use the updated frontend that connects directly to ovara-agent.`;

    // Check for duplicate agent messages within the last 5 seconds
    const recentAgentMessages = await Message.find({
      conversation: conversationId,
      sender: "agent",
      content: agentResponse,
      createdAt: { $gte: fiveSecondsAgo },
    })
      .sort({ createdAt: -1 })
      .limit(1);

    let agentMessage;

    if (recentAgentMessages.length > 0) {
      // Use the existing message instead of creating a duplicate
      logger.info(
        `Found duplicate agent message in conversation ${conversationId}, using existing message`
      );
      agentMessage = recentAgentMessages[0];
    } else {
      // Save the agent's response
      agentMessage = await Message.create({
        conversation: conversationId,
        sender: "agent",
        content: agentResponse,
      });
    }

    // Update conversation lastMessageAt and message count
    conversation.lastMessageAt = Date.now();
    // Only increment message count if we created new messages
    if (recentUserMessages.length === 0 && recentAgentMessages.length === 0) {
      conversation.messageCount = (conversation.messageCount || 0) + 2; // +2 because we added two messages
    } else if (
      recentUserMessages.length === 0 ||
      recentAgentMessages.length === 0
    ) {
      conversation.messageCount = (conversation.messageCount || 0) + 1; // +1 because we added one message
    }
    await conversation.save();

    // Return both messages
    res.status(200).json({
      success: true,
      data: {
        userMessage,
        agentMessage,
      },
    });
  } catch (error) {
    logger.error("Chat with agent error:", error);

    // Check if this is an authentication error with the LLM API
    if (
      error.message &&
      (error.message.includes("API key") ||
        error.message.includes("authentication") ||
        error.message.includes("auth"))
    ) {
      logger.error("Authentication error with LLM API", {
        error: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        message:
          "Authentication error with AI service. Please check your API key configuration.",
        error: error.message,
      });
    }

    // Return a generic error for other cases
    res.status(500).json({
      success: false,
      message: "Server error processing chat",
      error: error.message,
    });
  }
};
