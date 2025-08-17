const express = require('express');
const router = express.Router();
const FacebookRaid = require('../models/FacebookRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const pointsModule = require('./points');
const axios = require('axios');
const { twitterRaidRateLimit } = require('../middleware/rateLimiter');
const AffiliateEarning = require('../models/AffiliateEarning');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const telegramService = require('../utils/telegramService');

// Use the imported module function
const awardSocialMediaPoints = pointsModule.awardSocialMediaPoints;

// Get all active Facebook raids
router.get('/', async (req, res) => {
  try {
    const raids = await FacebookRaid.find({ active: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username');
    
    res.json(raids);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Facebook raids' });
  }
});

// Create a new Facebook raid (admin only)
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can create Facebook raids' });
    }

    const { postUrl, title, description, points } = req.body;

    if (!postUrl || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract post ID from URL
    let postId = null;
    const shareMatch = postUrl.match(/\/share\/p\/([^\/]+)/);
    if (shareMatch && shareMatch[1]) {
      postId = shareMatch[1];
    } else {
      const postsMatch = postUrl.match(/\/posts\/(\d+)/);
      if (postsMatch && postsMatch[1]) {
        postId = postsMatch[1];
      }
    }

    if (!postId) {
      return res.status(400).json({ error: 'Invalid Facebook URL' });
    }

    const raid = new FacebookRaid({
      postId,
      postUrl,
      title,
      description,
      points: points || 50,
      createdBy: req.user.id,
      isPaid: false,
      paymentStatus: 'approved' // Admin created raids are automatically approved
    });

    await raid.save();
    
    // Send Telegram notification
    telegramService.sendRaidNotification({
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description
    });
    
    res.status(201).json(raid);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Facebook raid' });
  }
});

// Create a new paid Facebook raid (users)
router.post('/paid', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description, txSignature, paymentChain, chainSymbol, chainAddress } = req.body;

    if (!postUrl || !title || !description || !txSignature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract post ID from URL
    let postId = null;
    const shareMatch = postUrl.match(/\/share\/p\/([^\/]+)/);
    if (shareMatch && shareMatch[1]) {
      postId = shareMatch[1];
    } else {
      const postsMatch = postUrl.match(/\/posts\/(\d+)/);
      if (postsMatch && postsMatch[1]) {
        postId = postsMatch[1];
      }
    }

    if (!postId) {
      return res.status(400).json({ error: 'Invalid Facebook URL' });
    }

    // Create the raid with pending payment status
    const raid = new FacebookRaid({
      postId,
      postUrl,
      title,
      description,
      points: 50, // Fixed points for paid raids
      createdBy: req.user.id,
      isPaid: true,
      paymentStatus: 'pending',
      txSignature,
      paymentChain,
      chainSymbol,
      chainAddress,
      active: true // Ensure the raid is active even if payment is pending
    });

    await raid.save();
    
    // Process affiliate commission if applicable
    try {
      const raidCreator = await User.findById(req.user.id);
      if (raidCreator && raidCreator.referredBy) {
        const raidAmount = 1.50; // 1.50 USDC per raid
        
        const commissionRate = await AffiliateEarning.calculateCommissionRate(raidCreator.referredBy);
        const commissionEarned = AffiliateEarning.calculateCommission(raidAmount, commissionRate);
        
        const earning = new AffiliateEarning({
          affiliateId: raidCreator.referredBy,
          referredUserId: raidCreator._id,
          adId: raid._id,
          adAmount: raidAmount,
          currency: 'USDC',
          commissionRate,
          commissionEarned
        });
        
        await earning.save();
      }
    } catch (commissionError) {
      // Continue despite commission error
    }
    
    res.status(201).json({ 
      message: 'Facebook raid created successfully! It will be active once payment is approved.',
      raid 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Facebook raid' });
  }
});

