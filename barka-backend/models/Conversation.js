const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: function() {
        // Client is required for client conversations, optional for admin conversations
        return this.conversationType === "client";
      },
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    conversationType: {
      type: String,
      enum: ["client", "admin"],
      default: "client",
      required: true,
    },
    title: {
      type: String,
      default: "New Conversation",
    },
    titleGenerated: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
    summary: {
      type: String,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Object,
      default: {},
    },
    tags: {
      type: [String],
      default: [],
    },
    // Store the memory/context for LangChain
    memoryContext: {
      type: Object,
      default: {},
    },
    // Track key information extracted during the conversation
    extractedInformation: {
      type: Object,
      default: {},
    },
    // ADK Session Management Fields
    adkSessionId: {
      type: String,
      index: true, // For efficient lookups
      sparse: true, // Allow null values but index non-null ones
    },
    adkUserId: {
      type: String,
      index: true, // Store the user ID used in ADK
      sparse: true,
    },
    adkAppName: {
      type: String,
      default: "orchestrator", // Default to orchestrator agent
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for getting all messages in this conversation
ConversationSchema.virtual("messages", {
  ref: "Message",
  localField: "_id",
  foreignField: "conversation",
});

// Method to get the latest messages (with pagination)
ConversationSchema.methods.getMessages = async function(limit = 50, page = 1) {
  const skip = (page - 1) * limit;
  
  return await mongoose.model("Message").find({ conversation: this._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

// Static method to get conversation statistics for an organization
ConversationSchema.statics.getOrganizationStats = async function(organizationId) {
  const stats = await this.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(organizationId) }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  const messageCountByConversation = await mongoose.model("Message").aggregate([
    {
      $lookup: {
        from: "conversations",
        localField: "conversation",
        foreignField: "_id",
        as: "conversationData"
      }
    },
    {
      $unwind: "$conversationData"
    },
    {
      $match: {
        "conversationData.organization": new mongoose.Types.ObjectId(organizationId)
      }
    },
    {
      $group: {
        _id: "$conversation",
        messageCount: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        avgMessagesPerConversation: { $avg: "$messageCount" },
        totalMessages: { $sum: "$messageCount" }
      }
    }
  ]);

  return {
    statusStats: stats,
    messageStats: messageCountByConversation.length > 0 ? messageCountByConversation[0] : { avgMessagesPerConversation: 0, totalMessages: 0 },
    totalConversations: await this.countDocuments({ organization: organizationId })
  };
};

module.exports = mongoose.model("Conversation", ConversationSchema);
