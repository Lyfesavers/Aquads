const mongoose = require('mongoose');

const LeaderboardEntrySchema = new mongoose.Schema(
  {
    game: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: 'Guest' },
    result: { type: String, enum: ['Win', 'Loss', 'Draw'], required: true },
    you: { type: Number, required: true, min: 0 },
    ai: { type: Number, required: true, min: 0 },
    grid: { type: String, required: true }, // e.g., "4x4"
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LeaderboardEntrySchema.index({ game: 1, createdAt: -1 });

// Performance indexes for common queries
LeaderboardEntrySchema.index({ userId: 1, createdAt: -1 }); // For user's entries by date
LeaderboardEntrySchema.index({ game: 1, difficulty: 1 }); // For game + difficulty queries
LeaderboardEntrySchema.index({ game: 1, result: 1 }); // For game + result queries
LeaderboardEntrySchema.index({ username: 1 }); // For username lookups
LeaderboardEntrySchema.index({ createdAt: -1 }); // For entries by date

module.exports = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);


