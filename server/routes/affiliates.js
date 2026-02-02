const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AffiliateEarning = require('../models/AffiliateEarning');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');
const User = require('../models/User');
const Service = require('../models/Service');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const ServiceReview = require('../models/ServiceReview');
const Game = require('../models/Game');
const TwitterRaid = require('../models/TwitterRaid');
const TokenPurchase = require('../models/TokenPurchase');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const { calculateActivityDiversityScore, calculateLoginFrequencyAnalysis, calculateAdvancedFraudScore } = require('../utils/fraudDetection');
const { emitAffiliateEarningUpdate } = require('../socket');

// Get affiliate earnings from all sources (ads + hyperspace)
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

    const affiliateId = new mongoose.Types.ObjectId(req.user.userId);

    // Get ad/bump/banner earnings
    const adEarnings = await AffiliateEarning.find({ affiliateId })
      .populate('adId', 'title')
      .sort({ createdAt: -1 })
      .lean() || [];
    
    // Get HyperSpace earnings
    const hsEarnings = await HyperSpaceAffiliateEarning.find({ affiliateId })
      .populate('hyperspaceOrderId', 'orderId listenerCount duration')
      .sort({ createdAt: -1 })
      .lean() || [];
    
    // Normalize and combine earnings with source type
    const normalizedAdEarnings = adEarnings.map(e => ({
      ...e,
      sourceType: 'ad',
      sourceLabel: e.adId?.title || 'Listing/Bump',
      baseAmount: e.adAmount || 0
    }));
    
    const normalizedHsEarnings = hsEarnings.map(e => ({
      ...e,
      sourceType: 'hyperspace',
      sourceLabel: `HyperSpace: ${e.hyperspaceOrderId?.listenerCount || '?'} listeners`,
      baseAmount: e.profitAmount || 0, // For HyperSpace, base is profit
      adAmount: e.profitAmount || 0    // For backwards compatibility
    }));
    
    // Combine and sort by date
    const allEarnings = [...normalizedAdEarnings, ...normalizedHsEarnings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Calculate totals with null checks
    const totalEarnings = allEarnings.reduce((sum, earning) => sum + (earning.commissionEarned || 0), 0);
    const pendingEarnings = allEarnings
      .filter(e => e?.status === 'pending')
      .reduce((sum, earning) => sum + (earning.commissionEarned || 0), 0);
    const paidEarnings = allEarnings
      .filter(e => e?.status === 'paid')
      .reduce((sum, earning) => sum + (earning.commissionEarned || 0), 0);
    
    // Get current commission rate (now calculated across both models)
    const currentRate = await AffiliateEarning.calculateCommissionRate(req.user.userId) || 0.10;
    
    res.json({
      earnings: allEarnings || [],
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
    
    // Emit real-time update for affiliate earning
    emitAffiliateEarningUpdate({
      affiliateId: req.user.userId,
      earningId: earning._id,
      commissionEarned: earning.commissionEarned,
      adAmount: earning.adAmount,
      commissionRate: earning.commissionRate,
      createdAt: earning.createdAt
    });
    
    res.status(201).json(earning);
  } catch (error) {
    console.error('Error recording ad commission:', error);
    res.status(500).json({ error: 'Failed to record ad commission' });
  }
});

