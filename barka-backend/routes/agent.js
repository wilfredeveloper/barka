const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const agentController = require("../controllers/agentController");
const { protect, authorize, isAdmin } = require("../middleware/auth");
const { ROLES } = require("../models/User");
const axios = require("axios");

// Apply protection to all routes
router.use(protect);

// @route   POST /api/agent/chat
// @desc    Process a message with the AI agent
// @access  Private (Admin or client)
router.post(
  "/chat",
  [
    check("conversationId", "Conversation ID is required").not().isEmpty(),
    check("message", "Message is required").not().isEmpty(),
  ],
  agentController.chat
);

// @route   POST /api/agent/summarize
// @desc    Generate a summary of the conversation
// @access  Private (Admin only)
router.post(
  "/summarize",
  [
    isAdmin,
    check("conversationId", "Conversation ID is required").not().isEmpty(),
  ],
  agentController.summarize
);

// @route   POST /api/agent/extract-requirements
// @desc    Extract requirements from the conversation
// @access  Private (Admin only)
router.post(
  "/extract-requirements",
  [
    isAdmin,
    check("conversationId", "Conversation ID is required").not().isEmpty(),
    check("clientId", "Client ID is required").not().isEmpty(),
  ],
  agentController.extractRequirements
);

// @route   POST /api/agent/respond
// @desc    Get a response from the agent for a client message
// @access  Private (Client only)
router.post(
  "/respond",
  [
    authorize(ROLES.ORG_CLIENT),
    check("conversationId", "Conversation ID is required").not().isEmpty(),
    check("clientId", "Client ID is required").not().isEmpty(),
    check("organizationId", "Organization ID is required").not().isEmpty(),
  ],
  agentController.respond
);

// ADK Proxy Endpoints
// These endpoints proxy requests to the Google ADK server to avoid CORS issues

const ADK_BASE_URL = process.env.ADK_BASE_URL || 'http://localhost:5566';
const Conversation = require("../models/Conversation");
const Client = require("../models/Client");

// @route   POST /api/agent/adk/create-session
// @desc    Create new ADK session with custom initial state and link to conversation
// @access  Private
router.post("/adk/create-session", async (req, res) => {
  try {
    const { conversationId, clientId, organizationId } = req.body;

    if (!conversationId || !clientId || !organizationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId, clientId, and organizationId are required"
      });
    }

    // Fetch conversation to ensure it exists and user has access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    // Check if conversation already has an ADK session
    if (conversation.adkSessionId) {
      return res.status(400).json({
        success: false,
        message: "Conversation already has an ADK session",
        sessionId: conversation.adkSessionId
      });
    }

    // Generate unique session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const userId = clientId; // Use client ID as user ID for ADK
    const appName = "orchestrator";

    // Get user name from JWT token (already decoded in auth middleware)
    const userFullName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : null;

    // Prepare enhanced initial state with project management context
    const userRole = req.user?.role || "org_client";
    const userEmail = req.user?.email;

    // Get role-based permissions
    const getUserPermissions = (role) => {
      const rolePermissions = {
        "org_admin": {
          "can_create_projects": true,
          "can_delete_projects": true,
          "can_manage_team": true,
          "can_view_analytics": true,
          "can_edit_organization": true
        },
        "org_member": {
          "can_create_projects": true,
          "can_delete_projects": false,
          "can_manage_team": false,
          "can_view_analytics": true,
          "can_edit_organization": false
        },
        "org_client": {
          "can_create_projects": false,
          "can_delete_projects": false,
          "can_manage_team": false,
          "can_view_analytics": false,
          "can_edit_organization": false
        }
      };
      return rolePermissions[role] || rolePermissions["org_client"];
    };

    // For org_admin users, ensure client_id is set to user_id for Jarvis agent functionality
    const effectiveClientId = (userRole === 'org_admin') ? req.user.id : clientId;

    const initialState = {
      // Core identifiers (REQUIRED for MCP tools)
      client_id: effectiveClientId,
      organization_id: organizationId,
      conversation_id: conversationId,
      user_id: userId,

      // User context for personalization and permissions
      user_name: userFullName || "there",
      user_full_name: userFullName,
      user_role: userRole,
      user_email: userEmail,

      // Project management context
      project_management: {
        active_project_id: null,
        default_project_status: "planning",
        default_task_status: "todo",
        default_priority: "medium",
        user_permissions: getUserPermissions(userRole),
        preferences: {
          default_view: "list",
          items_per_page: 20,
          show_completed_tasks: false,
          notification_preferences: {
            task_assignments: true,
            project_updates: true,
            deadline_reminders: true
          }
        }
      },

      // Agent coordination
      current_agent: "orchestrator_agent",
      agent_history: [],

      // Compatibility with other agents
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
        frontend_conversation_id: conversationId,
        session_type: "project_management",
        platform: "barka_frontend"
      }
    };

    // Create ADK session with custom initial state
    const adkUrl = `${ADK_BASE_URL}/apps/${appName}/users/${userId}/sessions/${sessionId}`;
    console.log(`Creating ADK session at: ${adkUrl}`);

    const response = await axios.post(adkUrl, initialState, {
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

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        userId: userId,
        appName: appName,
        conversationId: conversationId,
        adkResponse: response.data
      }
    });

  } catch (error) {
    console.error('ADK session creation error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: "ADK server is not available. Please make sure it's running on port 5566."
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data || error.message || "Failed to create ADK session"
    });
  }
});

