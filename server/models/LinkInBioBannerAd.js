const mongoose = require('mongoose');

const linkInBioBannerAdSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  gif: {
    type: String,
    required: true,
    maxlength: 2048
  },
  url: {
    type: String,
    required: true,
    maxlength: 2048
  },
  advertiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  advertiserInfo: {
    name: { type: String, maxlength: 100 },
    email: { type: String, maxlength: 200 }
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUsername: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled'],
    default: 'pending'
  },
  txSignature: {
    type: String,
    required: true
  },
  paymentChain: {
    type: String,
    default: 'AquaPay'
  },
  chainSymbol: {
    type: String,
    default: 'USDC'
  },
  chainAddress: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date
});

linkInBioBannerAdSchema.index({ targetUsername: 1, status: 1, expiresAt: 1 });
linkInBioBannerAdSchema.index({ advertiser: 1 });
linkInBioBannerAdSchema.index({ targetUser: 1 });
linkInBioBannerAdSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('LinkInBioBannerAd', linkInBioBannerAdSchema);
