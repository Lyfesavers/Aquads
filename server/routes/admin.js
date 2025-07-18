const express = require('express');
const router = express.Router();
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
const mongoose = require('mongoose');
const { adminRateLimit } = require('../middleware/rateLimiter');
const telegramService = require('../utils/telegramService');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking admin status' });
  }
};

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

// Get detailed affiliate information for a specific user
router.get('/user/:userId/affiliates', auth, isAdmin, adminRateLimit, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user and populate their affiliates with detailed info
    const user = await User.findById(userId)
      .populate({
        path: 'affiliates',
        select: 'username email createdAt points tokens ipAddress country deviceFingerprint emailVerified affiliateCount lastSeen lastActivity isOnline',
        options: { sort: { createdAt: -1 } }
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate advanced fraud metrics for the main user
    const userFraudAnalysis = await calculateAdvancedFraudScore(user, user.affiliates);

    // Get additional stats for each affiliate
    const affiliateDetails = await Promise.all(
      user.affiliates.map(async (affiliate) => {
        // Get affiliate's own affiliates count
        const affiliateInfo = await User.findById(affiliate._id)
          .populate({
            path: 'affiliates',
            select: 'username createdAt',
            options: { sort: { createdAt: -1 } }
          });

        // Calculate activity and login metrics for each affiliate
        const activityAnalysis = await calculateActivityDiversityScore(affiliate._id);
        const loginAnalysis = calculateLoginFrequencyAnalysis(affiliate);

        return {
          id: affiliate._id,
          username: affiliate.username,
          email: affiliate.email,
          createdAt: affiliate.createdAt,
          points: affiliate.points,
          tokens: affiliate.tokens,
          ipAddress: affiliate.ipAddress,
          country: affiliate.country,
          deviceFingerprint: affiliate.deviceFingerprint,
          emailVerified: affiliate.emailVerified,
          affiliateCount: affiliate.affiliateCount,
          lastSeen: affiliate.lastSeen,
          lastActivity: affiliate.lastActivity,
          isOnline: affiliate.isOnline,
          // NEW: Enhanced metrics
          activityScore: activityAnalysis.score,
          activityDetails: activityAnalysis.activities,
          loginFrequency: loginAnalysis.frequencyScore,
          isDormant: loginAnalysis.isDormant,
          daysSinceLastSeen: loginAnalysis.daysSinceLastSeen,
          // Include their own affiliates for pattern detection
          subAffiliates: affiliateInfo?.affiliates || []
        };
      })
    );

    // Data integrity check: ensure affiliateCount matches actual affiliates
    const actualAffiliateCount = user.affiliates ? user.affiliates.length : 0;
    const storedAffiliateCount = user.affiliateCount || 0;
    const countMismatch = actualAffiliateCount !== storedAffiliateCount;
    
    // Log data integrity issues for monitoring
    if (countMismatch) {
      console.warn(`Data integrity issue - User ${user._id}: stored count ${storedAffiliateCount} vs actual ${actualAffiliateCount}`);
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        totalAffiliates: actualAffiliateCount, // Use actual count for accuracy
        storedAffiliateCount: storedAffiliateCount,
        countMismatch: countMismatch,
        // NEW: Enhanced user metrics
        activityScore: userFraudAnalysis.activityAnalysis?.score || 0,
        loginFrequency: userFraudAnalysis.loginAnalysis?.frequencyScore || 0,
        riskScore: userFraudAnalysis.riskScore,
        riskFactors: userFraudAnalysis.riskFactors
      },
      affiliates: affiliateDetails,
      summary: {
        totalAffiliates: affiliateDetails.length,
        emailVerified: affiliateDetails.filter(a => a.emailVerified).length,
        sameIP: affiliateDetails.filter(a => a.ipAddress === user.ipAddress).length,
        sameCountry: affiliateDetails.filter(a => a.country === user.country).length,
        sameDevice: affiliateDetails.filter(a => a.deviceFingerprint === user.deviceFingerprint).length,
        totalPoints: affiliateDetails.reduce((sum, a) => sum + (a.points || 0), 0),
        recentSignups: affiliateDetails.filter(a => {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return new Date(a.createdAt) > dayAgo;
        }).length,
        // NEW: Activity and engagement metrics
        averageActivityScore: affiliateDetails.length > 0 ? 
          Math.round((affiliateDetails.reduce((sum, a) => sum + a.activityScore, 0) / affiliateDetails.length) * 100) / 100 : 0,
        averageLoginFrequency: affiliateDetails.length > 0 ? 
          Math.round((affiliateDetails.reduce((sum, a) => sum + a.loginFrequency, 0) / affiliateDetails.length) * 100) / 100 : 0,
        dormantAffiliates: affiliateDetails.filter(a => a.isDormant).length,
        lowActivityAffiliates: affiliateDetails.filter(a => a.activityScore < 0.1).length
      },
      // NEW: Include detailed fraud analysis
      fraudAnalysis: userFraudAnalysis
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch affiliate details' });
  }
});

