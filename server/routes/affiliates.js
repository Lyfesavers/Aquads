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
    // Input validation
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return { score: 0, activities: {}, error: 'Invalid user ID' };
    }

    const user = await User.findById(userId);
    if (!user) return { score: 0, activities: {}, error: 'User not found' };

    // Optimize with parallel queries using Promise.all
    const [
      servicesCreated,
      jobsPosted,
      bookingsMade,
      servicesBooked,
      tokenReviewsWritten,
      serviceReviewsWritten,
      gamesCreated,
      socialRaidsParticipated,
      tokenPurchasesMade
    ] = await Promise.all([
      Service.countDocuments({ seller: userId }),
      Job.countDocuments({ owner: userId }),
      Booking.countDocuments({ buyerId: userId }),
      Booking.countDocuments({ sellerId: userId }),
      Review.countDocuments({ userId: userId }),
      ServiceReview.countDocuments({ userId: userId }),
      Game.countDocuments({ owner: userId }),
      TwitterRaid.countDocuments({ 'completions.userId': userId }),
      TokenPurchase.countDocuments({ userId: userId })
    ]);

    // Safe calculations with null checks
    const pointsEarned = user.pointsHistory ? user.pointsHistory.filter(p => p && p.amount > 0).length : 0;
    const pointsSpent = user.pointsHistory ? user.pointsHistory.filter(p => p && p.amount < 0).length : 0;
    const tokenTransactions = user.tokenHistory ? user.tokenHistory.length : 0;
    const hasCustomImage = user.image && user.image !== 'https://i.imgur.com/6VBx3io.png';
    const emailVerified = Boolean(user.emailVerified);

    const activities = {
      servicesCreated,
      jobsPosted,
      bookingsMade,
      servicesBooked,
      tokenReviewsWritten,
      serviceReviewsWritten,
      gamesCreated,
      socialRaidsParticipated,
      tokenPurchasesMade,
      pointsEarned,
      pointsSpent,
      tokenTransactions,
      hasCustomImage,
      emailVerified
    };

    // Weighted activity types for more accurate fraud detection
    const activityWeights = {
      servicesCreated: 2,        // High weight - requires real engagement
      jobsPosted: 2,             // High weight - requires real engagement
      bookingsMade: 3,           // Very high weight - financial commitment
      servicesBooked: 3,         // Very high weight - financial commitment
      tokenReviewsWritten: 1,    // Medium weight - easy to fake
      serviceReviewsWritten: 1,  // Medium weight - easy to fake
      gamesCreated: 1,           // Medium weight - moderate engagement
      socialRaidsParticipated: 1, // Low weight - easy to fake
      tokenPurchasesMade: 3,     // Very high weight - financial commitment
      pointsSpent: 2,            // High weight - shows real platform usage
      tokenTransactions: 2,      // High weight - shows real platform usage
      hasCustomImage: 1,         // Low weight - easy to fake
      emailVerified: 1           // Low weight - basic requirement
    };

    // Calculate weighted diversity score
    let totalWeight = 0;
    let activeWeight = 0;
    
    Object.keys(activityWeights).forEach(key => {
      const weight = activityWeights[key];
      totalWeight += weight;
      
      if (key === 'hasCustomImage' || key === 'emailVerified') {
        if (activities[key]) activeWeight += weight;
      } else {
        if (activities[key] > 0) activeWeight += weight;
      }
    });

    const diversityScore = totalWeight > 0 ? activeWeight / totalWeight : 0;

    return {
      score: Math.round(diversityScore * 100) / 100,
      activities,
      activeTypes: Object.keys(activities).filter(key => {
        if (key === 'hasCustomImage' || key === 'emailVerified') {
          return activities[key];
        }
        return activities[key] > 0;
      }).length,
      maxPossibleTypes: Object.keys(activities).length,
      weightedScore: Math.round(diversityScore * 100) / 100
    };
  } catch (error) {
    console.error('Error calculating activity diversity score:', error);
    return { score: 0, activities: {}, error: 'Calculation failed' };
  }
};

