const User = require('../models/User');
const Service = require('../models/Service');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const ServiceReview = require('../models/ServiceReview');
const Game = require('../models/Game');
const TwitterRaid = require('../models/TwitterRaid');
const TokenPurchase = require('../models/TokenPurchase');
const BumpRequest = require('../models/BumpRequest');
const mongoose = require('mongoose');

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

const calculateAdvancedFraudScore = async (user, affiliates) => {
  try {
    const analysis = {
      riskLevel: 'low',
      riskScore: 0,
      flags: [],
      details: {}
    };

    // 1. Network Analysis
    const uniqueIPs = new Set();
    const uniqueCountries = new Set();
    const uniqueDevices = new Set();
    
    if (user.loginHistory) {
      user.loginHistory.forEach(login => {
        if (login.ip) uniqueIPs.add(login.ip);
        if (login.country) uniqueCountries.add(login.country);
        if (login.device) uniqueDevices.add(login.device);
      });
    }

    analysis.details.networkDiversity = {
      uniqueIPs: uniqueIPs.size,
      uniqueCountries: uniqueCountries.size,
      uniqueDevices: uniqueDevices.size
    };

    // Flag: Too many different IPs
    if (uniqueIPs.size > 10) {
      analysis.flags.push('multiple_ips');
      analysis.riskScore += 0.3;
    }

    // Flag: Multiple countries
    if (uniqueCountries.size > 3) {
      analysis.flags.push('multiple_countries');
      analysis.riskScore += 0.2;
    }

    // 2. Affiliate Network Analysis
    if (affiliates && affiliates.length > 0) {
      const rapidSignups = [];
      const sharedIPs = new Set();
      
      for (const affiliate of affiliates) {
        // Check for rapid signups
        const signupTime = new Date(affiliate.createdAt);
        const userSignupTime = new Date(user.createdAt);
        const timeDiff = Math.abs(signupTime - userSignupTime) / (1000 * 60 * 60); // hours
        
        if (timeDiff < 24) {
          rapidSignups.push(affiliate._id);
        }

        // Check for shared IPs
        if (affiliate.loginHistory) {
          affiliate.loginHistory.forEach(login => {
            if (login.ip && uniqueIPs.has(login.ip)) {
              sharedIPs.add(login.ip);
            }
          });
        }
      }

      analysis.details.affiliateNetwork = {
        totalAffiliates: affiliates.length,
        rapidSignups: rapidSignups.length,
        sharedIPs: sharedIPs.size
      };
      
      // Add to networkDiversity for calling code compatibility
      analysis.details.networkDiversity.rapidSignups = rapidSignups.length;
      analysis.details.networkDiversity.totalAffiliates = affiliates.length;

      // Flag: Too many rapid signups
      if (rapidSignups.length > 5) {
        analysis.flags.push('rapid_affiliate_signups');
        analysis.riskScore += 0.4;
      }

      // Flag: Shared IPs with affiliates
      if (sharedIPs.size > 0) {
        analysis.flags.push('shared_ips_with_affiliates');
        analysis.riskScore += 0.3;
      }

      // Flag: Unusually high affiliate count
      if (affiliates.length > 50) {
        analysis.flags.push('high_affiliate_count');
        analysis.riskScore += 0.2;
      }
    }

    // 3. Activity Diversity Analysis
    const activityAnalysis = await calculateActivityDiversityScore(user._id);
    analysis.details.activityDiversity = activityAnalysis;

    if (activityAnalysis.score < 0.2 && activityAnalysis.totalActivities > 0) {
      analysis.flags.push('low_activity_diversity');
      analysis.riskScore += 0.1;
    }

    // 4. Login Pattern Analysis
    const loginAnalysis = calculateLoginFrequencyAnalysis(user);
    analysis.details.loginPatterns = loginAnalysis;

    if (loginAnalysis.pattern === 'very_frequent') {
      analysis.flags.push('suspicious_login_frequency');
      analysis.riskScore += 0.2;
    }

    // 5. Account Age vs Activity
    const accountAge = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24); // days
    if (accountAge < 7 && (analysis.details.affiliateNetwork?.totalAffiliates || 0) > 10) {
      analysis.flags.push('new_account_high_activity');
      analysis.riskScore += 0.3;
    }

    // Determine risk level
    analysis.riskScore = Math.min(1, analysis.riskScore);
    
    if (analysis.riskScore >= 0.7) {
      analysis.riskLevel = 'high';
    } else if (analysis.riskScore >= 0.4) {
      analysis.riskLevel = 'medium';
    } else {
      analysis.riskLevel = 'low';
    }

    // Convert risk score to 0-100 scale to match calling code expectations
    analysis.riskScore = Math.round(analysis.riskScore * 100);
    
    // Add embedded analysis objects for compatibility
    analysis.activityAnalysis = analysis.details.activityDiversity;
    analysis.loginAnalysis = analysis.details.loginPatterns;
    analysis.networkAnalysis = analysis.details.networkDiversity;
    
    // Rename flags to riskFactors for compatibility
    analysis.riskFactors = analysis.flags;
    delete analysis.flags;

    return analysis;
  } catch (error) {
    console.error('Error calculating advanced fraud score:', error);
    return {
      riskLevel: 'unknown',
      riskScore: 0,
      riskFactors: ['analysis_error'],
      details: { error: error.message },
      activityAnalysis: { score: 0, activities: {} },
      loginAnalysis: { frequencyScore: 0, isDormant: true, isHighlyDormant: true, daysSinceLastActivity: 999, accountAgeDays: 0 },
      networkAnalysis: { uniqueIPs: 0, uniqueCountries: 0, uniqueDevices: 0, rapidSignups: 0, totalAffiliates: 0 }
    };
  }
};

module.exports = {
  calculateActivityDiversityScore,
  calculateLoginFrequencyAnalysis,
  calculateAdvancedFraudScore
}; 