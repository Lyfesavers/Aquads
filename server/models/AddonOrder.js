const mongoose = require('mongoose');

const addonOrderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  // Reference to the existing project
  projectId: {
    type: String,
    required: true
  },
  projectTitle: {
    type: String,
    required: true
  },
  projectLogo: {
    type: String,
    default: null
  },
  // Owner info
  owner: {
    type: String,
    required: true
  },
  // Selected add-on packages
  selectedAddons: {
    type: [String],
    required: true
  },
  // Payment info
  totalAmount: {
    type: Number,
    required: true
  },
  txSignature: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    default: 'crypto' // 'crypto' or 'paypal'
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
  // Discount info
  appliedDiscountCode: {
    type: String,
    default: null
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  // Status for admin approval
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  rejectionReason: {
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
  }
});

// Indexes
addonOrderSchema.index({ status: 1, createdAt: -1 });
addonOrderSchema.index({ owner: 1 });
addonOrderSchema.index({ projectId: 1 });

module.exports = mongoose.model('AddonOrder', addonOrderSchema);

