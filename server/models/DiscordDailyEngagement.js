const mongoose = require('mongoose');

const discordDailyEngagementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  discordUserId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
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

discordDailyEngagementSchema.index({ userId: 1, channelId: 1, date: 1 }, { unique: true });
discordDailyEngagementSchema.index({ discordUserId: 1, date: -1 });
discordDailyEngagementSchema.index({ date: -1 });

module.exports = mongoose.model('DiscordDailyEngagement', discordDailyEngagementSchema);
