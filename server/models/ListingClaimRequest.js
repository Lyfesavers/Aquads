const mongoose = require('mongoose');

const listingClaimRequestSchema = new mongoose.Schema({
  adId: { type: String, required: true, trim: true, index: true },
  requesterUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  requesterUsername: { type: String, required: true, trim: true },
  verificationCode: { type: String, required: true, trim: true },
  tweetUrl: { type: String, default: null, trim: true },
  status: {
    type: String,
    enum: ['prepared', 'pending', 'approved', 'rejected'],
    default: 'prepared'
  },
  rejectionReason: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: String, default: null },
  codeExpiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

listingClaimRequestSchema.index({ status: 1, createdAt: -1 });
listingClaimRequestSchema.index({ adId: 1, requesterUserId: 1 });
listingClaimRequestSchema.index(
  { adId: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ['prepared', 'pending'] } } }
);

module.exports = mongoose.model('ListingClaimRequest', listingClaimRequestSchema);
