const mongoose = require("mongoose");

const TrashSchema = new mongoose.Schema(
  {
    // Original document data (stored as mixed type to accommodate any collection)
    originalData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    
    // Metadata about the deletion
    originalCollection: {
      type: String,
      required: true,
      enum: ["projects", "tasks", "team_members", "documents"], // Extensible for future use
    },
    originalId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    
    // Deletion tracking
    deleted_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Auto-cleanup scheduling (7 days from deletion)
    auto_delete_date: {
      type: Date,
      required: true,
      default: function() {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      },
    },
    
    // Organization scoping for multi-tenant support
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    
    // Optional deletion reason
    deletion_reason: {
      type: String,
      maxlength: 500,
    },
    
    // Recovery tracking
    recovered_at: {
      type: Date,
    },
    recovered_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ["deleted", "recovered", "permanently_deleted"],
      default: "deleted",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and auto-cleanup
TrashSchema.index({ auto_delete_date: 1 }); // For auto-cleanup queries
TrashSchema.index({ organization: 1, originalCollection: 1 }); // For organization-scoped queries
TrashSchema.index({ originalId: 1, originalCollection: 1 }); // For finding specific items
TrashSchema.index({ deleted_by: 1 }); // For user-specific queries
TrashSchema.index({ status: 1 }); // For status filtering

// Static method to find items ready for permanent deletion
TrashSchema.statics.findExpiredItems = function() {
  return this.find({
    auto_delete_date: { $lte: new Date() },
    status: "deleted"
  });
};

// Static method to recover an item
TrashSchema.statics.recoverItem = async function(trashId, userId) {
  const trashItem = await this.findById(trashId);
  if (!trashItem || trashItem.status !== "deleted") {
    throw new Error("Item not found or already recovered");
  }
  
  trashItem.status = "recovered";
  trashItem.recovered_at = new Date();
  trashItem.recovered_by = userId;
  
  return await trashItem.save();
};

// Instance method to check if item is expired
TrashSchema.methods.isExpired = function() {
  return this.auto_delete_date <= new Date();
};

// Instance method to get days until auto-deletion
TrashSchema.methods.getDaysUntilDeletion = function() {
  const now = new Date();
  const diffTime = this.auto_delete_date - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model("Trash", TrashSchema);
