const mongoose = require('mongoose');

/**
 * Memory Schema
 * Stores client-specific information for cross-conversation awareness
 */
const MemorySchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  type: {
    type: String,
    enum: ['project_info', 'technical', 'design', 'business', 'preference', 'constraint', 'general'],
    required: true,
    index: true
  },
  key: {
    type: String,
    required: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  source: {
    type: String,
    enum: ['conversation', 'todo', 'manual'],
    default: 'conversation'
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'source === "conversation" ? "Conversation" : "Todo"'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient lookups
MemorySchema.index({ client: 1, type: 1, key: 1 }, { unique: true });

/**
 * Static method to create or update a memory
 * @param {Object} memoryData - The memory data
 * @returns {Promise<Object>} - The created or updated memory
 */
MemorySchema.statics.createOrUpdate = async function(memoryData) {
  const { client, type, key, value } = memoryData;
  
  // Find existing memory
  const existingMemory = await this.findOne({ client, type, key });
  
  if (existingMemory) {
    // Update existing memory
    existingMemory.value = value;
    existingMemory.confidence = memoryData.confidence || existingMemory.confidence;
    existingMemory.updatedAt = new Date();
    
    if (memoryData.source) existingMemory.source = memoryData.source;
    if (memoryData.sourceId) existingMemory.sourceId = memoryData.sourceId;
    
    await existingMemory.save();
    return existingMemory;
  } else {
    // Create new memory
    return await this.create(memoryData);
  }
};

/**
 * Static method to get memories by client
 * @param {string} clientId - The client ID
 * @param {string} type - Optional memory type filter
 * @returns {Promise<Array>} - Array of memories
 */
MemorySchema.statics.getMemories = async function(clientId, type = null) {
  const query = { client: clientId };
  if (type) query.type = type;
  
  return await this.find(query).sort({ updatedAt: -1 }).lean();
};

/**
 * Static method to extract memories from conversation
 * @param {string} conversationId - The conversation ID
 * @param {string} clientId - The client ID
 * @param {string} organizationId - The organization ID
 * @param {Array} messages - Array of conversation messages
 * @returns {Promise<Array>} - Array of created/updated memories
 */
MemorySchema.statics.extractFromConversation = async function(conversationId, clientId, organizationId, messages) {
  // This would be implemented with LLM-based extraction
  // For now, we'll leave it as a placeholder
  return [];
};

module.exports = mongoose.model('Memory', MemorySchema);
