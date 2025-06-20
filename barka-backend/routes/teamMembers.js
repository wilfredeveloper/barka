const express = require("express");
const {
  getTeamMembers,
  createTeamMember,
  getTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTeamStats,
  updateWorkload,
  updateStatus,
  updateHourlyRate,
  getTeamMemberTasks,
  getTeamMemberProjects,
  updateSkills,
  getAvailableTeamMembers,
  getTeamMembersByRole,
  searchTeamMembers,
} = require("../controllers/teamMemberController");

const {
  validateCreateTeamMember,
  validateUpdateTeamMember,
  validateGetTeamMembers,
  validateTeamMemberId,
  validateUpdateWorkload,
  validateUpdateStatus,
  validateUpdateSkills,
  validateGetAvailable,
  validateGetByRole,
} = require("../middleware/teamMemberValidators");

const { protect, isAdmin } = require("../middleware/auth");

const router = express.Router();

// ===== PHASE 2: MANAGEMENT OPERATIONS (Must come before parameterized routes) =====

/**
 * @route   GET /api/team-members/stats
 * @desc    Get team statistics for organization
 * @access  Private (Admin only)
 */
router.get("/stats", protect, isAdmin, getTeamStats);

/**
 * @route   GET /api/team-members/available
 * @desc    Get available team members for assignment
 * @access  Private
 */
router.get("/available", protect, validateGetAvailable, getAvailableTeamMembers);

/**
 * @route   GET /api/team-members/by-role/:role
 * @desc    Get team members by role
 * @access  Private (Organization scoped)
 */
router.get("/by-role/:role", protect, validateGetByRole, getTeamMembersByRole);

/**
 * @route   GET /api/team-members/search
 * @desc    Search team members
 * @access  Private (Organization scoped)
 */
router.get("/search", protect, searchTeamMembers);

// ===== PHASE 1: CORE CRUD OPERATIONS =====

/**
 * @route   GET /api/team-members
 * @desc    Get all team members (org-scoped)
 * @access  Private (Organization scoped)
 */
router.get("/", protect, validateGetTeamMembers, getTeamMembers);

/**
 * @route   POST /api/team-members
 * @desc    Create new team member
 * @access  Private (Admin only)
 */
router.post("/", protect, isAdmin, validateCreateTeamMember, createTeamMember);

/**
 * @route   GET /api/team-members/:id
 * @desc    Get single team member
 * @access  Private (Organization scoped)
 */
router.get("/:id", protect, validateTeamMemberId, getTeamMember);

/**
 * @route   PUT /api/team-members/:id
 * @desc    Update team member
 * @access  Private (Admin or self-update)
 */
router.put("/:id", protect, validateUpdateTeamMember, updateTeamMember);

/**
 * @route   DELETE /api/team-members/:id
 * @desc    Delete team member
 * @access  Private (Admin only)
 */
router.delete("/:id", protect, isAdmin, validateTeamMemberId, deleteTeamMember);

/**
 * @route   PUT /api/team-members/:id/workload
 * @desc    Update team member workload
 * @access  Private (Admin only)
 */
router.put("/:id/workload", protect, isAdmin, validateUpdateWorkload, updateWorkload);

/**
 * @route   PUT /api/team-members/:id/status
 * @desc    Update team member status
 * @access  Private (Admin only)
 */
router.put("/:id/status", protect, isAdmin, validateUpdateStatus, updateStatus);

/**
 * @route   PUT /api/team-members/:id/hourly-rate
 * @desc    Update team member hourly rate
 * @access  Private (Admin only)
 */
router.put("/:id/hourly-rate", protect, isAdmin, validateTeamMemberId, updateHourlyRate);

/**
 * @route   GET /api/team-members/:id/tasks
 * @desc    Get tasks assigned to team member
 * @access  Private (Organization scoped)
 */
router.get("/:id/tasks", protect, validateTeamMemberId, getTeamMemberTasks);

/**
 * @route   GET /api/team-members/:id/projects
 * @desc    Get projects assigned to team member
 * @access  Private (Organization scoped)
 */
router.get("/:id/projects", protect, validateTeamMemberId, getTeamMemberProjects);

/**
 * @route   PUT /api/team-members/:id/skills
 * @desc    Update team member skills
 * @access  Private (Admin or self-update)
 */
router.put("/:id/skills", protect, validateUpdateSkills, updateSkills);

module.exports = router;
