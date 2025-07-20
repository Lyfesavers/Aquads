const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const botSettingsSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BotSettings', botSettingsSchema); 