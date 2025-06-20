const express = require("express");
const {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  recoverProject,
  // Phase 2: Project Management Operations
  getProjectStats,
  updateProjectStatus,
  updateProjectProgress,
  getProjectTasks,
  createProjectTask,
  getProjectTeam,
  updateProjectTeam,
  getProjectTimeline,
  updateProjectMilestones,
  getProjectDocuments,
  updateProjectDocuments,
  // Phase 3: Project Search and Filtering
  searchProjects,
  getProjectsByStatus,
  getProjectsByPriority,
  getOverdueProjects,
  getProjectsDueSoon,
  getActiveProjects,
} = require("../controllers/projectController");

const {
  validateCreateProject,
  validateUpdateProject,
  validateGetProjects,
  validateProjectId,
  // Phase 2 validators
  validateUpdateProjectStatus,
  validateGetProjectTasks,
  validateCreateProjectTask,
  validateUpdateProjectTeam,
  validateUpdateProjectMilestones,
  validateUpdateProjectDocuments,
  // Phase 3 validators
  validateProjectSearch,
  validateProjectStatus,
  validateProjectPriority,
  validateProjectsDueSoon,
  validateBasicProjectFilter,
} = require("../middleware/projectValidators");

const { protect, isAdmin } = require("../middleware/auth");

const router = express.Router();

// ============================================================================
// PHASE 1: CORE CRUD OPERATIONS
// ============================================================================

/**
 * @route   GET /api/projects
 * @desc    Get all projects (client/org-scoped)
 * @access  Private (Organization/Client scoped)
 */
router.get("/", protect, validateGetProjects, getProjects);

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private (Admin only)
 */
router.post("/", protect, isAdmin, validateCreateProject, createProject);

/**
 * @route   GET /api/projects/stats
 * @desc    Get project statistics
 * @access  Private (Organization/Client scoped)
 */
router.get("/stats", protect, getProjectStats);

// ============================================================================
// PHASE 3: PROJECT SEARCH AND FILTERING
// ============================================================================

/**
 * @route   GET /api/projects/search?q=query
 * @desc    Search projects by name/description
 * @access  Private (Organization/Client scoped)
 */
router.get("/search", protect, validateProjectSearch, searchProjects);

/**
 * @route   GET /api/projects/by-status/:status
 * @desc    Get projects by status
 * @access  Private (Organization/Client scoped)
 */
router.get("/by-status/:status", protect, validateProjectStatus, getProjectsByStatus);

/**
 * @route   GET /api/projects/by-priority/:priority
 * @desc    Get projects by priority
 * @access  Private (Organization/Client scoped)
 */
router.get("/by-priority/:priority", protect, validateProjectPriority, getProjectsByPriority);

/**
 * @route   GET /api/projects/overdue
 * @desc    Get overdue projects
 * @access  Private (Organization/Client scoped)
 */
router.get("/overdue", protect, validateBasicProjectFilter, getOverdueProjects);

/**
 * @route   GET /api/projects/due-soon
 * @desc    Get projects due soon
 * @access  Private (Organization/Client scoped)
 */
router.get("/due-soon", protect, validateProjectsDueSoon, getProjectsDueSoon);

/**
 * @route   GET /api/projects/active
 * @desc    Get active projects
 * @access  Private (Organization/Client scoped)
 */
router.get("/active", protect, validateBasicProjectFilter, getActiveProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project with full details
 * @access  Private (Organization/Client scoped)
 */
router.get("/:id", protect, validateProjectId, getProject);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private (Admin only)
 */
router.put("/:id", protect, isAdmin, validateUpdateProject, updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project (soft delete to trash)
 * @access  Private (Admin only)
 */
router.delete("/:id", protect, isAdmin, validateProjectId, deleteProject);

/**
 * @route   POST /api/projects/recover/:trashId
 * @desc    Recover project from trash
 * @access  Private (Admin only)
 */
router.post("/recover/:trashId", protect, isAdmin, recoverProject);

// ============================================================================
// PHASE 2: PROJECT MANAGEMENT OPERATIONS
// ============================================================================

/**
 * @route   PUT /api/projects/:id/status
 * @desc    Update project status
 * @access  Private (Admin only)
 */
router.put("/:id/status", protect, isAdmin, validateUpdateProjectStatus, updateProjectStatus);

/**
 * @route   PUT /api/projects/:id/progress
 * @desc    Update project progress (auto-calculated from tasks)
 * @access  Private (Admin only)
 */
router.put("/:id/progress", protect, isAdmin, validateProjectId, updateProjectProgress);

/**
 * @route   GET /api/projects/:id/tasks
 * @desc    Get all tasks for project
 * @access  Private (Organization/Client scoped)
 */
router.get("/:id/tasks", protect, validateGetProjectTasks, getProjectTasks);

/**
 * @route   POST /api/projects/:id/tasks
 * @desc    Create task within project
 * @access  Private (Admin only)
 */
router.post("/:id/tasks", protect, isAdmin, validateCreateProjectTask, createProjectTask);

/**
 * @route   GET /api/projects/:id/team
 * @desc    Get project team members
 * @access  Private (Organization/Client scoped)
 */
router.get("/:id/team", protect, validateProjectId, getProjectTeam);

/**
 * @route   PUT /api/projects/:id/team
 * @desc    Update project team assignments
 * @access  Private (Admin only)
 */
router.put("/:id/team", protect, isAdmin, validateUpdateProjectTeam, updateProjectTeam);

/**
 * @route   GET /api/projects/:id/timeline
 * @desc    Get project timeline and milestones
 * @access  Private (Organization/Client scoped)
 */
router.get("/:id/timeline", protect, validateProjectId, getProjectTimeline);

/**
 * @route   PUT /api/projects/:id/milestones
 * @desc    Update project milestones
 * @access  Private (Admin only)
 */
router.put("/:id/milestones", protect, isAdmin, validateUpdateProjectMilestones, updateProjectMilestones);

/**
 * @route   GET /api/projects/:id/documents
 * @desc    Get linked documents
 * @access  Private (Organization/Client scoped)
 */
router.get("/:id/documents", protect, validateProjectId, getProjectDocuments);

/**
 * @route   PUT /api/projects/:id/documents
 * @desc    Link documents to project
 * @access  Private (Admin only)
 */
router.put("/:id/documents", protect, isAdmin, validateUpdateProjectDocuments, updateProjectDocuments);

module.exports = router;
