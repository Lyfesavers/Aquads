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

module.exports = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);


