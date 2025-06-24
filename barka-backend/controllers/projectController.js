const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const TeamMember = require("../models/TeamMember");
const Task = require("../models/Task");
const { ROLES } = require("../models/User");

/**
 * Helper function to apply organization-based security filter
 * CRITICAL SECURITY: Prevents users without organization from accessing any data
 */
const applyOrganizationFilter = (req, res, filter = {}) => {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    // Super admin can see all data (no filter applied)
    return { success: true, filter };
  } else if (req.user.organization) {
    // User has organization - apply organization filter
    filter.organization = req.user.organization;
    return { success: true, filter };
  } else {
    // SECURITY: User without organization cannot access any data
    return {
      success: false,
      error: {
        status: 403,
        response: {
          success: false,
          message: "Access denied. User account is not associated with an organization.",
        }
      }
    };
  }
};

/**
 * @desc    Get all projects (client/org-scoped)
 * @route   GET /api/projects
 * @access  Private (Organization/Client scoped)
 */
exports.getProjects = async (req, res) => {
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
      page = 1,
      limit = 10,
      status,
      priority,
      isActive,
      isArchived
    } = req.query;

    // Build filter based on user role and organization
    let filter = {};

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping - clients can only see their own projects
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply query filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isArchived !== undefined) filter.isArchived = isArchived === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get projects with pagination
    const projects = await Project.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / parseInt(limit));

    res.status(200).json({
      success: true,
      count: projects.length,
      totalProjects,
      totalPages,
      currentPage: parseInt(page),
      data: projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private (Admin only)
 */
exports.createProject = async (req, res) => {
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
      description,
      startDate,
      dueDate,
      status,
      priority,
      budget,
      currency,
      teamMembers,
      projectManager,
      tags,
      milestones,
      clientId,
      organizationId
    } = req.body;

    // Validate team members exist and belong to the same organization
    if (teamMembers && teamMembers.length > 0) {
      const validTeamMembers = await TeamMember.find({
        _id: { $in: teamMembers },
        organization: req.user.organization
      });

      if (validTeamMembers.length !== teamMembers.length) {
        return res.status(400).json({
          success: false,
          message: "One or more team members are invalid or not in your organization",
        });
      }
    }

    // Validate project manager exists and belongs to the same organization
    if (projectManager) {
      const validProjectManager = await TeamMember.findOne({
        _id: projectManager,
        organization: req.user.organization
      });

      if (!validProjectManager) {
        return res.status(400).json({
          success: false,
          message: "Project manager is invalid or not in your organization",
        });
      }
    }

    // Create project data
    const projectData = {
      name,
      description,
      startDate,
      dueDate,
      status: status || "planning",
      priority: priority || "medium",
      budget,
      currency: currency || "USD",
      teamMembers: teamMembers || [],
      projectManager,
      tags: tags || [],
      milestones: milestones || [],
      client: req.user.client || clientId,
      organization: req.user.organization || organizationId,
      createdBy: req.user.id,
    };



    const project = await Project.create(projectData);

    // Populate the created project
    const populatedProject = await Project.findById(project._id)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email");

    // Update team members' current projects
    if (teamMembers && teamMembers.length > 0) {
      await TeamMember.updateMany(
        { _id: { $in: teamMembers } },
        { $addToSet: { currentProjects: project._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populatedProject,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single project with full details
 * @route   GET /api/projects/:id
 * @access  Private (Organization/Client scoped)
 */
exports.getProject = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    const project = await Project.findOne(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role capacity")
      .populate("teamMembers", "name email role capacity workload")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email")
      .populate({
        path: "tasks",
        populate: {
          path: "assignedTo",
          select: "name email role"
        }
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private (Admin only)
 */
exports.updateProject = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Find the project first
    const existingProject = await Project.findOne(filter);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Define allowed fields for update
    const allowedFields = [
      "name",
      "description",
      "startDate",
      "dueDate",
      "status",
      "priority",
      "budget",
      "currency",
      "teamMembers",
      "projectManager",
      "tags",
      "milestones"
    ];

    // Update only allowed fields
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Validate date logic if both dates are being updated
    if (updateData.startDate && updateData.dueDate) {
      if (new Date(updateData.dueDate) <= new Date(updateData.startDate)) {
        return res.status(400).json({
          success: false,
          message: "Due date must be after start date",
        });
      }
    }

    // Validate team members if provided
    if (updateData.teamMembers) {
      const validTeamMembers = await TeamMember.find({
        _id: { $in: updateData.teamMembers },
        organization: req.user.organization
      });

      if (validTeamMembers.length !== updateData.teamMembers.length) {
        return res.status(400).json({
          success: false,
          message: "One or more team members are invalid or not in your organization",
        });
      }
    }

    // Validate project manager if provided
    if (updateData.projectManager) {
      const validProjectManager = await TeamMember.findOne({
        _id: updateData.projectManager,
        organization: req.user.organization
      });

      if (!validProjectManager) {
        return res.status(400).json({
          success: false,
          message: "Project manager is invalid or not in your organization",
        });
      }
    }

    // Add audit trail
    updateData.lastModifiedBy = req.user.id;

    // Handle status change to completed
    if (updateData.status === "completed" && existingProject.status !== "completed") {
      updateData.completedAt = new Date();
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email");

    // Update team members' current projects if team changed
    if (updateData.teamMembers) {
      // Remove project from old team members
      await TeamMember.updateMany(
        { currentProjects: req.params.id },
        { $pull: { currentProjects: req.params.id } }
      );

      // Add project to new team members
      await TeamMember.updateMany(
        { _id: { $in: updateData.teamMembers } },
        { $addToSet: { currentProjects: req.params.id } }
      );
    }

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Soft delete project (move to trash)
 * @route   DELETE /api/projects/:id
 * @access  Private (Admin only)
 */
exports.deleteProject = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { password, reason } = req.body;

    // Validate admin password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Admin password is required for project deletion",
      });
    }

    // Get user with password field for validation
    const { User } = require("../models/User");
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    const project = await Project.findOne(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Create trash entry
    const Trash = require("../models/Trash");
    const trashData = {
      originalData: project.toObject(),
      originalCollection: "projects",
      originalId: project._id,
      deleted_by: req.user.id,
      organization: project.organization._id || project.organization,
      deletion_reason: reason || "Project deleted by admin",
    };

    const trashEntry = await Trash.create(trashData);

    // Remove project from team members' current projects
    const TeamMember = require("../models/TeamMember");
    await TeamMember.updateMany(
      { currentProjects: req.params.id },
      { $pull: { currentProjects: req.params.id } }
    );

    // Remove the project from the projects collection
    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Project moved to trash. It will be automatically removed in 7 days unless restored.",
      data: {
        id: req.params.id,
        name: project.name,
        trashId: trashEntry._id,
        autoDeleteDate: trashEntry.auto_delete_date,
        daysUntilDeletion: trashEntry.getDaysUntilDeletion()
      }
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Recover project from trash
 * @route   POST /api/projects/recover/:trashId
 * @access  Private (Admin only)
 */
exports.recoverProject = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { password } = req.body;

    // Validate admin password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Admin password is required for project recovery",
      });
    }

    // Get user with password field for validation
    const { User } = require("../models/User");
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Find trash entry
    const Trash = require("../models/Trash");
    let filter = {
      _id: req.params.trashId,
      originalCollection: "projects",
      status: "deleted"
    };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    const trashEntry = await Trash.findOne(filter);
    if (!trashEntry) {
      return res.status(404).json({
        success: false,
        message: "Trash entry not found or already recovered",
      });
    }

    // Check if item is expired
    if (trashEntry.isExpired()) {
      return res.status(400).json({
        success: false,
        message: "Cannot recover expired item. It may have been permanently deleted.",
      });
    }

    // Restore the project
    const projectData = trashEntry.originalData;
    delete projectData._id; // Remove the old ID to create a new one
    projectData.lastModifiedBy = req.user.id;

    const restoredProject = await Project.create(projectData);

    // Update trash entry status
    await Trash.recoverItem(req.params.trashId, req.user.id);

    // Restore project to team members' current projects
    const TeamMember = require("../models/TeamMember");
    if (projectData.teamMembers && projectData.teamMembers.length > 0) {
      await TeamMember.updateMany(
        { _id: { $in: projectData.teamMembers } },
        { $addToSet: { currentProjects: restoredProject._id } }
      );
    }

    // Populate the restored project
    const populatedProject = await Project.findById(restoredProject._id)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Project recovered successfully",
      data: populatedProject,
    });
  } catch (error) {
    console.error("Recover project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================================================
// PHASE 2: PROJECT MANAGEMENT OPERATIONS
// ============================================================================

/**
 * @desc    Get project statistics
 * @route   GET /api/projects/stats
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectStats = async (req, res) => {
  try {
    // Build filter based on user role and organization
    let filter = {};

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping - clients can only see their own projects
    if (req.user.client) {
      filter.client = req.user.client;
    }

    // Get status distribution
    const statusStats = await Project.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgCompletion: { $avg: "$progress.completionPercentage" },
          totalBudget: { $sum: "$budget" }
        }
      }
    ]);

    // Get priority distribution
    const priorityStats = await Project.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get completion rates
    const completionStats = await Project.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          completedProjects: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          activeProjects: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          onHoldProjects: {
            $sum: { $cond: [{ $eq: ["$status", "on_hold"] }, 1, 0] }
          },
          planningProjects: {
            $sum: { $cond: [{ $eq: ["$status", "planning"] }, 1, 0] }
          },
          cancelledProjects: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          },
          avgCompletionPercentage: { $avg: "$progress.completionPercentage" },
          totalBudget: { $sum: "$budget" }
        }
      }
    ]);

    // Get overdue projects
    const overdueProjects = await Project.countDocuments({
      ...filter,
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] }
    });

    // Get projects due soon (within 7 days)
    const dueSoonDate = new Date();
    dueSoonDate.setDate(dueSoonDate.getDate() + 7);
    const dueSoonProjects = await Project.countDocuments({
      ...filter,
      dueDate: { $gte: new Date(), $lte: dueSoonDate },
      status: { $nin: ["completed", "cancelled"] }
    });

    const stats = {
      statusDistribution: statusStats,
      priorityDistribution: priorityStats,
      completionRates: completionStats[0] || {
        totalProjects: 0,
        completedProjects: 0,
        activeProjects: 0,
        onHoldProjects: 0,
        planningProjects: 0,
        cancelledProjects: 0,
        avgCompletionPercentage: 0,
        totalBudget: 0
      },
      overdueProjects,
      dueSoonProjects
    };

    res.status(200).json({
      success: true,
      message: "Project statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Get project stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update project status
 * @route   PUT /api/projects/:id/status
 * @access  Private (Admin only)
 */
exports.updateProjectStatus = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, reason } = req.body;

    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // Create status history entry
    const statusHistoryEntry = {
      status,
      timestamp: new Date(),
      changedBy: req.user.id,
      reason: reason || ""
    };

    // Update project status and add to history
    const updateData = {
      status,
      lastModifiedBy: req.user.id,
      $push: { statusHistory: statusHistoryEntry }
    };

    // Set completion date if completed
    if (status === "completed" && project.status !== "completed") {
      updateData.completedAt = new Date();
      updateData["progress.completionPercentage"] = 100;
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Project status updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update project progress (auto-calculated from tasks)
 * @route   PUT /api/projects/:id/progress
 * @access  Private (Admin only)
 */
exports.updateProjectProgress = async (req, res) => {
  try {
    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // Update progress using the model method
    await project.updateProgress();

    // Get the updated project with populated fields
    const updatedProject = await Project.findById(req.params.id)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role");

    res.status(200).json({
      success: true,
      message: "Project progress updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all tasks for project
 * @route   GET /api/projects/:id/tasks
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectTasks = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, assignee, priority, page = 1, limit = 10 } = req.query;

    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // Build filter for tasks
    let filter = {
      project: req.params.id,
    };

    const taskAuthResult = applyOrganizationFilter(req, res, filter);
    if (!taskAuthResult.success) {
      return res.status(taskAuthResult.error.status).json(taskAuthResult.error.response);
    }
    filter = taskAuthResult.filter;

    // Add optional filters
    if (status) filter.status = status;
    if (assignee) filter.assignedTo = assignee;
    if (priority) filter.priority = priority;

    // Client scoping - clients can only see their own tasks
    if (req.user.client) {
      filter.client = req.user.client;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalTasks = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Project tasks retrieved successfully",
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get project tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create task within project
 * @route   POST /api/projects/:id/tasks
 * @access  Private (Admin only)
 */
exports.createProjectTask = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    const {
      name,
      description,
      assignedTo,
      assignedToName,
      dueDate,
      startDate,
      priority,
      complexity,
      estimatedHours,
      tags,
      category
    } = req.body;

    // Validate assigned team member if provided
    if (assignedTo) {
      const validTeamMember = await TeamMember.findOne({
        _id: assignedTo,
        organization: req.user.organization
      });

      if (!validTeamMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned team member is invalid or not in your organization",
        });
      }
    }

    // Create task data
    const taskData = {
      name,
      description,
      project: req.params.id,
      assignedTo,
      assignedToName,
      dueDate,
      startDate,
      priority: priority || "medium",
      complexity: complexity || "medium",
      estimatedHours: estimatedHours || 0,
      tags: tags || [],
      category,
      client: project.client,
      organization: req.user.organization || project.organization,
      createdBy: req.user.id,
    };

    const task = await Task.create(taskData);

    // Populate the created task
    const populatedTask = await Task.findById(task._id)
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email");

    // Update project progress
    await project.updateProgress();

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Create project task error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get project team members
 * @route   GET /api/projects/:id/team
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectTeam = async (req, res) => {
  try {
    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter)
      .populate("teamMembers", "name email role status capacity workload performance");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // Get additional workload information for each team member
    const teamWithWorkload = await Promise.all(
      project.teamMembers.map(async (member) => {
        // Get current tasks for this member in this project
        const currentTasks = await Task.countDocuments({
          project: req.params.id,
          assignedTo: member._id,
          status: { $in: ["not_started", "in_progress", "under_review"] }
        });

        // Get total hours allocated for this project
        const totalHours = await Task.aggregate([
          {
            $match: {
              project: new mongoose.Types.ObjectId(req.params.id),
              assignedTo: member._id
            }
          },
          {
            $group: {
              _id: null,
              totalEstimated: { $sum: "$estimatedHours" },
              totalActual: { $sum: "$actualHours" }
            }
          }
        ]);

        return {
          ...member.toObject(),
          projectWorkload: {
            currentTasks,
            totalEstimatedHours: totalHours[0]?.totalEstimated || 0,
            totalActualHours: totalHours[0]?.totalActual || 0
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Project team retrieved successfully",
      data: {
        projectId: project._id,
        projectName: project.name,
        teamMembers: teamWithWorkload,
        projectManager: project.projectManager
      },
    });
  } catch (error) {
    console.error("Get project team error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update project team assignments
 * @route   PUT /api/projects/:id/team
 * @access  Private (Admin only)
 */
exports.updateProjectTeam = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { teamMembers } = req.body;

    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // Validate all team members exist and belong to the same organization
    if (teamMembers && teamMembers.length > 0) {
      const validTeamMembers = await TeamMember.find({
        _id: { $in: teamMembers },
        organization: req.user.organization
      });

      if (validTeamMembers.length !== teamMembers.length) {
        return res.status(400).json({
          success: false,
          message: "One or more team members are invalid or not in your organization",
        });
      }
    }

    // Get current team members to update their project lists
    const currentTeamMembers = project.teamMembers || [];
    const newTeamMembers = teamMembers || [];

    // Remove project from team members who are no longer assigned
    const removedMembers = currentTeamMembers.filter(
      memberId => !newTeamMembers.includes(memberId.toString())
    );

    if (removedMembers.length > 0) {
      await TeamMember.updateMany(
        { _id: { $in: removedMembers } },
        { $pull: { currentProjects: project._id } }
      );
    }

    // Add project to new team members
    const addedMembers = newTeamMembers.filter(
      memberId => !currentTeamMembers.some(current => current.toString() === memberId)
    );

    if (addedMembers.length > 0) {
      await TeamMember.updateMany(
        { _id: { $in: addedMembers } },
        { $addToSet: { currentProjects: project._id } }
      );
    }

    // Update project team
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        teamMembers: newTeamMembers,
        lastModifiedBy: req.user.id
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("teamMembers", "name email role")
      .populate("projectManager", "name email role")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Project team updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project team error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get project timeline and milestones
 * @route   GET /api/projects/:id/timeline
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectTimeline = async (req, res) => {
  try {
    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // Get project tasks for timeline
    let taskFilter = { project: req.params.id };
    const taskAuthResult = applyOrganizationFilter(req, res, taskFilter);
    if (!taskAuthResult.success) {
      return res.status(taskAuthResult.error.status).json(taskAuthResult.error.response);
    }
    taskFilter = taskAuthResult.filter;
    const tasks = await Task.find(taskFilter)
      .populate("assignedTo", "name email")
      .sort({ startDate: 1, dueDate: 1 });

    // Calculate critical path and timeline metrics
    const timeline = {
      project: {
        id: project._id,
        name: project.name,
        startDate: project.startDate,
        dueDate: project.dueDate,
        status: project.status,
        progress: project.progress
      },
      milestones: project.milestones || [],
      tasks: tasks.map(task => ({
        id: task._id,
        name: task.name,
        status: task.status,
        priority: task.priority,
        startDate: task.startDate,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        assignedTo: task.assignedTo,
        progress: task.progress,
        dependsOn: task.dependsOn,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours
      })),
      metrics: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === "completed").length,
        overdueTasks: tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== "completed").length,
        upcomingTasks: tasks.filter(t => {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          return t.dueDate && t.dueDate <= nextWeek && t.status !== "completed";
        }).length
      }
    };

    res.status(200).json({
      success: true,
      message: "Project timeline retrieved successfully",
      data: timeline,
    });
  } catch (error) {
    console.error("Get project timeline error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update project milestones
 * @route   PUT /api/projects/:id/milestones
 * @access  Private (Admin only)
 */
exports.updateProjectMilestones = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { milestones } = req.body;

    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // Update project milestones
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        milestones: milestones || [],
        lastModifiedBy: req.user.id
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Project milestones updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project milestones error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get linked documents
 * @route   GET /api/projects/:id/documents
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectDocuments = async (req, res) => {
  try {
    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter)
      .populate("linkedDocuments", "title type status uploadedBy createdAt");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    res.status(200).json({
      success: true,
      message: "Project documents retrieved successfully",
      data: {
        projectId: project._id,
        projectName: project.name,
        documents: project.linkedDocuments || []
      },
    });
  } catch (error) {
    console.error("Get project documents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Link documents to project
 * @route   PUT /api/projects/:id/documents
 * @access  Private (Admin only)
 */
exports.updateProjectDocuments = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { documentIds } = req.body;

    // Check if project exists and user has access
    let projectFilter = { _id: req.params.id };
    const authResult = applyOrganizationFilter(req, res, projectFilter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    projectFilter = authResult.filter;
    const project = await Project.findOne(projectFilter);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // Validate documents exist and belong to the same organization
    if (documentIds && documentIds.length > 0) {
      const Document = require("../models/Document");
      const validDocuments = await Document.find({
        _id: { $in: documentIds },
        organization: req.user.organization
      });

      if (validDocuments.length !== documentIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more documents are invalid or not in your organization",
        });
      }
    }

    // Update project documents
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        linkedDocuments: documentIds || [],
        lastModifiedBy: req.user.id
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("linkedDocuments", "title type status uploadedBy createdAt")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Project documents updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project documents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================================================
// PHASE 3: PROJECT SEARCH AND FILTERING
// ============================================================================

/**
 * @desc    Search projects by name/description
 * @route   GET /api/projects/search?q=query
 * @access  Private (Organization/Client scoped)
 */
exports.searchProjects = async (req, res) => {
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
      q,
      status,
      priority,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter based on user role and organization
    let filter = {};

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping - clients can only see their own projects
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Add search query using text search or regex
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    // Apply additional filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get projects with pagination
    const projects = await Project.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({
        // Sort by relevance (exact matches first), then by creation date
        createdAt: -1
      })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Project search completed successfully",
      query: q,
      count: projects.length,
      totalProjects,
      totalPages,
      currentPage: parseInt(page),
      data: projects,
    });
  } catch (error) {
    console.error("Search projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get projects by status
 * @route   GET /api/projects/by-status/:status
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectsByStatus = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Build filter based on user role and organization
    let filter = { status };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping - clients can only see their own projects
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get projects with pagination
    const projects = await Project.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / parseInt(limit));

    res.status(200).json({
      success: true,
      message: `Projects with status '${status}' retrieved successfully`,
      status,
      count: projects.length,
      totalProjects,
      totalPages,
      currentPage: parseInt(page),
      data: projects,
    });
  } catch (error) {
    console.error("Get projects by status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get projects by priority
 * @route   GET /api/projects/by-priority/:priority
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectsByPriority = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { priority } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Build filter based on user role and organization
    let filter = { priority };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping - clients can only see their own projects
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get projects with pagination
    const projects = await Project.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / parseInt(limit));

    res.status(200).json({
      success: true,
      message: `Projects with priority '${priority}' retrieved successfully`,
      priority,
      count: projects.length,
      totalProjects,
      totalPages,
      currentPage: parseInt(page),
      data: projects,
    });
  } catch (error) {
    console.error("Get projects by priority error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get overdue projects
 * @route   GET /api/projects/overdue
 * @access  Private (Organization/Client scoped)
 */
exports.getOverdueProjects = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { page = 1, limit = 10 } = req.query;

    // Build filter based on user role and organization
    let filter = {
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] }
    };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping - clients can only see their own projects
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get projects with pagination
    const projects = await Project.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ dueDate: 1 }) // Sort by due date (most overdue first)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / parseInt(limit));

    // Calculate days overdue for each project
    const projectsWithOverdueDays = projects.map(project => ({
      ...project.toObject(),
      daysOverdue: Math.ceil((new Date() - project.dueDate) / (1000 * 60 * 60 * 24))
    }));

    res.status(200).json({
      success: true,
      message: "Overdue projects retrieved successfully",
      count: projects.length,
      totalProjects,
      totalPages,
      currentPage: parseInt(page),
      data: projectsWithOverdueDays,
    });
  } catch (error) {
    console.error("Get overdue projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get projects due soon
 * @route   GET /api/projects/due-soon
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectsDueSoon = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { days = 7, page = 1, limit = 10 } = req.query;

    // Calculate the date range
    const today = new Date();
    const dueSoonDate = new Date();
    dueSoonDate.setDate(today.getDate() + parseInt(days));

    // Build filter based on user role and organization
    let filter = {
      dueDate: { $gte: today, $lte: dueSoonDate },
      status: { $nin: ["completed", "cancelled"] }
    };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping - clients can only see their own projects
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get projects with pagination
    const projects = await Project.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ dueDate: 1 }) // Sort by due date (soonest first)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / parseInt(limit));

    // Calculate days until due for each project
    const projectsWithDaysUntilDue = projects.map(project => ({
      ...project.toObject(),
      daysUntilDue: Math.ceil((project.dueDate - today) / (1000 * 60 * 60 * 24))
    }));

    res.status(200).json({
      success: true,
      message: `Projects due within ${days} days retrieved successfully`,
      daysFilter: parseInt(days),
      count: projects.length,
      totalProjects,
      totalPages,
      currentPage: parseInt(page),
      data: projectsWithDaysUntilDue,
    });
  } catch (error) {
    console.error("Get projects due soon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get active projects
 * @route   GET /api/projects/active
 * @access  Private (Organization/Client scoped)
 */
exports.getActiveProjects = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { page = 1, limit = 10 } = req.query;

    // Build filter based on user role and organization
    let filter = { status: "active" };

    // Apply organization-based security filter
    const authResult = applyOrganizationFilter(req, res, filter);
    if (!authResult.success) {
      return res.status(authResult.error.status).json(authResult.error.response);
    }
    filter = authResult.filter;

    // Client scoping - clients can only see their own projects
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get projects with pagination
    const projects = await Project.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("projectManager", "name email role")
      .populate("teamMembers", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Active projects retrieved successfully",
      count: projects.length,
      totalProjects,
      totalPages,
      currentPage: parseInt(page),
      data: projects,
    });
  } catch (error) {
    console.error("Get active projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
