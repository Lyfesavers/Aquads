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
    console.error('Error calculating activity diversity:', error);
    return { score: 0, activities: {}, error: error.message };
  }
};

// Helper function to calculate login frequency analysis
const calculateLoginFrequencyAnalysis = (user) => {
  try {
    const now = new Date();
    const createdAt = new Date(user.createdAt);
    const lastSeen = user.lastSeen ? new Date(user.lastSeen) : createdAt;
    const lastActivity = user.lastActivity ? new Date(user.lastActivity) : createdAt;

    // Calculate account age in days
    const accountAgeMs = now.getTime() - createdAt.getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    // Calculate days since last seen/activity
    const daysSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate engagement metrics
    const isDormant = daysSinceLastSeen > 7; // No activity for a week
    const isHighlyDormant = daysSinceLastSeen > 30; // No activity for a month
    const isNewAndInactive = accountAgeDays < 7 && daysSinceLastSeen > 2; // New account but already inactive
    const isOldAndSuddenlyActive = accountAgeDays > 30 && daysSinceLastActivity < 1; // Old account suddenly active

    // Calculate frequency score (0-1, higher = better engagement)
    let frequencyScore = 0;
    if (accountAgeDays > 0) {
      const expectedLogins = Math.min(accountAgeDays, 30); // Expect at least some activity
      const actualEngagement = Math.max(0, 30 - daysSinceLastSeen); // Recent activity is good
      frequencyScore = Math.min(actualEngagement / expectedLogins, 1);
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
      lastSeen: lastSeen.toISOString(),
      lastActivity: lastActivity.toISOString()
    };
  } catch (error) {
    console.error('Error calculating login frequency:', error);
    return {
      accountAgeDays: 0,
      daysSinceLastSeen: 999,
      isDormant: true,
      frequencyScore: 0,
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
    console.error('Error calculating advanced fraud score:', error);
    return {
      riskScore: 0,
      riskFactors: ['calculation_error'],
      error: error.message
    };
  }
};

// Get detailed affiliate information for a specific user
router.get('/user/:userId/affiliates', auth, isAdmin, async (req, res) => {
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

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        totalAffiliates: user.affiliateCount,
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
    console.error('Error fetching affiliate details:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate details' });
  }
});

// Get bulk affiliate information for multiple users
router.post('/bulk-affiliate-lookup', auth, isAdmin, async (req, res) => {
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
    console.error('Error in bulk affiliate lookup:', error);
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
    console.error('Error fetching top affiliates:', error);
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
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get users with suspicious patterns
router.get('/suspicious-users', auth, isAdmin, async (req, res) => {
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
    console.error('Error fetching suspicious users:', error);
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
    console.error('Error fetching activity analysis:', error);
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

module.exports = router; 