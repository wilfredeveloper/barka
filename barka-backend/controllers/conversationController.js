const { ROLES } = require("../models/User");
const Client = require("../models/Client");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { validationResult } = require("express-validator");
const Groq = require("groq-sdk");

/**
 * @desc    Get all conversations (filtered by organization for org admins)
 * @route   GET /api/conversations
 * @access  Private (Admin or client)
 */
exports.getConversations = async (req, res) => {
  try {
    let query = {};

    // If org admin, show conversations from their organization (both client and admin conversations)
    if (req.user.role === ROLES.ORG_ADMIN) {
      query.organization = req.user.organization;
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      // If client, only show their conversations
      const client = await Client.findOne({ user: req.user.id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }
      query.client = client._id;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by conversation type if provided
    if (req.query.conversationType) {
      query.conversationType = req.query.conversationType;
    }

    // Filter by client if provided (for admins)
    if (
      req.query.client &&
      (req.user.role === ROLES.ORG_ADMIN || req.user.role === ROLES.SUPER_ADMIN)
    ) {
      query.client = req.query.client;
    }

    const conversations = await Conversation.find(query)
      .populate("client", "projectType status")
      .populate("organization", "name")
      .sort({ lastMessageAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single conversation with messages
 * @route   GET /api/conversations/:id
 * @access  Private (Admin or conversation participant)
 */
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("client", "projectType status")
      .populate("organization", "name");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to view this conversation
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization._id.toString() !==
        req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this conversation",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      // For client conversations, check if client owns the conversation
      if (conversation.conversationType === "client") {
        const client = await Client.findOne({ user: req.user.id });
        if (
          !client ||
          !conversation.client ||
          client._id.toString() !== conversation.client._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to access this conversation",
          });
        }
      } else {
        // Clients cannot access admin conversations
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this conversation",
        });
      }
    }

    // Get messages with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const messages = await conversation.getMessages(limit, page);

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new conversation
 * @route   POST /api/conversations
 * @access  Private (Admin or client)
 */
exports.createConversation = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { clientId, organizationId, title, type } = req.body;
    let conversationData = {
      title: title || "New Conversation",
      status: "active",
    };

    // Determine conversation type and handle accordingly
    if (clientId) {
      // Client conversation
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }

      // Check if user has permission to create conversation for this client
      if (
        req.user.role === ROLES.ORG_ADMIN &&
        client.organization.toString() !== req.user.organization.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to create conversation for this client",
        });
      } else if (req.user.role === ROLES.ORG_CLIENT) {
        // Check if client is the current user
        const userClient = await Client.findOne({ user: req.user.id });
        if (!userClient || userClient._id.toString() !== clientId) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to create conversation for this client",
          });
        }
      }

      conversationData.client = clientId;
      conversationData.organization = client.organization;
      conversationData.conversationType = "client";
    } else if (organizationId && (req.user.role === ROLES.ORG_ADMIN || req.user.role === ROLES.SUPER_ADMIN)) {
      // Admin conversation
      const Organization = require("../models/Organization");
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Check if admin has permission for this organization
      if (req.user.role === ROLES.ORG_ADMIN && req.user.organization.toString() !== organizationId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to create conversation for this organization",
        });
      }

      conversationData.organization = organizationId;
      conversationData.conversationType = "admin";

      // For admin test conversations, add metadata
      if (type === "admin_test") {
        conversationData.metadata = { type: "admin_test" };
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either clientId or organizationId must be provided",
      });
    }

    // Create conversation
    const conversation = await Conversation.create(conversationData);

    // Automatically create ADK session for the new conversation
    try {
      const axios = require('axios');
      const ADK_BASE_URL = process.env.ADK_BASE_URL || 'http://localhost:5566';

      // Generate unique session ID
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const appName = "orchestrator";

      let userId, userFullName, userRole, userEmail;

      if (conversationData.conversationType === "client") {
        // For client conversations, use client ID as user ID
        userId = clientId;
        const clientWithUser = await Client.findById(clientId).populate('user', 'firstName lastName email');
        userFullName = clientWithUser?.user ?
          `${clientWithUser.user.firstName || ''} ${clientWithUser.user.lastName || ''}`.trim() : null;
        userEmail = clientWithUser?.user?.email || null;
        userRole = "client";
      } else {
        // For admin conversations, use organization ID as user ID
        userId = organizationId;
        userFullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
        userEmail = req.user.email || null;
        userRole = req.user.role;
      }

      // Prepare custom initial state
      const initialState = {
        conversation_id: conversation._id.toString(),
        current_agent: "orchestrator_agent",
        agent_history: [],
        user_name: userFullName || "there", // Include user name to avoid DB fetch in ovara-agent
        user_full_name: userFullName,
        user_role: userRole,
        user_email: userEmail,
        conversation_type: conversationData.conversationType,
        onboarding: {
          status: "not_started",
          phase: null,
          current_todo: null,
          progress: 0
        },
        scheduling: {
          meetings: [],
          availability: {},
          preferences: {}
        },
        user_preferences: {},
        session_metadata: {
          created_at: new Date().toISOString(),
          frontend_conversation_id: conversation._id.toString()
        }
      };

      // Add type-specific fields
      if (conversationData.conversationType === "client") {
        initialState.client_id = clientId;
        initialState.organization_id = conversationData.organization.toString();
      } else {
        initialState.organization_id = organizationId;
        initialState.user_id = req.user.id; // Add admin user ID for admin conversations

        // For org_admin users, set client_id to user_id to ensure Jarvis agent functionality
        if (req.user.role === 'org_admin') {
          initialState.client_id = req.user.id;
          console.log(`Setting client_id to user_id for org_admin: ${req.user.id}`);
        }
      }

      // Create ADK session with custom initial state
      const adkUrl = `${ADK_BASE_URL}/apps/${appName}/users/${userId}/sessions/${sessionId}`;
      console.log(`Creating ADK session for new conversation at: ${adkUrl}`);

      const adkResponse = await axios.post(adkUrl, initialState, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      // Update conversation with ADK session information
      conversation.adkSessionId = sessionId;
      conversation.adkUserId = userId;
      conversation.adkAppName = appName;
      await conversation.save();

      console.log(`ADK session created successfully for conversation ${conversation._id}: ${sessionId}`);

    } catch (adkError) {
      console.error('Failed to create ADK session for new conversation:', adkError.message);
      // Don't fail the conversation creation if ADK session creation fails
      // The frontend can create the session later if needed
    }

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update conversation
 * @route   PUT /api/conversations/:id
 * @access  Private (Admin only)
 */
exports.updateConversation = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to update this conversation
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this conversation",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      return res.status(403).json({
        success: false,
        message: "Clients cannot update conversation details",
      });
    }

    // Update conversation
    conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Update conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get conversation statistics for an organization
 * @route   GET /api/conversations/stats
 * @access  Private (Admin only)
 */
