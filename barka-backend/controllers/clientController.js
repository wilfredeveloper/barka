const { User, ROLES } = require("../models/User");
const Client = require("../models/Client");
const Organization = require("../models/Organization");
const Todo = require("../models/Todo");
const { generateDefaultTodos } = require("../utils/todoGenerator");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");

/**
 * @desc    Get all clients (filtered by organization for org admins)
 * @route   GET /api/clients
 * @access  Private (Admin only)
 */
exports.getClients = async (req, res) => {
  try {
    let query = {};

    // If org admin, only show clients from their organization
    if (req.user.role === ROLES.ORG_ADMIN) {
      query.organization = req.user.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN && req.query.organization) {
      // Super admin can filter by organization
      query.organization = req.query.organization;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by project type if provided
    if (req.query.projectType) {
      query.projectType = req.query.projectType;
    }

    const clients = await Client.find(query)
      .populate({
        path: "user",
        select: "firstName lastName email",
      })
      .populate("organization", "name");

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single client
 * @route   GET /api/clients/:id
 * @access  Private (Admin or same organization)
 */
exports.getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate({
        path: "user",
        select: "firstName lastName email",
      })
      .populate("organization", "name");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check if user has permission to view this client
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      client.organization &&
      client.organization._id.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this client",
      });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new client
 * @route   POST /api/clients
 * @access  Private (Admin only)
 */
exports.createClient = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      userId,
      projectType,
      projectTypeOther,
      budget,
      timeline,
      requirements,
      notes,
      status,
    } = req.body;

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Determine organization
    let organizationId;
    if (req.user.role === ROLES.ORG_ADMIN) {
      // Org admin can only create clients in their organization
      organizationId = req.user.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      // Super admin must specify organization
      organizationId = req.body.organizationId;
      if (!organizationId) {
        // If no organization is specified, check if the user has an organization
        if (user.organization) {
          organizationId = user.organization;
        } else {
          return res.status(400).json({
            success: false,
            message: "Organization ID is required",
          });
        }
      }
    }

    // Create client
    const client = await Client.create({
      user: userId,
      organization: organizationId,
      projectType,
      projectTypeOther,
      budget,
      timeline,
      requirements,
      notes,
      status: status || "onboarding",
    });

    // Update user role to org_client if not already
    if (user.role !== ROLES.ORG_CLIENT) {
      user.role = ROLES.ORG_CLIENT;
      user.organization = organizationId;
      await user.save();
    }

    // Generate default todos for the client based on project type
    try {
      logger.info(
        `Generating default todos for client ${client._id} with project type ${projectType}`
      );
      const todos = await generateDefaultTodos(
        client._id,
        organizationId,
        projectType,
        { budget, timeline }
      );

      logger.info(`Created ${todos.length} todos for client ${client._id}`);
    } catch (todoError) {
      logger.error(`Error generating todos: ${todoError.message}`, todoError);
      // Continue even if todo generation fails - we don't want to fail the client creation
    }

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update client
 * @route   PUT /api/clients/:id
 * @access  Private (Admin only)
 */
exports.updateClient = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check if user has permission to update this client
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      client.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this client",
      });
    }

    // Update client
    client = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate({
      path: "user",
      select: "firstName lastName email",
    });

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete client
 * @route   DELETE /api/clients/:id
 * @access  Private (Admin only)
 */
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check if user has permission to delete this client
    if (
      req.user.role === ROLES.ORG_ADMIN &&
      client.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this client",
      });
    }

    await client.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get client information for the logged in user
 * @route   GET /api/clients/me
 * @access  Private (Client only)
 */
exports.getClientForUser = async (req, res) => {
  try {
    // Find client where user is the logged in user
    const client = await Client.findOne({ user: req.user.id })
      .populate({
        path: "user",
        select: "firstName lastName email",
      })
      .populate("organization", "name");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client information not found",
      });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Get client for user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get upcoming meetings for the logged in client
 * @route   GET /api/clients/me/meetings
 * @access  Private (Client only)
 */