// Create a new Facebook raid using affiliate points (users)
router.post('/points', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description } = req.body;
    const POINTS_REQUIRED = 2000; // Points required to create a raid

    if (!postUrl || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user has enough points
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.points < POINTS_REQUIRED) {
      return res.status(400).json({ 
        error: `Not enough points. You have ${user.points} points but need ${POINTS_REQUIRED} points to create a raid.`
      });
    }

    // Extract post ID from URL
    let postId = null;
    const shareMatch = postUrl.match(/\/share\/p\/([^\/]+)/);
    if (shareMatch && shareMatch[1]) {
      postId = shareMatch[1];
    } else {
      const postsMatch = postUrl.match(/\/posts\/(\d+)/);
      if (postsMatch && postsMatch[1]) {
        postId = postsMatch[1];
      }
    }

    if (!postId) {
      return res.status(400).json({ error: 'Invalid Facebook URL' });
    }

    // Create the raid
    const raid = new FacebookRaid({
      postId,
      postUrl,
      title,
      description,
      points: 50, // Fixed points for raids
      createdBy: req.user.id,
      isPaid: false, // Not a paid raid (it's a points raid)
      paymentStatus: 'approved', // Automatically approved since we're deducting points
      active: true,
      paidWithPoints: true, // New field to track point-based raids
      pointsSpent: POINTS_REQUIRED // Track how many points were spent
    });

    // Deduct points from user
    user.points -= POINTS_REQUIRED;
    user.pointsHistory.push({
      amount: -POINTS_REQUIRED,
      reason: 'Created Facebook raid with points',
      socialRaidId: raid._id,
      createdAt: new Date()
    });

    // Save both the raid and updated user
    await Promise.all([
      raid.save(),
      user.save()
    ]);
    
    // Send Telegram notification
    telegramService.sendRaidNotification({
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description
    });
    
    res.status(201).json({ 
      message: `Facebook raid created successfully! ${POINTS_REQUIRED} points have been deducted from your account.`,
      raid,
      pointsRemaining: user.points
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Facebook raid' });
  }
});

// Approve a paid Facebook raid (admin only)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve raids' });
    }

    const raid = await FacebookRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    if (!raid.isPaid) {
      return res.status(400).json({ error: 'This is not a paid raid' });
    }

    if (raid.paymentStatus === 'approved') {
      return res.status(400).json({ error: 'This raid is already approved' });
    }

    // Update raid status
    raid.paymentStatus = 'approved';
    raid.active = true;
    await raid.save();
    
    // Send Telegram notification
    telegramService.sendRaidNotification({
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description
    });
    
    res.json({ 
      message: 'Facebook raid payment approved!',
      raid 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve Facebook raid' });
  }
});

// Reject a paid Facebook raid (admin only)
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject raids' });
    }

    const { rejectionReason } = req.body;
    const raid = await FacebookRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    if (!raid.isPaid) {
      return res.status(400).json({ error: 'This is not a paid raid' });
    }

    if (raid.paymentStatus === 'rejected') {
      return res.status(400).json({ error: 'This raid is already rejected' });
    }

    // Update raid status
    raid.paymentStatus = 'rejected';
    raid.active = false;
    raid.rejectionReason = rejectionReason || 'Payment verification failed';
    await raid.save();
    
    res.json({ 
      message: 'Facebook raid payment rejected!',
      raid 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject Facebook raid' });
  }
});

// Delete a Facebook raid (admin only)
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete Facebook raids' });
    }

    const raid = await FacebookRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    // Instead of deleting, mark as inactive
    raid.active = false;
    await raid.save();
    
    res.json({ message: 'Facebook raid deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete Facebook raid' });
  }
});

