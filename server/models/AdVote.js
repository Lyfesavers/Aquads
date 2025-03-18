const mongoose = require('mongoose');

const adVoteSchema = new mongoose.Schema({
  adId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  userIp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours (in seconds)
  }
});

// Compound index to prevent duplicate votes
adVoteSchema.index({ adId: 1, userId: 1, userIp: 1 }, { unique: true });

module.exports = mongoose.model('AdVote', adVoteSchema); 