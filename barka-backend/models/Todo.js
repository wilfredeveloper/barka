const mongoose = require("mongoose");

/**
 * Todo Schema
 * This model represents a todo item for client onboarding
 * Todos are created dynamically based on project type and organization requirements
 */
const TodoSchema = new mongoose.Schema(
  {
    // The client this todo is for
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    // The organization this todo belongs to
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    // The title/description of the todo
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Detailed description of what information needs to be collected
    description: {
      type: String,
      trim: true,
    },
    // Current status of the todo
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "skipped"],
      default: "pending",
    },
    // Priority level to help with weighted progress calculation
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    // Weight for progress calculation (higher weight = more impact on progress)
    weight: {
      type: Number,
      default: 1,
      min: 0,
      max: 10,
    },
    // The phase this todo belongs to
    phase: {
      type: String,
      enum: ["initial", "requirements", "design", "technical", "financial", "final"],
      default: "initial",
    },
    // Order within the phase (for sequential todos)
    orderInPhase: {
      type: Number,
      default: 0,
    },
    // Dependencies - todos that must be completed before this one
    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Todo",
      },
    ],
    // Information collected for this todo
    collectedInformation: {
      type: Object,
      default: {},
    },
    // Conversation where this todo was completed
    completedInConversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    // When the todo was completed
    completedAt: {
      type: Date,
    },
    // Additional metadata
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
TodoSchema.index({ client: 1, status: 1 });
TodoSchema.index({ client: 1, phase: 1, orderInPhase: 1 });
TodoSchema.index({ organization: 1, createdAt: -1 });

/**
 * Get the next pending todo for a client
 * @returns {Promise<Object>} The next todo to work on
 */
TodoSchema.statics.getNextTodo = async function (clientId) {
  // First try to find an in-progress todo
  let todo = await this.findOne({
    client: clientId,
    status: "in_progress",
  }).sort({ phase: 1, orderInPhase: 1 });

  // If no in-progress todo, find the next pending todo
  if (!todo) {
    todo = await this.findOne({
      client: clientId,
      status: "pending",
    }).sort({ phase: 1, orderInPhase: 1 });
  }

  return todo;
};

/**
 * Calculate the overall progress for a client
 * @param {string} clientId - The client ID
 * @returns {Promise<Object>} Progress information
 */
TodoSchema.statics.calculateProgress = async function (clientId) {
  const todos = await this.find({ client: clientId });
  
  if (todos.length === 0) {
    return { 
      overall: 0, 
      byPhase: {},
      totalTodos: 0,
      completedTodos: 0
    };
  }

  // Calculate weighted progress
  let totalWeight = 0;
  let completedWeight = 0;
  const phaseProgress = {};
  const phaseTotals = {};

  // Initialize phase counters
  todos.forEach(todo => {
    if (!phaseTotals[todo.phase]) {
      phaseTotals[todo.phase] = { total: 0, completed: 0, weight: 0, completedWeight: 0 };
    }
  });

  // Calculate weights and progress
  todos.forEach(todo => {
    const weight = todo.weight;
    totalWeight += weight;
    phaseTotals[todo.phase].total++;
    phaseTotals[todo.phase].weight += weight;

    if (todo.status === "completed") {
      completedWeight += weight;
      phaseTotals[todo.phase].completed++;
      phaseTotals[todo.phase].completedWeight += weight;
    }
  });

  // Calculate progress by phase
  Object.keys(phaseTotals).forEach(phase => {
    const { total, completed, weight, completedWeight } = phaseTotals[phase];
    phaseProgress[phase] = {
      count: { total, completed },
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      weightedPercentage: weight > 0 ? Math.round((completedWeight / weight) * 100) : 0
    };
  });

  // Calculate overall progress
  const overallProgress = totalWeight > 0 
    ? Math.round((completedWeight / totalWeight) * 100) 
    : 0;

  return {
    overall: overallProgress,
    byPhase: phaseProgress,
    totalTodos: todos.length,
    completedTodos: todos.filter(t => t.status === "completed").length
  };
};

/**
 * Mark a todo as completed and update client progress
 * @param {string} todoId - The todo ID
 * @param {string} conversationId - The conversation where it was completed
 * @param {Object} collectedInfo - Information collected for this todo
 * @returns {Promise<Object>} The updated todo
 */
TodoSchema.statics.completeTodo = async function (todoId, conversationId, collectedInfo = {}) {
  const todo = await this.findById(todoId);
  
  if (!todo) {
    throw new Error("Todo not found");
  }
  
  todo.status = "completed";
  todo.completedAt = new Date();
  todo.completedInConversation = conversationId;
  todo.collectedInformation = collectedInfo;
  
  await todo.save();
  
  // Update client progress
  const Client = mongoose.model("Client");
  const progress = await this.calculateProgress(todo.client);
  
  await Client.findByIdAndUpdate(todo.client, {
    onboardingProgress: progress.overall
  });
  
  return todo;
};

module.exports = mongoose.model("Todo", TodoSchema);
