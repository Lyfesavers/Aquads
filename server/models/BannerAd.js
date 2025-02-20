const mongoose = require('mongoose');

const bannerAdSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  gif: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired'],
    default: 'pending'
  },
  txSignature: {
    type: String,
    required: true
  },
  paymentChain: {
    type: String,
    required: true
  },
  chainSymbol: {
    type: String,
    required: true
  },
  chainAddress: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: String
  }
});

module.exports = mongoose.model('BannerAd', bannerAdSchema); 