const express = require('express');
const router = express.Router();
const TwitterRaid = require('../models/TwitterRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const pointsModule = require('./points');
const axios = require('axios');
const { twitterRaidRateLimit } = require('../middleware/rateLimiter');
const AffiliateEarning = require('../models/AffiliateEarning');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Use the imported module function
const awardSocialMediaPoints = pointsModule.awardSocialMediaPoints;

// Get all active Twitter raids
router.get('/', async (req, res) => {
  try {
    const raids = await TwitterRaid.find({ active: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username');
    
    res.json(raids);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Twitter raids' });
  }
});

// Create a new Twitter raid (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can create Twitter raids' });
    }

    const { tweetUrl, title, description, points } = req.body;

    if (!tweetUrl || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract tweet ID from URL
    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    if (!tweetIdMatch || !tweetIdMatch[1]) {
      return res.status(400).json({ error: 'Invalid Twitter URL' });
    }

    const tweetId = tweetIdMatch[1];

    const raid = new TwitterRaid({
      tweetId,
      tweetUrl,
      title,
      description,
      points: points || 50,
      createdBy: req.user.id,
      isPaid: false,
      paymentStatus: 'approved' // Admin created raids are automatically approved
    });

    await raid.save();
    
    res.status(201).json(raid);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Twitter raid' });
  }
});

// Create a new paid Twitter raid (users)
router.post('/paid', auth, async (req, res) => {
  try {
    const { tweetUrl, title, description, txSignature, paymentChain, chainSymbol, chainAddress } = req.body;

    if (!tweetUrl || !title || !description || !txSignature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract tweet ID from URL
    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    if (!tweetIdMatch || !tweetIdMatch[1]) {
      return res.status(400).json({ error: 'Invalid Twitter URL' });
    }

    const tweetId = tweetIdMatch[1];

    // Create the raid with pending payment status
    const raid = new TwitterRaid({
      tweetId,
      tweetUrl,
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
      message: 'Twitter raid created successfully! It will be active once payment is approved.',
      raid 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Twitter raid' });
  }
});

// Create a new Twitter raid using affiliate points (users)
router.post('/points', auth, async (req, res) => {
  try {
    const { tweetUrl, title, description } = req.body;
    const POINTS_REQUIRED = 200; // Points required to create a raid

    if (!tweetUrl || !title || !description) {
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

    // Extract tweet ID from URL
    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    if (!tweetIdMatch || !tweetIdMatch[1]) {
      return res.status(400).json({ error: 'Invalid Twitter URL' });
    }

    const tweetId = tweetIdMatch[1];

    // Create the raid
    const raid = new TwitterRaid({
      tweetId,
      tweetUrl,
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
      reason: 'Created Twitter raid with points',
      socialRaidId: raid._id,
      createdAt: new Date()
    });

    // Save both the raid and updated user
    await Promise.all([
      raid.save(),
      user.save()
    ]);
    
    res.status(201).json({ 
      message: `Twitter raid created successfully! ${POINTS_REQUIRED} points have been deducted from your account.`,
      raid,
      pointsRemaining: user.points
    });
  } catch (error) {
    console.error('Error creating Twitter raid with points:', error);
    res.status(500).json({ error: 'Failed to create Twitter raid' });
  }
});

// Approve a paid Twitter raid (admin only)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve raids' });
    }

    const raid = await TwitterRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Twitter raid not found' });
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
    
    res.json({ 
      message: 'Twitter raid payment approved!',
      raid 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve Twitter raid' });
  }
});

// Reject a paid Twitter raid (admin only)
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject raids' });
    }

    const { rejectionReason } = req.body;
    const raid = await TwitterRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Twitter raid not found' });
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
      message: 'Twitter raid payment rejected!',
      raid 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject Twitter raid' });
  }
});

// Delete a Twitter raid (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete Twitter raids' });
    }

    const raid = await TwitterRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Twitter raid not found' });
    }

    // Instead of deleting, mark as inactive
    raid.active = false;
    await raid.save();
    
    res.json({ message: 'Twitter raid deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete Twitter raid' });
  }
});

