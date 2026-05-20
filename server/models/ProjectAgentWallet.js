const mongoose = require('mongoose');

const projectAgentWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adId: {
    type: String,
    required: true,
    index: true
  },
  balanceCents: {
    type: Number,
    default: 0,
    min: 0
  },
  starterGranted: {
    type: Boolean,
    default: false
  },
  starterGrantedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

projectAgentWalletSchema.index({ userId: 1, adId: 1 }, { unique: true });

projectAgentWalletSchema.pre('save', function preSave(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ProjectAgentWallet', projectAgentWalletSchema);
