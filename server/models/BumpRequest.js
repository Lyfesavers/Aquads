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
    required: function() {
      return this.paymentMethod === 'crypto';
    }
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
  // Payment method field
  paymentMethod: {
    type: String,
    enum: ['crypto', 'nowpayments'],
    default: 'crypto'
  },
  // NOWPayments specific fields
  nowPaymentsData: {
    paymentId: {
      type: String,
      default: null
    },
    paymentStatus: {
      type: String,
      default: null
    },
    payUrl: {
      type: String,
      default: null
    },
    priceAmount: {
      type: Number,
      default: null
    },
    priceCurrency: {
      type: String,
      default: null
    },
    payCurrency: {
      type: String,
      default: null
    },
    payAmount: {
      type: Number,
      default: null
    },
    orderId: {
      type: String,
      default: null
    },
    paymentHash: {
      type: String,
      default: null
    }
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
  }
});

module.exports = mongoose.model('BumpRequest', bumpRequestSchema); 