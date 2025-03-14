const mongoose = require('mongoose');

const gameVoteSchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
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
    max: 1  // Using 1 as the only valid vote value (upvote)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one vote per user per game
gameVoteSchema.index({ gameId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('GameVote', gameVoteSchema); 