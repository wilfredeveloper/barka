const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    // Core identification
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false, // Optional - projects can exist at organization level
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
    },
    
    // Project status and priority
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    
    // Timeline and scheduling
    startDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    
    // Budget and financial
    budget: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    
    // Project management
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
    },
    
    // Progress tracking
    progress: {
      completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      totalTasks: {
        type: Number,
        default: 0,
      },
      completedTasks: {
        type: Number,
        default: 0,
      },
      inProgressTasks: {
        type: Number,
        default: 0,
      },
      notStartedTasks: {
        type: Number,
        default: 0,
      },
    },
    
    // Relationships
    teamMembers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
    }],
    
    // Document links
    documents: [{
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
      documentType: {
        type: String,
        enum: ["SRS", "CONTRACT", "PROPOSAL", "TECHNICAL_SPEC", "OTHER"],
      },
      linkedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Milestones
    milestones: [{
      name: {
        type: String,
        required: true,
      },
      description: String,
      dueDate: Date,
      status: {
        type: String,
        enum: ["not_started", "in_progress", "completed"],
        default: "not_started",
      },
      completedAt: Date,
    }],
    
    // Metadata and customization
    tags: [{
      type: String,
      trim: true,
    }],
    customFields: {
      type: Object,
      default: {},
    },
    
    // Integration points
    sourceDocument: {
      documentId: mongoose.Schema.Types.ObjectId,
      documentType: String,
    },
    linkedDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    }],
    calendarEvents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduledEvent",
    }],

    // Status history for audit trail
    statusHistory: [{
      status: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      reason: String,
    }],

    // Status tracking
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    
    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for tasks
ProjectSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
});

// Virtual for calculating days remaining
ProjectSchema.virtual("daysRemaining").get(function() {
  if (!this.dueDate) return null;
  const today = new Date();
  const timeDiff = this.dueDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for deadline status
ProjectSchema.virtual("deadlineStatus").get(function() {
  const daysRemaining = this.daysRemaining;
  if (daysRemaining === null) return "unknown";
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining === 0) return "due_today";
  if (daysRemaining <= 7) return "due_soon";
  return "on_track";
});

// Index for efficient queries
ProjectSchema.index({ client: 1, organization: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ dueDate: 1 });
ProjectSchema.index({ "teamMembers": 1 });

// Static method to get project statistics for a client
ProjectSchema.statics.getClientStats = async function(clientId) {
  const stats = await this.aggregate([
    {
      $match: { client: new mongoose.Types.ObjectId(clientId) }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgCompletion: { $avg: "$progress.completionPercentage" },
        totalBudget: { $sum: "$budget" }
      }
    }
  ]);

  return {
    statusStats: stats,
    totalProjects: await this.countDocuments({ client: clientId })
  };
};

// Static method to get organization project overview
ProjectSchema.statics.getOrganizationStats = async function(organizationId) {
  const stats = await this.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(organizationId) }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgCompletion: { $avg: "$progress.completionPercentage" },
        totalBudget: { $sum: "$budget" }
      }
    }
  ]);

  const priorityStats = await this.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(organizationId) }
    },
    {
      $group: {
        _id: "$priority",
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    statusStats: stats,
    priorityStats: priorityStats,
    totalProjects: await this.countDocuments({ organization: organizationId })
  };
};

// Instance method to update progress
ProjectSchema.methods.updateProgress = async function() {
  const Task = mongoose.model("Task");
  const tasks = await Task.find({ project: this._id });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === "completed").length;
  const inProgressTasks = tasks.filter(task => task.status === "in_progress").length;
  const notStartedTasks = tasks.filter(task => task.status === "not_started").length;

  this.progress = {
    completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    totalTasks,
    completedTasks,
    inProgressTasks,
    notStartedTasks
  };

  return this.save();
};

module.exports = mongoose.model("Project", ProjectSchema);
