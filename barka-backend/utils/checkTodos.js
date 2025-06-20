/**
 * Utility functions for checking todos and their status
 */
const mongoose = require("mongoose");
const Todo = require("../models/Todo");
const Client = require("../models/Client");
const logger = require("./logger");

/**
 * Get all todos for a specific client
 * @param {string} clientId - The client ID
 * @param {string} [status] - Optional status filter (pending, in_progress, completed, skipped)
 * @returns {Promise<Array>} - Array of todos
 */
async function getClientTodos(clientId, status = null) {
  try {
    // Validate clientId
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new Error("Invalid client ID format");
    }

    // Build query
    const query = { client: clientId };
    if (status) {
      query.status = status;
    }

    // Get todos
    const todos = await Todo.find(query)
      .sort({ phase: 1, orderInPhase: 1 })
      .lean();

    return todos;
  } catch (error) {
    logger.error(`Error getting client todos: ${error.message}`);
    throw error;
  }
}

/**
 * Get todos summary for a client
 * @param {string} clientId - The client ID
 * @returns {Promise<Object>} - Summary of todos
 */
async function getClientTodosSummary(clientId) {
  try {
    // Validate clientId
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new Error("Invalid client ID format");
    }

    // Get client info
    const client = await Client.findById(clientId).lean();
    if (!client) {
      throw new Error("Client not found");
    }

    // Get all todos
    const todos = await Todo.find({ client: clientId }).lean();

    // Get progress
    const progress = await Todo.calculateProgress(clientId);

    // Count todos by status
    const pending = todos.filter(t => t.status === "pending").length;
    const inProgress = todos.filter(t => t.status === "in_progress").length;
    const completed = todos.filter(t => t.status === "completed").length;
    const skipped = todos.filter(t => t.status === "skipped").length;

    // Count todos by phase
    const byPhase = {};
    todos.forEach(todo => {
      if (!byPhase[todo.phase]) {
        byPhase[todo.phase] = {
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
          skipped: 0
        };
      }
      
      byPhase[todo.phase].total++;
      
      if (todo.status === "pending") byPhase[todo.phase].pending++;
      if (todo.status === "in_progress") byPhase[todo.phase].inProgress++;
      if (todo.status === "completed") byPhase[todo.phase].completed++;
      if (todo.status === "skipped") byPhase[todo.phase].skipped++;
    });

    return {
      clientId,
      clientName: client.name || "Unknown",
      projectType: client.projectType,
      progress: progress.overall,
      totalTodos: todos.length,
      byStatus: {
        pending,
        inProgress,
        completed,
        skipped
      },
      byPhase,
      phaseProgress: progress.byPhase
    };
  } catch (error) {
    logger.error(`Error getting client todos summary: ${error.message}`);
    throw error;
  }
}

/**
 * Get the next todo for a client
 * @param {string} clientId - The client ID
 * @returns {Promise<Object|null>} - The next todo or null if none found
 */
async function getNextClientTodo(clientId) {
  try {
    // Validate clientId
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new Error("Invalid client ID format");
    }

    // Use the existing method from the Todo model
    const nextTodo = await Todo.getNextTodo(clientId);
    return nextTodo;
  } catch (error) {
    logger.error(`Error getting next client todo: ${error.message}`);
    throw error;
  }
}

/**
 * Get completed todos with their collected information
 * @param {string} clientId - The client ID
 * @returns {Promise<Array>} - Array of completed todos with collected information
 */
async function getCompletedTodosWithInfo(clientId) {
  try {
    // Validate clientId
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new Error("Invalid client ID format");
    }

    // Get completed todos
    const completedTodos = await Todo.find({
      client: clientId,
      status: "completed"
    })
      .sort({ completedAt: 1 })
      .populate("completedInConversation", "title")
      .lean();

    return completedTodos;
  } catch (error) {
    logger.error(`Error getting completed todos: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getClientTodos,
  getClientTodosSummary,
  getNextClientTodo,
  getCompletedTodosWithInfo
};
