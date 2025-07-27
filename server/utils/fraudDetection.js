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
    if (!user.loginHistory || user.loginHistory.length === 0) {
      return { score: 0, pattern: 'insufficient_data' };
    }

    const logins = user.loginHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const recentLogins = logins.filter(login => new Date(login.timestamp) > thirtyDaysAgo);
    
    if (recentLogins.length < 2) {
      return { score: 0, pattern: 'insufficient_recent_data' };
    }

    // Calculate intervals between logins
    const intervals = [];
    for (let i = 0; i < recentLogins.length - 1; i++) {
      const interval = new Date(recentLogins[i].timestamp) - new Date(recentLogins[i + 1].timestamp);
      intervals.push(interval / (1000 * 60 * 60)); // Convert to hours
    }

    // Calculate patterns
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Score based on regularity (lower variance = higher score)
    const regularityScore = Math.min(1, 1 / (1 + stdDev / avgInterval));
    
    let pattern = 'normal';
    if (avgInterval < 1) pattern = 'very_frequent';
    else if (avgInterval < 6) pattern = 'frequent';
    else if (avgInterval > 168) pattern = 'infrequent';

    return {
      score: regularityScore,
      pattern,
      avgIntervalHours: avgInterval,
      recentLoginCount: recentLogins.length
    };
  } catch (error) {
    console.error('Error calculating login frequency:', error);
    return { score: 0, pattern: 'error' };
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

    return analysis;
  } catch (error) {
    console.error('Error calculating advanced fraud score:', error);
    return {
      riskLevel: 'unknown',
      riskScore: 0,
      flags: ['analysis_error'],
      details: { error: error.message }
    };
  }
};

module.exports = {
  calculateActivityDiversityScore,
  calculateLoginFrequencyAnalysis,
  calculateAdvancedFraudScore
}; 