exports.getClientMeetings = async (req, res) => {
  try {
    // Find client where user is the logged in user
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client information not found",
      });
    }

    // Get the number of days to look ahead (default 30)
    const daysAhead = parseInt(req.query.days) || 30;

    // Calculate date range
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    // Use mongoose connection to access the scheduled_events collection
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        message: "Database connection not available",
      });
    }

    const scheduledEventsCollection = db.collection('scheduled_events');

    // Query for upcoming meetings for this client
    // Try both ObjectId and string formats to ensure compatibility
    const meetings = await scheduledEventsCollection.find({
      clientId: client._id, // Use ObjectId format as stored in database
      startTime: {
        $gte: now,
        $lte: futureDate
      }
    }).sort({ startTime: 1 }).toArray();

    // Format meetings for frontend
    const formattedMeetings = meetings.map(meeting => ({
      id: meeting._id,
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      eventType: meeting.eventType,
      status: meeting.status || 'scheduled',
      attendees: meeting.attendees || [],
      calendarEventId: meeting.calendarEventId,
      createdAt: meeting.createdAt
    }));

    res.status(200).json({
      success: true,
      data: formattedMeetings,
      count: formattedMeetings.length,
      message: `Found ${formattedMeetings.length} upcoming meetings`
    });

  } catch (error) {
    console.error("Get client meetings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all meetings for the logged in client (not just upcoming)
 * @route   GET /api/clients/me/meetings/all
 * @access  Private (Client only)
 */
exports.getAllClientMeetings = async (req, res) => {
  try {
    // Find client where user is the logged in user
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client information not found",
      });
    }

    // Get MongoDB connection
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        message: "Database connection not available",
      });
    }

    const scheduledEventsCollection = db.collection('scheduled_events');

    // Query for all meetings for this client
    const meetings = await scheduledEventsCollection.find({
      clientId: client._id, // Use ObjectId format as stored in database
    }).sort({ startTime: -1 }).toArray(); // Sort by most recent first

    // Format meetings for frontend
    const formattedMeetings = meetings.map(meeting => ({
      id: meeting._id,
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      eventType: meeting.eventType,
      status: meeting.status || 'scheduled',
      attendees: meeting.attendees || [],
      calendarEventId: meeting.calendarEventId,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: formattedMeetings,
      count: formattedMeetings.length,
      message: `Found ${formattedMeetings.length} meetings`
    });

  } catch (error) {
    console.error("Get all client meetings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Refresh client onboarding progress
 * @route   POST /api/clients/:id/refresh-progress
 * @access  Private (Admin or same client)
 */
exports.refreshClientProgress = async (req, res) => {
  try {
    const clientId = req.params.id;

    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check permissions
    if (req.user.role === ROLES.ORG_CLIENT) {
      // Clients can only refresh their own progress
      const userClient = await Client.findOne({ user: req.user.id });
      if (!userClient || userClient._id.toString() !== clientId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to refresh this client's progress",
        });
      }
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      // Org admins can only refresh progress for clients in their organization
      if (client.organization.toString() !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to refresh this client's progress",
        });
      }
    }
    // Super admins can refresh any client's progress

    // Calculate current progress
    const progress = await Todo.calculateProgress(clientId);

    // Update client with new progress
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      { onboardingProgress: progress.overall },
      { new: true }
    ).populate({
      path: "user",
      select: "firstName lastName email",
    });

    logger.info(`Progress refreshed for client ${clientId}: ${progress.overall}%`);

    res.status(200).json({
      success: true,
      data: {
        client: updatedClient,
        progress: progress,
        message: `Progress updated to ${progress.overall}%`
      },
    });
  } catch (error) {
    logger.error("Refresh client progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Refresh current user's onboarding progress
 * @route   POST /api/clients/me/refresh-progress
 * @access  Private (Client only)
 */
exports.refreshMyProgress = async (req, res) => {
  try {
    // Find client for the logged in user
    const client = await Client.findOne({ user: req.user.id });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client information not found",
      });
    }

    // Calculate current progress
    const progress = await Todo.calculateProgress(client._id);

    // Update client with new progress
    const updatedClient = await Client.findByIdAndUpdate(
      client._id,
      { onboardingProgress: progress.overall },
      { new: true }
    ).populate({
      path: "user",
      select: "firstName lastName email",
    });

    logger.info(`Progress refreshed for current user client ${client._id}: ${progress.overall}%`);

    res.status(200).json({
      success: true,
      data: {
        client: updatedClient,
        progress: progress,
        message: `Progress updated to ${progress.overall}%`
      },
    });
  } catch (error) {
    logger.error("Refresh my progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single meeting details for the logged in client
 * @route   GET /api/clients/me/meetings/:meetingId
 * @access  Private (Client only)
 */
exports.getClientMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Find client where user is the logged in user
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client information not found",
      });
    }

    // Get MongoDB connection
    const mongoose = require('mongoose');
    const { ObjectId } = require('mongodb');
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        message: "Database connection not available",
      });
    }

    const scheduledEventsCollection = db.collection('scheduled_events');

    // Query for specific meeting for this client
    const meeting = await scheduledEventsCollection.findOne({
      _id: new ObjectId(meetingId),
      clientId: client._id, // Ensure client can only access their own meetings
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Format meeting for frontend
    const formattedMeeting = {
      id: meeting._id,
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      eventType: meeting.eventType,
      status: meeting.status || 'scheduled',
      attendees: meeting.attendees || [],
      calendarEventId: meeting.calendarEventId,
      location: meeting.location,
      meetingLink: meeting.meetingLink,
      reminders: meeting.reminders || [],
      metadata: meeting.metadata || {},
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt
    };

    res.status(200).json({
      success: true,
      data: formattedMeeting,
      message: "Meeting details retrieved successfully"
    });

  } catch (error) {
    console.error("Get client meeting error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update meeting for the logged in client
 * @route   PUT /api/clients/me/meetings/:meetingId
 * @access  Private (Client only)
 */
exports.updateClientMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, description, startTime, endTime, status } = req.body;

    // Find client where user is the logged in user
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client information not found",
      });
    }

    // Get MongoDB connection
    const mongoose = require('mongoose');
    const { ObjectId } = require('mongodb');
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        message: "Database connection not available",
      });
    }

    const scheduledEventsCollection = db.collection('scheduled_events');

    // Prepare update data
    const updateData = {
      updatedAt: new Date()
    };

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (status) updateData.status = status;

    // Update the meeting
    const result = await scheduledEventsCollection.updateOne(
      {
        _id: new ObjectId(meetingId),
        clientId: client._id, // Ensure client can only update their own meetings
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Get the updated meeting
    const updatedMeeting = await scheduledEventsCollection.findOne({
      _id: new ObjectId(meetingId)
    });

    res.status(200).json({
      success: true,
      data: {
        id: updatedMeeting._id,
        title: updatedMeeting.title,
        description: updatedMeeting.description,
        startTime: updatedMeeting.startTime,
        endTime: updatedMeeting.endTime,
        eventType: updatedMeeting.eventType,
        status: updatedMeeting.status,
        attendees: updatedMeeting.attendees || [],
        calendarEventId: updatedMeeting.calendarEventId,
        createdAt: updatedMeeting.createdAt,
        updatedAt: updatedMeeting.updatedAt
      },
      message: "Meeting updated successfully"
    });

  } catch (error) {
    console.error("Update client meeting error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete meeting for the logged in client
 * @route   DELETE /api/clients/me/meetings/:meetingId
 * @access  Private (Client only)
 */
exports.deleteClientMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Find client where user is the logged in user
    const client = await Client.findOne({ user: req.user.id });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client information not found",
      });
    }

    // Get MongoDB connection
    const mongoose = require('mongoose');
    const { ObjectId } = require('mongodb');
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        message: "Database connection not available",
      });
    }

    const scheduledEventsCollection = db.collection('scheduled_events');

    // Delete the meeting
    const result = await scheduledEventsCollection.deleteOne({
      _id: new ObjectId(meetingId),
      clientId: client._id, // Ensure client can only delete their own meetings
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Meeting deleted successfully"
    });

  } catch (error) {
    console.error("Delete client meeting error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get client statistics for an organization
 * @route   GET /api/clients/stats
 * @access  Private (Admin only)
 */
exports.getClientStats = async (req, res) => {
  try {
    let organizationId;

    if (req.user.role === ROLES.ORG_ADMIN) {
      organizationId = req.user.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN && req.query.organization) {
      organizationId = req.query.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      // Get stats across all organizations
      // This would be a more complex aggregation
      return res.status(400).json({
        success: false,
        message: "Please specify an organization ID",
      });
    }

    const stats = await Client.getOrganizationStats(organizationId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get client stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