// Get bulk affiliate information for multiple users
router.post('/bulk-affiliate-lookup', auth, isAdmin, adminRateLimit, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    // Limit to 20 users at a time to prevent overload
    const limitedUserIds = userIds.slice(0, 20);
    
    const results = await Promise.all(
      limitedUserIds.map(async (userId) => {
        try {
          const user = await User.findById(userId)
            .populate({
              path: 'affiliates',
              select: 'username email createdAt points ipAddress country deviceFingerprint emailVerified',
              options: { sort: { createdAt: -1 } }
            });

          if (!user) {
            return { userId, error: 'User not found' };
          }

          // Enhanced fraud detection using new metrics
          const fraudAnalysis = await calculateAdvancedFraudScore(user, user.affiliates);

          return {
            userId: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            totalAffiliates: user.affiliates.length,
            flags: fraudAnalysis.riskFactors,
            riskScore: fraudAnalysis.riskScore,
            // NEW: Enhanced metrics
            activityScore: fraudAnalysis.activityAnalysis?.score || 0,
            loginFrequency: fraudAnalysis.loginAnalysis?.frequencyScore || 0,
            isDormant: fraudAnalysis.loginAnalysis?.isDormant || false,
            daysSinceLastSeen: fraudAnalysis.loginAnalysis?.daysSinceLastSeen || 999,
            networkAnalysis: fraudAnalysis.networkAnalysis,
            affiliates: user.affiliates.map(a => ({
              id: a._id,
              username: a.username,
              email: a.email,
              createdAt: a.createdAt,
              points: a.points,
              emailVerified: a.emailVerified,
              ipAddress: a.ipAddress,
              country: a.country
            }))
          };
        } catch (error) {
          return { userId, error: error.message };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform bulk lookup' });
  }
});

// Get top affiliates (users with most affiliates)
router.get('/top-affiliates', auth, isAdmin, async (req, res) => {
  try {
    const { limit = 50, minAffiliates = 5 } = req.query;
    
    const topAffiliates = await User.find({
      affiliateCount: { $gte: parseInt(minAffiliates) }
    })
    .select('username email createdAt affiliateCount points ipAddress country deviceFingerprint')
    .sort({ affiliateCount: -1 })
    .limit(parseInt(limit));

    res.json({
      topAffiliates: topAffiliates.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        affiliateCount: user.affiliateCount,
        points: user.points,
        ipAddress: user.ipAddress,
        country: user.country,
        deviceFingerprint: user.deviceFingerprint
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top affiliates' });
  }
});

// Search users by username or email
router.get('/search-users', auth, isAdmin, async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username email createdAt affiliateCount points ipAddress country')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        affiliateCount: user.affiliateCount,
        points: user.points,
        ipAddress: user.ipAddress,
        country: user.country
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get users with suspicious patterns
router.get('/suspicious-users', auth, isAdmin, adminRateLimit, async (req, res) => {
  try {
    const { minAffiliates = 10, daysBack = 30 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysBack));

    // Find users with high affiliate counts
    const suspiciousUsers = await User.find({
      affiliateCount: { $gte: parseInt(minAffiliates) },
      createdAt: { $gte: cutoffDate }
    })
    .populate({
      path: 'affiliates',
      select: 'username email createdAt ipAddress country deviceFingerprint',
      options: { sort: { createdAt: -1 } }
    })
    .sort({ affiliateCount: -1 })
    .limit(100);

    const flaggedUsers = await Promise.all(suspiciousUsers.map(async user => {
      // Use enhanced fraud detection
      const fraudAnalysis = await calculateAdvancedFraudScore(user, user.affiliates);

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        affiliateCount: user.affiliateCount,
        points: user.points,
        flags: fraudAnalysis.riskFactors,
        riskScore: fraudAnalysis.riskScore,
        // NEW: Enhanced metrics
        activityScore: fraudAnalysis.activityAnalysis?.score || 0,
        loginFrequency: fraudAnalysis.loginAnalysis?.frequencyScore || 0,
        isDormant: fraudAnalysis.loginAnalysis?.isDormant || false,
        isHighlyDormant: fraudAnalysis.loginAnalysis?.isHighlyDormant || false,
        daysSinceLastSeen: fraudAnalysis.loginAnalysis?.daysSinceLastSeen || 999,
        accountAgeDays: fraudAnalysis.loginAnalysis?.accountAgeDays || 0,
        // Network analysis
        uniqueIPs: fraudAnalysis.networkAnalysis?.uniqueIPs || 0,
        uniqueCountries: fraudAnalysis.networkAnalysis?.uniqueCountries || 0,
        uniqueDevices: fraudAnalysis.networkAnalysis?.uniqueDevices || 0,
        recentSignups: fraudAnalysis.networkAnalysis?.rapidSignups || 0
      };
    }));

    // Sort by risk score
    flaggedUsers.sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      suspiciousUsers: flaggedUsers,
      summary: {
        totalUsers: flaggedUsers.length,
        highRisk: flaggedUsers.filter(u => u.riskScore >= 75).length,
        mediumRisk: flaggedUsers.filter(u => u.riskScore >= 50 && u.riskScore < 75).length,
        lowRisk: flaggedUsers.filter(u => u.riskScore < 50).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suspicious users' });
  }
});

// Get detailed activity analysis for a user
router.get('/user/:userId/activity-analysis', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activityAnalysis = await calculateActivityDiversityScore(userId);
    const loginAnalysis = calculateLoginFrequencyAnalysis(user);

    res.json({
      userId: user._id,
      username: user.username,
      activityAnalysis: {
        ...activityAnalysis,
        recommendations: generateActivityRecommendations(activityAnalysis)
      },
      loginAnalysis: {
        ...loginAnalysis,
        recommendations: generateLoginRecommendations(loginAnalysis)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity analysis' });
  }
});

// Helper function to generate activity recommendations
const generateActivityRecommendations = (analysis) => {
  const recommendations = [];
  
  if (analysis.score < 0.1) {
    recommendations.push('CRITICAL: User shows almost no platform engagement');
  } else if (analysis.score < 0.3) {
    recommendations.push('WARNING: Low activity diversity suggests potential fraud');
  }
  
  if (!analysis.activities.emailVerified) {
    recommendations.push('User email not verified - suspicious for affiliate programs');
  }
  
  if (analysis.activities.hasCustomImage === false) {
    recommendations.push('Using default profile image - common in fake accounts');
  }
  
  if (analysis.activities.pointsSpent === 0 && analysis.activities.pointsEarned > 0) {
    recommendations.push('Has earned points but never spent any - hoarding behavior');
  }
  
  return recommendations;
};

// Helper function to generate login recommendations
const generateLoginRecommendations = (analysis) => {
  const recommendations = [];
  
  if (analysis.isNewAndInactive) {
    recommendations.push('ALERT: New account already inactive - possible throwaway');
  }
  
  if (analysis.isHighlyDormant) {
    recommendations.push('Account dormant for over 30 days');
  }
  
  if (analysis.frequencyScore < 0.2) {
    recommendations.push('Very poor login frequency for account age');
  }
  
  if (analysis.isOldAndSuddenlyActive) {
    recommendations.push('INVESTIGATE: Old dormant account suddenly active');
  }
  
  return recommendations;
};

// Add endpoint to check and fix affiliate count discrepancies
router.post('/sync-affiliate-counts', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('_id username affiliateCount');
    const discrepancies = [];
    const fixes = [];

    for (const user of users) {
      // Count actual affiliates by referredBy field
      const actualCount = await User.countDocuments({ referredBy: user._id });
      const storedCount = user.affiliateCount || 0;

      if (actualCount !== storedCount) {
        discrepancies.push({
          userId: user._id,
          username: user.username,
          actualCount,
          storedCount,
          difference: actualCount - storedCount
        });

        // Fix the discrepancy
        const affiliates = await User.find({ referredBy: user._id }).select('_id');
        await User.findByIdAndUpdate(user._id, {
          affiliateCount: actualCount,
          affiliates: affiliates.map(affiliate => affiliate._id)
        });

        fixes.push({
          userId: user._id,
          username: user.username,
          oldCount: storedCount,
          newCount: actualCount
        });
      }
    }

    res.json({
      message: 'Affiliate count sync completed',
      discrepanciesFound: discrepancies.length,
      discrepancies: discrepancies,
      fixes: fixes,
      totalUsersChecked: users.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync affiliate counts' });
  }
});

// Send top 10 bubbles notification to specific Telegram group
router.post('/send-top-bubbles', auth, isAdmin, async (req, res) => {
  try {
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ 
        error: 'chatId is required in request body',
        success: false
      });
    }

    const success = await telegramService.sendTopBubblesNotification(chatId);
    
    if (success) {
      res.json({ 
        message: 'Top bubbles notification sent successfully to the specified group',
        success: true
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send top bubbles notification',
        success: false
      });
    }
  } catch (error) {
    console.error('Error sending top bubbles notification:', error);
    res.status(500).json({ 
      error: 'Failed to send top bubbles notification',
      success: false
    });
  }
});

module.exports = router; 