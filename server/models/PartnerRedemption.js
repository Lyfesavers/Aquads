const mongoose = require('mongoose');
const { Schema } = mongoose;

const partnerRedemptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  partnerId: {
    type: Schema.Types.ObjectId,
    ref: 'PartnerStore',
    required: true
  },
  offerId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  
  // Redemption details
  pointsUsed: {
    type: Number,
    required: true
  },
  discountCode: {
    type: String,
    required: true,
    uppercase: true
  },
  offerTitle: {
    type: String,
    required: true
  },
  offerDescription: {
    type: String,
    required: true
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'cancelled'],
    default: 'active'
  },
  
  // Dates
  redeemedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  usedAt: {
    type: Date,
    default: null
  },
  
  // Optional: Partner can mark as used (for single-use codes)
  markedUsedBy: {
    type: String,
    default: null // Partner system identifier
  },
  
  // User's points balance at time of redemption (for audit)
  userPointsBalance: {
    type: Number,
    required: true
  }
});

// Indexes for performance
partnerRedemptionSchema.index({ userId: 1, status: 1, redeemedAt: -1 });
partnerRedemptionSchema.index({ partnerId: 1, redeemedAt: -1 });
partnerRedemptionSchema.index({ discountCode: 1 });
partnerRedemptionSchema.index({ expiresAt: 1 }); // For cleanup of expired codes

// Virtual to check if redemption is still valid
partnerRedemptionSchema.virtual('isValid').get(function() {
  return this.status === 'active' && this.expiresAt > new Date();
});

// Method to mark as used
partnerRedemptionSchema.methods.markAsUsed = function(markedBy = null) {
  this.status = 'used';
  this.usedAt = new Date();
  this.markedUsedBy = markedBy;
  return this.save();
};

// Static method to find valid redemption by code
partnerRedemptionSchema.statics.findValidRedemption = function(code) {
  return this.findOne({
    discountCode: code.toUpperCase(),
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).populate('partnerId userId', 'name username');
};

// Static method to get user's redemption history
partnerRedemptionSchema.statics.getUserHistory = function(userId, limit = 50) {
  return this.find({ userId })
    .populate('partnerId', 'name logo')
    .sort({ redeemedAt: -1 })
    .limit(limit);
};

// Static method to get partner analytics
partnerRedemptionSchema.statics.getPartnerAnalytics = function(partnerId) {
  return this.aggregate([
    { $match: { partnerId: new mongoose.Types.ObjectId(partnerId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPoints: { $sum: '$pointsUsed' }
      }
    }
  ]);
};

module.exports = mongoose.model('PartnerRedemption', partnerRedemptionSchema);
