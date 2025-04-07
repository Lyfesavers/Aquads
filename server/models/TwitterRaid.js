const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const twitterRaidSchema = new Schema({
  tweetId: {
    type: String,
    required: true
  },
  tweetUrl: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 50
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completions: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      twitterUsername: {
        type: String,
        required: true
      },
      tweetUrl: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      ipAddress: {
        type: String,
        default: null
      },
      ownershipVerified: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      verifiedAt: Date,
      verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      rejectionReason: String
    }
  ],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Extract tweet ID from URL if only URL is provided
twitterRaidSchema.pre('save', function(next) {
  if (!this.tweetId && this.tweetUrl) {
    // Extract tweet ID from URL
    const matches = this.tweetUrl.match(/\/status\/(\d+)/);
    if (matches && matches[1]) {
      this.tweetId = matches[1];
    }
  }
  next();
});

module.exports = mongoose.model('TwitterRaid', twitterRaidSchema); 