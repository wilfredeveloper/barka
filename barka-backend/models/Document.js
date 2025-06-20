const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    fileType: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    // For storing the extracted text content from the document
    extractedText: {
      type: String,
    },
    // For storing document processing status
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    // For storing document categorization
    category: {
      type: String,
      enum: ["requirements", "design", "contract", "reference", "other"],
      default: "other",
    },
    // For storing document tags
    tags: {
      type: [String],
      default: [],
    },
    // For storing document metadata
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
DocumentSchema.index({ client: 1, createdAt: -1 });
DocumentSchema.index({ organization: 1, createdAt: -1 });
DocumentSchema.index({ conversation: 1, createdAt: -1 });

// Static method to get document statistics for an organization
DocumentSchema.statics.getOrganizationStats = async function(organizationId) {
  const stats = await this.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(organizationId) }
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        totalSize: { $sum: "$fileSize" }
      }
    }
  ]);

  const fileTypeStats = await this.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(organizationId) }
    },
    {
      $group: {
        _id: "$fileType",
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    categoryStats: stats,
    fileTypeStats: fileTypeStats,
    totalDocuments: await this.countDocuments({ organization: organizationId }),
    totalSize: (await this.aggregate([
      {
        $match: { organization: new mongoose.Types.ObjectId(organizationId) }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$fileSize" }
        }
      }
    ]))[0]?.total || 0
  };
};

module.exports = mongoose.model("Document", DocumentSchema);
