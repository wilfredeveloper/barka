const { body, param, query, validationResult } = require("express-validator");

/**
 * Validation rules for creating a project
 */
exports.validateCreateProject = [
  body("name")
    .notEmpty()
    .withMessage("Project name is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Project name must be between 2 and 200 characters")
    .trim(),

  body("description")
    .notEmpty()
    .withMessage("Project description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Project description must be between 10 and 2000 characters")
    .trim(),

  body("startDate")
    .isISO8601()
    .withMessage("Please provide a valid start date")
    .toDate(),

  body("dueDate")
    .isISO8601()
    .withMessage("Please provide a valid due date")
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("Due date must be after start date");
      }
      return true;
    }),

  body("status")
    .optional()
    .isIn(["planning", "active", "on_hold", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Please provide a valid priority"),

  body("budget")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Budget must be a positive number"),

  body("currency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-character code")
    .isAlpha()
    .withMessage("Currency must contain only letters")
    .toUpperCase(),

  body("teamMembers")
    .optional()
    .isArray()
    .withMessage("Team members must be an array"),

  body("teamMembers.*")
    .optional()
    .isMongoId()
    .withMessage("Each team member must be a valid ID"),

  body("projectManager")
    .optional()
    .isMongoId()
    .withMessage("Project manager must be a valid team member ID"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters")
    .trim(),

  body("milestones")
    .optional()
    .isArray()
    .withMessage("Milestones must be an array"),

  body("milestones.*.name")
    .optional()
    .notEmpty()
    .withMessage("Milestone name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Milestone name must be between 2 and 100 characters")
    .trim(),

  body("milestones.*.dueDate")
    .optional()
    .isISO8601()
    .withMessage("Milestone due date must be a valid date")
    .toDate(),

  body("milestones.*.description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Milestone description must not exceed 500 characters")
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
 * Validation rules for updating a project
 */
exports.validateUpdateProject = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid project ID"),

  body("name")
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage("Project name must be between 2 and 200 characters")
    .trim(),

  body("description")
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Project description must be between 10 and 2000 characters")
    .trim(),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid start date")
    .toDate(),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid due date")
    .toDate(),

  body("status")
    .optional()
    .isIn(["planning", "active", "on_hold", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Please provide a valid priority"),

  body("budget")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Budget must be a positive number"),

  body("currency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-character code")
    .isAlpha()
    .withMessage("Currency must contain only letters")
    .toUpperCase(),

  body("teamMembers")
    .optional()
    .isArray()
    .withMessage("Team members must be an array"),

  body("teamMembers.*")
    .optional()
    .isMongoId()
    .withMessage("Each team member must be a valid ID"),

  body("projectManager")
    .optional()
    .isMongoId()
    .withMessage("Project manager must be a valid team member ID"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters")
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
 * Validation rules for getting projects with query parameters
 */
exports.validateGetProjects = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(["planning", "active", "on_hold", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
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
 * Validation rules for project ID parameter
 */
exports.validateProjectId = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid project ID"),

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

// ============================================================================
// PHASE 2: PROJECT MANAGEMENT OPERATIONS VALIDATORS
// ============================================================================

/**
 * Validation rules for updating project status
 */
exports.validateUpdateProjectStatus = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid project ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["planning", "active", "on_hold", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  body("reason")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Reason must not exceed 500 characters")
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
 * Validation rules for getting project tasks
 */
exports.validateGetProjectTasks = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid project ID"),

  query("status")
    .optional()
    .isIn(["not_started", "in_progress", "blocked", "under_review", "completed", "cancelled"])
    .withMessage("Please provide a valid task status"),

  query("assignee")
    .optional()
    .isMongoId()
    .withMessage("Assignee must be a valid team member ID"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Please provide a valid priority"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

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
 * Validation rules for creating project task
 */
exports.validateCreateProjectTask = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid project ID"),

  body("name")
    .notEmpty()
    .withMessage("Task name is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Task name must be between 2 and 200 characters")
    .trim(),

  body("description")
    .notEmpty()
    .withMessage("Task description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Task description must be between 10 and 2000 characters")
    .trim(),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Assigned team member must be a valid ID"),

  body("assignedToName")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Assigned team member name must be between 2 and 100 characters")
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

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Please provide a valid priority"),

  body("complexity")
    .optional()
    .isIn(["simple", "medium", "complex", "very_complex"])
    .withMessage("Please provide a valid complexity"),

  body("estimatedHours")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Estimated hours must be a positive number"),

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
    .isLength({ min: 2, max: 100 })
    .withMessage("Category must be between 2 and 100 characters")
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
 * Validation rules for updating project team
 */
exports.validateUpdateProjectTeam = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid project ID"),

  body("teamMembers")
    .isArray()
    .withMessage("Team members must be an array"),

  body("teamMembers.*")
    .isMongoId()
    .withMessage("Each team member must be a valid ID"),

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
 * Validation rules for updating project milestones
 */
exports.validateUpdateProjectMilestones = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid project ID"),

  body("milestones")
    .isArray()
    .withMessage("Milestones must be an array"),

  body("milestones.*.name")
    .optional()
    .notEmpty()
    .withMessage("Milestone name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Milestone name must be between 2 and 100 characters")
    .trim(),

  body("milestones.*.dueDate")
    .optional()
    .isISO8601()
    .withMessage("Milestone due date must be a valid date")
    .toDate(),

  body("milestones.*.description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Milestone description must not exceed 500 characters")
    .trim(),

  body("milestones.*.status")
    .optional()
    .isIn(["not_started", "in_progress", "completed", "cancelled"])
    .withMessage("Please provide a valid milestone status"),

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
 * Validation rules for updating project documents
 */
exports.validateUpdateProjectDocuments = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid project ID"),

  body("documentIds")
    .isArray()
    .withMessage("Document IDs must be an array"),

  body("documentIds.*")
    .isMongoId()
    .withMessage("Each document ID must be a valid ID"),

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

// ============================================================================
// PHASE 3: PROJECT SEARCH AND FILTERING VALIDATORS
// ============================================================================

/**
 * Validation rules for project search
 */
exports.validateProjectSearch = [
  query("q")
    .notEmpty()
    .withMessage("Search query is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Search query must be between 1 and 200 characters")
    .trim(),

  query("status")
    .optional()
    .isIn(["planning", "active", "on_hold", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Please provide a valid priority"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

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
 * Validation rules for project status parameter
 */
exports.validateProjectStatus = [
  param("status")
    .isIn(["planning", "active", "on_hold", "completed", "cancelled"])
    .withMessage("Please provide a valid status"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

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
 * Validation rules for project priority parameter
 */
exports.validateProjectPriority = [
  param("priority")
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Please provide a valid priority"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

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
 * Validation rules for projects due soon
 */
exports.validateProjectsDueSoon = [
  query("days")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Days must be between 1 and 365"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

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
 * Validation rules for basic project filtering (overdue, active)
 */
exports.validateBasicProjectFilter = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

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