// Get earnings summary (aggregated from all sources)
router.get('/summary', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        totalEarned: 0,
        pendingAmount: 0,
        totalReferredRevenue: 0,
        totalAdRevenue: 0, // Kept for backwards compatibility
        currentRate: 0.10,
        isVipAffiliate: false,
        nextTier: {
          rate: 0.15,
          amountNeeded: 5000,
          progress: 0
        }
      });
    }

    const affiliateId = new mongoose.Types.ObjectId(req.user.userId);

    // Find user to get VIP status
    const user = await User.findById(req.user.userId);
    const isVipAffiliate = user?.isVipAffiliate || false;

    // Get ad/bump/banner earnings
    const adEarnings = await AffiliateEarning.find({ affiliateId }).lean() || [];
    
    // Get HyperSpace earnings
    const hsEarnings = await HyperSpaceAffiliateEarning.find({ affiliateId }).lean() || [];
    
    // Get current commission rate (now calculated across both models)
    const currentRate = await AffiliateEarning.calculateCommissionRate(req.user.userId) || 0.10;
    
    // Calculate ad revenue (gross amounts from ads/bumps/banners)
    const adRevenue = adEarnings.reduce((sum, e) => sum + (e.adAmount || 0), 0);
    
    // Calculate HyperSpace profit volume (commission base for hyperspace)
    const hsProfit = hsEarnings.reduce((sum, e) => sum + (e.profitAmount || 0), 0);
    
    // Total referred revenue for tier calculation (ad revenue + hyperspace profit)
    const totalReferredRevenue = adRevenue + hsProfit;
    
    // Calculate total earned commission from both sources
    const adEarned = adEarnings.reduce((sum, e) => sum + (e.commissionEarned || 0), 0);
    const hsEarned = hsEarnings.reduce((sum, e) => sum + (e.commissionEarned || 0), 0);
    const totalEarned = adEarned + hsEarned;
    
    // Calculate pending amounts from both sources
    const adPending = adEarnings
      .filter(e => e?.status === 'pending')
      .reduce((sum, e) => sum + (e.commissionEarned || 0), 0);
    const hsPending = hsEarnings
      .filter(e => e?.status === 'pending')
      .reduce((sum, e) => sum + (e.commissionEarned || 0), 0);
    const pendingAmount = adPending + hsPending;
    
    const summary = {
      totalEarned: totalEarned || 0,
      pendingAmount: pendingAmount || 0,
      totalReferredRevenue: totalReferredRevenue || 0, // New field - combined
      totalAdRevenue: totalReferredRevenue || 0, // Kept for backwards compatibility (now shows combined)
      currentRate: currentRate || 0.10,
      isVipAffiliate: isVipAffiliate,
      // Breakdown by source (optional - for detailed views)
      breakdown: {
        ads: { revenue: adRevenue, earned: adEarned, pending: adPending },
        hyperspace: { revenue: hsProfit, earned: hsEarned, pending: hsPending }
      },
      nextTier: currentRate < 0.20 ? {
        rate: currentRate === 0.10 ? 0.15 : 0.20,
        amountNeeded: currentRate === 0.10 ? 5000 : 25000,
        progress: totalReferredRevenue || 0
      } : null
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching earnings summary:', error);
    res.status(500).json({
      totalEarned: 0,
      pendingAmount: 0,
      totalReferredRevenue: 0,
      totalAdRevenue: 0,
      currentRate: 0.10,
      isVipAffiliate: false,
      nextTier: {
        rate: 0.15,
        amountNeeded: 5000,
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

// Note: Manual free raid toggle has been removed.
// Free raids are now automatic for projects with lifetime bumps in bubbles.
// Users with lifetime bumped projects get 20 free raids per day automatically.

// Get detailed affiliate analytics for current user (user-facing)
router.get('/analytics', auth, async (req, res) => {
  try {
    // Get user's affiliates with fields needed for fraud detection (no personal data like emails)
    const affiliates = await User.find({ referredBy: req.user.userId })
      .select('username createdAt points tokens isOnline lastSeen lastActivity affiliateCount emailVerified ipAddress country deviceFingerprint cv')
      .sort({ createdAt: -1 });

    // Get current user info with fraud detection fields
    const currentUser = await User.findById(req.user.userId).select('username createdAt affiliateCount ipAddress country deviceFingerprint lastSeen lastActivity isOnline cv');

    // Calculate analytics
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Growth metrics
    const thisWeekSignups = affiliates.filter(a => new Date(a.createdAt) >= oneWeekAgo).length;
    const thisMonthSignups = affiliates.filter(a => new Date(a.createdAt) >= oneMonthAgo).length;

    // Activity metrics
    const activeThisWeek = affiliates.filter(a => 
      a.lastSeen && new Date(a.lastSeen) >= oneWeekAgo
    ).length;
    const verifiedAffiliates = affiliates.filter(a => a.emailVerified).length;

    // Engagement metrics
    const averagePoints = affiliates.length > 0 ? 
      Math.round(affiliates.reduce((sum, a) => sum + (a.points || 0), 0) / affiliates.length) : 0;
    const totalAffiliateTokens = affiliates.reduce((sum, a) => sum + (a.tokens || 0), 0);

    // Network growth (affiliates who have their own affiliates)
    const networkBuilders = affiliates.filter(a => (a.affiliateCount || 0) > 0).length;

    // Performance tiers
    const topPerformers = affiliates.filter(a => (a.points || 0) > 1000).length;
    const moderatePerformers = affiliates.filter(a => (a.points || 0) > 500 && (a.points || 0) <= 1000).length;
    const newAffiliates = affiliates.filter(a => (a.points || 0) <= 500).length;

    // Time-based analysis
    const affiliatesByMonth = {};
    affiliates.forEach(affiliate => {
      const month = new Date(affiliate.createdAt).toISOString().substring(0, 7);
      affiliatesByMonth[month] = (affiliatesByMonth[month] || 0) + 1;
    });

    // Calculate fraud analysis for the user
    const fraudAnalysis = await calculateAdvancedFraudScore(currentUser, affiliates);

    // Prepare affiliate list for display (no personal info)
    const affiliateList = affiliates.map(affiliate => ({
      username: affiliate.username,
      joinDate: affiliate.createdAt,
      points: affiliate.points || 0,
      tokens: affiliate.tokens || 0,
      isOnline: affiliate.isOnline || false,
      lastSeen: affiliate.lastSeen,
      affiliateCount: affiliate.affiliateCount || 0,
      emailVerified: affiliate.emailVerified || false,
      daysSinceJoin: Math.floor((now - new Date(affiliate.createdAt)) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      summary: {
        totalAffiliates: affiliates.length,
        thisWeekSignups,
        thisMonthSignups,
        activeThisWeek,
        verifiedAffiliates,
        averagePoints,
        totalAffiliateTokens,
        networkBuilders,
        verificationRate: affiliates.length > 0 ? Math.round((verifiedAffiliates / affiliates.length) * 100) : 0,
        activityRate: affiliates.length > 0 ? Math.round((activeThisWeek / affiliates.length) * 100) : 0
      },
      performance: {
        topPerformers,
        moderatePerformers,
        newAffiliates
      },
      growth: {
        monthlyData: affiliatesByMonth,
        growthTrend: thisMonthSignups > 0 ? 'growing' : 'stable'
      },
      fraudAnalysis: {
        riskScore: fraudAnalysis.riskScore,
        riskLevel: fraudAnalysis.riskScore >= 75 ? 'high' : fraudAnalysis.riskScore >= 50 ? 'medium' : 'low',
        riskFactors: fraudAnalysis.riskFactors,
        activityScore: fraudAnalysis.activityAnalysis?.score || 0,
        loginFrequency: fraudAnalysis.loginAnalysis?.frequencyScore || 0,
        networkAnalysis: fraudAnalysis.networkAnalysis,
        activityDetails: fraudAnalysis.activityAnalysis?.activities || {},
        loginDetails: fraudAnalysis.loginAnalysis || {}
      },
      affiliates: affiliateList,
      user: {
        username: currentUser.username,
        joinDate: currentUser.createdAt,
        totalAffiliates: currentUser.affiliateCount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate analytics:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate analytics' });
  }
});

module.exports = router; 