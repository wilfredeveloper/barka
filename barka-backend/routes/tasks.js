const express = require("express");
const {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTask,
  updateTaskProgress,
  addTaskComment,
  getTaskComments,
  logTaskTime,
  getTaskHistory,
  updateTaskDependencies,
  // Phase 3: Search and Filtering functions
  searchTasks,
  getTasksByStatus,
  getTasksByPriority,
  getTasksByAssignee,
  getOverdueTasks,
  getTasksDueToday,
  getUnassignedTasks,
  getBlockedTasks,
} = require("../controllers/taskController");

const {
  validateCreateTask,
  validateUpdateTask,
  validateGetTasks,
  validateTaskId,
  validateUpdateTaskStatus,
  validateAssignTask,
  validateUpdateTaskProgress,
  validateAddTaskComment,
  validateLogTime,
  validateUpdateTaskDependencies,
  // Phase 3: Search and Filtering validators
  validateTaskSearch,
  validateTaskStatusParam,
  validateTaskPriorityParam,
  validateTeamMemberIdParam,
  validateDateFiltering,
} = require("../middleware/taskValidators");

const { protect, isAdmin } = require("../middleware/auth");

const router = express.Router();

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (project/client-scoped)
 * @access  Private (Organization/Client scoped)
 */
router.get("/", protect, validateGetTasks, getTasks);

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private (Admin only)
 */
router.post("/", protect, isAdmin, validateCreateTask, createTask);

// ===== PHASE 3: SEARCH AND FILTERING ROUTES (MUST BE BEFORE PARAMETERIZED ROUTES) =====

/**
 * @route   GET /api/tasks/search
 * @desc    Search tasks by name and description
 * @access  Private (Organization/Client scoped)
 */
router.get("/search", protect, validateTaskSearch, searchTasks);

/**
 * @route   GET /api/tasks/by-status/:status
 * @desc    Get tasks by status
 * @access  Private (Organization/Client scoped)
 */
router.get("/by-status/:status", protect, validateTaskStatusParam, getTasksByStatus);

/**
 * @route   GET /api/tasks/by-priority/:priority
 * @desc    Get tasks by priority
 * @access  Private (Organization/Client scoped)
 */
router.get("/by-priority/:priority", protect, validateTaskPriorityParam, getTasksByPriority);

/**
 * @route   GET /api/tasks/by-assignee/:memberId
 * @desc    Get tasks by assignee
 * @access  Private (Organization/Client scoped)
 */
router.get("/by-assignee/:memberId", protect, validateTeamMemberIdParam, getTasksByAssignee);

/**
 * @route   GET /api/tasks/overdue
 * @desc    Get overdue tasks
 * @access  Private (Organization/Client scoped)
 */
router.get("/overdue", protect, validateDateFiltering, getOverdueTasks);

/**
 * @route   GET /api/tasks/due-today
 * @desc    Get tasks due today
 * @access  Private (Organization/Client scoped)
 */
router.get("/due-today", protect, validateDateFiltering, getTasksDueToday);

/**
 * @route   GET /api/tasks/unassigned
 * @desc    Get unassigned tasks
 * @access  Private (Admin only)
 */
router.get("/unassigned", protect, isAdmin, validateDateFiltering, getUnassignedTasks);

/**
 * @route   GET /api/tasks/blocked
 * @desc    Get blocked tasks
 * @access  Private (Organization/Client scoped)
 */
router.get("/blocked", protect, validateDateFiltering, getBlockedTasks);

// ===== PARAMETERIZED ROUTES (MUST BE AFTER SPECIFIC ROUTES) =====

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task with full details
 * @access  Private (Organization/Client scoped)
 */
router.get("/:id", protect, validateTaskId, getTask);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private (Admin or assignee)
 */
router.put("/:id", protect, validateUpdateTask, updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private (Admin only)
 */
router.delete("/:id", protect, isAdmin, validateTaskId, deleteTask);

/**
 * @route   PUT /api/tasks/:id/status
 * @desc    Update task status
 * @access  Private (Admin or assignee)
 */
router.put("/:id/status", protect, validateUpdateTaskStatus, updateTaskStatus);

/**
 * @route   PUT /api/tasks/:id/assign
 * @desc    Assign task to team member
 * @access  Private (Admin only)
 */
router.put("/:id/assign", protect, isAdmin, validateAssignTask, assignTask);

/**
 * @route   PUT /api/tasks/:id/progress
 * @desc    Update task progress
 * @access  Private (Assignee or Admin)
 */
router.put("/:id/progress", protect, validateUpdateTaskProgress, updateTaskProgress);

/**
 * @route   POST /api/tasks/:id/comments
 * @desc    Add comment to task
 * @access  Private (Team member or client)
 */
router.post("/:id/comments", protect, validateAddTaskComment, addTaskComment);

/**
 * @route   GET /api/tasks/:id/comments
 * @desc    Get task comments
 * @access  Private (Organization/Client scoped)
 */
router.get("/:id/comments", protect, validateTaskId, getTaskComments);

/**
 * @route   PUT /api/tasks/:id/time
 * @desc    Log time spent on task
 * @access  Private (Assignee only)
 */
router.put("/:id/time", protect, validateLogTime, logTaskTime);

/**
 * @route   GET /api/tasks/:id/history
 * @desc    Get task status history
 * @access  Private (Organization/Client scoped)
 */
router.get("/:id/history", protect, validateTaskId, getTaskHistory);

/**
 * @route   PUT /api/tasks/:id/dependencies
 * @desc    Update task dependencies
 * @access  Private (Admin only)
 */
router.put("/:id/dependencies", protect, isAdmin, validateUpdateTaskDependencies, updateTaskDependencies);

module.exports = router;
