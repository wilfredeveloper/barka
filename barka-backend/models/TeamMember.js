const mongoose = require("mongoose");

const TeamMemberSchema = new mongoose.Schema(
  {
    // Core identification
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false, // Optional - team members can exist at organization level
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Team member name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    
    // Role and status
    role: {
      type: String,
      enum: [
        "project_manager",
        "developer",
        "designer", 
        "qa_engineer",
        "business_analyst",
        "stakeholder",
        "client",
        "other"
      ],
      required: true,
    },
    customRole: {
      type: String,
      trim: true,
      required: function() {
        return this.role === "other";
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on_leave"],
      default: "active",
    },
    
    // Contact information
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    
    // Capacity and availability
    capacity: {
      hoursPerWeek: {
        type: Number,
        default: 40,
        min: 0,
        max: 168, // Maximum hours in a week
      },
      availability: {
        type: String,
        enum: ["full_time", "part_time", "contract", "consultant"],
        default: "full_time",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      workingHours: {
        start: {
          type: String, // Format: "09:00"
          default: "09:00",
        },
        end: {
          type: String, // Format: "17:00"
          default: "17:00",
        },
      },
    },
    
    // Skills and expertise
    skills: [{
      type: String,
      trim: true,
    }],
    expertise: [{
      skill: {
        type: String,
        required: true,
        trim: true,
      },
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        required: true,
      },
    }],
    certifications: [{
      name: String,
      issuedBy: String,
      issuedDate: Date,
      expiryDate: Date,
    }],
    
    // Project assignments and workload
    currentProjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    }],
    workload: {
      currentTasks: {
        type: Number,
        default: 0,
      },
      totalHoursAllocated: {
        type: Number,
        default: 0,
      },
      utilizationPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    
    // Performance tracking
    performance: {
      tasksCompleted: {
        type: Number,
        default: 0,
      },
      averageTaskCompletionTime: {
        type: Number, // in hours
        default: 0,
      },
      onTimeDeliveryRate: {
        type: Number, // percentage
        default: 100,
        min: 0,
        max: 100,
      },
      qualityRating: {
        type: Number, // 1-5 scale
        min: 1,
        max: 5,
      },
    },
    
    // Financial information
    hourlyRate: {
      type: Number,
      min: 0,
      validate: {
        validator: function(value) {
          return value === undefined || value === null || (value >= 10 && value <= 500);
        },
        message: 'Hourly rate must be between $10 and $500 per hour'
      }
    },

    // Metadata and customization
    tags: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
      trim: true,
    },
    customFields: {
      type: Object,
      default: {},
    },
    
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
    lastActivity: {
      type: Date,
      default: Date.now,
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

// Virtual for assigned tasks
TeamMemberSchema.virtual("assignedTasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "assignedTo",
});

// Virtual for full role display
TeamMemberSchema.virtual("displayRole").get(function() {
  return this.role === "other" ? this.customRole : this.role.replace("_", " ");
});

// Virtual for availability status
TeamMemberSchema.virtual("availabilityStatus").get(function() {
  if (this.status !== "active") return this.status;
  
  const utilizationPercentage = this.workload.utilizationPercentage;
  if (utilizationPercentage >= 100) return "fully_allocated";
  if (utilizationPercentage >= 80) return "mostly_allocated";
  if (utilizationPercentage >= 50) return "partially_allocated";
  return "available";
});

// Index for efficient queries
TeamMemberSchema.index({ client: 1, organization: 1 });
TeamMemberSchema.index({ email: 1 }, { unique: true });
TeamMemberSchema.index({ role: 1 });
TeamMemberSchema.index({ status: 1 });
TeamMemberSchema.index({ "currentProjects": 1 });

// Static method to get team statistics for a client
TeamMemberSchema.statics.getClientStats = async function(clientId) {
  const stats = await this.aggregate([
    {
      $match: { client: new mongoose.Types.ObjectId(clientId) }
    },
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        avgUtilization: { $avg: "$workload.utilizationPercentage" },
        avgPerformance: { $avg: "$performance.onTimeDeliveryRate" }
      }
    }
  ]);

  const statusStats = await this.aggregate([
    {
      $match: { client: new mongoose.Types.ObjectId(clientId) }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    roleStats: stats,
    statusStats: statusStats,
    totalMembers: await this.countDocuments({ client: clientId })
  };
};

// Static method to get organization team overview
TeamMemberSchema.statics.getOrganizationStats = async function(organizationId) {
  const stats = await this.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(organizationId) }
    },
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        avgUtilization: { $avg: "$workload.utilizationPercentage" }
      }
    }
  ]);

  return {
    roleStats: stats,
    totalMembers: await this.countDocuments({ organization: organizationId })
  };
};

// Instance method to update workload
TeamMemberSchema.methods.updateWorkload = async function() {
  const Task = mongoose.model("Task");
  const tasks = await Task.find({
    assignedTo: this._id,
    status: { $in: ["not_started", "in_progress"] }
  });

  const currentTasks = tasks.length;
  const totalHoursAllocated = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  const utilizationPercentage = Math.min(
    Math.round((totalHoursAllocated / this.capacity.hoursPerWeek) * 100),
    100
  );

  this.workload = {
    currentTasks,
    totalHoursAllocated,
    utilizationPercentage
  };

  return this.save();
};

module.exports = mongoose.model("TeamMember", TeamMemberSchema, "team_members");
