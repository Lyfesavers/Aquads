const mongoose = require('mongoose');

const gameCommentSchema = new mongoose.Schema({
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
  username: {
    type: String,
    required: true
  },
  userImage: {
    type: String,
    default: null
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

gameCommentSchema.index({ gameId: 1, createdAt: -1 });
gameCommentSchema.index({ userId: 1 });

module.exports = mongoose.model('GameComment', gameCommentSchema);
