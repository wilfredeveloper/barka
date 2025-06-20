const mongoose = require("mongoose");
const { ROLES } = require("./User");

const ClientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    projectType: {
      type: String,
      enum: ["web_development", "mobile_app", "design", "marketing", "other"],
      required: true,
    },
    projectTypeOther: {
      type: String,
      required: function() {
        return this.projectType === "other";
      },
    },
    budget: {
      type: Number,
    },
    timeline: {
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      estimatedDuration: {
        type: String,
        enum: ["1-4_weeks", "1-3_months", "3-6_months", "6+_months"],
      },
    },
    status: {
      type: String,
      enum: ["onboarding", "active", "paused", "completed"],
      default: "onboarding",
    },
    requirements: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
    },
    onboardingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    onboardingCompletedAt: {
      type: Date,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get client statistics for an organization
ClientSchema.statics.getOrganizationStats = async function(organizationId) {
  const stats = await this.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(organizationId) }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgBudget: { $avg: "$budget" },
        avgOnboardingProgress: { $avg: "$onboardingProgress" }
      }
    }
  ]);

  const projectTypeStats = await this.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(organizationId) }
    },
    {
      $group: {
        _id: "$projectType",
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    statusStats: stats,
    projectTypeStats: projectTypeStats,
    totalClients: await this.countDocuments({ organization: organizationId })
  };
};

module.exports = mongoose.model("Client", ClientSchema);
