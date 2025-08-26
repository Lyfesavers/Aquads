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
const { calculateActivityDiversityScore, calculateLoginFrequencyAnalysis, calculateAdvancedFraudScore } = require('../utils/fraudDetection');

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
          isUnverified: loginAnalysis.isUnverified,
          daysSinceLastSeen: loginAnalysis.daysSinceLastActivity,
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
        unverifiedAffiliates: affiliateDetails.filter(a => a.isUnverified).length,
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
            daysSinceLastSeen: fraudAnalysis.loginAnalysis?.daysSinceLastActivity || 999,
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

    // Find users with high affiliate counts - Remove date restriction to catch all suspicious patterns
    const suspiciousUsers = await User.find({
      affiliateCount: { $gte: parseInt(minAffiliates) }
    })
    .select('username email createdAt ipAddress country deviceFingerprint lastActivity lastSeen emailVerified affiliateCount points affiliates pointsHistory tokenHistory image')
    .populate({
      path: 'affiliates',
      select: 'username email createdAt ipAddress country deviceFingerprint lastActivity lastSeen emailVerified points',
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
        daysSinceLastSeen: fraudAnalysis.loginAnalysis?.daysSinceLastActivity || 999,
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

// Debug endpoint for dormant detection analysis
router.get('/debug/dormant-detection/:userId', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loginAnalysis = calculateLoginFrequencyAnalysis(user);
    
    // Get detailed breakdown of the calculation
    const now = new Date();
    const createdAt = new Date(user.createdAt);
    const accountAgeMs = now.getTime() - createdAt.getTime();
    const accountAgeDays = Math.max(0, Math.floor(accountAgeMs / (1000 * 60 * 60 * 24)));
    
    const timestamps = [user.lastSeen, user.lastActivity]
      .filter(Boolean)
      .map(t => {
        const date = new Date(t);
        return isNaN(date.getTime()) ? null : date;
      })
      .filter(Boolean);
    
    const mostRecentActivity = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
    const hasRealActivityData = mostRecentActivity !== null;
    const lastActivityTime = mostRecentActivity || createdAt;
    
    const daysSinceLastActivity = Math.max(0, Math.floor((now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      userId: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen,
      lastActivity: user.lastActivity,
      isOnline: user.isOnline,
      
      // Calculation breakdown
      calculationDetails: {
        now: now.toISOString(),
        accountAgeDays,
        hasRealActivityData,
        mostRecentActivity: mostRecentActivity?.toISOString(),
        lastActivityTime: lastActivityTime.toISOString(),
        daysSinceLastActivity,
        timestampsFound: timestamps.length,
        validTimestamps: timestamps.map(t => t.toISOString())
      },
      
      // Results
      loginAnalysis,
      
      // Recommendations
      recommendations: generateLoginRecommendations(loginAnalysis)
    });
  } catch (error) {
    console.error('Error in dormant detection debug:', error);
    res.status(500).json({ error: 'Failed to analyze dormant detection' });
  }
});

// Bulk dormant detection analysis for multiple users
router.post('/debug/bulk-dormant-analysis', auth, isAdmin, async (req, res) => {
  try {
    const { userIds, limit = 20 } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    // Limit to prevent overload
    const limitedUserIds = userIds.slice(0, parseInt(limit));
    
    const results = await Promise.all(
      limitedUserIds.map(async (userId) => {
        try {
          const user = await User.findById(userId);
          if (!user) {
            return { userId, error: 'User not found' };
          }

          const loginAnalysis = calculateLoginFrequencyAnalysis(user);
          
          return {
            userId: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            lastSeen: user.lastSeen,
            lastActivity: user.lastActivity,
            isOnline: user.isOnline,
            accountAgeDays: loginAnalysis.accountAgeDays,
            daysSinceLastActivity: loginAnalysis.daysSinceLastActivity,
            isDormant: loginAnalysis.isDormant,
            isUnverified: loginAnalysis.isUnverified,
            isHighlyDormant: loginAnalysis.isHighlyDormant,
            hasRealActivityData: loginAnalysis.hasRealActivityData,
            frequencyScore: loginAnalysis.frequencyScore,
            recommendations: generateLoginRecommendations(loginAnalysis)
          };
        } catch (error) {
          return { userId, error: error.message };
        }
      })
    );

    // Summary statistics
    const totalUsers = results.length;
    const dormantUsers = results.filter(r => !r.error && r.isDormant).length;
    const highlyDormantUsers = results.filter(r => !r.error && r.isHighlyDormant).length;
    const usersWithRealActivity = results.filter(r => !r.error && r.hasRealActivityData).length;
    const averageFrequencyScore = results.filter(r => !r.error).reduce((sum, r) => sum + (r.frequencyScore || 0), 0) / results.filter(r => !r.error).length;

    res.json({
      summary: {
        totalUsers,
        dormantUsers,
        highlyDormantUsers,
        usersWithRealActivity,
        averageFrequencyScore: Math.round(averageFrequencyScore * 100) / 100
      },
      results
    });
  } catch (error) {
    console.error('Error in bulk dormant analysis:', error);
    res.status(500).json({ error: 'Failed to perform bulk dormant analysis' });
  }
});

module.exports = router; 