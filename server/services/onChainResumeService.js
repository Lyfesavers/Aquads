/**
 * On-Chain Resume Service
 * 
 * Calculates and prepares attestation data for freelancer resumes
 * Uses EAS (Ethereum Attestation Service) on Base chain
 */

const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const ServiceReview = require('../models/ServiceReview');
const { ethers } = require('ethers');

// EAS contract addresses on Base
const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021';
const SCHEMA_REGISTRY_ADDRESS = '0x4200000000000000000000000000000000000020';

/**
 * Calculate trust score using the same logic as RiskGauge
 */
const calculateTrustScore = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Get user's services for rating calculation
  const services = await Service.find({ seller: userId });
  
  // Calculate aggregate rating
  let totalRating = 0;
  let totalReviews = 0;
  
  for (const service of services) {
    if (service.reviews > 0) {
      totalRating += (service.rating || 0) * service.reviews;
      totalReviews += service.reviews;
    }
  }
  
  const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;

  // Get completion rate from bookings
  const allBookings = await Booking.find({
    sellerId: userId,
    status: { $in: ['completed', 'cancelled', 'declined'] }
  });
  
  const completedBookings = await Booking.countDocuments({
    sellerId: userId,
    status: 'completed'
  });
  
  const totalBookings = allBookings.length;
  const completionRate = totalBookings > 0 
    ? Math.round((completedBookings / totalBookings) * 100) 
    : 0;

  // Calculate score breakdown (matching RiskGauge logic)
  let ratingScore = 0;
  let completionScore = 0;
  let profileScore = 0;
  let verificationScore = 0;
  let badgeScore = 0;

  // Factor 1: Rating (50% weight, 0-50 points)
  if (totalReviews === 0) {
    ratingScore = 0;
  } else if (avgRating >= 4.8) {
    ratingScore = 50;
  } else if (avgRating >= 4.5) {
    ratingScore = 40;
  } else if (avgRating >= 4.0) {
    ratingScore = 30;
  } else if (avgRating >= 3.5) {
    ratingScore = 15;
  } else {
    ratingScore = 5;
  }

  // Factor 2: Completion Rate (30% weight, 0-30 points)
  if (totalBookings === 0) {
    completionScore = 6; // No booking history - neutral
  } else if (completionRate >= 95) {
    completionScore = 30;
  } else if (completionRate >= 85) {
    completionScore = 24;
  } else if (completionRate >= 75) {
    completionScore = 18;
  } else if (completionRate >= 65) {
    completionScore = 9;
  } else {
    completionScore = 3;
  }

  // Factor 3: CV/Profile Completeness (10% weight, 0-10 points)
  const hasCV = user.cv && (
    user.cv.fullName || 
    user.cv.summary || 
    (user.cv.experience && user.cv.experience.length > 0) ||
    (user.cv.education && user.cv.education.length > 0) ||
    (user.cv.skills && user.cv.skills.length > 0)
  );
  profileScore = hasCV ? 10 : 0;

  // Factor 4: Account Verification (5% weight, 0-5 points)
  if (user.userType === 'freelancer') verificationScore += 2.5;
  // Check if user has any premium services
  const hasPremiumService = services.some(s => s.isPremium);
  if (hasPremiumService) verificationScore += 2.5;
  verificationScore = Math.round(verificationScore);

  // Factor 5: Skill Badges (5% weight, 0-5 points)
  const skillBadges = user.skillBadges || [];
  if (skillBadges.length >= 3) {
    badgeScore = 5;
  } else if (skillBadges.length >= 1) {
    badgeScore = 2.5;
  }
  badgeScore = Math.round(badgeScore);

  // Calculate total trust score
  const trustScore = Math.round(
    ratingScore + completionScore + profileScore + verificationScore + badgeScore
  );

  return {
    trustScore,
    breakdown: {
      ratingScore: Math.round(ratingScore),
      completionScore: Math.round(completionScore),
      profileScore: Math.round(profileScore),
      verificationScore: Math.round(verificationScore),
      badgeScore: Math.round(badgeScore)
    },
    stats: {
      avgRating: Math.round(avgRating * 10), // Multiply by 10 for precision (4.8 -> 48)
      totalReviews,
      completedJobs: completedBookings,
      completionRate,
      badgeCount: skillBadges.length,
      skillBadges: skillBadges.map(b => b.badgeName).join(',')
    },
    profile: {
      hasVerifiedCV: hasCV,
      isFreelancer: user.userType === 'freelancer',
      isPremium: hasPremiumService,
      memberSince: Math.floor(new Date(user.createdAt).getTime() / 1000),
      username: user.username
    }
  };
};

