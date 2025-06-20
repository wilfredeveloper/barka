const { ROLES } = require("../models/User");
const Client = require("../models/Client");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { validationResult } = require("express-validator");

/**
 * @desc    Get messages for a conversation
 * @route   GET /api/conversations/:conversationId/messages
 * @access  Private (Admin or conversation participant)
 */
exports.getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to view messages in this conversation
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access messages in this conversation",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (!client || client._id.toString() !== conversation.client.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access messages in this conversation",
        });
      }
    }

    // Get messages with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "attachments",
        select: "name fileType fileSize category",
      });

    const total = await Message.countDocuments({
      conversation: req.params.conversationId,
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new message
 * @route   POST /api/conversations/:conversationId/messages
 * @access  Private (Admin or conversation participant)
 */
exports.createMessage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to add messages to this conversation
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add messages to this conversation",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (!client || client._id.toString() !== conversation.client.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to add messages to this conversation",
        });
      }
    }

    const { content, structuredContent, attachments } = req.body;
    const sender = req.user.role === ROLES.ORG_CLIENT ? "user" : "agent"; // Assuming admin messages are from the agent

    // Check for duplicate messages within the last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recentMessages = await Message.find({
      conversation: req.params.conversationId,
      sender: sender,
      content: content,
      createdAt: { $gte: fiveSecondsAgo },
    })
      .sort({ createdAt: -1 })
      .limit(1);

    let message;

    if (recentMessages.length > 0) {
      // Use the existing message instead of creating a duplicate
      console.log(
        `Found duplicate message in conversation ${req.params.conversationId}, using existing message`
      );
      message = recentMessages[0];
    } else {
      // Create message
      message = await Message.create({
        conversation: req.params.conversationId,
        sender: sender,
        content,
        structuredContent: structuredContent || null,
        hasAttachment: attachments && attachments.length > 0,
        attachments: attachments || [],
      });

      // Update conversation lastMessageAt
      conversation.lastMessageAt = Date.now();
      await conversation.save();
    }

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Create message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update message (mark as important or read)
 * @route   PUT /api/messages/:id
 * @access  Private (Admin only)
 */
exports.updateMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Get the conversation to check permissions
    const conversation = await Conversation.findById(message.conversation);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Associated conversation not found",
      });
    }

    // Check if user has permission to update this message
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this message",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      return res.status(403).json({
        success: false,
        message: "Clients cannot update messages",
      });
    }

    // Update message fields
    if (req.body.isImportant !== undefined) {
      message.isImportant = req.body.isImportant;
    }

    if (req.body.readByAdmin !== undefined) {
      message.readByAdmin = req.body.readByAdmin;
    }

    await message.save();

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Update message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get message statistics
 * @route   GET /api/messages/stats
 * @access  Private (Admin only)
 */
exports.getMessageStats = async (req, res) => {
  try {
    if (req.user.role === ROLES.ORG_CLIENT) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access message stats",
      });
    }

    let filter = {};

    // If org admin, only show stats from their organization
    if (req.user.role === ROLES.ORG_ADMIN) {
      // We need to find conversations in the admin's organization
      const conversations = await Conversation.find({
        organization: req.user.organization,
      });
      const conversationIds = conversations.map((conv) => conv._id);

      filter.conversation = { $in: conversationIds };
    } else if (req.user.role === ROLES.SUPER_ADMIN && req.query.organization) {
      // Super admin can filter by organization
      const conversations = await Conversation.find({
        organization: req.query.organization,
      });
      const conversationIds = conversations.map((conv) => conv._id);

      filter.conversation = { $in: conversationIds };
    }

    const stats = await Message.getStats(filter);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get message stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
