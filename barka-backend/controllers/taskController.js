const { validationResult } = require("express-validator");
const Task = require("../models/Task");
const Project = require("../models/Project");
const TeamMember = require("../models/TeamMember");
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
 * @desc    Get all tasks (project/client-scoped)
 * @route   GET /api/tasks
 * @access  Private (Organization/Client scoped)
 */
exports.getTasks = async (req, res) => {
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
      project,
      assignee,
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

    // Client scoping - clients can only see their own tasks
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply query filters
    if (project) filter.project = project;
    if (assignee) filter.assignedTo = assignee;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isArchived !== undefined) filter.isArchived = isArchived === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalTasks / parseInt(limit));

    res.status(200).json({
      success: true,
      count: tasks.length,
      totalTasks,
      totalPages,
      currentPage: parseInt(page),
      data: tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new task
 * @route   POST /api/tasks
 * @access  Private (Admin only)
 */
exports.createTask = async (req, res) => {
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
      project,
      status,
      priority,
      complexity,
      assignedTo,
      assignedToName,
      dueDate,
      startDate,
      estimatedHours,
      actualHours,
      progress,
      dependsOn,
      blockedBy,
      parentTask,
      acceptanceCriteria,
      requirements,
      deliverables,
      tags,
      category,
      clientId,
      organizationId
    } = req.body;

    // Debug logging
    console.log("Task creation request body:", {
      clientId,
      organizationId,
      userClient: req.user.client,
      userOrganization: req.user.organization,
      name,
      project
    });

    // Validate project exists and belongs to the same organization
    const projectDoc = await Project.findOne({
      _id: project,
      organization: req.user.organization || organizationId
    });

    if (!projectDoc) {
      return res.status(400).json({
        success: false,
        message: "Project not found or not in your organization",
      });
    }

    // Validate assigned team member if provided
    if (assignedTo) {
      const teamMember = await TeamMember.findOne({
        _id: assignedTo,
        organization: req.user.organization || organizationId
      });

      if (!teamMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned team member not found or not in your organization",
        });
      }
    }

    // Validate dependencies if provided
    if (dependsOn && dependsOn.length > 0) {
      const validDependencies = await Task.find({
        _id: { $in: dependsOn },
        organization: req.user.organization || organizationId
      });

      if (validDependencies.length !== dependsOn.length) {
        return res.status(400).json({
          success: false,
          message: "One or more task dependencies are invalid or not in your organization",
        });
      }
    }

    // Determine client and organization
    const taskClient = req.user.client || clientId;
    const taskOrganization = req.user.organization || organizationId;

    // Debug logging
    console.log("Task creation validation:", {
      taskClient,
      taskOrganization,
      clientIdFromBody: clientId,
      organizationIdFromBody: organizationId,
      userClient: req.user.client,
      userOrganization: req.user.organization
    });

    // Validate that we have both client and organization
    if (!taskClient) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required. Please select a client from the dropdown.",
      });
    }

    if (!taskOrganization) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required. Please ensure your user account has an organization assigned.",
      });
    }

    // Create task data
    const taskData = {
      name,
      description,
      project,
      status: status || "not_started",
      priority: priority || "medium",
      complexity: complexity || "medium",
      assignedTo,
      assignedToName,
      dueDate,
      startDate,
      estimatedHours: estimatedHours || 0,
      actualHours: actualHours || 0,
      progress: progress || { completionPercentage: 0, timeSpent: 0, remainingWork: 0 },
      dependsOn: dependsOn || [],
      blockedBy: blockedBy || [],
      parentTask,
      acceptanceCriteria: acceptanceCriteria || [],
      requirements: requirements || [],
      deliverables: deliverables || [],
      tags: tags || [],
      category,
      client: taskClient,
      organization: taskOrganization,
      createdBy: req.user.id,
    };

    const task = await Task.create(taskData);

    // Populate the created task
    const populatedTask = await Task.findById(task._id)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single task with full details
 * @route   GET /api/tasks/:id
 * @access  Private (Organization/Client scoped)
 */
