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

const calculateActivityDiversityScore = async (userInput) => {
  try {
    // Accept either userId or user object for flexibility
    let user;
    if (typeof userInput === 'string' || userInput instanceof mongoose.Types.ObjectId) {
      // Input validation for userId
      if (!userInput || !mongoose.Types.ObjectId.isValid(userInput)) {
        return { score: 0, activities: {}, error: 'Invalid user ID' };
      }
      user = await User.findById(userInput);
      if (!user) return { score: 0, activities: {}, error: 'User not found' };
    } else {
      // Use provided user object
      user = userInput;
    }

    // Optimize with parallel queries using Promise.all
    const userId = user._id;
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

    // Calculate total activity volume (more important than diversity for legitimate users)
    const totalActivities = servicesCreated + jobsPosted + bookingsMade + servicesBooked + 
                           tokenReviewsWritten + serviceReviewsWritten + gamesCreated + 
                           socialRaidsParticipated + tokenPurchasesMade + pointsEarned + pointsSpent;

    // If user has high activity volume, they're likely legitimate regardless of diversity
    let diversityScore = 0;
    if (totalActivities >= 20) {
      // High activity users get good diversity score even if specialized
      diversityScore = 0.8;
    } else if (totalActivities >= 10) {
      diversityScore = 0.6;
    } else if (totalActivities >= 5) {
      diversityScore = 0.4;
    } else {
      // Only penalize users with very low total activity
      const activeTypes = Object.values(activities).filter((value, index) => {
        const key = Object.keys(activities)[index];
        if (key === 'hasCustomImage' || key === 'emailVerified') {
          return activities[key];
        }
        return activities[key] > 0;
      }).length;
      diversityScore = Math.min(0.7, activeTypes / 14); // Max 0.7 for low-activity users
    }

    return {
      score: Math.round(diversityScore * 100) / 100,
      activities,
      totalActivities,
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

    // 1. Network Analysis - Use actual User model fields
    const uniqueIPs = new Set();
    const uniqueCountries = new Set();
    const uniqueDevices = new Set();
    
    // Parse multiple IPs from user.ipAddress (comma-separated)
    if (user.ipAddress) {
      const ips = user.ipAddress.split(',').map(ip => ip.trim()).filter(ip => ip);
      ips.forEach(ip => uniqueIPs.add(ip));
    }
    
    // Add user's country
    if (user.country) {
      uniqueCountries.add(user.country);
    }
    
    // Add user's device fingerprint
    if (user.deviceFingerprint) {
      uniqueDevices.add(user.deviceFingerprint);
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
      const inactiveAffiliates = [];
      const unverifiedAffiliates = [];
      const now = new Date();
      
      for (const affiliate of affiliates) {
        // Check for rapid signups - with null checks
        const signupTime = affiliate.createdAt ? new Date(affiliate.createdAt) : null;
        const userSignupTime = user.createdAt ? new Date(user.createdAt) : null;
        
        if (signupTime && userSignupTime && !isNaN(signupTime.getTime()) && !isNaN(userSignupTime.getTime())) {
          const timeDiff = Math.abs(signupTime - userSignupTime) / (1000 * 60 * 60); // hours
          if (timeDiff < 24) {
            rapidSignups.push(affiliate._id);
          }
        }

        // Check for shared IPs using actual affiliate ipAddress field
        if (affiliate.ipAddress) {
          const affiliateIPs = affiliate.ipAddress.split(',').map(ip => ip.trim()).filter(ip => ip);
          affiliateIPs.forEach(ip => {
            if (uniqueIPs.has(ip)) {
              sharedIPs.add(ip);
            }
          });
        }

        // CRITICAL: Check if affiliate is actually active - with null checks
        const createdAt = affiliate.createdAt ? new Date(affiliate.createdAt) : null;
        if (!createdAt || isNaN(createdAt.getTime())) {
          // Skip invalid affiliate data
          continue;
        }
        
        const accountAge = (now - createdAt) / (1000 * 60 * 60 * 24); // days
        const lastActivity = affiliate.lastActivity ? new Date(affiliate.lastActivity) : createdAt;
        const daysSinceLastActivity = isNaN(lastActivity.getTime()) ? accountAge : (now - lastActivity) / (1000 * 60 * 60 * 24);
        
        // More aggressive inactivity detection for fraud prevention
        // Flag as inactive if:
        // 1. Account is over 3 days old AND no activity in last 14 days, OR
        // 2. Account is over 14 days old AND no activity in last 30 days, OR  
        // 3. Account is over 30 days old AND no activity in last 60 days
        const isInactive = (accountAge > 3 && daysSinceLastActivity > 14) || 
                          (accountAge > 14 && daysSinceLastActivity > 30) ||
                          (accountAge > 30 && daysSinceLastActivity > 60) ||
                          (!affiliate.lastActivity && accountAge > 1); // No lastActivity and older than 1 day
        
        // Additional check: Low engagement patterns (common in fake accounts)
        // Users get 1000 bonus points for signing up with affiliate, so threshold should be higher
        const hasMinimalEngagement = (affiliate.points || 0) <= 1100 && accountAge > 7; // Only signup bonus + minimal activity after 1 week
        const isLikelyFake = hasMinimalEngagement || isInactive;
        
        // Debug logging for Sethobra specifically
        if (user.username === 'Sethobra') {
          console.log(`  📋 Affiliate ${affiliate.username}: Age=${Math.round(accountAge)} days, LastActivity=${Math.round(daysSinceLastActivity)} days ago, Points=${affiliate.points || 0}, Verified=${affiliate.emailVerified}, Inactive=${isInactive}, MinimalEng=${hasMinimalEngagement}, IsFake=${isLikelyFake}`);
        }
        
        if (isLikelyFake) {
          inactiveAffiliates.push(affiliate._id);
        }
        
        // Track unverified affiliates - with null check
        if (affiliate.emailVerified === false || affiliate.emailVerified === undefined || affiliate.emailVerified === null) {
          unverifiedAffiliates.push(affiliate._id);
        }
      }

      analysis.details.affiliateNetwork = {
        totalAffiliates: affiliates.length,
        rapidSignups: rapidSignups.length,
        sharedIPs: sharedIPs.size,
        inactiveAffiliates: inactiveAffiliates.length,
        unverifiedAffiliates: unverifiedAffiliates.length,
        inactiveRatio: affiliates.length > 0 ? Math.round((inactiveAffiliates.length / affiliates.length) * 100) / 100 : 0,
        unverifiedRatio: affiliates.length > 0 ? Math.round((unverifiedAffiliates.length / affiliates.length) * 100) / 100 : 0
      };
      
      // Add to networkDiversity for calling code compatibility
      analysis.details.networkDiversity.rapidSignups = rapidSignups.length;
      analysis.details.networkDiversity.totalAffiliates = affiliates.length;

      // Flag: Too many rapid signups
      const rapidSignupRatio = rapidSignups.length / affiliates.length;
      if (rapidSignups.length > 5 && rapidSignupRatio > 0.3) {
        analysis.flags.push('rapid_affiliate_signups');
        analysis.riskScore += 0.25;
      }

      // Flag: High percentage of inactive/unverified affiliates (KEY FRAUD INDICATOR)
      const inactiveRatio = inactiveAffiliates.length / affiliates.length;
      const unverifiedRatio = unverifiedAffiliates.length / affiliates.length;
      
      // More aggressive thresholds for dormant affiliates
      if (affiliates.length >= 10 && inactiveRatio > 0.6) {
        analysis.flags.push('mostly_inactive_affiliates');
        analysis.riskScore += 0.5; // High penalty for fake affiliate networks
      } else if (affiliates.length >= 5 && inactiveRatio > 0.7) {
        analysis.flags.push('inactive_affiliates');
        analysis.riskScore += 0.3;
      }
      
      // Flag high percentage of unverified affiliates
      if (affiliates.length >= 5 && unverifiedRatio > 0.5) {
        analysis.flags.push('mostly_unverified_affiliates');
        analysis.riskScore += 0.3; // Penalty for unverified affiliate networks
      }
      
      // Combined penalty for both inactive AND unverified patterns
      if (affiliates.length >= 10 && (inactiveRatio + unverifiedRatio) > 1.0) {
        analysis.flags.push('fake_affiliate_network');
        analysis.riskScore += 0.2; // Additional penalty for combined pattern
      }

      // Flag: Suspiciously high affiliate count for referral fraud
      if (affiliates.length > 50) {
        analysis.flags.push('high_affiliate_count');
        analysis.riskScore += 0.2;
      } else if (affiliates.length > 25) {
        analysis.flags.push('elevated_affiliate_count');
        analysis.riskScore += 0.1;
      }

      // Flag: Shared IPs with affiliates (only if significant)
      const sharedIPRatio = sharedIPs.size / Math.max(1, affiliates.length);
      if (sharedIPs.size > 1 && sharedIPRatio > 0.2) {
        analysis.flags.push('shared_ips_with_affiliates');
        analysis.riskScore += 0.2;
      }
    }

    // 3. Activity Diversity Analysis
    const activityAnalysis = await calculateActivityDiversityScore(user);
    analysis.details.activityDiversity = activityAnalysis;

    // Only flag if BOTH low diversity AND low total activity (avoid penalizing specialists)
    if (activityAnalysis.score < 0.3 && (activityAnalysis.totalActivities || 0) < 5) {
      analysis.flags.push('low_activity_diversity');
      analysis.riskScore += 0.15;
    }
    
    // Give bonus for high activity ONLY if no suspicious affiliate patterns
    const hasSuspiciousAffiliates = analysis.flags.includes('mostly_inactive_affiliates') || 
                                   analysis.flags.includes('inactive_affiliates') ||
                                   analysis.flags.includes('mostly_unverified_affiliates') ||
                                   analysis.flags.includes('fake_affiliate_network') ||
                                   analysis.flags.includes('high_affiliate_count') ||
                                   analysis.flags.includes('rapid_affiliate_signups');
    
    if (!hasSuspiciousAffiliates) {
      // Only give activity bonuses to users without referral fraud patterns
      if ((activityAnalysis.totalActivities || 0) >= 20) {
        analysis.riskScore = Math.max(0, analysis.riskScore - 0.3); // Reduce risk for very active users
      } else if ((activityAnalysis.totalActivities || 0) >= 10) {
        analysis.riskScore = Math.max(0, analysis.riskScore - 0.2); // Reduce risk for active users
      }
    } else {
      // Users with suspicious affiliate patterns get additional penalty even if personally active
      analysis.riskScore += 0.1; // Small additional penalty for trying to hide fraud with activity
    }

    // 4. Login Pattern Analysis
    const loginAnalysis = calculateLoginFrequencyAnalysis(user);
    analysis.details.loginPatterns = loginAnalysis;

    if (loginAnalysis.pattern === 'very_frequent') {
      analysis.flags.push('suspicious_login_frequency');
      analysis.riskScore += 0.2;
    }

    // 5. Account Age vs Activity Analysis
    const accountAge = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24); // days
    const affiliateCount = analysis.details.affiliateNetwork?.totalAffiliates || 0;
    
    // Flag new accounts with too many affiliates too quickly
    if (accountAge < 7 && affiliateCount > 10) {
      analysis.flags.push('new_account_high_affiliates');
      analysis.riskScore += 0.3;
    } else if (accountAge < 30 && affiliateCount > 50) {
      analysis.flags.push('rapid_affiliate_farming');
      analysis.riskScore += 0.4;
    }
    
    // Flag accounts with affiliate-to-age ratio that suggests farming
    if (accountAge > 7) {
      const affiliatesPerDay = affiliateCount / accountAge;
      if (affiliatesPerDay > 2) { // More than 2 affiliates per day on average
        analysis.flags.push('high_affiliate_velocity');
        analysis.riskScore += 0.25;
      }
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
    
    // Debug logging for specific users or when score is unexpectedly low
    if (user.username === 'Sethobra' || user.username === 'DI_DAN101' || (affiliates?.length > 20 && analysis.riskScore < 50)) {
      console.log(`📊 Final analysis for ${user.username}: Risk Score = ${analysis.riskScore}%, Flags = [${analysis.flags.join(', ')}]`);
      console.log(`📈 Activity Score: ${analysis.details.activityDiversity?.score || 0}, Login Score: ${analysis.details.loginPatterns?.frequencyScore || 0}`);
      if (affiliates?.length > 0) {
        console.log(`🔗 Affiliate Network: ${analysis.details.affiliateNetwork?.inactiveAffiliates || 0}/${affiliates.length} inactive (${Math.round((analysis.details.affiliateNetwork?.inactiveRatio || 0) * 100)}%), ${analysis.details.affiliateNetwork?.unverifiedAffiliates || 0} unverified (${Math.round((analysis.details.affiliateNetwork?.unverifiedRatio || 0) * 100)}%)`);
      }
    }
    
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