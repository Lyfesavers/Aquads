const mongoose = require('mongoose');

const freelancerEscrowSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USDC'
  },
  chain: {
    type: String,
    enum: ['solana', 'ethereum', 'base', 'polygon', 'arbitrum', 'bnb'],
    default: null
  },
  token: {
    type: String,
    enum: ['USDC', 'SOL', 'ETH', 'MATIC', 'BNB'],
    default: null
  },

  status: {
    type: String,
    enum: [
      'awaiting_deposit',
      'deposit_pending',
      'funded',
      'pending_release',
      'released',
      'disputed',
      'resolved_seller',
      'resolved_buyer',
      'cancelled'
    ],
    default: 'awaiting_deposit'
  },

  // Deposit (Buyer → Escrow Wallet)
  depositTxHash: {
    type: String,
    default: null
  },
  depositVerified: {
    type: Boolean,
    default: false
  },
  depositAmount: {
    type: Number,
    default: null
  },
  buyerWalletAddress: {
    type: String,
    default: null
  },
  escrowWalletAddress: {
    type: String,
    default: null
  },

  // Release (Escrow Wallet → Seller)
  releaseTxHash: {
    type: String,
    default: null
  },
  releaseAmount: {
    type: Number,
    default: null
  },
  sellerWalletAddress: {
    type: String,
    default: null
  },

  // Refund (admin-initiated, Escrow Wallet → Buyer)
  refundTxHash: {
    type: String,
    default: null
  },
  refundAmount: {
    type: Number,
    default: null
  },

  // Platform fee
  platformFee: {
    type: Number,
    default: 0
  },
  feePercentage: {
    type: Number,
    default: 0.0125
  },

  // Dispute
  disputeReason: {
    type: String,
    default: null,
    maxlength: 1000
  },
  disputeOpenedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  disputeResolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  disputeNotes: {
    type: String,
    default: null,
    maxlength: 2000
  },

  // Timestamps
  fundedAt: { type: Date, default: null },
  releasedAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  disputeOpenedAt: { type: Date, default: null },
  disputeResolvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

freelancerEscrowSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

freelancerEscrowSchema.index({ bookingId: 1 }, { unique: true });
freelancerEscrowSchema.index({ buyerId: 1, status: 1 });
freelancerEscrowSchema.index({ sellerId: 1, status: 1 });
freelancerEscrowSchema.index({ status: 1, createdAt: -1 });
freelancerEscrowSchema.index({ depositTxHash: 1 }, { sparse: true });
freelancerEscrowSchema.index({ invoiceId: 1 });

module.exports = mongoose.model('FreelancerEscrow', freelancerEscrowSchema);
