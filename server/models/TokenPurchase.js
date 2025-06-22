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

module.exports = mongoose.model('TokenPurchase', tokenPurchaseSchema); 