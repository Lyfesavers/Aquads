const mongoose = require('mongoose');
const { Schema } = mongoose;

const affiliateEarningSchema = new Schema({
  affiliateId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referredUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Ad'
  },
  adAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    required: true
  },
  commissionEarned: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date
});

// Calculate commission rate based on total ad revenue
affiliateEarningSchema.statics.calculateCommissionRate = async function(affiliateId) {
  const totalEarnings = await this.aggregate([
    { $match: { affiliateId: mongoose.Types.ObjectId(affiliateId) } },
    { $group: { _id: null, total: { $sum: "$adAmount" } } }
  ]);
  
  const total = totalEarnings[0]?.total || 0;
  
  if (total >= 25000) return 0.20;      // 20% for $25,000+
  if (total >= 5000) return 0.15;       // 15% for $5,000+
  return 0.10;                          // 10% base rate
};

// Calculate commission amount
affiliateEarningSchema.statics.calculateCommission = function(amount, rate) {
  return parseFloat((amount * rate).toFixed(2));
};

module.exports = mongoose.model('AffiliateEarning', affiliateEarningSchema); 