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

// When calculating total earnings, make sure we're not converting from SOL
affiliateEarningSchema.statics.calculateCommissionRate = async function(affiliateId) {
  const user = await mongoose.model('User').findById(affiliateId);
  console.log('Calculating commission rate for user:', user?.username);
  
  if (user?.isVipAffiliate) {
    console.log('User is VIP affiliate, returning 30%');
    return 0.30;
  }
  
  const totalEarnings = await this.aggregate([
    { $match: { affiliateId: new mongoose.Types.ObjectId(affiliateId) } },
    { $group: { _id: null, total: { $sum: "$adAmount" } } }
  ]);
  
  const total = totalEarnings[0]?.total || 0;
  console.log('Total earnings found:', total, 'USDC');
  
  let rate;
  if (total >= 25000) rate = 0.20;
  else if (total >= 5000) rate = 0.15;
  else rate = 0.10;
  
  console.log('Calculated commission rate:', rate);
  return rate;
};



module.exports = mongoose.model('AffiliateEarning', affiliateEarningSchema); 