exports.getConversationStats = async (req, res) => {
  try {
    let organizationId;

    if (req.user.role === ROLES.ORG_ADMIN) {
      organizationId = req.user.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN && req.query.organization) {
      organizationId = req.query.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Please specify an organization ID",
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access conversation stats",
      });
    }

    const stats = await Conversation.getOrganizationStats(organizationId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get conversation stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a conversation
 * @route   DELETE /api/conversations/:id
 * @access  Private (Admin or conversation owner)
 */
exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to delete this conversation
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this conversation",
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      // Check if client is the owner of this conversation (only for client conversations)
      if (conversation.conversationType === "client") {
        const client = await Client.findOne({ user: req.user.id });
        if (!client || !conversation.client || client._id.toString() !== conversation.client.toString()) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete this conversation",
          });
        }
      } else {
        // Clients cannot delete admin conversations
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this conversation",
        });
      }
    }

    // Delete all messages in the conversation first
    await Message.deleteMany({ conversation: req.params.id });

    // Delete the conversation
    await conversation.deleteOne();

    res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete multiple conversations
 * @route   DELETE /api/conversations/batch
 * @access  Private (Admin or conversation owner)
 */
exports.batchDeleteConversations = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of conversation IDs",
      });
    }

    // Get all conversations
    const conversations = await Conversation.find({ _id: { $in: ids } });

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No conversations found with the provided IDs",
      });
    }

    // Check permissions for each conversation
    const allowedIds = [];
    for (const conversation of conversations) {
      let isAuthorized = false;

      if (req.user.role === ROLES.SUPER_ADMIN) {
        isAuthorized = true;
      } else if (
        req.user.role === ROLES.ORG_ADMIN &&
        conversation.organization.toString() ===
          req.user.organization.toString()
      ) {
        isAuthorized = true;
      } else if (req.user.role === ROLES.ORG_CLIENT) {
        // Only allow clients to delete their own client conversations
        if (conversation.conversationType === "client" && conversation.client) {
          const client = await Client.findOne({ user: req.user.id });
          if (
            client &&
            client._id.toString() === conversation.client.toString()
          ) {
            isAuthorized = true;
          }
        }
      }

      if (isAuthorized) {
        allowedIds.push(conversation._id);
      }
    }

    if (allowedIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete any of the specified conversations",
      });
    }

    // Delete all messages in the allowed conversations
    await Message.deleteMany({ conversation: { $in: allowedIds } });

    // Delete the allowed conversations
    const result = await Conversation.deleteMany({ _id: { $in: allowedIds } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} conversations deleted successfully`,
      deletedCount: result.deletedCount,
      requestedCount: ids.length,
    });
  } catch (error) {
    console.error("Batch delete conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Generate a conversation title using AI
 * @route   POST /api/conversations/generate-title
 * @access  Private (Client only)
 */
exports.generateTitle = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { conversationId, messages } = req.body;

    // Get the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Check if user has permission to update this conversation
    if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (!client || client._id.toString() !== conversation.client.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this conversation",
        });
      }
    } else if (
      req.user.role === ROLES.ORG_ADMIN &&
      conversation.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this conversation",
      });
    }

    // Check if GROQ API key is available
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "AI service not configured",
      });
    }

    // Initialize Groq client
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Prepare the conversation context for title generation
    // For early conversations, use all available messages; for longer ones, use first few and last few
    let contextMessages;
    if (messages.length <= 4) {
      // Use all messages for short conversations
      contextMessages = messages;
    } else {
      // Use first 2 and last 3 messages for longer conversations
      contextMessages = [...messages.slice(0, 2), ...messages.slice(-3)];
    }

    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const titlePrompt = `Based on the following conversation, generate a concise, descriptive title (maximum 50 characters) that captures the main topic or purpose of the discussion:

${conversationContext}

Generate only the title, nothing else. Keep it under 50 characters and make it descriptive of the conversation's main topic.`;

    // Generate title using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: titlePrompt,
        },
      ],
      model: "llama3-70b-8192",
      temperature: 0.3,
      max_tokens: 50,
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim();

    if (!generatedTitle) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate title",
      });
    }

    // Remove quotes if present and ensure title is within 50 characters
    const cleanedTitle = generatedTitle.replace(/^["']|["']$/g, '');
    const finalTitle = cleanedTitle.length > 50
      ? cleanedTitle.substring(0, 47) + "..."
      : cleanedTitle;

    // Update the conversation with the new title and mark as generated
    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { title: finalTitle, titleGenerated: true },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: {
        title: finalTitle,
        conversation: updatedConversation,
      },
    });

  } catch (error) {
    console.error("Generate title error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate conversation title",
      error: error.message,
    });
  }
};

