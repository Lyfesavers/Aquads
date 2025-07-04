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
  // Payment related fields
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  txSignature: {
    type: String,
    default: null
  },
  paymentChain: {
    type: String,
    default: null
  },
  chainSymbol: {
    type: String,
    default: null
  },
  chainAddress: {
    type: String,
    default: null
  },
  // Points payment related fields
  paidWithPoints: {
    type: Boolean,
    default: false
  },
  pointsSpent: {
    type: Number,
    default: 0
  },
  completions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    twitterUsername: {
      type: String,
      required: true // We validate this in the route instead
    },
    tweetUrl: String,
    tweetId: {
      type: String,
      default: null
    },
    verificationCode: String,
    verificationMethod: {
      type: String,
      enum: ['automatic', 'manual', 'tweet_embed', 'client_side', 'iframe_interaction'],
      default: 'automatic'
    },
    verified: {
      type: Boolean,
      default: false
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    pointsAwarded: {
      type: Boolean,
      default: false
    },
    ipAddress: {
      type: String,
      default: null
    },
    iframeVerified: {
      type: Boolean,
      default: false
    },
    iframeInteractions: {
      type: Number,
      default: 0
    },
    verificationNote: String,
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
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