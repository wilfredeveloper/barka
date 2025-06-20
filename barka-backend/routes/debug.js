/**
 * Debug routes for development and testing purposes
 * These routes should be disabled in production
 */
const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');
const { protect, isAdmin } = require('../middleware/auth');

// Apply protection to all routes - only admins can access debug routes
router.use(protect);
router.use(isAdmin);

// Debug routes for todos
router.get('/todos/:clientId', debugController.getClientTodoDebug);

// Debug routes for conversations
router.get('/conversation/:conversationId', debugController.getConversationDebug);

module.exports = router;
