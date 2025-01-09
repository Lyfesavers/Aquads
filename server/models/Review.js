const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  tokenSymbol: {
    type: String,
    required: true
  },
  userId: {
    type: String,
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
    maxLength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one review per token per user
reviewSchema.index({ tokenSymbol: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema); 