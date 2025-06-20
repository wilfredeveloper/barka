const express = require("express");
const {
  getDashboardAnalytics,
  getProjectOverview,
  getTeamPerformance,
  getTaskCompletionAnalytics,
  getWorkloadDistribution,
  getTimelineProgress,
} = require("../controllers/analyticsController");

const { protect, isAdmin } = require("../middleware/auth");

const router = express.Router();

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get comprehensive dashboard data
 * @access  Private (Organization/Client scoped)
 */
router.get("/dashboard", protect, getDashboardAnalytics);

/**
 * @route   GET /api/analytics/projects/overview
 * @desc    Get project overview statistics
 * @access  Private (Organization/Client scoped)
 */
router.get("/projects/overview", protect, getProjectOverview);

/**
 * @route   GET /api/analytics/team/performance
 * @desc    Get team performance metrics
 * @access  Private (Admin only)
 */
router.get("/team/performance", protect, isAdmin, getTeamPerformance);

/**
 * @route   GET /api/analytics/tasks/completion
 * @desc    Get task completion analytics
 * @access  Private (Organization/Client scoped)
 */
router.get("/tasks/completion", protect, getTaskCompletionAnalytics);

/**
 * @route   GET /api/analytics/workload/distribution
 * @desc    Get workload distribution analytics
 * @access  Private (Admin only)
 */
router.get("/workload/distribution", protect, isAdmin, getWorkloadDistribution);

/**
 * @route   GET /api/analytics/timeline/progress
 * @desc    Get timeline and progress analytics
 * @access  Private (Organization/Client scoped)
 */
router.get("/timeline/progress", protect, getTimelineProgress);

module.exports = router;
