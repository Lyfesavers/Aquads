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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'expired'],
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
  expiresAt: Date,
  rejectionReason: String
});

// Add database indexes for better query performance
bannerAdSchema.index({ status: 1, createdAt: -1 }); // For main banner ads query
bannerAdSchema.index({ owner: 1, createdAt: -1 }); // For user's banner ads
bannerAdSchema.index({ status: 1, expiresAt: 1 }); // For active/expired queries
bannerAdSchema.index({ paymentChain: 1, status: 1 }); // For blockchain filtering

module.exports = mongoose.model('BannerAd', bannerAdSchema); 