/**
 * @desc    Generate suggested questions based on user's last conversation
 * @route   POST /api/conversations/suggested-questions
 * @access  Private (Client only)
 */
exports.getSuggestedQuestions = async (req, res) => {
  try {
    const { clientId } = req.body;

    // Validate client ID
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required",
      });
    }

    // Check if user has permission to access this client's data
    if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (!client || client._id.toString() !== clientId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this client's data",
        });
      }
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      const client = await Client.findById(clientId);
      if (!client || client.organization.toString() !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this client's data",
        });
      }
    }

    // Find the most recent conversation for this client
    const lastConversation = await Conversation.findOne({ client: clientId })
      .sort({ lastMessageAt: -1 })
      .populate('client', 'projectType status');

    if (!lastConversation) {
      // Return default questions if no previous conversation
      return res.status(200).json({
        success: true,
        data: {
          questions: [
            'Help me get started with the onboarding process for my project.',
            'I need help collecting and organizing my project requirements.',
            'I\'d like to schedule a meeting with the team.',
            'Help me manage my project and track progress.',
            'What are the next steps for my project?'
          ]
        }
      });
    }

    // Get recent messages from the last conversation
    const messages = await lastConversation.getMessages(10, 1); // Get last 10 messages

    if (!messages || messages.length === 0) {
      // Return default questions if no messages
      return res.status(200).json({
        success: true,
        data: {
          questions: [
            'Help me get started with the onboarding process for my project.',
            'I need help collecting and organizing my project requirements.',
            'I\'d like to schedule a meeting with the team.',
            'Help me manage my project and track progress.',
            'What are the next steps for my project?'
          ]
        }
      });
    }

    // Check if GROQ API key is available
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "AI service not configured",
      });
    }

    // Initialize Groq client
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Prepare conversation context
    const conversationContext = messages
      .slice(-8) // Use last 8 messages for context
      .map(msg => `${msg.sender}: ${msg.content}`)
      .join('\n');

    const questionsPrompt = `Based on the following conversation history between a client and an AI assistant, generate 5 follow-up questions that the client might want to ask to continue or catch up on their project in a new conversation.

Conversation context:
${conversationContext}

Client project type: ${lastConversation.client.projectType || 'Not specified'}
Client status: ${lastConversation.client.status || 'Not specified'}

Generate exactly 5 questions that:
1. Are relevant to the conversation context
2. Help the client continue from where they left off
3. Are each one sentence only
4. Are natural follow-up questions a client would ask
5. Focus on next steps, clarifications, or progress updates

Return only the 5 questions, one per line, without numbering or bullet points.`;

    // Generate questions using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: questionsPrompt,
        },
      ],
      model: "llama3-70b-8192",
      temperature: 0.7,
      max_tokens: 300,
    });

    const generatedQuestions = completion.choices[0]?.message?.content?.trim();

    if (!generatedQuestions) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate suggested questions",
      });
    }

    // Parse the questions (split by newlines and clean up)
    const questions = generatedQuestions
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .slice(0, 5); // Ensure we only have 5 questions

    // If we don't have 5 questions, pad with defaults
    while (questions.length < 5) {
      const defaults = [
        'What are the next steps for my project?',
        'Can you help me review the current progress?',
        'I need assistance with the next phase of development.',
        'How can we move forward with the implementation?',
        'What should I focus on next?'
      ];
      const defaultToAdd = defaults[questions.length % defaults.length];
      if (!questions.includes(defaultToAdd)) {
        questions.push(defaultToAdd);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        questions: questions.slice(0, 5)
      }
    });

  } catch (error) {
    console.error("Generate suggested questions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate suggested questions",
      error: error.message,
    });
  }
};

