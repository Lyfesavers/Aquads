const mongoose = require('mongoose');

const voteBoostSchema = new mongoose.Schema({
  adId: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  txSignature: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  // Package details
  packageName: {
    type: String,
    required: true
  },
  votesToAdd: {
    type: Number,
    required: true
  },
  votesAdded: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    required: true
  },
  // Discount info
  originalPrice: {
    type: Number,
    default: null
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  // Telegram group link (required for boost)
  telegramGroupLink: {
    type: String,
    required: true
  },
  // Payment details
  paymentChain: {
    type: String,
    default: 'Solana'
  },
  chainSymbol: {
    type: String,
    default: 'USDC'
  },
  chainAddress: {
    type: String,
    default: null
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  processedBy: {
    type: String,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  // Interval settings (in seconds)
  intervalSeconds: {
    type: Number,
    default: 30
  },
  // Last vote added timestamp (for interval tracking)
  lastVoteAt: {
    type: Date,
    default: null
  }
});

// Performance indexes
voteBoostSchema.index({ adId: 1 }); // For ad-specific lookups
voteBoostSchema.index({ owner: 1, createdAt: -1 }); // For owner's boosts
voteBoostSchema.index({ status: 1, createdAt: -1 }); // For status-based queries
voteBoostSchema.index({ status: 1, lastVoteAt: 1 }); // For active boost processing

module.exports = mongoose.model('VoteBoost', voteBoostSchema);

