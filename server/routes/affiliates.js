const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AffiliateEarning = require('../models/AffiliateEarning');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get affiliate earnings from ads
router.get('/earnings', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        earnings: [],
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        currentRate: 0.10
      });
    }

    const earnings = await AffiliateEarning.find({ affiliateId: new mongoose.Types.ObjectId(req.user.userId) })
      .populate('adId', 'title')
      .sort({ createdAt: -1 })
      .lean() || [];
    
    // Calculate totals with null checks
    const totalEarnings = earnings.reduce((sum, earning) => sum + (earning.commissionEarned || 0), 0);
    const pendingEarnings = earnings
      .filter(e => e?.status === 'pending')
      .reduce((sum, earning) => sum + (earning.commissionEarned || 0), 0);
    const paidEarnings = earnings
      .filter(e => e?.status === 'paid')
      .reduce((sum, earning) => sum + (earning.commissionEarned || 0), 0);
    
    // Get current commission rate
    const currentRate = await AffiliateEarning.calculateCommissionRate(req.user.userId) || 0.10;
    
    res.json({
      earnings: earnings || [],
      totalEarnings: totalEarnings || 0,
      pendingEarnings: pendingEarnings || 0,
      paidEarnings: paidEarnings || 0,
      currentRate: currentRate || 0.10
    });
  } catch (error) {
    console.error('Error fetching affiliate earnings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch affiliate earnings',
      earnings: [],
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      currentRate: 0.10
    });
  }
});

// Record new ad commission
router.post('/record-ad-commission', auth, async (req, res) => {
  try {
    const { referredUserId, adId, adAmount } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(req.user.userId) || 
        !mongoose.Types.ObjectId.isValid(referredUserId) || 
        !mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Calculate commission rate based on total earnings
    const commissionRate = await AffiliateEarning.calculateCommissionRate(req.user.userId);
    const commissionEarned = AffiliateEarning.calculateCommission(adAmount, commissionRate);
    
    const earning = new AffiliateEarning({
      affiliateId: new mongoose.Types.ObjectId(req.user.userId),
      referredUserId: new mongoose.Types.ObjectId(referredUserId),
      adId: new mongoose.Types.ObjectId(adId),
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
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        totalEarned: 0,
        pendingAmount: 0,
        totalAdRevenue: 0,
        currentRate: 0.10,
        nextTier: {
          rate: 0.15,
          amountNeeded: 25.66,
          progress: 0
        }
      });
    }

    const earnings = await AffiliateEarning.find({ affiliateId: new mongoose.Types.ObjectId(req.user.userId) })
      .lean() || [];
    const currentRate = await AffiliateEarning.calculateCommissionRate(req.user.userId) || 0.10;
    
    // Calculate total ad revenue with null check
    const totalAdRevenue = earnings.reduce((sum, e) => sum + (e.adAmount || 0), 0);
    const totalEarned = earnings.reduce((sum, e) => sum + (e.commissionEarned || 0), 0);
    const pendingAmount = earnings
      .filter(e => e?.status === 'pending')
      .reduce((sum, e) => sum + (e.commissionEarned || 0), 0);
    
    const summary = {
      totalEarned: totalEarned || 0,
      pendingAmount: pendingAmount || 0,
      totalAdRevenue: totalAdRevenue || 0,
      currentRate: currentRate || 0.10,
      nextTier: currentRate < 0.20 ? {
        rate: currentRate === 0.10 ? 0.15 : 0.20,
        amountNeeded: currentRate === 0.10 ? 25.66 : 128.26,
        progress: totalAdRevenue || 0
      } : null
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching earnings summary:', error);
    // Return safe default values on error
    res.status(500).json({
      totalEarned: 0,
      pendingAmount: 0,
      totalAdRevenue: 0,
      currentRate: 0.10,
      nextTier: {
        rate: 0.15,
        amountNeeded: 25.66,
        progress: 0
      }
    });
  }
});

// Add VIP affiliate route (admin only)
router.post('/vip/:userId', auth, async (req, res) => {
  try {
    // Verify admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can manage VIP affiliates' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle VIP status
    user.isVipAffiliate = !user.isVipAffiliate;
    await user.save();

    res.json({ 
      message: `User ${user.username} ${user.isVipAffiliate ? 'added to' : 'removed from'} VIP affiliates`,
      isVipAffiliate: user.isVipAffiliate 
    });
  } catch (error) {
    console.error('Error managing VIP affiliate:', error);
    res.status(500).json({ error: 'Failed to update VIP status' });
  }
});

module.exports = router; 