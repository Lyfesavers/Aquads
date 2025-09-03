const mongoose = require('mongoose');

const serviceReviewSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
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

// Ensure one review per service per user
serviceReviewSchema.index({ serviceId: 1, userId: 1 }, { unique: true });

// Add performance indexes
serviceReviewSchema.index({ serviceId: 1, createdAt: -1 }); // For service reviews by date
serviceReviewSchema.index({ userId: 1, createdAt: -1 }); // For user's reviews
serviceReviewSchema.index({ rating: 1 }); // For rating-based queries
serviceReviewSchema.index({ serviceId: 1, rating: 1 }); // For service rating aggregation

module.exports = mongoose.model('ServiceReview', serviceReviewSchema); 