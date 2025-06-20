const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    // Core identification
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false, // Optional - tasks can exist at organization level
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Task name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Task description is required"],
      trim: true,
    },
    
    // Task status and priority
    status: {
      type: String,
      enum: ["not_started", "in_progress", "blocked", "under_review", "completed", "cancelled"],
      default: "not_started",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    complexity: {
      type: String,
      enum: ["simple", "medium", "complex", "very_complex"],
      default: "medium",
    },
    
    // Assignment and scheduling
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
    },
    assignedToName: {
      type: String, // Denormalized for quick access
      trim: true,
    },
    dueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    
    // Time tracking
    estimatedHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Progress tracking
    progress: {
      completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      timeSpent: {
        type: Number,
        default: 0,
      },
      remainingWork: {
        type: Number,
        default: 0,
      },
    },
    
    // Dependencies and relationships
    dependsOn: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    }],
    blockedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    }],
    subtasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    }],
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    
    // Requirements and acceptance criteria
    acceptanceCriteria: [{
      description: {
        type: String,
        required: true,
      },
      isCompleted: {
        type: Boolean,
        default: false,
      },
      completedAt: Date,
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    }],
    requirements: [{
      type: String,
      trim: true,
    }],
    deliverables: [{
      name: String,
      description: String,
      isDelivered: {
        type: Boolean,
        default: false,
      },
      deliveredAt: Date,
    }],
    
    // Comments and updates
    comments: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
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
      comment: String,
    }],
    
    // Metadata and customization
    tags: [{
      type: String,
      trim: true,
    }],
    category: {
      type: String,
      trim: true,
    },
    customFields: {
      type: Object,
      default: {},
    },
    
    // Integration points
    linkedDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    }],
    calendarEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduledEvent",
    },
    
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

// Virtual for calculating days remaining
TaskSchema.virtual("daysRemaining").get(function() {
  if (!this.dueDate) return null;
  const today = new Date();
  const timeDiff = this.dueDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for deadline status
TaskSchema.virtual("deadlineStatus").get(function() {
  const daysRemaining = this.daysRemaining;
  if (daysRemaining === null) return "no_deadline";
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining === 0) return "due_today";
  if (daysRemaining <= 3) return "due_soon";
  return "on_track";
});

// Virtual for completion status
TaskSchema.virtual("isCompleted").get(function() {
  return this.status === "completed";
});

// Virtual for blocked status
TaskSchema.virtual("isBlocked").get(function() {
  return this.status === "blocked" || (this.blockedBy && this.blockedBy.length > 0);
});

// Index for efficient queries
TaskSchema.index({ client: 1, organization: 1 });
TaskSchema.index({ project: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ priority: 1 });

// Static method to get task statistics for a project
TaskSchema.statics.getProjectStats = async function(projectId) {
  const stats = await this.aggregate([
    {
      $match: { project: new mongoose.Types.ObjectId(projectId) }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgCompletion: { $avg: "$progress.completionPercentage" },
        totalEstimatedHours: { $sum: "$estimatedHours" },
        totalActualHours: { $sum: "$actualHours" }
      }
    }
  ]);

  const priorityStats = await this.aggregate([
    {
      $match: { project: new mongoose.Types.ObjectId(projectId) }
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
    totalTasks: await this.countDocuments({ project: projectId })
  };
};

// Static method to get client task overview
TaskSchema.statics.getClientStats = async function(clientId) {
  const stats = await this.aggregate([
    {
      $match: { client: new mongoose.Types.ObjectId(clientId) }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgCompletion: { $avg: "$progress.completionPercentage" }
      }
    }
  ]);

  return {
    statusStats: stats,
    totalTasks: await this.countDocuments({ client: clientId })
  };
};

// Instance method to update status with history
TaskSchema.methods.updateStatus = function(newStatus, changedBy, comment = "") {
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    changedBy: changedBy,
    comment: comment
  });

  // Update current status
  this.status = newStatus;

  // Set completion date if completed
  if (newStatus === "completed") {
    this.completedAt = new Date();
    this.progress.completionPercentage = 100;
  }

  this.lastModifiedBy = changedBy;
  return this.save();
};

