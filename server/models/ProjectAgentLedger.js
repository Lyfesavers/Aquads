const mongoose = require('mongoose');

const projectAgentLedgerSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['starter_grant', 'usage', 'topup', 'topup_fee', 'adjustment', 'hold', 'hold_release'],
    required: true
  },
  /** Positive = credit, negative = debit (cents) */
  amountCents: {
    type: Number,
    required: true
  },
  balanceAfterCents: {
    type: Number,
    required: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

projectAgentLedgerSchema.index({ userId: 1, adId: 1, createdAt: -1 });

module.exports = mongoose.model('ProjectAgentLedger', projectAgentLedgerSchema);
