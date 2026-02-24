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

// Calculate commission amount
affiliateEarningSchema.statics.calculateCommission = function(amount, rate) {
  console.log('Calculating commission for amount:', amount, 'USDC', 'rate:', rate);
  const commissionAmount = amount * rate;
  const finalAmount = parseFloat(commissionAmount.toFixed(2));
  console.log('Commission calculated:', finalAmount, 'USDC');
  return finalAmount;
};

// Calculate commission rate based on COMBINED volume from all sources
// Includes: AffiliateEarning (ads/bumps/banners) + HyperSpaceAffiliateEarning (hyperspace orders)
affiliateEarningSchema.statics.calculateCommissionRate = async function(affiliateId) {
  const user = await mongoose.model('User').findById(affiliateId).lean();
  console.log('Calculating commission rate for user:', user?.username);
  
  if (user?.isVipAffiliate) {
    console.log('User is VIP affiliate, returning 30%');
    return 0.30;
  }
  
  // Get ad/bump/banner volume from AffiliateEarning
  const adEarnings = await this.aggregate([
    { $match: { affiliateId: new mongoose.Types.ObjectId(affiliateId) } },
    { $group: { _id: null, total: { $sum: "$adAmount" } } }
  ]);
  const adTotal = adEarnings[0]?.total || 0;
  
  // Get HyperSpace volume from HyperSpaceAffiliateEarning
  let hsTotal = 0;
  try {
    const HyperSpaceAffiliateEarning = mongoose.model('HyperSpaceAffiliateEarning');
    const hsEarnings = await HyperSpaceAffiliateEarning.aggregate([
      { $match: { affiliateId: new mongoose.Types.ObjectId(affiliateId) } },
      { $group: { _id: null, total: { $sum: "$profitAmount" } } }
    ]);
    hsTotal = hsEarnings[0]?.total || 0;
  } catch (err) {
    // HyperSpaceAffiliateEarning model may not be loaded yet, that's ok
    console.log('HyperSpaceAffiliateEarning not available for tier calculation');
  }
  
  // Combined total for tier calculation
  const total = adTotal + hsTotal;
  console.log('Total referred volume found:', total, 'USDC (ads:', adTotal, '+ hyperspace:', hsTotal, ')');
  
  let rate;
  if (total >= 25000) rate = 0.20;
  else if (total >= 5000) rate = 0.15;
  else rate = 0.10;
  
  console.log('Calculated commission rate:', rate);
  return rate;
};

// Performance indexes for common queries
affiliateEarningSchema.index({ affiliateId: 1, createdAt: -1 }); // For affiliate's earnings by date
affiliateEarningSchema.index({ referredUserId: 1 }); // For referred user lookups
affiliateEarningSchema.index({ adId: 1 }); // For ad-specific earnings
affiliateEarningSchema.index({ status: 1, createdAt: -1 }); // For pending/paid earnings
affiliateEarningSchema.index({ affiliateId: 1, status: 1 }); // For affiliate + status queries
affiliateEarningSchema.index({ createdAt: -1 }); // For earnings by date
affiliateEarningSchema.index({ paidAt: -1 }); // For paid earnings by date


module.exports = mongoose.model('AffiliateEarning', affiliateEarningSchema); 