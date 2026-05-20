const mongoose = require('mongoose');

const projectAgentTopupSchema = new mongoose.Schema({
  topupId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  adId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  /** USD credited to agent wallet (before fee) */
  creditUsd: {
    type: Number,
    required: true
  },
  creditCents: {
    type: Number,
    required: true
  },
  /** 5% load fee (USD) — paid on top of credit */
  feeUsd: {
    type: Number,
    required: true
  },
  feeCents: {
    type: Number,
    required: true
  },
  /** Total USD charged on AquaPay */
  payUsd: {
    type: Number,
    required: true
  },
  payCents: {
    type: Number,
    required: true
  },
  txHash: {
    type: String,
    default: null
  },
  paymentChain: {
    type: String,
    default: null
  },
  paymentToken: {
    type: String,
    default: null
  },
  returnPath: {
    type: String,
    default: '/project-agent'
  },
  paidAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

projectAgentTopupSchema.index({ txHash: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ProjectAgentTopup', projectAgentTopupSchema);
