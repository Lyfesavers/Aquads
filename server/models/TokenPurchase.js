const mongoose = require('mongoose');

const tokenPurchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USDC'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['crypto', 'card', 'paypal'],
    default: 'crypto'
  },
  // Payment verification fields (same as other payment systems)
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
  // Admin approval fields
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
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
  transactionHash: {
    type: String,
    default: null
  },
  paymentDetails: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Performance indexes for common queries
tokenPurchaseSchema.index({ userId: 1, createdAt: -1 }); // For user's purchases by date
tokenPurchaseSchema.index({ status: 1, createdAt: -1 }); // For status-based queries
tokenPurchaseSchema.index({ paymentMethod: 1, status: 1 }); // For payment method + status
tokenPurchaseSchema.index({ approvedBy: 1, createdAt: -1 }); // For admin approval queries
tokenPurchaseSchema.index({ txSignature: 1 }); // For transaction signature lookups
tokenPurchaseSchema.index({ amount: -1, createdAt: -1 }); // For amount-based sorting
tokenPurchaseSchema.index({ cost: -1, createdAt: -1 }); // For cost-based sorting
tokenPurchaseSchema.index({ completedAt: -1 }); // For completion date sorting


module.exports = mongoose.model('TokenPurchase', tokenPurchaseSchema); 