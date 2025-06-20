/**
 * Debug controller for development and testing purposes
 * These endpoints should be disabled in production
 */
const { 
  getClientTodos, 
  getClientTodosSummary, 
  getNextClientTodo, 
  getCompletedTodosWithInfo 
} = require('../utils/checkTodos');
const logger = require('../utils/logger');

/**
 * @desc    Get debug information about client todos
 * @route   GET /api/debug/todos/:clientId
 * @access  Private (Admin only)
 */
exports.getClientTodoDebug = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type = 'summary' } = req.query;
    
    let data;
    
    switch (type) {
      case 'summary':
        data = await getClientTodosSummary(clientId);
        break;
        
      case 'completed':
        data = await getCompletedTodosWithInfo(clientId);
        break;
        
      case 'all':
        data = await getClientTodos(clientId);
        break;
        
      case 'next':
        data = await getNextClientTodo(clientId);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid type parameter. Use summary, completed, all, or next'
        });
    }
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    logger.error(`Debug controller error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get debug information about agent conversation
 * @route   GET /api/debug/conversation/:conversationId
 * @access  Private (Admin only)
 */
exports.getConversationDebug = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // This is a placeholder for future implementation
    // You can add code to retrieve conversation details, messages, etc.
    
    res.status(200).json({
      success: true,
      message: 'Conversation debug endpoint (not yet implemented)',
      conversationId
    });
  } catch (error) {
    logger.error(`Debug controller error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