/**
 * Prepare attestation data for minting
 */
const prepareAttestationData = async (userId) => {
  const scoreData = await calculateTrustScore(userId);
  const user = await User.findById(userId);
  
  // Create a deterministic hash of the user ID for on-chain reference
  const aquadsId = ethers.keccak256(ethers.toUtf8Bytes(userId.toString()));
  
  // Current timestamp
  const lastUpdated = Math.floor(Date.now() / 1000);

  // Format data for EAS attestation
  const attestationData = {
    trustScore: scoreData.trustScore,
    ratingScore: scoreData.breakdown.ratingScore,
    completionScore: scoreData.breakdown.completionScore,
    profileScore: scoreData.breakdown.profileScore,
    verificationScore: scoreData.breakdown.verificationScore,
    badgeScore: scoreData.breakdown.badgeScore,
    avgRating: scoreData.stats.avgRating,
    totalReviews: scoreData.stats.totalReviews,
    completedJobs: scoreData.stats.completedJobs,
    completionRate: scoreData.stats.completionRate,
    skillBadges: scoreData.stats.skillBadges || '',
    badgeCount: scoreData.stats.badgeCount,
    hasVerifiedCV: scoreData.profile.hasVerifiedCV,
    isFreelancer: scoreData.profile.isFreelancer,
    isPremium: scoreData.profile.isPremium,
    memberSince: scoreData.profile.memberSince,
    lastUpdated: lastUpdated,
    username: scoreData.profile.username,
    aquadsId: aquadsId
  };

  // Check if user already has an on-chain resume
  const existingResume = user.onChainResume;
  const hasExistingResume = existingResume && existingResume.trustScoreAttestation?.uid;

  // Calculate if update is recommended
  let shouldUpdate = false;
  let scoreDifference = 0;
  
  if (hasExistingResume) {
    scoreDifference = attestationData.trustScore - (existingResume.trustScoreAttestation.score || 0);
    
    // Recommend update if score changed by 5+ points
    if (Math.abs(scoreDifference) >= 5) shouldUpdate = true;
    
    // Or if badge count increased
    if (attestationData.badgeCount > (existingResume.trustScoreAttestation.badgeCount || 0)) {
      shouldUpdate = true;
    }
    
    // Or if 3+ months since last update
    const lastUpdateTime = existingResume.trustScoreAttestation.lastUpdated;
    if (lastUpdateTime) {
      const monthsSinceUpdate = (Date.now() - new Date(lastUpdateTime).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceUpdate >= 3) shouldUpdate = true;
    }
  }

  return {
    attestationData,
    preview: {
      trustScore: scoreData.trustScore,
      breakdown: {
        rating: {
          score: scoreData.breakdown.ratingScore,
          max: 50,
          value: `${(scoreData.stats.avgRating / 10).toFixed(1)}★`,
          reviews: scoreData.stats.totalReviews
        },
        completion: {
          score: scoreData.breakdown.completionScore,
          max: 30,
          rate: `${scoreData.stats.completionRate}%`
        },
        profile: {
          score: scoreData.breakdown.profileScore,
          max: 10,
          status: scoreData.profile.hasVerifiedCV ? 'Complete' : 'Incomplete'
        },
        verification: {
          score: scoreData.breakdown.verificationScore,
          max: 5,
          type: scoreData.profile.isFreelancer ? 'Freelancer' : 'Project'
        },
        badges: {
          score: scoreData.breakdown.badgeScore,
          max: 5,
          count: scoreData.stats.badgeCount,
          names: scoreData.stats.skillBadges ? scoreData.stats.skillBadges.split(',') : []
        }
      },
      stats: {
        completedJobs: scoreData.stats.completedJobs,
        memberSince: new Date(scoreData.profile.memberSince * 1000).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        })
      }
    },
    existing: hasExistingResume ? {
      score: existingResume.trustScoreAttestation.score,
      mintedAt: existingResume.trustScoreAttestation.mintedAt,
      uid: existingResume.trustScoreAttestation.uid,
      walletAddress: existingResume.walletAddress
    } : null,
    shouldUpdate,
    scoreDifference,
    schemaUID: process.env.EAS_SCHEMA_UID,
    chainId: 8453, // Base mainnet
    easContractAddress: EAS_CONTRACT_ADDRESS
  };
};

