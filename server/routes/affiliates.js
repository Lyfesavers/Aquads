const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AffiliateEarning = require('../models/AffiliateEarning');
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
        isVipAffiliate: false,
        nextTier: {
          rate: 0.15,
          amountNeeded: 5000,
          progress: 0
        }
      });
    }

    // Find user to get VIP status
    const user = await User.findById(req.user.userId);
    const isVipAffiliate = user?.isVipAffiliate || false;

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
      isVipAffiliate: isVipAffiliate,
      nextTier: currentRate < 0.20 ? {
        rate: currentRate === 0.10 ? 0.15 : 0.20,
        amountNeeded: currentRate === 0.10 ? 5000 : 25000,
        progress: totalAdRevenue || 0
      } : null
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching earnings summary:', error);
    res.status(500).json({
      totalEarned: 0,
      pendingAmount: 0,
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

// Toggle free raid project status (admin only)
router.post('/free-raid-project/:userId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can manage free raid projects' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle free raid project status
    user.isFreeRaidProject = !user.isFreeRaidProject;
    await user.save();

    res.json({ 
      message: `User ${user.username} ${user.isFreeRaidProject ? 'added to' : 'removed from'} free raid projects`,
      isFreeRaidProject: user.isFreeRaidProject 
    });
  } catch (error) {
    console.error('Error managing free raid project:', error);
    res.status(500).json({ error: 'Failed to update free raid project status' });
  }
});

// Get free raid project status (admin only)
router.get('/free-raid-project/:userId', auth, async (req, res) => {
  try {
    // Allow users to check their own eligibility or admins to check any user
    if (!req.user.isAdmin && req.user.userId !== req.params.userId) {
      return res.status(403).json({ error: 'You can only check your own free raid project status' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const eligibility = user.checkFreeRaidEligibility();

    res.json({ 
      isFreeRaidProject: user.isFreeRaidProject,
      eligibility
    });
  } catch (error) {
    console.error('Error checking free raid project status:', error);
    res.status(500).json({ error: 'Failed to check free raid project status' });
  }
});

// Get detailed affiliate analytics for current user (user-facing)
router.get('/analytics', auth, async (req, res) => {
  try {
    // Get user's affiliates with fields needed for fraud detection (no personal data like emails)
    const affiliates = await User.find({ referredBy: req.user.userId })
      .select('username createdAt points tokens isOnline lastSeen lastActivity affiliateCount emailVerified ipAddress country deviceFingerprint')
      .sort({ createdAt: -1 });

    // Get current user info with fraud detection fields
    const currentUser = await User.findById(req.user.userId).select('username createdAt affiliateCount ipAddress country deviceFingerprint lastSeen lastActivity isOnline');

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