// Complete a Facebook raid with rate limiting
router.post('/:id/complete', auth, requireEmailVerification, twitterRaidRateLimit, async (req, res) => {
  try {
    const { facebookUsername, verificationCode, postUrl, iframeVerified, iframeInteractions, postId } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Get the user ID safely - checking both possible locations
    const userId = req.user.id || req.user.userId || req.user._id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }

    // Validate Facebook username is provided
    if (!facebookUsername || !facebookUsername.trim()) {
      return res.status(400).json({ error: 'Facebook username is required. Please enter your Facebook username.' });
    }

    // Validate Facebook username format (more flexible)
    const cleanUsername = facebookUsername.trim().replace(/^@/, ''); // Remove @ if present
    const usernameRegex = /^[a-zA-Z0-9._]{1,50}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({ error: 'Invalid Facebook username format. Use only letters, numbers, dots, and underscores (max 50 characters).' });
    }
    
    const raid = await FacebookRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    if (!raid.active) {
      return res.status(400).json({ error: 'This Facebook raid is no longer active' });
    }

    // Check if user already completed this raid - using the safely determined userId
    const alreadyCompleted = raid.completions.some(
      completion => completion.userId && completion.userId.toString() === userId.toString()
    );
    
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'You have already completed this raid' });
    }

    // Check verification method - either iframe or post URL
    let verificationMethod = 'manual';
    let verificationNote = 'User verification was not validated';
    let verified = false;
    let detectedPostId = null;
    
    // If iframe verification was used
    if (iframeVerified === true && iframeInteractions >= 3) {
      verificationMethod = 'iframe_interaction';
      verificationNote = `Verified through iframe interaction (${iframeInteractions} interactions)`;
      verified = true;
      detectedPostId = postId || null; // Use the provided post ID if available
    }
    // If post URL was provided
    else if (postUrl) {
      // Just check basic URL format - be more flexible with validation
      const isValidFormat = !!postUrl.match(/facebook\.com/i);
      
      if (!isValidFormat) {
        return res.status(400).json({ 
          error: 'Invalid Facebook post URL format. URL should be a valid Facebook post URL.',
          success: false
        });
      }
      
      // Extract post ID from URL
      try {
        const shareMatch = postUrl.match(/\/share\/p\/([^\/]+)/);
        if (shareMatch && shareMatch[1]) {
          detectedPostId = shareMatch[1];
        } else {
          const postsMatch = postUrl.match(/\/posts\/(\d+)/);
          if (postsMatch && postsMatch[1]) {
            detectedPostId = postsMatch[1];
          }
        }
        
        if (!detectedPostId && postId) {
          // Use provided post ID if URL parsing fails
          detectedPostId = postId;
        }
      } catch (error) {
        // Fall back to provided ID if extraction fails
        detectedPostId = postId || null;
      }
      
      // Check if URL contains "aquads.xyz" (case insensitive) - only as a note, not a requirement
      const containsVerificationTag = postUrl.toLowerCase().includes('aquads.xyz');
      if (!containsVerificationTag) {
        verificationMethod = 'post_embed';
        verificationNote = 'URL does not contain verification tag, but accepted';
        verified = true;
      } else {
        verificationMethod = 'post_embed';
        verificationNote = 'Facebook post URL format verified with verification tag';
        verified = true;
      }
    } else {
      return res.status(400).json({ 
        error: 'Verification failed. Please provide a valid Facebook post URL or complete iframe verification.',
        success: false
      });
    }

    // Create a pending completion that requires admin approval
    try {
      const pointsAmount = raid.points || 50;
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      // Record the completion as pending approval - DO NOT award points yet
      raid.completions.push({
        userId: userId,
        facebookUsername: cleanUsername,
        verificationCode,
        verificationMethod,
        postUrl: postUrl || null,
        postId: detectedPostId,
        verified: verified,
        approvalStatus: 'pending', // This is the key change
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        pointsAwarded: false,
        ipAddress,
        verificationNote,
        iframeVerified: iframeVerified || false,
        iframeInteractions: iframeInteractions || 0,
        completedAt: new Date()
      });
      
      // Update user's last activity for accurate fraud detection
      await User.findByIdAndUpdate(userId, {
        lastActivity: new Date()
      });
      
      // Save the raid with the pending completion
      await raid.save();
      
      // Success response - indicate pending approval
      const successResponse = {
        success: true,
        message: `Facebook raid submitted successfully! Your submission is pending admin approval.`,
        note: 'An admin will review your Facebook username and actions before awarding points.',
        pointsAmount: pointsAmount,
        status: 'pending_approval'
      };
      
      res.json(successResponse);
    } catch (error) {
      let errorMessage = 'Failed to complete Facebook raid: ' + (error.message || 'Unknown error');
      res.status(500).json({ 
        error: errorMessage,
        success: false
      });
    }
  } catch (error) {
    let errorMessage = 'Failed to complete Facebook raid: ' + (error.message || 'Unknown error');
    res.status(500).json({ 
      error: errorMessage,
      success: false 
    });
  }
});

// Admin endpoint to approve a completion
router.post('/:raidId/completions/:completionId/approve', auth, async (req, res) => {
  try {
    // Basic validation
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { raidId, completionId } = req.params;
    
    // Find the raid
    const raid = await FacebookRaid.findById(raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Raid not found' });
    }

    // Find the completion
    const completion = raid.completions.find(c => c._id.toString() === completionId);
    if (!completion) {
      return res.status(404).json({ error: 'Completion not found' });
    }

    // Update completion
    completion.approvalStatus = 'approved';
    completion.approvedBy = req.user.id;
    completion.approvedAt = new Date();
    completion.pointsAwarded = true;

    // Award points to user
    const user = await User.findById(completion.userId);
    if (user) {
      const points = raid.points || 50;
      user.points = (user.points || 0) + points;
      user.lastActivity = new Date(); // Update activity when points are awarded
      user.pointsHistory.push({
        amount: points,
        reason: `Facebook raid approved: ${raid.title}`,
        socialRaidId: raid._id,
        createdAt: new Date()
      });
      await user.save();
    }

    await raid.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Completion approved successfully'
    });

  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to approve' });
  }
});

