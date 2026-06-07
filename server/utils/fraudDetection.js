const User = require('../models/User');
const Service = require('../models/Service');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const ServiceReview = require('../models/ServiceReview');
const Game = require('../models/Game');
const TwitterRaid = require('../models/TwitterRaid');
const TokenPurchase = require('../models/TokenPurchase');
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
    // For accounts with real activity data: dormant after 14 days, highly dormant after 60 days
    // For accounts without real activity data: be more lenient and consider account age
    // For unverified users: treat as inactive since they cannot access features
    let isDormant = false;
    let isHighlyDormant = false;
    
    // Check if user is unverified (cannot access features, so treat as inactive)
    const isUnverified = user.email && !user.emailVerified;
    
    if (isUnverified) {
      // Unverified users are considered dormant if account is older than 3 days
      // This is because they cannot access any features and are essentially inactive
      isDormant = accountAgeDays > 3;
      isHighlyDormant = accountAgeDays > 14;
                    } else if (hasRealActivityData) {
                  // For verified accounts with real activity data, use straightforward time-based detection
                  isDormant = daysSinceLastActivity > 7;
                  isHighlyDormant = daysSinceLastActivity > 30;
    } else {
      // For verified accounts without real activity data, be more sophisticated
      if (accountAgeDays <= 7) {
        // New accounts (less than 7 days old) are not considered dormant
        isDormant = false;
        isHighlyDormant = false;
      } else if (accountAgeDays <= 30) {
        // Accounts 7-30 days old: dormant if inactive for more than 80% of their lifetime
        isDormant = daysSinceLastActivity > (accountAgeDays * 0.8);
        isHighlyDormant = false; // Not highly dormant for accounts this new
      } else {
        // Older accounts: dormant if inactive for more than 70% of their lifetime
        isDormant = daysSinceLastActivity > (accountAgeDays * 0.7);
        isHighlyDormant = daysSinceLastActivity > (accountAgeDays * 0.9);
      }
    }
    const isNewAndInactive = accountAgeDays < 7 && daysSinceLastActivity > 2 && hasRealActivityData;
    const isOldAndSuddenlyActive = accountAgeDays > 30 && daysSinceLastActivity < 1 && hasRealActivityData;

    // Calculate frequency score (0-1, higher = better engagement) with better logic
    let frequencyScore = 0;
    if (accountAgeDays > 0) {
      if (hasRealActivityData) {
        // More nuanced frequency calculation
        const expectedLogins = Math.min(accountAgeDays, 30);
        const actualEngagement = Math.max(0, 30 - daysSinceLastActivity);
        frequencyScore = expectedLogins > 0 ? Math.min(actualEngagement / expectedLogins, 1) : 0;
        
        // Boost score for very recent activity, but cap it more reasonably
        if (daysSinceLastActivity <= 1) {
          frequencyScore = Math.min(frequencyScore + 0.1, 0.9); // Cap at 0.9 instead of 1
        } else if (daysSinceLastActivity <= 3) {
          frequencyScore = Math.min(frequencyScore + 0.05, 0.8); // Cap at 0.8
        }
      } else {
        // More lenient scoring for accounts without real activity data
        if (accountAgeDays < 7) {
          frequencyScore = 0.4; // Give new accounts more benefit of doubt
        } else if (accountAgeDays < 30) {
          frequencyScore = 0.3; // Moderate penalty for older accounts with no activity
        } else if (accountAgeDays < 90) {
          frequencyScore = 0.2; // Higher penalty for older accounts
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
      isUnverified: isUnverified,
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

    // 1. Network diversity — rollup across referrer + all affiliates
    const referrerIPs = new Set();
    const uniqueIPs = new Set();
    const uniqueCountries = new Set();
    const uniqueDevices = new Set();

    const addIPsToSet = (ipAddress, targetSet) => {
      if (!ipAddress) return;
      ipAddress.split(',').map(ip => ip.trim()).filter(ip => ip).forEach(ip => targetSet.add(ip));
    };

    addIPsToSet(user.ipAddress, referrerIPs);
    referrerIPs.forEach(ip => uniqueIPs.add(ip));
    if (user.country) uniqueCountries.add(user.country);
    if (user.deviceFingerprint) uniqueDevices.add(user.deviceFingerprint);

    // 2. Affiliate Network Analysis
    if (affiliates && affiliates.length > 0) {
      const sharedIPs = new Set();
      const inactiveAffiliates = [];
      const unverifiedAffiliates = [];
      const now = new Date();
      
      for (const affiliate of affiliates) {
        // Roll affiliate signals into network-wide diversity totals
        addIPsToSet(affiliate.ipAddress, uniqueIPs);
        if (affiliate.country) uniqueCountries.add(affiliate.country);
        if (affiliate.deviceFingerprint) uniqueDevices.add(affiliate.deviceFingerprint);

        // Shared IPs = overlap between referrer and affiliate (not affiliate-to-affiliate)
        if (affiliate.ipAddress) {
          const affiliateIPs = affiliate.ipAddress.split(',').map(ip => ip.trim()).filter(ip => ip);
          affiliateIPs.forEach(ip => {
            if (referrerIPs.has(ip)) {
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
        
        if (isLikelyFake) {
          inactiveAffiliates.push(affiliate._id);
        }
        
        // Track unverified affiliates - with null check
        if (affiliate.emailVerified === false || affiliate.emailVerified === undefined || affiliate.emailVerified === null) {
          unverifiedAffiliates.push(affiliate._id);
        }
      }

      // Signups that sit in a dense window: ≥3 referrals whose createdAt falls within any 24h span
      const rapidIdSet = new Set();
      const withDates = affiliates.filter((a) => a.createdAt);
      for (let i = 0; i < withDates.length; i++) {
        const ti = new Date(withDates[i].createdAt).getTime();
        if (isNaN(ti)) continue;
        let inWindow = 0;
        for (let j = 0; j < withDates.length; j++) {
          const tj = new Date(withDates[j].createdAt).getTime();
          if (!isNaN(tj) && Math.abs(ti - tj) < 24 * 60 * 60 * 1000) inWindow++;
        }
        if (inWindow >= 3) rapidIdSet.add(withDates[i]._id.toString());
      }
      const rapidSignups = Array.from(rapidIdSet);

      analysis.details.affiliateNetwork = {
        totalAffiliates: affiliates.length,
        rapidSignups: rapidSignups.length,
        sharedIPs: sharedIPs.size,
        inactiveAffiliates: inactiveAffiliates.length,
        unverifiedAffiliates: unverifiedAffiliates.length,
        inactiveRatio: affiliates.length > 0 ? Math.round((inactiveAffiliates.length / affiliates.length) * 100) / 100 : 0,
        unverifiedRatio: affiliates.length > 0 ? Math.round((unverifiedAffiliates.length / affiliates.length) * 100) / 100 : 0
      };

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

    // Network diversity totals (referrer + affiliates) — set after affiliate rollup
    analysis.details.networkDiversity = {
      uniqueIPs: uniqueIPs.size,
      uniqueCountries: uniqueCountries.size,
      uniqueDevices: uniqueDevices.size,
      rapidSignups: analysis.details.affiliateNetwork?.rapidSignups || 0,
      totalAffiliates: analysis.details.affiliateNetwork?.totalAffiliates || 0,
      sharedIPsWithReferrer: analysis.details.affiliateNetwork?.sharedIPs || 0
    };

    // Flag: Too many different IPs across the network
    if (uniqueIPs.size > 10) {
      analysis.flags.push('multiple_ips');
      analysis.riskScore += 0.3;
    }

    // Flag: Multiple countries across the network
    if (uniqueCountries.size > 3) {
      analysis.flags.push('multiple_countries');
      analysis.riskScore += 0.2;
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

    // 4. Login Pattern Analysis (no granular login history in User — frequency score only)
    const loginAnalysis = calculateLoginFrequencyAnalysis(user);
    analysis.details.loginPatterns = loginAnalysis;

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
    
    if (analysis.riskScore >= 0.75) {
      analysis.riskLevel = 'high';
    } else if (analysis.riskScore >= 0.5) {
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