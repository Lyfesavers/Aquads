const mongoose = require('mongoose');

const serviceReviewSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false // Made optional for backward compatibility with existing reviews
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one review per completed booking (for new reviews with bookingId)
serviceReviewSchema.index({ bookingId: 1 }, { unique: true, sparse: true });

// Ensure one review per service per user (for legacy reviews without bookingId)
serviceReviewSchema.index({ serviceId: 1, userId: 1 }, { unique: true, partialFilterExpression: { bookingId: { $exists: false } } });

// Performance indexes for better query performance
serviceReviewSchema.index({ serviceId: 1, createdAt: -1 }); // For service reviews by date
serviceReviewSchema.index({ userId: 1, createdAt: -1 }); // For user's reviews
serviceReviewSchema.index({ rating: 1 }); // For rating-based queries
serviceReviewSchema.index({ serviceId: 1, rating: 1 }); // For service rating aggregation
serviceReviewSchema.index({ bookingId: 1, createdAt: -1 }); // For booking-specific reviews

module.exports = mongoose.model('ServiceReview', serviceReviewSchema); 