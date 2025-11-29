const mongoose = require('mongoose');

const telegramDailyEngagementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telegramUserId: {
    type: String,
    required: true
  },
  groupId: {
    type: String,
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  // Track both engagement types separately
  hasMessagedToday: {
    type: Boolean,
    default: false
  },
  hasReactedToday: {
    type: Boolean,
    default: false
  },
  messagePoints: {
    type: Number,
    default: 0
  },
  reactionPoints: {
    type: Number,
    default: 0
  },
  firstMessageAt: Date,
  firstReactionAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Unique constraint: one record per user per group per day
telegramDailyEngagementSchema.index({ userId: 1, groupId: 1, date: 1 }, { unique: true });
telegramDailyEngagementSchema.index({ telegramUserId: 1, date: -1 });
telegramDailyEngagementSchema.index({ date: -1 });

module.exports = mongoose.model('TelegramDailyEngagement', telegramDailyEngagementSchema);