// Helper function to calculate login frequency analysis
const calculateLoginFrequencyAnalysis = (user) => {
  try {
    // Input validation
    if (!user || !user.createdAt) {
      return {
        accountAgeDays: 0,
        daysSinceLastSeen: 999,
        daysSinceLastActivity: 999,
        isDormant: true,
        isHighlyDormant: true,
        frequencyScore: 0,
        hasRealActivityData: false,
        error: 'Invalid user data or missing creation date'
      };
    }

    const now = new Date();
    const createdAt = new Date(user.createdAt);
    
    // Validate creation date
    if (isNaN(createdAt.getTime())) {
      return {
        accountAgeDays: 0,
        daysSinceLastSeen: 999,
        daysSinceLastActivity: 999,
        isDormant: true,
        isHighlyDormant: true,
        frequencyScore: 0,
        hasRealActivityData: false,
        error: 'Invalid creation date'
      };
    }
    
    // Use the most recent activity timestamp available with validation
    const timestamps = [user.lastSeen, user.lastActivity]
      .filter(Boolean)
      .map(t => {
        const date = new Date(t);
        return isNaN(date.getTime()) ? null : date;
      })
      .filter(Boolean);
    
    const mostRecentActivity = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
    
    // If no activity timestamps are available, use creation date but flag it
    const hasRealActivityData = mostRecentActivity !== null;
    const lastActivityTime = mostRecentActivity || createdAt;
    
    // Separate lastSeen and lastActivity for more granular tracking
    const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
    const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;

    // Calculate account age in days with validation
    const accountAgeMs = now.getTime() - createdAt.getTime();
    const accountAgeDays = Math.max(0, Math.floor(accountAgeMs / (1000 * 60 * 60 * 24)));

    // Calculate days since most recent activity
    const daysSinceLastActivity = Math.max(0, Math.floor((now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60 * 24)));
    const daysSinceLastSeen = lastSeen && !isNaN(lastSeen.getTime()) ? 
      Math.max(0, Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24))) : 
      daysSinceLastActivity;

    // More accurate dormant detection with better thresholds
    const isDormant = hasRealActivityData ? daysSinceLastActivity > 7 : (accountAgeDays > 7 && daysSinceLastActivity >= accountAgeDays - 1);
    const isHighlyDormant = hasRealActivityData ? daysSinceLastActivity > 30 : (accountAgeDays > 30 && daysSinceLastActivity >= accountAgeDays - 1);
    const isNewAndInactive = accountAgeDays < 7 && daysSinceLastActivity > 2 && hasRealActivityData;
    const isOldAndSuddenlyActive = accountAgeDays > 30 && daysSinceLastActivity < 1 && hasRealActivityData;

    // Calculate frequency score (0-1, higher = better engagement) with better logic
    let frequencyScore = 0;
    if (accountAgeDays > 0) {
      if (hasRealActivityData) {
        const expectedLogins = Math.min(accountAgeDays, 30);
        const actualEngagement = Math.max(0, 30 - daysSinceLastActivity);
        frequencyScore = expectedLogins > 0 ? Math.min(actualEngagement / expectedLogins, 1) : 0;
      } else {
        // Penalize accounts with no real activity data based on account age
        if (accountAgeDays < 7) {
          frequencyScore = 0.3; // Give new accounts some benefit of doubt
        } else if (accountAgeDays < 30) {
          frequencyScore = 0.2; // Moderate penalty for older accounts with no activity
        } else {
          frequencyScore = 0.1; // High penalty for very old accounts with no activity
        }
      }
    }

    return {
      accountAgeDays,
      daysSinceLastSeen,
      daysSinceLastActivity,
      isOnline: Boolean(user.isOnline),
      isDormant,
      isHighlyDormant,
      isNewAndInactive,
      isOldAndSuddenlyActive,
      frequencyScore: Math.round(frequencyScore * 100) / 100,
      hasRealActivityData,
      lastSeen: lastSeen && !isNaN(lastSeen.getTime()) ? lastSeen.toISOString() : null,
      lastActivity: lastActivity && !isNaN(lastActivity.getTime()) ? lastActivity.toISOString() : null,
      mostRecentActivity: lastActivityTime.toISOString()
    };
  } catch (error) {
    console.error('Error calculating login frequency analysis:', error);
    return {
      accountAgeDays: 0,
      daysSinceLastSeen: 999,
      daysSinceLastActivity: 999,
      isDormant: true,
      isHighlyDormant: true,
      frequencyScore: 0,
      hasRealActivityData: false,
      error: 'Login frequency analysis failed'
    };
  }
};

