const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");

// Apply protection to all routes
router.use(protect);

// @route   GET /api/dashboard
// @desc    Get dashboard statistics and data
// @access  Private (Admin or client)
router.get("/", dashboardController.getDashboardData);

module.exports = router;
