const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted_by_seller', 'accepted_by_buyer', 'confirmed', 'cancelled', 'declined', 'completed'],
    default: 'pending'
  },
  buyerEmail: {
    type: String,
    required: false
  },
  buyerName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USDC'
  },
  requirements: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  isReviewed: {
    type: Boolean,
    default: false
  },
  // Escrow system
  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FreelancerEscrow',
    default: null
  },
  buyerWorkApproved: {
    type: Boolean,
    default: false
  },
  buyerWorkApprovedAt: {
    type: Date,
    default: null
  },
  // Token system for lead unlocking
  isUnlocked: {
    type: Boolean,
    default: false
  },
  unlockedAt: {
    type: Date,
    default: null
  },
  tokensSpent: {
    type: Number,
    default: 0
  }
});

// Update the updatedAt timestamp before saving
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Performance indexes for better query performance
bookingSchema.index({ buyerId: 1, createdAt: -1 }); // For user's bookings
bookingSchema.index({ sellerId: 1, createdAt: -1 }); // For seller's bookings
bookingSchema.index({ status: 1, createdAt: -1 }); // For status-based queries
bookingSchema.index({ serviceId: 1, status: 1 }); // For service-specific bookings
bookingSchema.index({ buyerId: 1, sellerId: 1 }); // For user-to-user booking queries

module.exports = mongoose.model('Booking', bookingSchema); 