/**
 * @desc    Generate suggested questions based on actual conversation messages
 * @route   POST /api/conversations/suggested-questions-from-messages
 * @access  Private (Client only)
 */
exports.getSuggestedQuestionsFromMessages = async (req, res) => {
  try {
    const { clientId, conversationId, messages, clientInfo } = req.body;

    // Validate required fields
    if (!clientId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "Client ID and messages array are required",
      });
    }

    if (messages.length === 0) {
      // Return default questions if no messages
      return res.status(200).json({
        success: true,
        data: {
          questions: [
            'Help me get started with the onboarding process for my project.',
            'I need help collecting and organizing my project requirements.',
            'I\'d like to schedule a meeting with the team.',
            'Help me manage my project and track progress.',
            'What are the next steps for my project?'
          ]
        }
      });
    }

    // Check if GROQ API key is available
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "AI service not configured",
      });
    }

    // Initialize Groq client
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Prepare conversation context from actual messages
    const conversationContext = messages
      .slice(-8) // Use last 8 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const questionsPrompt = `Based on the following recent conversation between a client and an AI assistant, generate 5 contextual follow-up questions that the client might want to ask to continue their project progress.

Recent conversation:
${conversationContext}

Client context:
- Project type: ${clientInfo?.projectType || 'Not specified'}
- Status: ${clientInfo?.status || 'Not specified'}
- Organization: ${clientInfo?.organizationName || 'Not specified'}

Generate exactly 5 questions that:
1. Are directly relevant to the conversation context
2. Help the client continue from where they left off
3. Focus on next steps, clarifications, or progress updates
4. Are natural follow-up questions a client would ask
5. Are each one complete sentence only

Return only the 5 questions, one per line, without numbering or bullet points.`;

    // Generate questions using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: questionsPrompt,
        },
      ],
      model: "llama3-70b-8192",
      temperature: 0.7,
      max_tokens: 300,
    });

    const generatedQuestions = completion.choices[0]?.message?.content?.trim();

    if (!generatedQuestions) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate suggested questions",
      });
    }

    // Parse the questions (split by newlines and clean up)
    const questions = generatedQuestions
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.match(/^\d+\.?\s*/)) // Remove numbered items
      .slice(0, 5); // Ensure we only have 5 questions

    // If we don't have 5 questions, pad with contextual defaults
    while (questions.length < 5) {
      const contextualDefaults = [
        'What are the next steps for my project?',
        'Can you help me review the current progress?',
        'I need assistance with the next phase of development.',
        'How can we move forward with the implementation?',
        'What should I focus on next?'
      ];
      const defaultToAdd = contextualDefaults[questions.length % contextualDefaults.length];
      if (!questions.includes(defaultToAdd)) {
        questions.push(defaultToAdd);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        questions: questions.slice(0, 5),
        generatedFromMessages: true,
        conversationId: conversationId
      }
    });

  } catch (error) {
    console.error("Generate suggested questions from messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate suggested questions",
      error: error.message,
    });
  }
};
