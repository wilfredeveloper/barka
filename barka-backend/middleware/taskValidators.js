const { body, param, query, validationResult } = require("express-validator");

/**
 * Validation rules for creating a task
 */
exports.validateCreateTask = [
  body("name")
    .notEmpty()
    .withMessage("Task name is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Task name must be between 2 and 200 characters")
    .trim(),

  body("description")
    .notEmpty()
    .withMessage("Task description is required")
    .isLength({ min: 5, max: 2000 })
    .withMessage("Task description must be between 5 and 2000 characters")
    .trim(),

  body("project")
    .isMongoId()
    .withMessage("Project ID must be a valid MongoDB ObjectId"),

  body("status")
    .optional()
    .isIn(["not_started", "in_progress", "blocked", "under_review", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Please provide a valid priority"),

  body("complexity")
    .optional()
    .isIn(["simple", "medium", "complex", "very_complex"])
    .withMessage("Please provide a valid complexity level"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Assigned to must be a valid team member ID"),

  body("assignedToName")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Assigned to name must be between 2 and 100 characters")
    .trim(),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid due date")
    .toDate(),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid start date")
    .toDate(),

  body("estimatedHours")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Estimated hours must be a positive number"),

  body("actualHours")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Actual hours must be a positive number"),

  body("progress.completionPercentage")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Completion percentage must be between 0 and 100"),

  body("progress.timeSpent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Time spent must be a positive number"),

  body("progress.remainingWork")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Remaining work must be a positive number"),

  body("dependsOn")
    .optional()
    .isArray()
    .withMessage("Dependencies must be an array"),

  body("dependsOn.*")
    .optional()
    .isMongoId()
    .withMessage("Each dependency must be a valid task ID"),

  body("blockedBy")
    .optional()
    .isArray()
    .withMessage("Blocked by must be an array"),

  body("blockedBy.*")
    .optional()
    .isMongoId()
    .withMessage("Each blocking task must be a valid task ID"),

  body("parentTask")
    .optional()
    .isMongoId()
    .withMessage("Parent task must be a valid task ID"),

  body("acceptanceCriteria")
    .optional()
    .isArray()
    .withMessage("Acceptance criteria must be an array"),

  body("acceptanceCriteria.*.description")
    .optional()
    .notEmpty()
    .withMessage("Acceptance criteria description is required")
    .isLength({ min: 5, max: 500 })
    .withMessage("Acceptance criteria description must be between 5 and 500 characters")
    .trim(),

  body("requirements")
    .optional()
    .isArray()
    .withMessage("Requirements must be an array"),

  body("requirements.*")
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage("Each requirement must be between 5 and 500 characters")
    .trim(),

  body("deliverables")
    .optional()
    .isArray()
    .withMessage("Deliverables must be an array"),

  body("deliverables.*.name")
    .optional()
    .notEmpty()
    .withMessage("Deliverable name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Deliverable name must be between 2 and 100 characters")
    .trim(),

  body("deliverables.*.description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Deliverable description must not exceed 500 characters")
    .trim(),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters")
    .trim(),

  body("category")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Category must be between 2 and 50 characters")
    .trim(),

  body("clientId")
    .optional()
    .isMongoId()
    .withMessage("Client ID must be a valid MongoDB ObjectId"),

  body("organizationId")
    .optional()
    .isMongoId()
    .withMessage("Organization ID must be a valid MongoDB ObjectId"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for updating a task
 */
exports.validateUpdateTask = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid task ID"),

  body("name")
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage("Task name must be between 2 and 200 characters")
    .trim(),

  body("description")
    .optional()
    .isLength({ min: 5, max: 2000 })
    .withMessage("Task description must be between 5 and 2000 characters")
    .trim(),

  body("status")
    .optional()
    .isIn(["not_started", "in_progress", "blocked", "under_review", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Please provide a valid priority"),

  body("complexity")
    .optional()
    .isIn(["simple", "medium", "complex", "very_complex"])
    .withMessage("Please provide a valid complexity level"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Assigned to must be a valid team member ID"),

  body("assignedToName")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Assigned to name must be between 2 and 100 characters")
    .trim(),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid due date")
    .toDate(),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid start date")
    .toDate(),

  body("estimatedHours")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Estimated hours must be a positive number"),

  body("actualHours")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Actual hours must be a positive number"),

  body("progress.completionPercentage")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Completion percentage must be between 0 and 100"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters")
    .trim(),

  body("category")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Category must be between 2 and 50 characters")
    .trim(),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for getting tasks with query parameters
 */
exports.validateGetTasks = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("project")
    .optional()
    .isMongoId()
    .withMessage("Project ID must be a valid MongoDB ObjectId"),

  query("assignee")
    .optional()
    .isMongoId()
    .withMessage("Assignee ID must be a valid MongoDB ObjectId"),

  query("status")
    .optional()
    .isIn(["not_started", "in_progress", "blocked", "under_review", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Please provide a valid priority"),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),

  query("isArchived")
    .optional()
    .isBoolean()
    .withMessage("isArchived must be a boolean value"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for task ID parameter
 */
exports.validateTaskId = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid task ID"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for updating task status
 */
exports.validateUpdateTaskStatus = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid task ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["not_started", "in_progress", "blocked", "under_review", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  body("comment")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Comment must be less than 500 characters")
    .trim(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for assigning task
 */
exports.validateAssignTask = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid task ID"),

  body("assignedTo")
    .notEmpty()
    .withMessage("Assigned to is required")
    .isMongoId()
    .withMessage("Assigned to must be a valid team member ID"),

  body("assignedToName")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Assigned to name must be between 2 and 100 characters")
    .trim(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for updating task progress
 */
exports.validateUpdateTaskProgress = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid task ID"),

  body("completionPercentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Completion percentage must be between 0 and 100"),

  body("timeSpent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Time spent must be a positive number"),

  body("remainingWork")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Remaining work must be a positive number"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for adding task comment
 */
exports.validateAddTaskComment = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid task ID"),

  body("content")
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment content must be between 1 and 1000 characters")
    .trim(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for logging time
 */
exports.validateLogTime = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid task ID"),

  body("hours")
    .notEmpty()
    .withMessage("Hours is required")
    .isFloat({ min: 0.1, max: 24 })
    .withMessage("Hours must be between 0.1 and 24"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters")
    .trim(),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid ISO 8601 date"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for updating task dependencies
 */
exports.validateUpdateTaskDependencies = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid task ID"),

  body("dependsOn")
    .optional()
    .isArray()
    .withMessage("Depends on must be an array"),

  body("dependsOn.*")
    .optional()
    .isMongoId()
    .withMessage("Each dependency must be a valid task ID"),

  body("blockedBy")
    .optional()
    .isArray()
    .withMessage("Blocked by must be an array"),

  body("blockedBy.*")
    .optional()
    .isMongoId()
    .withMessage("Each blocking task must be a valid task ID"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for task search endpoint
 */
exports.validateTaskSearch = [
  query("q")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Search query must be between 1 and 200 characters")
    .trim(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("project")
    .optional()
    .isMongoId()
    .withMessage("Project ID must be a valid MongoDB ObjectId"),

  query("assignee")
    .optional()
    .isMongoId()
    .withMessage("Assignee ID must be a valid MongoDB ObjectId"),

  query("status")
    .optional()
    .isIn(["not_started", "in_progress", "blocked", "under_review", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Please provide a valid priority"),

  query("complexity")
    .optional()
    .isIn(["simple", "medium", "complex", "very_complex"])
    .withMessage("Please provide a valid complexity level"),

  query("category")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Category must be between 1 and 50 characters")
    .trim(),

  query("tags")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Tags must be between 1 and 200 characters")
    .trim(),

  query("dueDateFrom")
    .optional()
    .isISO8601()
    .withMessage("Due date from must be a valid ISO 8601 date"),

  query("dueDateTo")
    .optional()
    .isISO8601()
    .withMessage("Due date to must be a valid ISO 8601 date"),

  query("createdFrom")
    .optional()
    .isISO8601()
    .withMessage("Created from must be a valid ISO 8601 date"),

  query("createdTo")
    .optional()
    .isISO8601()
    .withMessage("Created to must be a valid ISO 8601 date"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for task status parameter
 */
exports.validateTaskStatusParam = [
  param("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["not_started", "in_progress", "blocked", "under_review", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for task priority parameter
 */
exports.validateTaskPriorityParam = [
  param("priority")
    .notEmpty()
    .withMessage("Priority is required")
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Please provide a valid priority"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for team member ID parameter
 */
exports.validateTeamMemberIdParam = [
  param("memberId")
    .notEmpty()
    .withMessage("Team member ID is required")
    .isMongoId()
    .withMessage("Team member ID must be a valid MongoDB ObjectId"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validation rules for date-based filtering endpoints
 */
exports.validateDateFiltering = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("project")
    .optional()
    .isMongoId()
    .withMessage("Project ID must be a valid MongoDB ObjectId"),

  query("assignee")
    .optional()
    .isMongoId()
    .withMessage("Assignee ID must be a valid MongoDB ObjectId"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Please provide a valid priority"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];
