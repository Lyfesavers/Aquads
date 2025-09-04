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



module.exports = mongoose.model('Token', tokenSchema); 