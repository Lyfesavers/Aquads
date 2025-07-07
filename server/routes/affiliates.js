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

// Helper function to calculate activity diversity score (0-1, higher = more diverse)
const calculateActivityDiversityScore = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { score: 0, activities: {} };

    // Check various activity types
    const activities = {
      servicesCreated: await Service.countDocuments({ seller: userId }),
      jobsPosted: await Job.countDocuments({ owner: userId }),
      bookingsMade: await Booking.countDocuments({ buyerId: userId }),
      servicesBooked: await Booking.countDocuments({ sellerId: userId }),
      tokenReviewsWritten: await Review.countDocuments({ userId: userId }),
      serviceReviewsWritten: await ServiceReview.countDocuments({ userId: userId }),
      gamesCreated: await Game.countDocuments({ owner: userId }),
      socialRaidsParticipated: await TwitterRaid.countDocuments({ 'completions.userId': userId }),
      tokenPurchasesMade: await TokenPurchase.countDocuments({ userId: userId }),
      pointsEarned: user.pointsHistory ? user.pointsHistory.filter(p => p.amount > 0).length : 0,
      pointsSpent: user.pointsHistory ? user.pointsHistory.filter(p => p.amount < 0).length : 0,
      tokenTransactions: user.tokenHistory ? user.tokenHistory.length : 0,
      hasCustomImage: user.image !== 'https://i.imgur.com/6VBx3io.png',
      emailVerified: user.emailVerified
    };

    // Calculate diversity score based on different activity types
    const activityTypes = [
      activities.servicesCreated > 0,
      activities.jobsPosted > 0,
      activities.bookingsMade > 0,
      activities.servicesBooked > 0,
      activities.tokenReviewsWritten > 0,
      activities.serviceReviewsWritten > 0,
      activities.gamesCreated > 0,
      activities.socialRaidsParticipated > 0,
      activities.tokenPurchasesMade > 0,
      activities.pointsSpent > 0,
      activities.tokenTransactions > 0,
      activities.hasCustomImage,
      activities.emailVerified
    ];

    const activeTypes = activityTypes.filter(Boolean).length;
    const maxPossibleTypes = activityTypes.length;
    const diversityScore = activeTypes / maxPossibleTypes;

    return {
      score: Math.round(diversityScore * 100) / 100,
      activities,
      activeTypes,
      maxPossibleTypes
    };
  } catch (error) {
    return { score: 0, activities: {}, error: error.message };
  }
};

// Helper function to calculate login frequency analysis
const calculateLoginFrequencyAnalysis = (user) => {
  try {
    const now = new Date();
    const createdAt = new Date(user.createdAt);
    
    // Use the most recent activity timestamp available
    const timestamps = [user.lastSeen, user.lastActivity].filter(Boolean).map(t => new Date(t));
    const mostRecentActivity = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
    
    // If no activity timestamps are available, use creation date but flag it
    const hasRealActivityData = mostRecentActivity !== null;
    const lastActivityTime = mostRecentActivity || createdAt;
    
    // Separate lastSeen and lastActivity for more granular tracking
    const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
    const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;

    // Calculate account age in days
    const accountAgeMs = now.getTime() - createdAt.getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    // Calculate days since most recent activity
    const daysSinceLastActivity = Math.floor((now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLastSeen = lastSeen ? Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)) : daysSinceLastActivity;

    // More accurate dormant detection
    const isDormant = hasRealActivityData ? daysSinceLastActivity > 7 : (accountAgeDays > 7 && daysSinceLastActivity >= accountAgeDays - 1);
    const isHighlyDormant = hasRealActivityData ? daysSinceLastActivity > 30 : (accountAgeDays > 30 && daysSinceLastActivity >= accountAgeDays - 1);
    const isNewAndInactive = accountAgeDays < 7 && daysSinceLastActivity > 2 && hasRealActivityData;
    const isOldAndSuddenlyActive = accountAgeDays > 30 && daysSinceLastActivity < 1 && hasRealActivityData;

    // Calculate frequency score (0-1, higher = better engagement)
    let frequencyScore = 0;
    if (accountAgeDays > 0 && hasRealActivityData) {
      const expectedLogins = Math.min(accountAgeDays, 30);
      const actualEngagement = Math.max(0, 30 - daysSinceLastActivity);
      frequencyScore = Math.min(actualEngagement / expectedLogins, 1);
    } else if (!hasRealActivityData && accountAgeDays > 0) {
      // Penalize accounts with no real activity data
      frequencyScore = 0.1; // Very low but not zero
    }

    return {
      accountAgeDays,
      daysSinceLastSeen,
      daysSinceLastActivity,
      isOnline: user.isOnline || false,
      isDormant,
      isHighlyDormant,
      isNewAndInactive,
      isOldAndSuddenlyActive,
      frequencyScore: Math.round(frequencyScore * 100) / 100,
      hasRealActivityData,
      lastSeen: lastSeen ? lastSeen.toISOString() : null,
      lastActivity: lastActivity ? lastActivity.toISOString() : null,
      mostRecentActivity: lastActivityTime.toISOString()
    };
  } catch (error) {
    return {
      accountAgeDays: 0,
      daysSinceLastSeen: 999,
      daysSinceLastActivity: 999,
      isDormant: true,
      isHighlyDormant: true,
      frequencyScore: 0,
      hasRealActivityData: false,
      error: error.message
    };
  }
};

