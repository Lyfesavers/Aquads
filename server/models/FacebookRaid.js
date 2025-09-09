const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const facebookRaidSchema = new Schema({
  postId: {
    type: String,
    required: true
  },
  postUrl: {
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
    facebookUsername: {
      type: String,
      required: true
    },
    postUrl: String,
    postId: {
      type: String,
      default: null
    },
    verificationCode: String,
    verificationMethod: {
      type: String,
      enum: ['automatic', 'manual', 'post_embed', 'client_side', 'iframe_interaction', 'telegram_bot'],
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

// Add performance indexes for common queries
facebookRaidSchema.index({ active: 1, createdAt: -1 }); // For main raids listing
facebookRaidSchema.index({ createdBy: 1 }); // For user's raids
facebookRaidSchema.index({ postId: 1 }); // For post ID lookups
facebookRaidSchema.index({ 'completions.userId': 1 }); // For user completion lookups
facebookRaidSchema.index({ 'completions.verified': 1 }); // For verified completions
facebookRaidSchema.index({ 'completions.approvalStatus': 1 }); // For approval status filtering

// Extract post ID from URL if only URL is provided
facebookRaidSchema.pre('save', function(next) {
  if (!this.postId && this.postUrl) {
    // Extract post ID from Facebook URL - try multiple patterns
    let matches = this.postUrl.match(/\/posts\/(\d+)/);
    if (!matches) {
      matches = this.postUrl.match(/\/permalink\/(\d+)/);
    }
    if (!matches) {
      matches = this.postUrl.match(/\/share\/p\/([a-zA-Z0-9]+)/);
    }
    if (!matches) {
      matches = this.postUrl.match(/\/share\/v\/([a-zA-Z0-9]+)/);
    }
    if (!matches) {
      matches = this.postUrl.match(/\/story\.php\?story_fbid=(\d+)/);
    }
    if (!matches) {
      matches = this.postUrl.match(/\/photo\.php\?fbid=(\d+)/);
    }
    if (matches && matches[1]) {
      this.postId = matches[1];
    }
  }
  next();
});



module.exports = mongoose.model('FacebookRaid', facebookRaidSchema);