// Admin endpoint to reject a completion
router.post('/:raidId/completions/:completionId/reject', auth, async (req, res) => {
  try {
    // Basic validation
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { raidId, completionId } = req.params;
    const { rejectionReason } = req.body;
    
    // Find the raid
    const raid = await FacebookRaid.findById(raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Raid not found' });
    }

    // Find the completion
    const completion = raid.completions.find(c => c._id.toString() === completionId);
    if (!completion) {
      return res.status(404).json({ error: 'Completion not found' });
    }

    // Update completion
    completion.approvalStatus = 'rejected';
    completion.approvedBy = req.user.id;
    completion.approvedAt = new Date();
    completion.rejectionReason = rejectionReason || 'No reason provided';
    completion.pointsAwarded = false;

    await raid.save({ validateBeforeSave: false });

    // Send notification to the user about the rejection
    try {
      const userId = completion.userId;
      const reason = rejectionReason || 'No reason provided';
      const notificationMessage = `Your Facebook raid submission for "${raid.title}" was rejected. Reason: ${reason}`;
      
      const notification = new Notification({
        userId: userId,
        type: 'status',
        message: notificationMessage,
        link: '/dashboard',
        relatedId: raidId,
        relatedModel: 'FacebookRaid'
      });
      
      await notification.save();
  
    } catch (notificationError) {
      // Continue execution even if notification fails
    }

    res.json({
      success: true,
      message: 'Completion rejected successfully'
    });

  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to reject' });
  }
});

// Admin endpoint to get all pending completions
router.get('/completions/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can view pending completions' });
    }

    const raids = await FacebookRaid.find({
      'completions.approvalStatus': 'pending'
    })
    .populate('completions.userId', 'username email')
    .populate('createdBy', 'username')
    .sort({ 'completions.completedAt': -1 });

    // Extract pending completions with raid info
    const pendingCompletions = [];
    
    // Get all user IDs for trust score calculation
    const userIds = new Set();
    raids.forEach(raid => {
      raid.completions.forEach(completion => {
        if (completion.approvalStatus === 'pending' && completion.userId) {
          userIds.add(completion.userId._id.toString());
        }
      });
    });

    // Calculate trust scores for all users
    const userTrustScores = {};
    if (userIds.size > 0) {
      const allRaidsWithCompletions = await FacebookRaid.find({
        'completions.userId': { $in: Array.from(userIds) }
      });

      userIds.forEach(userId => {
        let totalCompletions = 0;
        let approvedCompletions = 0;

        allRaidsWithCompletions.forEach(raid => {
          raid.completions.forEach(completion => {
            if (completion.userId && completion.userId.toString() === userId && 
                completion.approvalStatus !== 'pending') {
              totalCompletions++;
              if (completion.approvalStatus === 'approved') {
                approvedCompletions++;
              }
            }
          });
        });

        userTrustScores[userId] = {
          totalCompletions,
          approvedCompletions,
          approvalRate: totalCompletions > 0 ? (approvedCompletions / totalCompletions) * 100 : 0,
          trustLevel: totalCompletions === 0 ? 'new' : 
                     (approvedCompletions / totalCompletions) >= 0.85 ? 'high' :
                     (approvedCompletions / totalCompletions) >= 0.65 ? 'medium' : 'low'
        };
      });
    }
    
    raids.forEach(raid => {
      raid.completions.forEach(completion => {
        if (completion.approvalStatus === 'pending') {
          const userId = completion.userId ? completion.userId._id.toString() : null;
          const trustScore = userId ? userTrustScores[userId] : null;
          
          pendingCompletions.push({
            completionId: completion._id,
            raidId: raid._id,
            raidTitle: raid.title,
            raidPostUrl: raid.postUrl,
            pointsAmount: raid.points || 50,
            user: completion.userId,
            facebookUsername: completion.facebookUsername,
            verificationMethod: completion.verificationMethod,
            verificationNote: completion.verificationNote,
            iframeVerified: completion.iframeVerified,
            completedAt: completion.completedAt,
            ipAddress: completion.ipAddress,
            trustScore: trustScore || {
              totalCompletions: 0,
              approvedCompletions: 0,
              approvalRate: 0,
              trustLevel: 'new'
            }
          });
        }
      });
    });

    // Sort by trust level priority: high -> medium -> new -> low
    const trustLevelPriority = { 'high': 0, 'medium': 1, 'new': 2, 'low': 3 };
    pendingCompletions.sort((a, b) => {
      const aPriority = trustLevelPriority[a.trustScore.trustLevel];
      const bPriority = trustLevelPriority[b.trustScore.trustLevel];
      return aPriority - bPriority;
    });

    res.json({
      success: true,
      pendingCompletions,
      total: pendingCompletions.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending completions' });
  }
});

