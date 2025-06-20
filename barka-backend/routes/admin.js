const express = require('express');
const router = express.Router();
const {
  getOrganizations,
  getOrganization,
  updateOrganization
} = require('../controllers/organizationController');
const {
  protect,
  authorize,
  isAdmin,
  isSameOrganization
} = require('../middleware/auth');
const { ROLES } = require('../models/User');
const { organizationValidator } = require('../middleware/validators');

// Import events routes
const eventsRouter = require('./events');

// Apply protection to all routes
router.use(protect);
router.use(isAdmin);

// Organization routes for org admins
router.get('/organizations', getOrganizations);
router.route('/organizations/:id')
  .get(isSameOrganization, getOrganization)
  .put(isSameOrganization, organizationValidator, updateOrganization);

// Events routes
router.use('/events', eventsRouter);

module.exports = router;