/**
 * Save attestation record after successful mint
 */
const saveAttestationRecord = async (userId, attestationData) => {
  const { uid, txHash, walletAddress, score, badgeCount } = attestationData;
  
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Initialize onChainResume if it doesn't exist
  if (!user.onChainResume) {
    user.onChainResume = {
      walletAddress: null,
      chainId: 8453,
      trustScoreAttestation: null,
      attestationHistory: [],
      publicResumeSlug: null
    };
  }

  // Update wallet address
  user.onChainResume.walletAddress = walletAddress;

  // Add to history if there's an existing attestation
  if (user.onChainResume.trustScoreAttestation?.uid) {
    user.onChainResume.attestationHistory = user.onChainResume.attestationHistory || [];
    user.onChainResume.attestationHistory.push({
      ...user.onChainResume.trustScoreAttestation
    });
  }

  // Set new attestation as current
  user.onChainResume.trustScoreAttestation = {
    uid,
    score,
    badgeCount,
    mintedAt: new Date(),
    lastUpdated: new Date(),
    txHash
  };

  // Generate public resume slug if not exists
  if (!user.onChainResume.publicResumeSlug) {
    user.onChainResume.publicResumeSlug = user.username.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  await user.save();

  return {
    success: true,
    attestationUID: uid,
    publicResumeUrl: `/resume/${user.onChainResume.publicResumeSlug}`,
    explorerUrl: `https://base.easscan.org/attestation/view/${uid}`
  };
};

/**
 * Get public resume data by slug
 */
const getPublicResume = async (slug) => {
  const user = await User.findOne({
    'onChainResume.publicResumeSlug': slug
  });

  if (!user || !user.onChainResume?.trustScoreAttestation?.uid) {
    return null;
  }

  // Get current live data
  const liveData = await calculateTrustScore(user._id);

  return {
    username: user.username,
    image: user.image,
    memberSince: user.createdAt,
    
    // Live data (current)
    current: {
      trustScore: liveData.trustScore,
      breakdown: liveData.breakdown,
      stats: liveData.stats
    },
    
    // Verified on-chain data
    verified: {
      trustScore: user.onChainResume.trustScoreAttestation.score,
      mintedAt: user.onChainResume.trustScoreAttestation.mintedAt,
      uid: user.onChainResume.trustScoreAttestation.uid,
      txHash: user.onChainResume.trustScoreAttestation.txHash,
      walletAddress: user.onChainResume.walletAddress
    },
    
    // History
    history: user.onChainResume.attestationHistory || [],
    
    // Links
    explorerUrl: `https://base.easscan.org/attestation/view/${user.onChainResume.trustScoreAttestation.uid}`,
    basescanUrl: `https://basescan.org/tx/${user.onChainResume.trustScoreAttestation.txHash}`
  };
};

module.exports = {
  calculateTrustScore,
  prepareAttestationData,
  saveAttestationRecord,
  getPublicResume,
  EAS_CONTRACT_ADDRESS,
  SCHEMA_REGISTRY_ADDRESS
};