// @route   POST /api/agent/adk/session
// @desc    Create ADK session (proxy to avoid CORS) - Legacy endpoint
// @access  Private
router.post("/adk/session", async (req, res) => {
  try {
    const { appName, userId, sessionId } = req.body;

    if (!appName || !userId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "appName, userId, and sessionId are required"
      });
    }

    const adkUrl = `${ADK_BASE_URL}/apps/${appName}/users/${userId}/sessions/${sessionId}`;
    console.log(`Proxying ADK session creation to: ${adkUrl}`);

    const response = await axios.post(adkUrl, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    res.json({
      success: true,
      data: response.data,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('ADK session creation error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: "ADK server is not available. Please make sure it's running on port 8000."
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data || error.message || "Failed to create ADK session"
    });
  }
});

// @route   POST /api/agent/adk/run
// @desc    Send message to ADK agent (proxy to avoid CORS)
// @access  Private
router.post("/adk/run", async (req, res) => {
  try {
    const { app_name, user_id, session_id, new_message } = req.body;

    if (!app_name || !user_id || !session_id || !new_message) {
      return res.status(400).json({
        success: false,
        message: "app_name, user_id, session_id, and new_message are required"
      });
    }

    const adkUrl = `${ADK_BASE_URL}/run`;
    console.log(`Proxying ADK message to: ${adkUrl}`);

    const response = await axios.post(adkUrl, {
      app_name,
      user_id,
      session_id,
      new_message
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 100000 // 100 seconds timeout for agent responses
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('ADK run error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: "ADK server is not available. Please make sure it's running on port 8000."
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data || error.message || "Failed to send message to ADK"
    });
  }
});

// @route   GET /api/agent/adk/conversation/:conversationId
// @desc    Get ADK session data for existing conversation
// @access  Private
router.get("/adk/conversation/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    console.log(`🔍 ADK SESSION REQUEST: Frontend requesting conversation ${conversationId}`);

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId is required"
      });
    }

    // Fetch conversation with ADK session information
    const conversation = await Conversation.findById(conversationId)
      .populate('client', 'user projectType status')
      .populate('organization', 'name');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    // Check if conversation has an ADK session
    if (!conversation.adkSessionId) {
      return res.status(404).json({
        success: false,
        message: "No ADK session found for this conversation",
        needsSessionCreation: true,
        conversationData: {
          id: conversation._id,
          title: conversation.title,
          status: conversation.status,
          client: conversation.client,
          organization: conversation.organization
        }
      });
    }

    // Fetch session data from ADK
    const { adkSessionId, adkUserId, adkAppName } = conversation;
    const adkUrl = `${ADK_BASE_URL}/apps/${adkAppName}/users/${adkUserId}/sessions/${adkSessionId}`;
    console.log(`🎯 FOUND MAPPING: conversation ${conversationId} -> session ${adkSessionId}`);
    console.log(`📡 Fetching ADK session from: ${adkUrl}`);

    const response = await axios.get(adkUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    // Combine conversation metadata with ADK session data
    const sessionData = response.data;

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation._id,
          title: conversation.title,
          status: conversation.status,
          lastMessageAt: conversation.lastMessageAt,
          client: conversation.client,
          organization: conversation.organization,
          adkSessionId: conversation.adkSessionId,
          adkUserId: conversation.adkUserId,
          adkAppName: conversation.adkAppName
        },
        session: {
          id: sessionData.id,
          app_name: sessionData.app_name,
          user_id: sessionData.user_id,
          state: sessionData.state,
          events: sessionData.events || [],
          last_update_time: sessionData.last_update_time
        },
        // Extract messages from events for frontend compatibility
        messages: (sessionData.events || []).map(event => ({
          id: event.id,
          author: event.author,
          content: event.content,
          timestamp: event.timestamp,
          turn_complete: event.turn_complete,
          actions: event.actions,
          metadata: {
            invocation_id: event.invocation_id,
            partial: event.partial,
            interrupted: event.interrupted,
            error_code: event.error_code,
            error_message: event.error_message
          }
        }))
      }
    });

  } catch (error) {
    console.error('ADK session retrieval error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: "ADK server is not available. Please make sure it's running on port 5566."
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "ADK session not found. The session may have expired or been deleted.",
        needsSessionCreation: true
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data || error.message || "Failed to retrieve ADK session"
    });
  }
});

module.exports = router;
