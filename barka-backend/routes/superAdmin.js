const express = require('express');
const router = express.Router();
const { 
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization
} = require('../controllers/organizationController');
const { 
  protect, 
  authorize, 
  isSuperAdmin 
} = require('../middleware/auth');
const { ROLES } = require('../models/User');
const { organizationValidator } = require('../middleware/validators');

// Apply protection to all routes
router.use(protect);
router.use(isSuperAdmin);

// Super admin organization routes
router.route('/organizations')
  .get(getOrganizations)
  .post(organizationValidator, createOrganization);

router.route('/organizations/:id')
  .get(getOrganization)
  .put(organizationValidator, updateOrganization)
  .delete(deleteOrganization);

module.exports = router;
