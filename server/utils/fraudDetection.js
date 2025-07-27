const User = require('../models/User');
const Service = require('../models/Service');
const Job = require('../models/Job');
const Review = require('../models/Review');
const BumpRequest = require('../models/BumpRequest');
const mongoose = require('mongoose');

const calculateActivityDiversityScore = async (userId) => {
  try {
    // Get all activities for this user
    const [services, jobs, reviews, bumps] = await Promise.all([
      Service.find({ user: userId }),
      Job.find({ user: userId }),
      Review.find({ user: userId }),
      BumpRequest.find({ user: userId })
    ]);

    const activities = {
      services: services.length,
      jobs: jobs.length,
      reviews: reviews.length,
      bumps: bumps.length
    };

    // Calculate diversity score (0-1, higher is more diverse)
    const totalActivities = Object.values(activities).reduce((sum, count) => sum + count, 0);
    if (totalActivities === 0) return 0;

    const activityTypes = Object.values(activities).filter(count => count > 0).length;
    const diversityScore = activityTypes / 4; // 4 total activity types

    return {
      score: diversityScore,
      breakdown: activities,
      totalActivities
    };
  } catch (error) {
    console.error('Error calculating activity diversity:', error);
    return { score: 0, breakdown: {}, totalActivities: 0 };
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