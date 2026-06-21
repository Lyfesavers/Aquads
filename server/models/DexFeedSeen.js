const mongoose = require('mongoose');

const dexFeedSeenSchema = new mongoose.Schema({
  chainId: { type: String, required: true, trim: true, lowercase: true },
  tokenAddress: { type: String, required: true, trim: true },
  adId: { type: String, default: null },
  firstSeenAt: { type: Date, default: Date.now }
});

dexFeedSeenSchema.index({ chainId: 1, tokenAddress: 1 }, { unique: true });

module.exports = mongoose.model('DexFeedSeen', dexFeedSeenSchema);
