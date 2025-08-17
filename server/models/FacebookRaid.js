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

// Extract post ID from URL if only URL is provided
facebookRaidSchema.pre('save', function(next) {
  if (!this.postId && this.postUrl) {
    // Extract post ID from various Facebook URL formats
    let postId = null;
    
    // Handle /share/p/ format
    const shareMatch = this.postUrl.match(/\/share\/p\/([^\/]+)/);
    if (shareMatch && shareMatch[1]) {
      postId = shareMatch[1];
    }
    // Handle /posts/ format
    else {
      const postsMatch = this.postUrl.match(/\/posts\/(\d+)/);
      if (postsMatch && postsMatch[1]) {
        postId = postsMatch[1];
      }
    }
    
    if (postId) {
      this.postId = postId;
    }
  }
  next();
});

module.exports = mongoose.model('FacebookRaid', facebookRaidSchema);