// Instance method to add comment
TaskSchema.methods.addComment = function(author, content) {
  this.comments.push({
    author: author,
    content: content,
    createdAt: new Date()
  });

  return this.save();
};

// Function to update team member metrics
async function updateTeamMemberMetrics(teamMemberId) {
  if (!teamMemberId) return;

  try {
    const TeamMember = mongoose.model("TeamMember");
    const teamMember = await TeamMember.findById(teamMemberId);
    if (!teamMember) return;

    console.log(`🔄 Auto-updating metrics for ${teamMember.name}...`);

    // Update workload metrics
    await teamMember.updateWorkload();

    // Calculate performance metrics based on completed tasks
    const Task = mongoose.model("Task");
    const completedTasks = await Task.find({
      assignedTo: teamMemberId,
      status: 'completed'
    });

    if (completedTasks.length > 0) {
      // Calculate average completion time
      const tasksWithTime = completedTasks.filter(task =>
        task.actualHours && task.actualHours > 0
      );
      const averageCompletionTime = tasksWithTime.length > 0
        ? tasksWithTime.reduce((sum, task) => sum + task.actualHours, 0) / tasksWithTime.length
        : 0;

      // Calculate on-time delivery rate
      const tasksWithDueDate = completedTasks.filter(task => task.dueDate);
      const onTimeDeliveries = tasksWithDueDate.filter(task =>
        task.completedAt && task.completedAt <= task.dueDate
      );
      const onTimeDeliveryRate = tasksWithDueDate.length > 0
        ? (onTimeDeliveries.length / tasksWithDueDate.length) * 100
        : 100;

      // Update performance metrics
      teamMember.performance.tasksCompleted = completedTasks.length;
      teamMember.performance.averageTaskCompletionTime = Math.round(averageCompletionTime * 100) / 100;
      teamMember.performance.onTimeDeliveryRate = Math.round(onTimeDeliveryRate * 100) / 100;

      await teamMember.save();
    }

    console.log(`   ✅ Updated: Current Tasks: ${teamMember.workload.currentTasks}, Completed: ${teamMember.performance.tasksCompleted}, Utilization: ${teamMember.workload.utilizationPercentage}%`);

  } catch (error) {
    console.error(`❌ Error updating team member metrics: ${error.message}`);
  }
}

// Pre-save hook to track changes
TaskSchema.pre('save', function(next) {
  // Store original values for comparison in post-save
  if (this.isModified('assignedTo') || this.isModified('status') || this.isModified('estimatedHours')) {
    this._wasModified = {
      assignedTo: this.isModified('assignedTo'),
      status: this.isModified('status'),
      estimatedHours: this.isModified('estimatedHours'),
      originalAssignedTo: this.isModified('assignedTo') ? this._original?.assignedTo : this.assignedTo,
      originalStatus: this.isModified('status') ? this._original?.status : this.status
    };
  }
  next();
});

// Post-save hook to update team member metrics
TaskSchema.post('save', async function(doc) {
  try {
    if (doc._wasModified) {
      const { assignedTo, status, estimatedHours, originalAssignedTo, originalStatus } = doc._wasModified;

      // If assignedTo changed, update both old and new assignees
      if (assignedTo) {
        if (originalAssignedTo && originalAssignedTo.toString() !== doc.assignedTo?.toString()) {
          await updateTeamMemberMetrics(originalAssignedTo);
        }
        if (doc.assignedTo) {
          await updateTeamMemberMetrics(doc.assignedTo);
        }
      }
      // If status or estimatedHours changed, update current assignee
      else if ((status || estimatedHours) && doc.assignedTo) {
        await updateTeamMemberMetrics(doc.assignedTo);
      }

      // Clear the modification tracking
      delete doc._wasModified;
    }
  } catch (error) {
    console.error('❌ Error in post-save hook:', error.message);
  }
});

// Post-remove hook to update team member metrics when task is deleted
TaskSchema.post('remove', async function(doc) {
  try {
    if (doc.assignedTo) {
      await updateTeamMemberMetrics(doc.assignedTo);
    }
  } catch (error) {
    console.error('❌ Error in post-remove hook:', error.message);
  }
});

module.exports = mongoose.model("Task", TaskSchema);
