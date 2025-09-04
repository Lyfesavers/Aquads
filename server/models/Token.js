const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  symbol: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: String,
  currentPrice: {
    type: Number,
    default: 0
  },
  marketCap: {
    type: Number,
    default: 0
  },
  marketCapRank: Number,
  totalVolume: {
    type: Number,
    default: 0
  },
  high24h: Number,
  low24h: Number,
  priceChange24h: Number,
  priceChangePercentage24h: Number,
  circulatingSupply: Number,
  totalSupply: Number,
  maxSupply: Number,
  ath: Number,
  athChangePercentage: Number,
  athDate: Date,
  fullyDilutedValuation: Number,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Add database indexes for better query performance
tokenSchema.index({ symbol: 1 }); // For symbol lookups
tokenSchema.index({ marketCap: -1 }); // For market cap sorting
tokenSchema.index({ priceChangePercentage24h: -1 }); // For price change sorting
tokenSchema.index({ lastUpdated: -1 }); // For recent updates
tokenSchema.index({ marketCapRank: 1 }); // For market cap ranking

module.exports = mongoose.model('Token', tokenSchema); 