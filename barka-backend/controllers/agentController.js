const { ROLES } = require("../models/User");
const Client = require("../models/Client");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * @desc    Process a message with the AI agent
 * @route   POST /api/agent/chat
 * @access  Private (Admin or client)
 */
exports.chat = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { conversationId, message } = req.body;

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
      content: message,
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
        content: message,
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

    agentResponse = `Hello! I'm Barka, your AI onboarding assistant.

This API endpoint has been migrated to use ovara-agent for better real-time performance.

Please use the WebSocket connection to ovara-agent instead:
- WebSocket URL: ws://localhost:8000/ws/{client_id}
- Authentication: JWT token as query parameter
- Real-time streaming responses

Your message was: "${message}"

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

    // Update conversation lastMessageAt again
    conversation.lastMessageAt = Date.now();
    await conversation.save();

    res.status(200).json({
      success: true,
      data: {
        userMessage,
        agentMessage,
      },
    });
  } catch (error) {
    console.error("Agent chat error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Generate a summary of the conversation
 * @route   POST /api/agent/summarize
 * @access  Private (Admin only)
 */
exports.summarize = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { conversationId } = req.body;

    // Get the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to summarize this conversation
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to summarize this conversation",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      return res.status(403).json({
        success: false,
        message: "Clients cannot generate summaries",
      });
    }

    // This would call a function to generate a summary using the AI agent
    // For now, we'll just return a placeholder
    const summary = "This is a placeholder summary of the conversation.";

    // Update the conversation with the summary
    conversation.summary = summary;
    await conversation.save();

    res.status(200).json({
      success: true,
      data: {
        summary,
        conversation,
      },
    });
  } catch (error) {
    console.error("Agent summarize error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Extract requirements from the conversation
 * @route   POST /api/agent/extract-requirements
 * @access  Private (Admin only)
 */
exports.extractRequirements = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { conversationId, clientId } = req.body;

    // Get the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to extract requirements from this conversation
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized to extract requirements from this conversation",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      return res.status(403).json({
        success: false,
        message: "Clients cannot extract requirements",
      });
    }

    // Get the client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // This would call a function to extract requirements using the AI agent
    // For now, we'll just return placeholder requirements
    const requirements = [
      "Responsive website design",
      "E-commerce functionality",
      "Content management system",
      "User authentication",
      "Payment gateway integration",
    ];

    // Update the client with the extracted requirements
    client.requirements = requirements;
    await client.save();

    // Store the extracted information in the conversation
    conversation.extractedInformation = {
      ...conversation.extractedInformation,
      requirements,
    };
    await conversation.save();

    res.status(200).json({
      success: true,
      data: {
        requirements,
        client,
        conversation,
      },
    });
  } catch (error) {
    console.error("Agent extract requirements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a response from the agent for a client message
 * @route   POST /api/agent/respond
 * @access  Private (Client only)
 */
exports.respond = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { conversationId, clientId, organizationId } = req.body;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(conversationId) ||
      !mongoose.Types.ObjectId.isValid(clientId) ||
      !mongoose.Types.ObjectId.isValid(organizationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
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

    // Check if user has permission to access this conversation
    const client = await Client.findOne({ user: req.user.id });
    if (!client || client._id.toString() !== conversation.client.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this conversation",
      });
    }

    // Get the last message from the user
    const lastMessage = await Message.findOne({
      conversation: conversationId,
      sender: "user",
    }).sort({ createdAt: -1 });

    if (!lastMessage) {
      return res.status(404).json({
        success: false,
        message: "No user message found in this conversation",
      });
    }

    // Process the message with the AI agent
    let agentResponse;

    // NOTE: This endpoint is deprecated in favor of ovara-agent WebSocket integration
    // The frontend now connects directly to ovara-agent via WebSocket for real-time chat
    // This endpoint is kept for backward compatibility but should redirect to ovara-agent

    logger.info(`Agent respond request for conversation ${conversationId} - redirecting to ovara-agent`, {
      clientId,
      organizationId,
      messageId: lastMessage._id,
      messageContent:
        lastMessage.content.substring(0, 50) +
        (lastMessage.content.length > 50 ? "..." : ""),
    });

    agentResponse = `Hello! I'm Barka, your AI onboarding assistant.

This API endpoint has been migrated to use ovara-agent for better real-time performance.

Please use the WebSocket connection to ovara-agent instead:
- WebSocket URL: ws://localhost:8000/ws/{client_id}
- Authentication: JWT token as query parameter
- Real-time streaming responses

Your message was: "${lastMessage.content}"

For the best experience, please use the updated frontend that connects directly to ovara-agent.`;

    // Check for duplicate agent messages within the last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
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

      // Only increment message count if we created a new message
      conversation.messageCount = (conversation.messageCount || 0) + 1;
    }

    // Update conversation lastMessageAt
    conversation.lastMessageAt = Date.now();
    await conversation.save();

    res.status(200).json({
      success: true,
      data: agentMessage,
    });
  } catch (error) {
    logger.error("Agent respond error:", error);

    // Check if this is an authentication error
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
      message: "Server error processing agent response",
      error: error.message,
    });
  }
};
