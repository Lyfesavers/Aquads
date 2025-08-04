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

module.exports = mongoose.model('BumpRequest', bumpRequestSchema); 