const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      default: 'landing_page',
      enum: ['landing_page', 'referral', 'social_media', 'other'],
    },
    isNotified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: {
      type: Date,
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      referrer: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance (email uniqueness already handled by unique: true in schema)
WaitlistSchema.index({ createdAt: -1 });

// Method to get full name
WaitlistSchema.methods.getFullName = function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.email;
};

// Static method to get waitlist stats
WaitlistSchema.statics.getStats = async function () {
  const total = await this.countDocuments();
  const notified = await this.countDocuments({ isNotified: true });
  const pending = total - notified;
  
  return {
    total,
    notified,
    pending,
  };
};

module.exports = mongoose.model('Waitlist', WaitlistSchema);
