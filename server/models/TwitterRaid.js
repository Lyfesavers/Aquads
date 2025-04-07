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
  completions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    twitterUsername: String,
    tweetUrl: String,
    verificationCode: String,
    verificationMethod: {
      type: String,
      enum: ['automatic', 'manual', 'tweet_embed', 'client_side'],
      default: 'automatic'
    },
    verified: {
      type: Boolean,
      default: false
    },
    ipAddress: {
      type: String,
      default: null
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