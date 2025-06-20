const { body, param, query, validationResult } = require("express-validator");

/**
 * Validation rules for creating a team member
 */
exports.validateCreateTeamMember = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),

  body("role")
    .isIn([
      "project_manager",
      "developer", 
      "designer",
      "qa_engineer",
      "business_analyst",
      "stakeholder",
      "client",
      "other"
    ])
    .withMessage("Please provide a valid role"),

  body("customRole")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Custom role must be between 2 and 50 characters")
    .trim(),

  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),

  body("department")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Department must not exceed 100 characters")
    .trim(),

  body("title")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Title must not exceed 100 characters")
    .trim(),

  body("capacity.hoursPerWeek")
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage("Hours per week must be between 1 and 168"),

  body("capacity.availability")
    .optional()
    .isIn(["full_time", "part_time", "contract", "consultant"])
    .withMessage("Please provide a valid availability type"),

  body("capacity.timezone")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Timezone must not exceed 50 characters"),

  body("capacity.workingHours.start")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:MM format"),

  body("capacity.workingHours.end")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be in HH:MM format"),

  body("skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array"),

  body("skills.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each skill must be between 1 and 50 characters")
    .trim(),

  body("expertise")
    .optional()
    .isArray()
    .withMessage("Expertise must be an array"),

  body("expertise.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each expertise must be between 1 and 50 characters")
    .trim(),

  body("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes must not exceed 1000 characters")
    .trim(),

  // Custom validation for role and customRole relationship
  body().custom((value) => {
    if (value.role === "other" && !value.customRole) {
      throw new Error("Custom role is required when role is 'other'");
    }
    return true;
  }),
];

/**
 * Validation rules for updating a team member
 */
exports.validateUpdateTeamMember = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid team member ID"),

  body("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),

  body("role")
    .optional()
    .isIn([
      "project_manager",
      "developer",
      "designer", 
      "qa_engineer",
      "business_analyst",
      "stakeholder",
      "client",
      "other"
    ])
    .withMessage("Please provide a valid role"),

  body("customRole")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Custom role must be between 2 and 50 characters")
    .trim(),

  body("status")
    .optional()
    .isIn(["active", "inactive", "on_leave"])
    .withMessage("Please provide a valid status"),

  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),

  body("department")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Department must not exceed 100 characters")
    .trim(),

  body("title")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Title must not exceed 100 characters")
    .trim(),

  body("capacity.hoursPerWeek")
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage("Hours per week must be between 1 and 168"),

  body("capacity.availability")
    .optional()
    .isIn(["full_time", "part_time", "contract", "consultant"])
    .withMessage("Please provide a valid availability type"),

  body("capacity.timezone")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Timezone must not exceed 50 characters"),

  body("capacity.workingHours.start")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:MM format"),

  body("capacity.workingHours.end")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be in HH:MM format"),

  body("skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array"),

  body("skills.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each skill must be between 1 and 50 characters")
    .trim(),

  body("expertise")
    .optional()
    .isArray()
    .withMessage("Expertise must be an array"),

  body("expertise.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each expertise must be between 1 and 50 characters")
    .trim(),

  body("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes must not exceed 1000 characters")
    .trim(),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isLength({ min: 1, max: 30 })
    .withMessage("Each tag must be between 1 and 30 characters")
    .trim(),

  // Custom validation for role and customRole relationship
  body().custom((value) => {
    if (value.role === "other" && !value.customRole) {
      throw new Error("Custom role is required when role is 'other'");
    }
    return true;
  }),
];

/**
 * Validation rules for getting team members with query parameters
 */
exports.validateGetTeamMembers = [
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
    .isIn(["active", "inactive", "on_leave"])
    .withMessage("Please provide a valid status"),

  query("role")
    .optional()
    .isIn([
      "project_manager",
      "developer",
      "designer",
      "qa_engineer", 
      "business_analyst",
      "stakeholder",
      "client",
      "other"
    ])
    .withMessage("Please provide a valid role"),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),

  query("organizationId")
    .optional()
    .isMongoId()
    .withMessage("Please provide a valid organization ID"),
];

/**
 * Validation rules for team member ID parameter
 */
exports.validateTeamMemberId = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid team member ID"),
];

/**
 * Validation rules for updating team member workload
 */
exports.validateUpdateWorkload = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid team member ID"),

  body("currentTasks")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Current tasks count must be a non-negative integer"),

  body("totalHoursAllocated")
    .optional()
    .isFloat({ min: 0, max: 168 })
    .withMessage("Total hours allocated must be between 0 and 168 (hours per week)"),

  body("workload.currentTasks")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Current tasks count must be a non-negative integer"),

  body("workload.totalHoursAllocated")
    .optional()
    .isFloat({ min: 0, max: 168 })
    .withMessage("Total hours allocated must be between 0 and 168 (hours per week)"),

  body("workload.utilizationPercentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Utilization percentage must be between 0 and 100"),

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
 * Validation rules for updating team member status
 */
exports.validateUpdateStatus = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid team member ID"),

  body("status")
    .isIn(["active", "inactive", "on_leave"])
    .withMessage("Status must be one of: active, inactive, on_leave"),

  body("reason")
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage("Reason must be between 5 and 500 characters")
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
 * Validation rules for updating team member skills
 */
exports.validateUpdateSkills = [
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid team member ID"),

  body("skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array"),

  body("skills.*")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Each skill must be between 2 and 50 characters")
    .trim(),

  body("expertise")
    .optional()
    .isArray()
    .withMessage("Expertise must be an array"),

  body("expertise.*.skill")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Expertise skill must be between 2 and 50 characters")
    .trim(),

  body("expertise.*.level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced", "expert"])
    .withMessage("Expertise level must be one of: beginner, intermediate, advanced, expert"),

  body("certifications")
    .optional()
    .isArray()
    .withMessage("Certifications must be an array"),

  body("certifications.*.name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Certification name must be between 2 and 100 characters")
    .trim(),

  body("certifications.*.issuer")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Certification issuer must be between 2 and 100 characters")
    .trim(),

  body("certifications.*.dateObtained")
    .optional()
    .isISO8601()
    .withMessage("Date obtained must be a valid date")
    .toDate(),

  body("certifications.*.expiryDate")
    .optional()
    .isISO8601()
    .withMessage("Expiry date must be a valid date")
    .toDate(),

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
 * Validation rules for getting available team members
 */
exports.validateGetAvailable = [
  query("hoursNeeded")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Hours needed must be a positive number"),

  query("skills")
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage("Skills query must be between 2 and 200 characters")
    .trim(),

  query("role")
    .optional()
    .isIn([
      "project_manager",
      "developer",
      "designer",
      "qa_engineer",
      "business_analyst",
      "stakeholder",
      "client",
      "other"
    ])
    .withMessage("Please provide a valid role"),

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
 * Validation rules for getting team members by role
 */
exports.validateGetByRole = [
  param("role")
    .isIn([
      "project_manager",
      "developer",
      "designer",
      "qa_engineer",
      "business_analyst",
      "stakeholder",
      "client",
      "other"
    ])
    .withMessage("Please provide a valid role"),

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
