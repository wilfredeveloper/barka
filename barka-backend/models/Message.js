const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: String,
      enum: ["user", "agent"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // For storing structured data like tool calls or results
    structuredContent: {
      type: Object,
      default: null,
    },
    // For tracking if this message contains important information
    isImportant: {
      type: Boolean,
      default: false,
    },
    // For tracking if this message has been read by the organization admin
    readByAdmin: {
      type: Boolean,
      default: false,
    },
    // For tracking if this message contains a document upload
    hasAttachment: {
      type: Boolean,
      default: false,
    },
    // Reference to attached documents
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
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
MessageSchema.index({ conversation: 1, createdAt: -1 });

// Method to mark message as important
MessageSchema.methods.markAsImportant = async function() {
  this.isImportant = true;
  return await this.save();
};

// Method to mark message as read by admin
MessageSchema.methods.markAsReadByAdmin = async function() {
  this.readByAdmin = true;
  return await this.save();
};

// Static method to get message statistics
MessageSchema.statics.getStats = async function(filter = {}) {
  return await this.aggregate([
    {
      $match: filter
    },
    {
      $group: {
        _id: "$sender",
        count: { $sum: 1 },
        avgContentLength: { $avg: { $strLenCP: "$content" } }
      }
    }
  ]);
};

module.exports = mongoose.model("Message", MessageSchema);