exports.getTask = async (req, res) => {
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

    // Organization scoping
    if (req.user.role === ROLES.SUPER_ADMIN) {
      // Super admin can see all tasks (no filter)
    } else if (req.user.organization) {
      filter.organization = req.user.organization;
    } else {
      // SECURITY: Users without organization cannot access any tasks
      return res.status(403).json({
        success: false,
        message: "Access denied. User account is not associated with an organization.",
      });
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    const task = await Task.findOne(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role capacity")
      .populate("dependsOn", "name status priority")
      .populate("blockedBy", "name status priority")
      .populate("subtasks", "name status priority")
      .populate("parentTask", "name status priority")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email")
      .populate("comments.author", "firstName lastName email")
      .populate("statusHistory.changedBy", "firstName lastName email");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private (Admin or assignee)
 */
exports.updateTask = async (req, res) => {
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

    // Find the task first
    const existingTask = await Task.findOne(filter);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check permissions - admin or assignee can update
    const isAdmin = req.user.role === "admin" || req.user.role === "org_admin" || req.user.role === "super_admin";
    const isAssignee = existingTask.assignedTo && existingTask.assignedTo.toString() === req.user.id;

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this task",
      });
    }

    // Define allowed fields for update
    const allowedFields = [
      "name",
      "description",
      "status",
      "priority",
      "complexity",
      "assignedTo",
      "assignedToName",
      "dueDate",
      "startDate",
      "estimatedHours",
      "actualHours",
      "progress",
      "tags",
      "category"
    ];

    // Update only allowed fields
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Validate assigned team member if provided
    if (updateData.assignedTo) {
      const teamMember = await TeamMember.findOne({
        _id: updateData.assignedTo,
        organization: req.user.organization
      });

      if (!teamMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned team member not found or not in your organization",
        });
      }
    }

    // Add audit trail
    updateData.lastModifiedBy = req.user.id;

    // Handle status change with history
    if (updateData.status && updateData.status !== existingTask.status) {
      // Add to status history
      const statusHistoryEntry = {
        status: updateData.status,
        timestamp: new Date(),
        changedBy: req.user.id,
        comment: req.body.statusComment || ""
      };

      updateData.$push = { statusHistory: statusHistoryEntry };

      // Set completion date if completed
      if (updateData.status === "completed") {
        updateData.completedAt = new Date();
        if (!updateData.progress) updateData.progress = {};
        updateData.progress.completionPercentage = 100;
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private (Admin only)
 */
exports.deleteTask = async (req, res) => {
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

    const task = await Task.findOne(filter);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check if task has subtasks (optional business logic)
    const subtasks = await Task.countDocuments({
      parentTask: req.params.id
    });

    if (subtasks > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete task with ${subtasks} subtask(s). Please delete or reassign subtasks first.`,
      });
    }

    // Check if other tasks depend on this task
    const dependentTasks = await Task.countDocuments({
      dependsOn: req.params.id
    });

    if (dependentTasks > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete task that ${dependentTasks} other task(s) depend on. Please update dependencies first.`,
      });
    }

    // Remove task from any blocking relationships
    await Task.updateMany(
      { blockedBy: req.params.id },
      { $pull: { blockedBy: req.params.id } }
    );

    // Delete the task
    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: {
        id: req.params.id,
        name: task.name
      }
    });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update task status
 * @route   PUT /api/tasks/:id/status
 * @access  Private (Admin or assignee)
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, comment } = req.body;

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping - clients can only see their own tasks
    if (req.user.role === "client") {
      filter.client = req.user.client;
    }

    const task = await Task.findOne(filter);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check permissions - admin or assignee can update status
    if (req.user.role !== "org_admin" && req.user.role !== "super_admin") {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You can only update status of tasks assigned to you",
        });
      }
    }

    // Use the model method to update status with history
    await task.updateStatus(status, req.user.id, comment);

    // Populate the updated task
    const updatedTask = await Task.findById(task._id)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("statusHistory.changedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Assign task to team member
 * @route   PUT /api/tasks/:id/assign
 * @access  Private (Admin only)
 */
exports.assignTask = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { assignedTo, assignedToName } = req.body;

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const task = await Task.findOne(filter);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Verify the team member exists and belongs to the same organization
    const TeamMember = require("../models/TeamMember");
    const teamMember = await TeamMember.findOne({
      _id: assignedTo,
      organization: req.user.organization
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found in your organization",
      });
    }

    // Update task assignment
    const updateData = {
      assignedTo: assignedTo,
      assignedToName: assignedToName || teamMember.name,
      lastModifiedBy: req.user.id
    };

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role");

    res.status(200).json({
      success: true,
      message: "Task assigned successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Assign task error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update task progress
 * @route   PUT /api/tasks/:id/progress
 * @access  Private (Assignee or Admin)
 */
exports.updateTaskProgress = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { completionPercentage, timeSpent, remainingWork } = req.body;

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping - clients can only see their own tasks
    if (req.user.role === "client") {
      filter.client = req.user.client;
    }

    const task = await Task.findOne(filter);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check permissions - admin or assignee can update progress
    if (req.user.role !== "org_admin" && req.user.role !== "super_admin") {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You can only update progress of tasks assigned to you",
        });
      }
    }

    // Build progress update data
    const progressUpdate = {};
    if (completionPercentage !== undefined) {
      progressUpdate["progress.completionPercentage"] = completionPercentage;

      // Auto-update status based on completion percentage
      if (completionPercentage === 100 && task.status !== "completed") {
        progressUpdate.status = "completed";
        progressUpdate.completedAt = new Date();
      } else if (completionPercentage > 0 && task.status === "not_started") {
        progressUpdate.status = "in_progress";
      }
    }

    if (timeSpent !== undefined) {
      progressUpdate["progress.timeSpent"] = timeSpent;
      progressUpdate.actualHours = timeSpent; // Update actual hours as well
    }

    if (remainingWork !== undefined) {
      progressUpdate["progress.remainingWork"] = remainingWork;
    }

    progressUpdate.lastModifiedBy = req.user.id;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      progressUpdate,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role");

    res.status(200).json({
      success: true,
      message: "Task progress updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Update task progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Add comment to task
 * @route   POST /api/tasks/:id/comments
 * @access  Private (Team member or client)
 */
exports.addTaskComment = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { content } = req.body;

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping - clients can only see their own tasks
    if (req.user.role === "client") {
      filter.client = req.user.client;
    }

    const task = await Task.findOne(filter);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Use the model method to add comment
    await task.addComment(req.user.id, content);

    // Get the updated task with populated comments
    const updatedTask = await Task.findById(task._id)
      .populate("comments.author", "firstName lastName email role")
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role");

    // Return the newly added comment
    const newComment = updatedTask.comments[updatedTask.comments.length - 1];

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: newComment,
    });
  } catch (error) {
    console.error("Add task comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get task comments
 * @route   GET /api/tasks/:id/comments
 * @access  Private (Organization/Client scoped)
 */
exports.getTaskComments = async (req, res) => {
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

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping - clients can only see their own tasks
    if (req.user.role === "client") {
      filter.client = req.user.client;
    }

    const task = await Task.findOne(filter)
      .populate("comments.author", "firstName lastName email role")
      .select("comments");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task comments retrieved successfully",
      data: task.comments,
      count: task.comments.length,
    });
  } catch (error) {
    console.error("Get task comments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Log time spent on task
 * @route   PUT /api/tasks/:id/time
 * @access  Private (Assignee only)
 */
exports.logTaskTime = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { hours, description, date } = req.body;

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const task = await Task.findOne(filter);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check permissions - assignee or admin can log time
    if (req.user.role !== "org_admin" && req.user.role !== "super_admin") {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You can only log time for tasks assigned to you",
        });
      }
    }

    // Update actual hours and time spent
    const updateData = {
      actualHours: (task.actualHours || 0) + hours,
      "progress.timeSpent": (task.progress?.timeSpent || 0) + hours,
      lastModifiedBy: req.user.id
    };

    // Add time log entry to comments for audit trail
    const timeLogComment = `Time logged: ${hours} hours${description ? ` - ${description}` : ''} (${new Date(date || Date.now()).toLocaleDateString()})`;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        $push: {
          comments: {
            author: req.user.id,
            content: timeLogComment,
            createdAt: new Date()
          }
        }
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role");

    res.status(200).json({
      success: true,
      message: "Time logged successfully",
      data: {
        task: updatedTask,
        timeLogged: {
          hours,
          description,
          date: date || new Date(),
          totalHours: updatedTask.actualHours
        }
      },
    });
  } catch (error) {
    console.error("Log task time error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get task status history
 * @route   GET /api/tasks/:id/history
 * @access  Private (Organization/Client scoped)
 */
exports.getTaskHistory = async (req, res) => {
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

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping - clients can only see their own tasks
    if (req.user.role === "client") {
      filter.client = req.user.client;
    }

    const task = await Task.findOne(filter)
      .populate("statusHistory.changedBy", "firstName lastName email role")
      .select("statusHistory name");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Sort status history by timestamp (newest first)
    const sortedHistory = task.statusHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      message: "Task status history retrieved successfully",
      data: {
        taskName: task.name,
        statusHistory: sortedHistory
      },
      count: sortedHistory.length,
    });
  } catch (error) {
    console.error("Get task history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update task dependencies
 * @route   PUT /api/tasks/:id/dependencies
 * @access  Private (Admin only)
 */
exports.updateTaskDependencies = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { dependsOn, blockedBy } = req.body;

    // Build filter based on user role and organization
    let filter = { _id: req.params.id };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    const task = await Task.findOne(filter);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Validate that dependency tasks exist and belong to the same organization
    if (dependsOn && Array.isArray(dependsOn) && dependsOn.length > 0) {
      const dependencyTasks = await Task.find({
        _id: { $in: dependsOn },
        organization: req.user.organization
      });

      if (dependencyTasks.length !== dependsOn.length) {
        return res.status(400).json({
          success: false,
          message: "One or more dependency tasks not found in your organization",
        });
      }

      // Check for circular dependencies
      for (const depId of dependsOn) {
        if (depId === req.params.id) {
          return res.status(400).json({
            success: false,
            message: "Task cannot depend on itself",
          });
        }
      }
    }

    // Validate blocking tasks
    if (blockedBy && Array.isArray(blockedBy) && blockedBy.length > 0) {
      const blockingTasks = await Task.find({
        _id: { $in: blockedBy },
        organization: req.user.organization
      });

      if (blockingTasks.length !== blockedBy.length) {
        return res.status(400).json({
          success: false,
          message: "One or more blocking tasks not found in your organization",
        });
      }
    }

    // Update dependencies
    const updateData = {
      lastModifiedBy: req.user.id
    };

    if (dependsOn !== undefined) {
      updateData.dependsOn = dependsOn;
    }

    if (blockedBy !== undefined) {
      updateData.blockedBy = blockedBy;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("dependsOn", "name status priority")
      .populate("blockedBy", "name status priority");

    res.status(200).json({
      success: true,
      message: "Task dependencies updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Update task dependencies error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Search tasks by name and description
 * @route   GET /api/tasks/search
 * @access  Private (Organization/Client scoped)
 */
exports.searchTasks = async (req, res) => {
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
      page = 1,
      limit = 10,
      project,
      assignee,
      status,
      priority,
      complexity,
      category,
      tags,
      dueDateFrom,
      dueDateTo,
      createdFrom,
      createdTo
    } = req.query;

    // Build base filter with organization/client scoping
    let filter = {};

    // Organization scoping - users can only see tasks from their organization
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping - clients can only see their own tasks
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Add text search using MongoDB text search or regex
    if (q && q.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    // Apply additional filters
    if (project) filter.project = project;
    if (assignee) filter.assignedTo = assignee;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (complexity) filter.complexity = complexity;
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Date range filters
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }

    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) filter.createdAt.$lte = new Date(createdTo);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalTasks / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Tasks search completed successfully",
      count: tasks.length,
      totalTasks,
      totalPages,
      currentPage: parseInt(page),
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (error) {
    console.error("Search tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get tasks by status
 * @route   GET /api/tasks/by-status/:status
 * @access  Private (Organization/Client scoped)
 */
exports.getTasksByStatus = async (req, res) => {
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
    const { page = 1, limit = 10, project, assignee, priority } = req.query;

    // Build filter based on user role and organization
    let filter = { status };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply additional filters
    if (project) filter.project = project;
    if (assignee) filter.assignedTo = assignee;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: `Tasks with status '${status}' retrieved successfully`,
      count: tasks.length,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (error) {
    console.error("Get tasks by status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get tasks by priority
 * @route   GET /api/tasks/by-priority/:priority
 * @access  Private (Organization/Client scoped)
 */
exports.getTasksByPriority = async (req, res) => {
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
    const { page = 1, limit = 10, project, assignee, status } = req.query;

    // Build filter based on user role and organization
    let filter = { priority };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply additional filters
    if (project) filter.project = project;
    if (assignee) filter.assignedTo = assignee;
    if (status) filter.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: `Tasks with priority '${priority}' retrieved successfully`,
      count: tasks.length,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (error) {
    console.error("Get tasks by priority error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get tasks by assignee
 * @route   GET /api/tasks/by-assignee/:memberId
 * @access  Private (Organization/Client scoped)
 */
exports.getTasksByAssignee = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { memberId } = req.params;
    const { page = 1, limit = 10, project, status, priority } = req.query;

    // Build filter based on user role and organization
    let filter = { assignedTo: memberId };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply additional filters
    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: `Tasks assigned to team member retrieved successfully`,
      count: tasks.length,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (error) {
    console.error("Get tasks by assignee error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get overdue tasks
 * @route   GET /api/tasks/overdue
 * @access  Private (Organization/Client scoped)
 */
exports.getOverdueTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, project, assignee, priority } = req.query;

    // Build filter based on user role and organization
    let filter = {
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] }
    };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply additional filters
    if (project) filter.project = project;
    if (assignee) filter.assignedTo = assignee;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ dueDate: 1 }) // Sort by due date ascending (most overdue first)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Overdue tasks retrieved successfully",
      count: tasks.length,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (error) {
    console.error("Get overdue tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get tasks due today
 * @route   GET /api/tasks/due-today
 * @access  Private (Organization/Client scoped)
 */
exports.getTasksDueToday = async (req, res) => {
  try {
    const { page = 1, limit = 10, project, assignee, priority } = req.query;

    // Get today's date range (start and end of day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Build filter based on user role and organization
    let filter = {
      dueDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $nin: ["completed", "cancelled"] }
    };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply additional filters
    if (project) filter.project = project;
    if (assignee) filter.assignedTo = assignee;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "firstName lastName email")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Tasks due today retrieved successfully",
      count: tasks.length,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (error) {
    console.error("Get tasks due today error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get unassigned tasks
 * @route   GET /api/tasks/unassigned
 * @access  Private (Admin only)
 */
exports.getUnassignedTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, project, status, priority } = req.query;

    // Build filter based on user role and organization
    let filter = {
      $or: [
        { assignedTo: null },
        { assignedTo: { $exists: false } }
      ]
    };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply additional filters
    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Unassigned tasks retrieved successfully",
      count: tasks.length,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (error) {
    console.error("Get unassigned tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get blocked tasks
 * @route   GET /api/tasks/blocked
 * @access  Private (Organization/Client scoped)
 */
exports.getBlockedTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, project, assignee, priority } = req.query;

    // Build filter based on user role and organization
    let filter = {
      $or: [
        { status: "blocked" },
        { blockedBy: { $exists: true, $ne: [] } }
      ]
    };

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Apply additional filters
    if (project) filter.project = project;
    if (assignee) filter.assignedTo = assignee;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const tasks = await Task.find(filter)
      .populate("client", "firstName lastName email")
      .populate("organization", "name")
      .populate("project", "name status priority")
      .populate("assignedTo", "name email role")
      .populate("blockedBy", "name status priority")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Blocked tasks retrieved successfully",
      count: tasks.length,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (error) {
    console.error("Get blocked tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
