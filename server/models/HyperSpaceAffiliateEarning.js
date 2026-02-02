const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * HyperSpace Affiliate Earning Model
 * Tracks commission earnings from HyperSpace (Twitter Space Listeners) orders
 * Commission is calculated on PROFIT MARGIN, not gross customer price
 */
const hyperSpaceAffiliateEarningSchema = new Schema({
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
  hyperspaceOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'HyperSpaceOrder',
    required: true
  },
  // The order ID string for easy reference
  orderId: {
    type: String,
    required: true
  },
  // Customer price (what they paid) - for display purposes
  orderAmount: {
    type: Number,
    required: true
  },
  // Profit margin (customerPrice - socialplugCost) - commission is based on THIS
  profitAmount: {
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

// Calculate commission amount (same logic as AffiliateEarning)
hyperSpaceAffiliateEarningSchema.statics.calculateCommission = function(profitAmount, rate) {
  console.log('Calculating HyperSpace commission for profit:', profitAmount, 'USDC', 'rate:', rate);
  const commissionAmount = profitAmount * rate;
  const finalAmount = parseFloat(commissionAmount.toFixed(2));
  console.log('HyperSpace commission calculated:', finalAmount, 'USDC');
  return finalAmount;
};

// Get total profit volume for an affiliate (used in combined tier calculation)
hyperSpaceAffiliateEarningSchema.statics.getTotalProfitVolume = async function(affiliateId) {
  const result = await this.aggregate([
    { $match: { affiliateId: new mongoose.Types.ObjectId(affiliateId) } },
    { $group: { _id: null, total: { $sum: "$profitAmount" } } }
  ]);
  return result[0]?.total || 0;
};

// Performance indexes for common queries
hyperSpaceAffiliateEarningSchema.index({ affiliateId: 1, createdAt: -1 }); // For affiliate's earnings by date
hyperSpaceAffiliateEarningSchema.index({ referredUserId: 1 }); // For referred user lookups
hyperSpaceAffiliateEarningSchema.index({ hyperspaceOrderId: 1 }); // For order-specific earnings
hyperSpaceAffiliateEarningSchema.index({ orderId: 1 }); // For order ID lookups
hyperSpaceAffiliateEarningSchema.index({ status: 1, createdAt: -1 }); // For pending/paid earnings
hyperSpaceAffiliateEarningSchema.index({ affiliateId: 1, status: 1 }); // For affiliate + status queries
hyperSpaceAffiliateEarningSchema.index({ createdAt: -1 }); // For earnings by date

module.exports = mongoose.model('HyperSpaceAffiliateEarning', hyperSpaceAffiliateEarningSchema);
