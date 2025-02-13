const express = require('express');
const router = express.Router();
const AffiliateEarning = require('../models/AffiliateEarning');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get affiliate earnings from ads
router.get('/earnings', auth, async (req, res) => {
  try {
    const earnings = await AffiliateEarning.find({ affiliateId: req.user.userId })
      .populate('adId', 'title')  // Get ad title for display
      .sort({ createdAt: -1 });
    
    // Calculate totals
    const totalEarnings = earnings.reduce((sum, earning) => sum + earning.commissionEarned, 0);
    const pendingEarnings = earnings
      .filter(e => e.status === 'pending')
      .reduce((sum, earning) => sum + earning.commissionEarned, 0);
    const paidEarnings = earnings
      .filter(e => e.status === 'paid')
      .reduce((sum, earning) => sum + earning.commissionEarned, 0);
    
    // Get current commission rate
    const currentRate = await AffiliateEarning.calculateCommissionRate(req.user.userId);
    
    res.json({
      earnings,
      totalEarnings,
      pendingEarnings,
      paidEarnings,
      currentRate
    });
  } catch (error) {
    console.error('Error fetching affiliate earnings:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate earnings' });
  }
});

// Record new ad commission
router.post('/record-ad-commission', auth, async (req, res) => {
  try {
    const { referredUserId, adId, adAmount } = req.body;
    
    // Calculate commission rate based on total earnings
    const commissionRate = await AffiliateEarning.calculateCommissionRate(req.user.userId);
    const commissionEarned = AffiliateEarning.calculateCommission(adAmount, commissionRate);
    
    const earning = new AffiliateEarning({
      affiliateId: req.user.userId,
      referredUserId,
      adId,
      adAmount,
      commissionRate,
      commissionEarned
    });
    
    await earning.save();
    res.status(201).json(earning);
  } catch (error) {
    console.error('Error recording ad commission:', error);
    res.status(500).json({ error: 'Failed to record ad commission' });
  }
});

// Get earnings summary
router.get('/summary', auth, async (req, res) => {
  try {
    const earnings = await AffiliateEarning.find({ affiliateId: req.user.userId });
    const currentRate = await AffiliateEarning.calculateCommissionRate(req.user.userId);
    
    // Calculate total ad revenue
    const totalAdRevenue = earnings.reduce((sum, e) => sum + e.adAmount, 0);
    
    const summary = {
      totalEarned: earnings.reduce((sum, e) => sum + e.commissionEarned, 0),
      pendingAmount: earnings
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + e.commissionEarned, 0),
      totalAdRevenue,
      currentRate,
      nextTier: currentRate < 0.20 ? {
        rate: currentRate === 0.10 ? 0.15 : 0.20,
        amountNeeded: currentRate === 0.10 ? 5000 : 25000,
        progress: totalAdRevenue
      } : null
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching earnings summary:', error);
    res.status(500).json({ error: 'Failed to fetch earnings summary' });
  }
});

module.exports = router; 