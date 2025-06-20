const Todo = require("../models/Todo");
const Client = require("../models/Client");
const { ROLES } = require("../models/User");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");

/**
 * @desc    Get all todos for a client
 * @route   GET /api/todos
 * @access  Private (Admin or client)
 */
exports.getTodos = async (req, res) => {
  try {
    let query = {};
    
    // If client ID is provided, filter by client
    if (req.query.client) {
      query.client = req.query.client;
    }
    
    // If organization ID is provided, filter by organization
    if (req.query.organization) {
      query.organization = req.query.organization;
    }
    
    // If phase is provided, filter by phase
    if (req.query.phase) {
      query.phase = req.query.phase;
    }
    
    // If status is provided, filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // If user is a client, only show todos for their client record
    if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client record not found for this user"
        });
      }
      query.client = client._id;
    }
    
    // If user is an org admin, only show todos from their organization
    if (req.user.role === ROLES.ORG_ADMIN) {
      query.organization = req.user.organization;
    }
    
    const todos = await Todo.find(query)
      .sort({ phase: 1, orderInPhase: 1 })
      .populate("client", "projectType status onboardingProgress")
      .populate("completedInConversation", "title");
    
    res.status(200).json({
      success: true,
      count: todos.length,
      data: todos
    });
  } catch (error) {
    logger.error("Get todos error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Get a single todo
 * @route   GET /api/todos/:id
 * @access  Private (Admin or client)
 */
exports.getTodo = async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id)
      .populate("client", "projectType status onboardingProgress")
      .populate("completedInConversation", "title");
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found"
      });
    }
    
    // Check if user has permission to view this todo
    if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (!client || todo.client.toString() !== client._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this todo"
        });
      }
    } else if (req.user.role === ROLES.ORG_ADMIN && 
               todo.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this todo"
      });
    }
    
    res.status(200).json({
      success: true,
      data: todo
    });
  } catch (error) {
    logger.error("Get todo error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Create a new todo
 * @route   POST /api/todos
 * @access  Private (Admin only)
 */
exports.createTodo = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const {
      client: clientId,
      title,
      description,
      priority,
      weight,
      phase,
      orderInPhase,
      dependencies
    } = req.body;
    
    // Verify client exists and user has permission
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }
    
    // Check if user has permission to create todo for this client
    if (req.user.role === ROLES.ORG_ADMIN && 
        client.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create todos for this client"
      });
    }
    
    // Create todo
    const todo = await Todo.create({
      client: clientId,
      organization: client.organization,
      title,
      description,
      priority: priority || "medium",
      weight: weight || 1,
      phase: phase || "initial",
      orderInPhase: orderInPhase || 0,
      dependencies: dependencies || [],
      status: "pending"
    });
    
    res.status(201).json({
      success: true,
      data: todo
    });
  } catch (error) {
    logger.error("Create todo error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Update a todo
 * @route   PUT /api/todos/:id
 * @access  Private (Admin only)
 */
exports.updateTodo = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    let todo = await Todo.findById(req.params.id);
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found"
      });
    }
    
    // Check if user has permission to update this todo
    if (req.user.role === ROLES.ORG_ADMIN && 
        todo.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this todo"
      });
    }
    
    // Update todo
    todo = await Todo.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    // If status is being updated to completed, update client progress
    if (req.body.status === "completed" && todo.status === "completed") {
      const progress = await Todo.calculateProgress(todo.client);
      await Client.findByIdAndUpdate(todo.client, {
        onboardingProgress: progress.overall
      });
    }
    
    res.status(200).json({
      success: true,
      data: todo
    });
  } catch (error) {
    logger.error("Update todo error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Delete a todo
 * @route   DELETE /api/todos/:id
 * @access  Private (Admin only)
 */
exports.deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found"
      });
    }
    
    // Check if user has permission to delete this todo
    if (req.user.role === ROLES.ORG_ADMIN && 
        todo.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this todo"
      });
    }
    
    await todo.deleteOne();
    
    // Recalculate client progress
    const progress = await Todo.calculateProgress(todo.client);
    await Client.findByIdAndUpdate(todo.client, {
      onboardingProgress: progress.overall
    });
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error("Delete todo error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Get todo progress for a client
 * @route   GET /api/todos/progress/:clientId
 * @access  Private (Admin or client)
 */
exports.getTodoProgress = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }
    
    // Check if user has permission to view this client's progress
    if (req.user.role === ROLES.ORG_CLIENT) {
      const userClient = await Client.findOne({ user: req.user.id });
      if (!userClient || userClient._id.toString() !== clientId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this client's progress"
        });
      }
    } else if (req.user.role === ROLES.ORG_ADMIN && 
               client.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this client's progress"
      });
    }
    
    // Calculate progress
    const progress = await Todo.calculateProgress(clientId);
    
    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error("Get todo progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
