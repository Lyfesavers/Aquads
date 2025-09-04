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

// Add database indexes for better query performance
bumpRequestSchema.index({ status: 1, createdAt: -1 }); // For main bump requests query
bumpRequestSchema.index({ owner: 1, createdAt: -1 }); // For user's bump requests
bumpRequestSchema.index({ adId: 1, status: 1 }); // For ad-specific bump requests
bumpRequestSchema.index({ processedBy: 1, createdAt: -1 }); // For admin processing queries

module.exports = mongoose.model('BumpRequest', bumpRequestSchema); 