// Helper function to verify tweet URL format and existence
const verifyTweetUrl = async (tweetUrl) => {
  try {
    // Check if the URL is valid - supports both twitter.com and x.com domains
    if (!tweetUrl.match(/(?:twitter\.com|x\.com)\/[^\/]+\/status\/\d+/i)) {
      return { success: false, error: 'Invalid tweet URL format. URL should look like: https://twitter.com/username/status/1234567890 or https://x.com/username/status/1234567890' };
    }
    
    // Try to fetch the tweet to see if it exists
    try {
      // Extract the tweet ID from the URL
      const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
      const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;
      
      if (!tweetId) {
        return { success: false, error: 'Could not extract tweet ID from URL' };
      }
      
      // Try to fetch the tweet
      const response = await axios.head(`https://twitter.com/i/status/${tweetId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        validateStatus: status => status < 500 // Accept any status code less than 500
      });
      
      // If we get a 404, the tweet doesn't exist
      if (response.status === 404) {
        return { success: false, error: 'Tweet not found. Please check the URL.' };
      }
      
      // For any response, we'll accept it as valid
      return { success: true };
    } catch (error) {
      // If we can't connect to Twitter, we'll still accept it
      return { success: true, warning: 'Could not verify tweet existence, but accepting submission.' };
    }
  } catch (error) {
    return { success: true, warning: 'Verification skipped due to error' };
  }
};

// Complete a Twitter raid with rate limiting
router.post('/:id/complete', auth, twitterRaidRateLimit, async (req, res) => {
  try {
    const { twitterUsername, verificationCode, tweetUrl, iframeVerified, iframeInteractions, tweetId } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Get the user ID safely - checking both possible locations
    const userId = req.user.id || req.user.userId || req.user._id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }

    // Validate Twitter username is provided
    if (!twitterUsername || !twitterUsername.trim()) {
      return res.status(400).json({ error: 'Twitter username is required. Please enter your Twitter username.' });
    }

    // Validate Twitter username format (more flexible)
    const cleanUsername = twitterUsername.trim().replace(/^@/, ''); // Remove @ if present
    const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({ error: 'Invalid Twitter username format. Use only letters, numbers, and underscores (max 15 characters).' });
    }
    
    const raid = await TwitterRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Twitter raid not found' });
    }

    if (!raid.active) {
      return res.status(400).json({ error: 'This Twitter raid is no longer active' });
    }

    // Check if user already completed this raid - using the safely determined userId
    const alreadyCompleted = raid.completions.some(
      completion => completion.userId && completion.userId.toString() === userId.toString()
    );
    
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'You have already completed this raid' });
    }

    // Check verification method - either iframe or tweet URL
    let verificationMethod = 'manual';
    let verificationNote = 'User verification was not validated';
    let verified = false;
    let detectedTweetId = null;
    
    // If iframe verification was used
    if (iframeVerified === true && iframeInteractions >= 3) {
      verificationMethod = 'iframe_interaction';
      verificationNote = `Verified through iframe interaction (${iframeInteractions} interactions)`;
      verified = true;
      detectedTweetId = tweetId || null; // Use the provided tweet ID if available
    }
    // If tweet URL was provided
    else if (tweetUrl) {
      // Just check basic URL format - be more flexible with validation
      const isValidFormat = !!tweetUrl.match(/(?:twitter\.com|x\.com)\/[^\/]+\/status\/\d+/i);
      
      if (!isValidFormat) {
        return res.status(400).json({ 
          error: 'Invalid tweet URL format. URL should look like: https://twitter.com/username/status/1234567890 or https://x.com/username/status/1234567890',
          success: false
        });
      }
      
      // Extract tweet ID from URL
      try {
        const urlMatch = tweetUrl.match(/\/status\/(\d+)/i);
        if (urlMatch && urlMatch[1]) {
          detectedTweetId = urlMatch[1];
        } else if (tweetId) {
          // Use provided tweet ID if URL parsing fails
          detectedTweetId = tweetId;
        }
      } catch (error) {
        // Fall back to provided ID if extraction fails
        detectedTweetId = tweetId || null;
      }
      
      // Check if URL contains "aquads.xyz" (case insensitive) - only as a note, not a requirement
      const containsVerificationTag = tweetUrl.toLowerCase().includes('aquads.xyz');
      if (!containsVerificationTag) {
        verificationMethod = 'tweet_embed';
        verificationNote = 'URL does not contain verification tag, but accepted';
        verified = true;
      } else {
        verificationMethod = 'tweet_embed';
        verificationNote = 'Tweet URL format verified with verification tag';
        verified = true;
      }
    } else {
      return res.status(400).json({ 
        error: 'Verification failed. Please provide a valid tweet URL or complete iframe verification.',
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
        twitterUsername: cleanUsername,
        verificationCode,
        verificationMethod,
        tweetUrl: tweetUrl || null,
        tweetId: detectedTweetId,
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
      
      // Save the raid with the pending completion
      await raid.save();
      
      // Success response - indicate pending approval
      const successResponse = {
        success: true,
        message: `Twitter raid submitted successfully! Your submission is pending admin approval.`,
        note: 'An admin will review your Twitter username and actions before awarding points.',
        pointsAmount: pointsAmount,
        status: 'pending_approval'
      };
      
      res.json(successResponse);
    } catch (error) {
      let errorMessage = 'Failed to complete Twitter raid: ' + (error.message || 'Unknown error');
      res.status(500).json({ 
        error: errorMessage,
        success: false
      });
    }
  } catch (error) {
    let errorMessage = 'Failed to complete Twitter raid: ' + (error.message || 'Unknown error');
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
    const raid = await TwitterRaid.findById(raidId);
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
      user.pointsHistory.push({
        amount: points,
        reason: `Twitter raid approved: ${raid.title}`,
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
    console.error('Approve error:', error);
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
    const raid = await TwitterRaid.findById(raidId);
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
      const notificationMessage = `Your Twitter raid submission for "${raid.title}" was rejected. Reason: ${reason}`;
      
      const notification = new Notification({
        userId: userId,
        type: 'status',
        message: notificationMessage,
        link: '/dashboard',
        relatedId: raidId,
        relatedModel: 'TwitterRaid'
      });
      
      await notification.save();
      console.log(`Rejection notification sent to user ${userId} for raid ${raidId}`);
    } catch (notificationError) {
      console.error('Error sending rejection notification:', notificationError);
      // Continue execution even if notification fails
    }

    res.json({
      success: true,
      message: 'Completion rejected successfully'
    });

  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: error.message || 'Failed to reject' });
  }
});

// Admin endpoint to get all pending completions
router.get('/completions/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can view pending completions' });
    }

    const raids = await TwitterRaid.find({
      'completions.approvalStatus': 'pending'
    })
    .populate('completions.userId', 'username email')
    .populate('createdBy', 'username')
    .sort({ 'completions.completedAt': -1 });

    // Extract pending completions with raid info
    const pendingCompletions = [];
    
    raids.forEach(raid => {
      raid.completions.forEach(completion => {
        if (completion.approvalStatus === 'pending') {
          pendingCompletions.push({
            completionId: completion._id,
            raidId: raid._id,
            raidTitle: raid.title,
            raidTweetUrl: raid.tweetUrl,
            pointsAmount: raid.points || 50,
            user: completion.userId,
            twitterUsername: completion.twitterUsername,
            verificationMethod: completion.verificationMethod,
            verificationNote: completion.verificationNote,
            iframeVerified: completion.iframeVerified,
            completedAt: completion.completedAt,
            ipAddress: completion.ipAddress
          });
        }
      });
    });

    res.json({
      success: true,
      pendingCompletions,
      total: pendingCompletions.length
    });

  } catch (error) {
    console.error('Error fetching pending completions:', error);
    res.status(500).json({ error: 'Failed to fetch pending completions' });
  }
});

// Get user's completed Twitter raids
router.get('/user/completed', auth, async (req, res) => {
  try {
    // Get the user ID safely - checking both possible locations
    const userId = req.user.id || req.user.userId || req.user._id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const raids = await TwitterRaid.find({
      'completions.userId': userId
    }).sort({ createdAt: -1 });
    
    res.json(raids);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch completed Twitter raids' });
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
    const raids = await TwitterRaid.find({
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

module.exports = router; 