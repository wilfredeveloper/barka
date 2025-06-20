/**
 * WebSocket server for streaming agent responses
 */
const WebSocket = require('ws');
const logger = require('./logger');

let wss = null;
const clients = new Map();

/**
 * Initialize the WebSocket server
 * @param {Object} server - HTTP server instance
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws, req) => {
    const clientId = req.url.split('/').pop();
    logger.info(`WebSocket connection established for client: ${clientId}`);
    
    // Store the client connection
    if (!clients.has(clientId)) {
      clients.set(clientId, new Set());
    }
    clients.get(clientId).add(ws);
    
    // Set up event handlers
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        logger.debug(`Received message from client ${clientId}:`, data);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      logger.info(`WebSocket connection closed for client: ${clientId}`);
      // Remove the client connection
      if (clients.has(clientId)) {
        clients.get(clientId).delete(ws);
        if (clients.get(clientId).size === 0) {
          clients.delete(clientId);
        }
      }
    });
    
    // Send a welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Barka agent'
    }));
  });
  
  logger.info('WebSocket server initialized');
  return wss;
}

/**
 * Send a message to all clients for a specific clientId
 * @param {string} clientId - The client ID
 * @param {Object} message - The message to send
 */
function sendToClient(clientId, message) {
  if (clients.has(clientId)) {
    const clientSockets = clients.get(clientId);
    clientSockets.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

/**
 * Send a message to all clients for a specific conversation
 * @param {string} conversationId - The conversation ID
 * @param {Object} message - The message to send
 */
function sendToConversation(conversationId, message) {
  // In this implementation, we're using clientId as the key
  // But we could also use conversationId if needed
  sendToClient(conversationId, message);
}

/**
 * Stream agent thoughts to the client
 * @param {string} conversationId - The conversation ID
 * @param {string} thought - The agent's thought
 */
function streamAgentThought(conversationId, thought) {
  sendToConversation(conversationId, {
    type: 'agent_thought',
    conversationId,
    content: thought,
    timestamp: new Date().toISOString()
  });
}

/**
 * Stream agent tool call to the client
 * @param {string} conversationId - The conversation ID
 * @param {Object} toolCall - The tool call details
 */
function streamToolCall(conversationId, toolCall) {
  sendToConversation(conversationId, {
    type: 'tool_call',
    conversationId,
    toolName: toolCall.name,
    toolInput: toolCall.input || {},
    timestamp: new Date().toISOString()
  });
}

/**
 * Stream agent tool result to the client
 * @param {string} conversationId - The conversation ID
 * @param {string} toolName - The name of the tool
 * @param {string} result - The tool result
 */
function streamToolResult(conversationId, toolName, result) {
  sendToConversation(conversationId, {
    type: 'tool_result',
    conversationId,
    toolName,
    result,
    timestamp: new Date().toISOString()
  });
}

/**
 * Stream agent response to the client
 * @param {string} conversationId - The conversation ID
 * @param {string} content - The response content
 * @param {boolean} isComplete - Whether this is the complete response
 */
function streamAgentResponse(conversationId, content, isComplete = false) {
  sendToConversation(conversationId, {
    type: isComplete ? 'agent_response_complete' : 'agent_response_chunk',
    conversationId,
    content,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  initWebSocket,
  sendToClient,
  sendToConversation,
  streamAgentThought,
  streamToolCall,
  streamToolResult,
  streamAgentResponse
};
