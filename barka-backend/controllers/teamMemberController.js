const TeamMember = require("../models/TeamMember");
const { User, ROLES } = require("../models/User");
const Client = require("../models/Client");
const { validationResult } = require("express-validator");

/**
 * @desc    Get all team members (org-scoped)
 * @route   GET /api/team-members
 * @access  Private (Organization scoped)
 */
exports.getTeamMembers = async (req, res) => {
  try {
    let query = {};

    // Build query based on user role
    if (req.user.role === ROLES.SUPER_ADMIN) {
      // Super admin can see all team members
      if (req.query.organizationId) {
        query.organization = req.query.organizationId;
      }
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      // Org admin can only see team members from their organization
      if (req.user.organization) {
        query.organization = req.user.organization;
      } else {
        // If admin doesn't have organization, show team members they created
        query.createdBy = req.user.id;
      }
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      // Clients can only see team members from their organization
      const client = await Client.findOne({ user: req.user.id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client profile not found",
        });
      }
      query.organization = client.organization;
    }

    // Apply filters from query parameters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.role) {
      query.role = req.query.role;
    }
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const teamMembers = await TeamMember.find(query)
      .populate("organization", "name")
      .populate("currentProjects", "name status")
      .select("-customFields") // Exclude custom fields for list view
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await TeamMember.countDocuments(query);

    // Pagination result
    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: teamMembers.length,
      total,
      pagination,
      data: teamMembers,
    });
  } catch (error) {
    console.error("Get team members error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new team member
 * @route   POST /api/team-members
 * @access  Private (Admin only)
 */
exports.createTeamMember = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      name,
      email,
      role,
      customRole,
      phone,
      department,
      title,
      capacity,
      skills,
      expertise,
      notes
    } = req.body;

    // Check if team member with this email already exists in the organization
    let organizationId;
    if (req.user.role === ROLES.ORG_ADMIN) {
      // For org admin, try to get organization from user, otherwise from request body
      organizationId = req.user.organization || req.body.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required. Please provide organizationId in request body.",
        });
      }
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      if (req.body.organizationId) {
        organizationId = req.body.organizationId;
      } else {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required for super admin users",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    // Get client ID for the organization (now optional)
    let clientId;
    if (req.user.role === ROLES.ORG_ADMIN) {
      // Try to find existing client profile
      const client = await Client.findOne({ user: req.user.id });
      if (client) {
        clientId = client._id;
      } else if (req.body.clientId) {
        // Allow explicit clientId in request body if no client profile exists
        clientId = req.body.clientId;
      }
      // Client is now optional - team members can exist at organization level
    } else if (req.body.clientId) {
      clientId = req.body.clientId;
    }
    // Client ID is no longer required - team members can be organization-level

    const existingTeamMember = await TeamMember.findOne({
      email,
      organization: organizationId,
    });

    if (existingTeamMember) {
      return res.status(400).json({
        success: false,
        message: "Team member with this email already exists in the organization",
      });
    }

    // Create team member data
    const teamMemberData = {
      client: clientId,
      organization: organizationId,
      name,
      email,
      role,
      customRole: role === "other" ? customRole : undefined,
      phone,
      department,
      title,
      capacity: capacity || {
        hoursPerWeek: 40,
        availability: "full_time",
        timezone: "UTC",
        workingHours: {
          start: "09:00",
          end: "17:00",
        },
      },
      skills: skills || [],
      expertise: expertise || [],
      notes,
      createdBy: req.user.id,
    };

    const teamMember = await TeamMember.create(teamMemberData);

    // Populate the response
    const populatedTeamMember = await TeamMember.findById(teamMember._id)
      .populate("organization", "name")
      .populate("createdBy", "firstName lastName email");

    res.status(201).json({
      success: true,
      data: populatedTeamMember,
      message: "Team member created successfully",
    });
  } catch (error) {
    console.error("Create team member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single team member
 * @route   GET /api/team-members/:id
 * @access  Private (Organization scoped)
 */
exports.getTeamMember = async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id)
      .populate("organization", "name")
      .populate("currentProjects", "name status priority")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email");

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    // Check if user has permission to view this team member
    let hasAccess = false;

    if (req.user.role === ROLES.SUPER_ADMIN) {
      hasAccess = true;
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      // For org admin without organization, allow access if they created the team member
      if (req.user.organization) {
        hasAccess = teamMember.organization._id.toString() === req.user.organization.toString();
      } else {
        // If admin doesn't have organization, check if they created this team member
        // Also check if the team member was created by this user (for testing scenarios)
        hasAccess = (teamMember.createdBy && teamMember.createdBy._id && teamMember.createdBy._id.toString() === req.user.id) ||
                   (teamMember.createdBy && teamMember.createdBy.toString() === req.user.id);
      }
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (client) {
        hasAccess = teamMember.organization._id.toString() === client.organization.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this team member",
      });
    }

    res.status(200).json({
      success: true,
      data: teamMember,
    });
  } catch (error) {
    console.error("Get team member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update team member
 * @route   PUT /api/team-members/:id
 * @access  Private (Admin or self-update)
 */
exports.updateTeamMember = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const teamMember = await TeamMember.findById(req.params.id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    // Check permissions
    let canUpdate = false;

    if (req.user.role === ROLES.SUPER_ADMIN) {
      canUpdate = true;
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      if (req.user.organization) {
        canUpdate = teamMember.organization.toString() === req.user.organization.toString();
      } else {
        // If admin doesn't have organization, check if they created this team member
        canUpdate = teamMember.createdBy && teamMember.createdBy.toString() === req.user.id;
      }
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      // Clients can only update their own team member profile if they have one
      const client = await Client.findOne({ user: req.user.id });
      if (client) {
        canUpdate = teamMember.organization.toString() === client.organization.toString() &&
                   teamMember.email === req.user.email; // Self-update only
      }
    }

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this team member",
      });
    }

    // Fields that can be updated
    const allowedFields = [
      'name', 'email', 'role', 'customRole', 'phone', 'department', 'title',
      'capacity', 'skills', 'expertise', 'notes', 'status', 'tags'
    ];

    // For non-admin users, restrict certain fields
    if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.ORG_ADMIN) {
      const restrictedFields = ['role', 'customRole', 'status'];
      restrictedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          delete req.body[field];
        }
      });
    }

    // Update only allowed fields
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle custom role validation
    if (updateData.role === "other" && !updateData.customRole) {
      return res.status(400).json({
        success: false,
        message: "Custom role is required when role is 'other'",
      });
    }

    // Add audit trail
    updateData.lastModifiedBy = req.user.id;

    const updatedTeamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("organization", "name")
      .populate("currentProjects", "name status priority")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      data: updatedTeamMember,
      message: "Team member updated successfully",
    });
  } catch (error) {
    console.error("Update team member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete team member
 * @route   DELETE /api/team-members/:id
 * @access  Private (Admin only)
 */
exports.deleteTeamMember = async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    // Check permissions - only admins can delete
    let canDelete = false;

    if (req.user.role === ROLES.SUPER_ADMIN) {
      canDelete = true;
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      if (req.user.organization) {
        canDelete = teamMember.organization.toString() === req.user.organization.toString();
      } else {
        // If admin doesn't have organization, check if they created this team member
        canDelete = teamMember.createdBy && teamMember.createdBy.toString() === req.user.id;
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this team member",
      });
    }

    // Check if team member has active assignments
    if (teamMember.currentProjects.length > 0 || teamMember.workload.currentTasks > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete team member with active project assignments or tasks. Please reassign or complete their work first.",
      });
    }

    await TeamMember.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Team member deleted successfully",
      data: {
        id: req.params.id,
        name: teamMember.name,
        email: teamMember.email,
      },
    });
  } catch (error) {
    console.error("Delete team member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get team statistics for organization
 * @route   GET /api/team-members/stats
 * @access  Private (Admin only)
 */
exports.getTeamStats = async (req, res) => {
  try {
    // Build filter based on organization
    let filter = {};
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Get total team members
    const totalMembers = await TeamMember.countDocuments(filter);

    // Get role distribution
    const roleDistribution = await TeamMember.aggregate([
      { $match: filter },
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get status distribution
    const statusDistribution = await TeamMember.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Get capacity utilization
    const capacityStats = await TeamMember.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: "$capacity.hoursPerWeek" },
          avgCapacity: { $avg: "$capacity.hoursPerWeek" },
          totalProjects: { $sum: "$workload.currentProjects" },
          totalTasks: { $sum: "$workload.totalTasks" },
          completedTasks: { $sum: "$workload.completedTasks" }
        }
      }
    ]);

    // Calculate utilization percentage
    const utilization = capacityStats.length > 0 ? {
      ...capacityStats[0],
      taskCompletionRate: capacityStats[0].totalTasks > 0
        ? (capacityStats[0].completedTasks / capacityStats[0].totalTasks * 100).toFixed(2)
        : 0
    } : {};

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        roleDistribution,
        statusDistribution,
        utilization,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Get team stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update team member workload
 * @route   PUT /api/team-members/:id/workload
 * @access  Private (Admin only)
 */
exports.updateWorkload = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Build filter based on organization
    let filter = { _id: req.params.id };
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const teamMember = await TeamMember.findOne(filter);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    const { currentTasks, totalHoursAllocated, workload } = req.body;

    // Update workload data
    const updateData = {};
    if (workload) {
      updateData.workload = { ...teamMember.workload, ...workload };
    }
    // Handle legacy fields for backward compatibility
    if (currentTasks !== undefined) {
      updateData.workload = { ...updateData.workload, currentTasks };
    }
    if (totalHoursAllocated !== undefined) {
      updateData.workload = { ...updateData.workload, totalHoursAllocated };
    }

    updateData.lastModifiedBy = req.user.id;

    const updatedTeamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("currentProjects", "name status")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Team member workload updated successfully",
      data: updatedTeamMember,
    });
  } catch (error) {
    console.error("Update workload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update team member hourly rate
 * @route   PUT /api/team-members/:id/hourly-rate
 * @access  Private (Admin only)
 */
exports.updateHourlyRate = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const teamMember = await TeamMember.findById(req.params.id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    // Check permissions - only admins can update hourly rates
    let canUpdate = false;

    if (req.user.role === ROLES.SUPER_ADMIN) {
      canUpdate = true;
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      if (req.user.organization) {
        canUpdate = teamMember.organization.toString() === req.user.organization.toString();
      } else {
        // If admin doesn't have organization, check if they created this team member
        canUpdate = teamMember.createdBy && teamMember.createdBy.toString() === req.user.id;
      }
    }

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this team member's hourly rate",
      });
    }

    const { hourlyRate } = req.body;

    // Validate hourly rate
    if (typeof hourlyRate !== 'number' || hourlyRate < 0) {
      return res.status(400).json({
        success: false,
        message: "Hourly rate must be a positive number",
      });
    }

    if (hourlyRate < 10 || hourlyRate > 500) {
      return res.status(400).json({
        success: false,
        message: "Hourly rate must be between $10 and $500 per hour",
      });
    }

    const updateData = {
      hourlyRate,
      lastModifiedBy: req.user.id,
    };

    const updatedTeamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("organization", "name")
      .populate("currentProjects", "name status priority")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      data: updatedTeamMember,
      message: "Hourly rate updated successfully",
    });
  } catch (error) {
    console.error("Update hourly rate error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update team member status
 * @route   PUT /api/team-members/:id/status
 * @access  Private (Admin only)
 */
exports.updateStatus = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Build filter based on organization
    let filter = { _id: req.params.id };
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const teamMember = await TeamMember.findOne(filter);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    const { status, reason } = req.body;

    // Create status history entry
    const statusHistoryEntry = {
      status,
      timestamp: new Date(),
      changedBy: req.user.id,
      reason: reason || ""
    };

    const updateData = {
      status,
      lastModifiedBy: req.user.id,
      $push: { statusHistory: statusHistoryEntry }
    };

    // If setting to inactive or on_leave, update isActive flag
    if (status === "inactive" || status === "on_leave") {
      updateData.isActive = false;
    } else if (status === "active") {
      updateData.isActive = true;
    }

    const updatedTeamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("lastModifiedBy", "firstName lastName email")
      .populate("statusHistory.changedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Team member status updated successfully",
      data: updatedTeamMember,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get tasks assigned to team member
 * @route   GET /api/team-members/:id/tasks
 * @access  Private (Organization scoped)
 */
exports.getTeamMemberTasks = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Build filter based on organization
    let filter = { _id: req.params.id };
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const teamMember = await TeamMember.findOne(filter);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    // Get tasks assigned to this team member
    const Task = require("../models/Task");
    const tasks = await Task.find({
      assignedTo: req.params.id,
      organization: req.user.organization
    })
      .populate("project", "name status priority")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    // Get task statistics
    const taskStats = await Task.aggregate([
      {
        $match: {
          assignedTo: teamMember._id,
          organization: req.user.organization
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        teamMember: {
          _id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          role: teamMember.role
        },
        tasks,
        taskStats,
        totalTasks: tasks.length
      }
    });
  } catch (error) {
    console.error("Get team member tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get projects assigned to team member
 * @route   GET /api/team-members/:id/projects
 * @access  Private (Organization scoped)
 */
exports.getTeamMemberProjects = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Build filter based on organization
    let filter = { _id: req.params.id };
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const teamMember = await TeamMember.findOne(filter);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    // Get projects where this team member is assigned
    const Project = require("../models/Project");
    const projects = await Project.find({
      $or: [
        { teamMembers: req.params.id },
        { projectManager: req.params.id }
      ],
      organization: req.user.organization
    })
      .populate("client", "firstName lastName email")
      .populate("projectManager", "name email role")
      .sort({ createdAt: -1 });

    // Get project statistics
    const projectStats = await Project.aggregate([
      {
        $match: {
          $or: [
            { teamMembers: teamMember._id },
            { projectManager: teamMember._id }
          ],
          organization: req.user.organization
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        teamMember: {
          _id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          role: teamMember.role
        },
        projects,
        projectStats,
        totalProjects: projects.length
      }
    });
  } catch (error) {
    console.error("Get team member projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update team member skills
 * @route   PUT /api/team-members/:id/skills
 * @access  Private (Admin or self-update)
 */
exports.updateSkills = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Build filter based on organization
    let filter = { _id: req.params.id };
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const teamMember = await TeamMember.findOne(filter);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    // Check permissions - admin or self-update
    const isAdmin = req.user.role === "admin" || req.user.role === "org_admin" || req.user.role === "super_admin";
    const isSelf = teamMember._id.toString() === req.user.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this team member's skills",
      });
    }

    const { skills, expertise, certifications } = req.body;

    const updateData = {};
    if (skills !== undefined) updateData.skills = skills;
    if (expertise !== undefined) updateData.expertise = expertise;
    if (certifications !== undefined) updateData.certifications = certifications;
    updateData.lastModifiedBy = req.user.id;

    const updatedTeamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Team member skills updated successfully",
      data: updatedTeamMember,
    });
  } catch (error) {
    console.error("Update skills error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get available team members for assignment
 * @route   GET /api/team-members/available
 * @access  Private
 */
exports.getAvailableTeamMembers = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { hoursNeeded, skills, role } = req.query;

    // Build filter based on organization and availability
    let filter = {
      status: "active",
      isActive: true
    };

    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    if (role) {
      filter.role = role;
    }

    // Get team members
    let teamMembers = await TeamMember.find(filter)
      .populate("currentProjects", "name status")
      .sort({ name: 1 });

    // Filter by skills if provided
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim().toLowerCase());
      teamMembers = teamMembers.filter(member => {
        const memberSkills = member.skills.map(s => s.toLowerCase());
        return skillsArray.some(skill => memberSkills.includes(skill));
      });
    }

    // Filter by capacity if hoursNeeded is provided
    if (hoursNeeded) {
      const hours = parseFloat(hoursNeeded);
      teamMembers = teamMembers.filter(member => {
        const availableHours = member.capacity.hoursPerWeek - (member.workload?.totalHoursAllocated || 0);
        return availableHours >= hours;
      });
    }

    // Calculate availability metrics for each team member
    const availableMembers = teamMembers.map(member => ({
      _id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      skills: member.skills,
      expertise: member.expertise,
      capacity: member.capacity,
      workload: member.workload,
      availability: {
        totalCapacity: member.capacity.hoursPerWeek,
        allocated: member.workload?.totalHoursAllocated || 0,
        available: member.capacity.hoursPerWeek - (member.workload?.totalHoursAllocated || 0),
        utilizationPercentage: member.capacity.hoursPerWeek > 0
          ? ((member.workload?.totalHoursAllocated || 0) / member.capacity.hoursPerWeek * 100).toFixed(2)
          : 0
      },
      currentProjects: member.currentProjects.length,
      currentTasks: member.workload?.currentTasks || 0
    }));

    res.status(200).json({
      success: true,
      count: availableMembers.length,
      filters: { hoursNeeded, skills, role },
      data: availableMembers,
    });
  } catch (error) {
    console.error("Get available team members error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get team members by role
 * @route   GET /api/team-members/by-role/:role
 * @access  Private (Organization scoped)
 */
exports.getTeamMembersByRole = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Build filter based on organization and role
    let filter = { role: req.params.role };
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const teamMembers = await TeamMember.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("currentProjects", "name status")
      .sort({ name: 1 });

    // Get role statistics
    const roleStats = await TeamMember.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      role: req.params.role,
      count: teamMembers.length,
      roleStats,
      data: teamMembers,
    });
  } catch (error) {
    console.error("Get team members by role error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Search team members
 * @route   GET /api/team-members/search
 * @access  Private (Organization scoped)
 */
exports.searchTeamMembers = async (req, res) => {
  try {
    const { q: query, role, status, department, page = 1, limit = 10 } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Build base query based on user role and organization
    let baseQuery = {};

    if (req.user.role === ROLES.SUPER_ADMIN) {
      // Super admin can search all team members
      if (req.query.organizationId) {
        baseQuery.organization = req.query.organizationId;
      }
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      // Org admin can only search team members from their organization
      if (req.user.organization) {
        baseQuery.organization = req.user.organization;
      } else {
        baseQuery.createdBy = req.user.id;
      }
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      // Clients can only search team members from their organization
      const client = await Client.findOne({ user: req.user.id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client profile not found",
        });
      }
      baseQuery.organization = client.organization;
    }

    // Create search regex for case-insensitive search
    const searchRegex = new RegExp(query.trim(), 'i');

    // Build search query
    const searchQuery = {
      ...baseQuery,
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { title: searchRegex },
        { skills: { $in: [searchRegex] } },
        { tags: { $in: [searchRegex] } }
      ]
    };

    // Apply additional filters
    if (role) {
      searchQuery.role = role;
    }
    if (status) {
      searchQuery.status = status;
    }
    if (department) {
      searchQuery.department = department;
    }

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const startIndex = (pageNum - 1) * limitNum;

    const teamMembers = await TeamMember.find(searchQuery)
      .populate("organization", "name")
      .populate("currentProjects", "name status")
      .select("-customFields") // Exclude custom fields for search results
      .sort({ name: 1 })
      .limit(limitNum)
      .skip(startIndex);

    const total = await TeamMember.countDocuments(searchQuery);

    // Pagination result
    const pagination = {};
    if (startIndex + limitNum < total) {
      pagination.next = {
        page: pageNum + 1,
        limit: limitNum,
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: pageNum - 1,
        limit: limitNum,
      };
    }

    res.status(200).json({
      success: true,
      count: teamMembers.length,
      total,
      query,
      pagination,
      members: teamMembers, // Use 'members' to match frontend expectation
      data: teamMembers, // Keep 'data' for backward compatibility
    });
  } catch (error) {
    console.error("Search team members error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
