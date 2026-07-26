const mongoose = require('mongoose');
const { Schema } = mongoose;

const horsePendingRaceSchema = new Schema({
  raceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  horses: {
    type: Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800 // 30 minutes TTL
  }
});

module.exports = mongoose.model('HorsePendingRace', horsePendingRaceSchema);