// Get user's completed Facebook raids
router.get('/user/completed', auth, async (req, res) => {
  try {
    // Get the user ID safely - checking both possible locations
    const userId = req.user.id || req.user.userId || req.user._id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const raids = await FacebookRaid.find({
      'completions.userId': userId
    }).sort({ createdAt: -1 });
    
    res.json(raids);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch completed Facebook raids' });
  }
});

// Admin endpoint to check for suspicious activity
router.get('/suspicious', auth, async (req, res) => {
  try {
    // Only admins can access this endpoint
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    
    // Get all raids with completions
    const raids = await FacebookRaid.find({
      'completions.0': { $exists: true }
    }).populate('completions.userId', 'username email');
    
    // Map to store completions by IP address
    const ipMap = {};
    
    // Process each raid to find IP patterns
    raids.forEach(raid => {
      if (!raid.completions || raid.completions.length === 0) return;
      
      raid.completions.forEach(completion => {
        if (!completion.ipAddress) return;
        
        if (!ipMap[completion.ipAddress]) {
          ipMap[completion.ipAddress] = [];
        }
        
        ipMap[completion.ipAddress].push({
          userId: completion.userId._id || completion.userId,
          username: completion.userId.username || 'Unknown',
          raidId: raid._id,
          title: raid.title,
          timestamp: completion.completedAt
        });
      });
    });
    
    // Find multiple accounts using the same IP
    const suspiciousIPs = {};
    
    Object.keys(ipMap).forEach(ip => {
      const completions = ipMap[ip];
      
      // Extract unique user IDs for this IP
      const userIds = new Set(completions.map(c => c.userId.toString()));
      
      // If more than one user has completed raids from this IP
      if (userIds.size > 1) {
        suspiciousIPs[ip] = completions;
      }
    });
    
    res.json({
      success: true,
      suspiciousIPs
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check for suspicious activity' });
  }
});

// Create a new free Facebook raid (for free raid projects)
router.post('/free', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description } = req.body;

    if (!postUrl || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is eligible for free raids
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const eligibility = user.checkFreeRaidEligibility();
    if (!eligibility.eligible) {
      return res.status(400).json({ error: eligibility.reason });
    }

    // Extract post ID from URL
    let postId = null;
    const shareMatch = postUrl.match(/\/share\/p\/([^\/]+)/);
    if (shareMatch && shareMatch[1]) {
      postId = shareMatch[1];
    } else {
      const postsMatch = postUrl.match(/\/posts\/(\d+)/);
      if (postsMatch && postsMatch[1]) {
        postId = postsMatch[1];
      }
    }

    if (!postId) {
      return res.status(400).json({ error: 'Invalid Facebook URL' });
    }

    // Use a free raid
    const usage = await user.useFreeRaid();

    // Create the raid
    const raid = new FacebookRaid({
      postId,
      postUrl,
      title,
      description,
      points: 50, // Fixed points for free raids
      createdBy: req.user.id,
      isPaid: false,
      paymentStatus: 'approved', // Free raids are automatically approved
      paidWithPoints: false,
      pointsSpent: 0,
      active: true
    });

    await raid.save();
    
    // Send Telegram notification
    telegramService.sendRaidNotification({
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description
    });
    
    res.status(201).json({ 
      message: 'Free Facebook raid created successfully!',
      raid,
      usage
    });
  } catch (error) {
    console.error('Error creating free raid:', error);
    res.status(500).json({ error: 'Failed to create free Facebook raid' });
  }
});

module.exports = router;