// Enhanced fraud detection function
const calculateAdvancedFraudScore = async (user, affiliates) => {
  try {
    // Input validation
    if (!user || !user._id) {
      return {
        riskScore: 0,
        riskFactors: ['invalid_user_data'],
        error: 'Invalid user data provided'
      };
    }

    if (!Array.isArray(affiliates)) {
      affiliates = [];
    }

    let riskScore = 0;
    let riskFactors = [];

    // Safe affiliate network analysis with null checks
    const uniqueIPs = new Set();
    const uniqueCountries = new Set();
    const uniqueDevices = new Set();
    let rapidSignups = 0;
    let validAffiliates = 0;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    affiliates.forEach(affiliate => {
      if (affiliate && affiliate.createdAt) {
        validAffiliates++;
        if (affiliate.ipAddress && typeof affiliate.ipAddress === 'string') {
          uniqueIPs.add(affiliate.ipAddress.trim());
        }
        if (affiliate.country && typeof affiliate.country === 'string') {
          uniqueCountries.add(affiliate.country.trim());
        }
        if (affiliate.deviceFingerprint && typeof affiliate.deviceFingerprint === 'string') {
          uniqueDevices.add(affiliate.deviceFingerprint.trim());
        }
        if (new Date(affiliate.createdAt) > dayAgo) {
          rapidSignups++;
        }
      }
    });

    // Network-based risk factors with proper validation
    if (rapidSignups > 5) {
      riskScore += 25;
      riskFactors.push('rapid_growth');
    }
    
    // Only apply IP clustering if we have sufficient data
    if (validAffiliates >= 2 && uniqueIPs.size > 0) {
      const ipRatio = uniqueIPs.size / validAffiliates;
      if (ipRatio < 0.5 && validAffiliates >= 4) {
        riskScore += 20;
        riskFactors.push('same_ip_cluster');
      }
    }
    
    // Device clustering analysis
    if (validAffiliates >= 3 && uniqueDevices.size > 0) {
      const deviceRatio = uniqueDevices.size / validAffiliates;
      if (deviceRatio < 0.3 && validAffiliates >= 5) {
        riskScore += 20;
        riskFactors.push('same_device_cluster');
      }
    }
    
    // Country diversity analysis
    if (uniqueCountries.size === 1 && validAffiliates > 10) {
      riskScore += 15;
      riskFactors.push('single_country');
    }

    // Enhanced activity diversity analysis
    const activityAnalysis = await calculateActivityDiversityScore(user._id);
    const userAffiliateCount = user.affiliateCount || 0;
    
    if (activityAnalysis && !activityAnalysis.error) {
      if (activityAnalysis.score < 0.1 && userAffiliateCount > 5) {
        riskScore += 30;
        riskFactors.push('very_low_activity_diversity');
      } else if (activityAnalysis.score < 0.2 && userAffiliateCount > 3) {
        riskScore += 20;
        riskFactors.push('low_activity_diversity');
      } else if (activityAnalysis.score < 0.3 && userAffiliateCount > 10) {
        riskScore += 15;
        riskFactors.push('moderate_activity_diversity');
      }
    }

    // Enhanced login frequency analysis
    const loginAnalysis = calculateLoginFrequencyAnalysis(user);
    if (loginAnalysis && !loginAnalysis.error) {
      if (loginAnalysis.isNewAndInactive && userAffiliateCount > 0) {
        riskScore += 25;
        riskFactors.push('new_inactive_with_affiliates');
      }
      if (loginAnalysis.isHighlyDormant && userAffiliateCount > 5) {
        riskScore += 20;
        riskFactors.push('dormant_with_many_affiliates');
      }
      if (loginAnalysis.frequencyScore < 0.1 && userAffiliateCount > 3) {
        riskScore += 15;
        riskFactors.push('poor_login_frequency');
      }
      if (loginAnalysis.isOldAndSuddenlyActive && userAffiliateCount > 10) {
        riskScore += 10;
        riskFactors.push('suspicious_reactivation');
      }
    }

    // Affiliate activity diversity analysis with better error handling
    if (validAffiliates > 0) {
      try {
        const affiliateActivityPromises = affiliates
          .filter(affiliate => affiliate && affiliate._id)
          .map(affiliate => calculateActivityDiversityScore(affiliate._id || affiliate.id));
        
        const affiliateActivities = await Promise.all(affiliateActivityPromises);
        const validActivities = affiliateActivities.filter(a => a && !a.error);
        
        if (validActivities.length > 0) {
          const lowActivityAffiliates = validActivities.filter(a => a.score < 0.1).length;
          const lowActivityRatio = lowActivityAffiliates / validActivities.length;
          
          if (lowActivityRatio > 0.8 && validActivities.length > 5) {
            riskScore += 25;
            riskFactors.push('affiliates_all_inactive');
          } else if (lowActivityRatio > 0.6 && validActivities.length > 3) {
            riskScore += 15;
            riskFactors.push('most_affiliates_inactive');
          }
        }
      } catch (affiliateError) {
        console.error('Error analyzing affiliate activities:', affiliateError);
        riskFactors.push('affiliate_analysis_failed');
      }
    }

    // Additional risk factors for better fraud detection
    if (userAffiliateCount > 50) {
      riskScore += 15;
      riskFactors.push('excessive_affiliate_count');
    }

    // Cross-reference with user behavior patterns
    if (user.createdAt) {
      const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
      const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
      
      if (accountAgeDays < 30 && userAffiliateCount > 20) {
        riskScore += 20;
        riskFactors.push('rapid_affiliate_growth');
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
        rapidSignups,
        validAffiliates,
        totalAffiliates: affiliates.length
      }
    };
  } catch (error) {
    console.error('Error calculating advanced fraud score:', error);
    return {
      riskScore: 0,
      riskFactors: ['calculation_error'],
      error: 'Fraud score calculation failed'
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