// Enhanced fraud detection function
const calculateAdvancedFraudScore = async (user, affiliates) => {
  try {
    let riskScore = 0;
    let riskFactors = [];

    // Existing fraud checks
    const uniqueIPs = new Set();
    const uniqueCountries = new Set();
    const uniqueDevices = new Set();
    let rapidSignups = 0;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    affiliates.forEach(affiliate => {
      if (affiliate.ipAddress) uniqueIPs.add(affiliate.ipAddress);
      if (affiliate.country) uniqueCountries.add(affiliate.country);
      if (affiliate.deviceFingerprint) uniqueDevices.add(affiliate.deviceFingerprint);
      if (new Date(affiliate.createdAt) > dayAgo) rapidSignups++;
    });

    // Original risk factors
    if (rapidSignups > 5) {
      riskScore += 25;
      riskFactors.push('rapid_growth');
    }
    if (uniqueIPs.size < affiliates.length * 0.5) {
      riskScore += 20;
      riskFactors.push('same_ip_cluster');
    }
    if (uniqueDevices.size < affiliates.length * 0.3) {
      riskScore += 20;
      riskFactors.push('same_device_cluster');
    }
    if (uniqueCountries.size === 1 && affiliates.length > 10) {
      riskScore += 15;
      riskFactors.push('single_country');
    }

    // NEW: Activity diversity analysis
    const activityAnalysis = await calculateActivityDiversityScore(user._id);
    if (activityAnalysis.score < 0.1 && user.affiliateCount > 5) {
      riskScore += 25;
      riskFactors.push('very_low_activity_diversity');
    } else if (activityAnalysis.score < 0.2 && user.affiliateCount > 3) {
      riskScore += 15;
      riskFactors.push('low_activity_diversity');
    }

    // NEW: Login frequency analysis
    const loginAnalysis = calculateLoginFrequencyAnalysis(user);
    if (loginAnalysis.isNewAndInactive && user.affiliateCount > 0) {
      riskScore += 20;
      riskFactors.push('new_inactive_with_affiliates');
    }
    if (loginAnalysis.isHighlyDormant && user.affiliateCount > 5) {
      riskScore += 15;
      riskFactors.push('dormant_with_many_affiliates');
    }
    if (loginAnalysis.frequencyScore < 0.1 && user.affiliateCount > 3) {
      riskScore += 15;
      riskFactors.push('poor_login_frequency');
    }

    // Check affiliate activity diversity (if they're all inactive, that's suspicious)
    if (affiliates.length > 0) {
      const affiliateActivityPromises = affiliates.map(affiliate => 
        calculateActivityDiversityScore(affiliate._id || affiliate.id)
      );
      const affiliateActivities = await Promise.all(affiliateActivityPromises);
      const lowActivityAffiliates = affiliateActivities.filter(a => a.score < 0.1).length;
      const lowActivityRatio = lowActivityAffiliates / affiliates.length;
      
      if (lowActivityRatio > 0.8 && affiliates.length > 5) {
        riskScore += 20;
        riskFactors.push('affiliates_all_inactive');
      } else if (lowActivityRatio > 0.6 && affiliates.length > 3) {
        riskScore += 10;
        riskFactors.push('most_affiliates_inactive');
      }
    }

    return {
      riskScore: Math.min(riskScore, 100),
      riskFactors,
      activityAnalysis,
      loginAnalysis,
      networkAnalysis: {
        uniqueIPs: uniqueIPs.size,
        uniqueCountries: uniqueCountries.size,
        uniqueDevices: uniqueDevices.size,
        rapidSignups
      }
    };
  } catch (error) {
    return {
      riskScore: 0,
      riskFactors: ['calculation_error'],
      error: error.message
    };
  }
};

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