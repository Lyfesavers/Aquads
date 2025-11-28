const mongoose = require('mongoose');

const telegramReactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telegramUserId: {
    type: String,
    required: true
  },
  messageId: {
    type: String,
    required: true
  },
  chatId: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 1
  },
  reactedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one reaction point award per user per message
telegramReactionSchema.index({ userId: 1, messageId: 1 }, { unique: true });
telegramReactionSchema.index({ telegramUserId: 1, reactedAt: -1 });
telegramReactionSchema.index({ reactedAt: -1 });

module.exports = mongoose.model('TelegramReaction', telegramReactionSchema);

