const mongoose = require('mongoose');

const globalMarketSnapshotSchema = new mongoose.Schema({
  totalMarketCap: { type: Number, required: true },
  totalVolume24h: { type: Number, required: true },
  marketCapChangePercentage24h: { type: Number, default: 0 },
  volumeChangePercentage24h: { type: Number, default: 0 },
  recordedAt: { type: Date, default: Date.now, index: true }
});

globalMarketSnapshotSchema.index({ recordedAt: -1 });

module.exports = mongoose.model('GlobalMarketSnapshot', globalMarketSnapshotSchema);
