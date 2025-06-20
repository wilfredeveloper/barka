const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const todoController = require("../controllers/todoController");
const { protect, authorize, isAdmin } = require("../middleware/auth");
const { ROLES } = require("../models/User");

// Apply protection to all routes
router.use(protect);

// @route   GET /api/todos
// @desc    Get all todos (filtered by client, organization, phase, status)
// @access  Private (Admin or client)
router.get("/", todoController.getTodos);

// @route   GET /api/todos/progress/:clientId
// @desc    Get todo progress for a client
// @access  Private (Admin or client)
router.get("/progress/:clientId", todoController.getTodoProgress);

// @route   GET /api/todos/:id
// @desc    Get a single todo
// @access  Private (Admin or client)
router.get("/:id", todoController.getTodo);

// @route   POST /api/todos
// @desc    Create a new todo
// @access  Private (Admin only)
router.post(
  "/",
  [
    isAdmin,
    check("client", "Client ID is required").not().isEmpty(),
    check("title", "Title is required").not().isEmpty(),
  ],
  todoController.createTodo
);

// @route   PUT /api/todos/:id
// @desc    Update a todo
// @access  Private (Admin only)
router.put(
  "/:id",
  [
    isAdmin,
    check("title", "Title is required if provided").optional(),
  ],
  todoController.updateTodo
);

// @route   DELETE /api/todos/:id
// @desc    Delete a todo
// @access  Private (Admin only)
router.delete("/:id", isAdmin, todoController.deleteTodo);

module.exports = router;
