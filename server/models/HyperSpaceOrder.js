const mongoose = require('mongoose');

const hyperSpaceOrderSchema = new mongoose.Schema({
  // Unique order ID for Aquads
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  
  // User who placed the order
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  
  // Twitter Space details
  spaceUrl: {
    type: String,
    required: true
  },
  
  // Package details
  listenerCount: {
    type: Number,
    required: true,
    enum: [100, 200, 500, 1000, 2500, 5000]
  },
  duration: {
    type: Number,
    required: true,
    enum: [30, 60, 120] // minutes
  },
  
  // Pricing
  socialplugCost: {
    type: Number,
    required: true
  },
  customerPrice: {
    type: Number,
    required: true
  },
  profit: {
    type: Number,
    required: true
  },
  
  // Payment details
  paymentMethod: {
    type: String,
    enum: ['crypto', 'paypal'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
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
  paypalOrderId: {
    type: String,
    default: null
  },
  
  // Socialplug order details
  socialplugOrderId: {
    type: String,
    default: null
  },
  socialplugStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'processing', 'completed', 'partial', 'canceled', 'refunded', 'failed', null],
    default: null
  },
  socialplugCharge: {
    type: Number,
    default: null
  },
  
  // Order status
  status: {
    type: String,
    enum: ['awaiting_payment', 'payment_received', 'pending_approval', 'processing', 'delivering', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'awaiting_payment'
  },
  
  // Admin notes for manual processing
  adminNotes: {
    type: String,
    default: null
  },
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  
  // Error tracking
  errorMessage: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  paymentReceivedAt: {
    type: Date,
    default: null
  },
  socialplugOrderedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  
  // Discount code support
  discountCode: {
    type: String,
    default: null
  },
  discountAmount: {
    type: Number,
    default: 0
  }
});

// Indexes for efficient queries
// Note: orderId already has unique:true which creates an index
hyperSpaceOrderSchema.index({ userId: 1, createdAt: -1 });
hyperSpaceOrderSchema.index({ username: 1 });
hyperSpaceOrderSchema.index({ status: 1 });
hyperSpaceOrderSchema.index({ socialplugOrderId: 1 });
hyperSpaceOrderSchema.index({ createdAt: -1 });

// Virtual for duration label
hyperSpaceOrderSchema.virtual('durationLabel').get(function() {
  const labels = { 30: '30 Minutes', 60: '1 Hour', 120: '2 Hours' };
  return labels[this.duration] || `${this.duration} Minutes`;
});

// Method to check if order can be retried
hyperSpaceOrderSchema.methods.canRetry = function() {
  return this.status === 'failed' && this.retryCount < 3;
};

// Static method to generate unique order ID
hyperSpaceOrderSchema.statics.generateOrderId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `HS-${timestamp}-${random}`.toUpperCase();
};

// Pre-save hook to set profit
hyperSpaceOrderSchema.pre('save', function(next) {
  if (this.customerPrice && this.socialplugCost) {
    this.profit = this.customerPrice - this.socialplugCost - (this.discountAmount || 0);
  }
  next();
});

module.exports = mongoose.model('HyperSpaceOrder', hyperSpaceOrderSchema);

