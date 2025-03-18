const mongoose = require('mongoose');

const adVoteSchema = new mongoose.Schema({
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vote: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    max: 1
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-expire votes after 24 hours (in seconds)
  }
});

// Ensure one vote per user per ad
adVoteSchema.index({ adId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AdVote', adVoteSchema); 