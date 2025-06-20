/**
 * Memory API Proxy Routes
 * 
 * This module provides proxy endpoints to communicate with the ovara-agent
 * memory system while handling authentication and CORS issues.
 */

const express = require('express');
const axios = require('axios');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Configuration
const OVARA_API_URL = process.env.OVARA_API_URL || 'http://localhost:5566';
const MEMORY_API_BASE = `${OVARA_API_URL}/api/memory`;

// Helper function to make requests to ovara-agent
async function makeOvaraRequest(endpoint, method = 'GET', data = null, userId = null) {
  try {
    const config = {
      method,
      url: `${MEMORY_API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Ovara API request failed:', error.message);
    if (error.response) {
      throw new Error(`Ovara API error: ${error.response.status} ${error.response.statusText}`);
    }
    throw new Error('Failed to connect to memory service');
  }
}

// Get user profile
router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own profile
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own profile'
      });
    }

    const result = await makeOvaraRequest(`/profile/${userId}`, 'GET', null, userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user profile'
    });
  }
});

// Update user profile
router.put('/profile/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { field, value } = req.body;
    
    // Ensure user can only update their own profile
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own profile'
      });
    }

    const result = await makeOvaraRequest(`/profile/${userId}`, 'PUT', { field, value }, userId);
    res.json(result);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user profile'
    });
  }
});

// Get user interests
router.get('/interests/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    // Ensure user can only access their own interests
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own interests'
      });
    }

    const result = await makeOvaraRequest(`/interests/${userId}?limit=${limit}`, 'GET', null, userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user interests:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user interests'
    });
  }
});

// Search memories
router.get('/memories/:userId/search', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { query = '', memory_type = '', limit = 10 } = req.query;
    
    // Ensure user can only search their own memories
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only search your own memories'
      });
    }

    const params = new URLSearchParams({
      query,
      memory_type,
      limit: limit.toString()
    });

    const result = await makeOvaraRequest(`/memories/${userId}/search?${params}`, 'GET', null, userId);
    res.json(result);
  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search memories'
    });
  }
});

// Get memory settings
router.get('/settings/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own settings
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own settings'
      });
    }

    const result = await makeOvaraRequest(`/settings/${userId}`, 'GET', null, userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching memory settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch memory settings'
    });
  }
});

// Update memory settings
router.put('/settings/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { setting, value } = req.body;
    
    // Ensure user can only update their own settings
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own settings'
      });
    }

    const result = await makeOvaraRequest(`/settings/${userId}`, 'PUT', { setting, value }, userId);
    res.json(result);
  } catch (error) {
    console.error('Error updating memory settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update memory settings'
    });
  }
});

// Get transparency info
router.get('/transparency/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own transparency info
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own transparency info'
      });
    }

    const result = await makeOvaraRequest(`/transparency/${userId}`, 'GET', null, userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching transparency info:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transparency info'
    });
  }
});

// Export user data
router.get('/export/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { data_types = 'all' } = req.query;
    
    // Ensure user can only export their own data
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only export your own data'
      });
    }

    const result = await makeOvaraRequest(`/export/${userId}?data_types=${data_types}`, 'GET', null, userId);
    res.json(result);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export user data'
    });
  }
});

// Delete user data
router.delete('/delete/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { data_types, confirmation } = req.body;
    
    // Ensure user can only delete their own data
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own data'
      });
    }

    const result = await makeOvaraRequest(`/delete/${userId}`, 'DELETE', { data_types, confirmation }, userId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user data'
    });
  }
});

module.exports = router;
