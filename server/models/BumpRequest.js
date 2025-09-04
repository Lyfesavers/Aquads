const mongoose = require('mongoose');

const bumpRequestSchema = new mongoose.Schema({
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
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  duration: {
    type: Number,
    required: true,
    default: 24 * 60 * 60 * 1000 // Default to 24 hours in milliseconds
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  // Discount code fields
  appliedDiscountCode: {
    type: String,
    default: null
  },
  discountAmount: {
    type: Number,
    default: 0
  }
});

// Performance indexes for common queries
bumpRequestSchema.index({ adId: 1 }); // For ad-specific bump requests
bumpRequestSchema.index({ owner: 1, createdAt: -1 }); // For owner's bump requests
bumpRequestSchema.index({ status: 1, createdAt: -1 }); // For status-based queries
bumpRequestSchema.index({ status: 1, processedAt: 1 }); // For processing status queries
bumpRequestSchema.index({ createdAt: -1 }); // For creation date sorting
bumpRequestSchema.index({ processedAt: -1 }); // For processing date sorting


module.exports = mongoose.model('BumpRequest', bumpRequestSchema); 