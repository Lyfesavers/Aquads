const express = require('express');
const router = express.Router();
const TwitterRaid = require('../models/TwitterRaid');
const User = require('../models/User');
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const pointsModule = require('./points');
const axios = require('axios');
const { twitterRaidRateLimit } = require('../middleware/rateLimiter');
const AffiliateEarning = require('../models/AffiliateEarning');
const { emitTwitterRaidApproved, emitTwitterRaidRejected, emitNewTwitterRaidCompletion, emitAffiliateEarningUpdate, emitRaidUpdate } = require('../socket');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const telegramService = require('../utils/telegramService');

// Constants for free raid limits
const LIFETIME_BUMP_FREE_RAID_LIMIT = 20;

// Helper function to check if user has a lifetime-bumped active ad
async function checkUserHasLifetimeBumpedAd(username) {
  try {
    const lifetimeBumpedAd = await Ad.findOne({
      owner: username,
      status: 'active',
      isBumped: true,
      $or: [
        { bumpDuration: -1 },           // Lifetime bump indicator
        { bumpExpiresAt: null }         // Another way lifetime bumps are stored
      ]
    });
    return lifetimeBumpedAd !== null;
  } catch (error) {
    console.error('Error checking lifetime bumped ad:', error);
    return false;
  }
}

// Helper function to calculate user trust score
async function calculateUserTrustScore(userId) {
  try {
    const allRaidsWithCompletions = await TwitterRaid.find({
      'completions.userId': new mongoose.Types.ObjectId(userId)
    })
    .select('completions')
    .lean();

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

    return {
      totalCompletions,
      approvedCompletions,
      approvalRate: totalCompletions > 0 ? (approvedCompletions / totalCompletions) * 100 : 0,
      trustLevel: totalCompletions === 0 ? 'new' : 
                 (approvedCompletions / totalCompletions) >= 0.85 ? 'high' :
                 (approvedCompletions / totalCompletions) >= 0.65 ? 'medium' : 'low'
    };
  } catch (error) {
    console.error('Error calculating trust score:', error);
    return {
      totalCompletions: 0,
      approvedCompletions: 0,
      approvalRate: 0,
      trustLevel: 'new'
    };
  }
}

// Webhook endpoint for receiving Telegram bot updates
router.post('/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // Always respond 200 OK quickly to Telegram
    res.json({ ok: true });
    
    // Process updates asynchronously
    if (update.message) {
      // Handle photo uploads (for branding)
      if (update.message.photo) {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const handled = await telegramService.handleBrandingImageUpload(chatId, userId, update.message.photo);
        // If not handled by branding, continue to command handler
        if (!handled && update.message.caption) {
          // Handle caption as command if photo wasn't for branding
          update.message.text = update.message.caption;
          await telegramService.handleCommand(update.message);
        }
      }
      // Handle text messages
      else if (update.message.text) {
        await telegramService.handleCommand(update.message);
      }
      
      // Track engagement in private group (messages)
      await telegramService.handleEngagementMessage(update.message);
    }
    
    if (update.callback_query) {
      await telegramService.handleCallbackQuery(update.callback_query);
    }
    
    // Handle reactions for daily engagement points
    if (update.message_reaction) {
      await telegramService.handleEngagementReaction(update.message_reaction);
    }
    
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});

// Use the imported module function
const awardSocialMediaPoints = pointsModule.awardSocialMediaPoints;

// Get all active Twitter raids
router.get('/', async (req, res) => {
  try {
    // Get user ID safely (works for both authenticated and non-authenticated users)
    const userId = req.user ? (req.user.userId || req.user.id || req.user._id) : null;
    
    // Load raids with only essential completion data for speed
    const raids = await TwitterRaid.find({ active: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username')
      .select('tweetId tweetUrl title description points createdBy active createdAt completions.userId completions.approvalStatus');
    
    // Process raids to add count and user completion status
    const processedRaids = raids.map(raid => {
      const approvedCompletions = raid.completions.filter(c => c.approvalStatus === 'approved');
      const userCompleted = userId ? raid.completions.some(c => 
        c.userId && c.userId.toString() === userId.toString()
      ) : false;
      
      return {
        ...raid.toObject(),
        completionCount: approvedCompletions.length,
        userCompleted: userCompleted
      };
    });
    
    res.json(processedRaids);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Twitter raids' });
  }
});

// Create a new Twitter raid (admin only)
router.post('/', auth, requireEmailVerification, async (req, res) => {
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
      points: points || 20,
      createdBy: req.user.id,
      isPaid: false,
      paymentStatus: 'approved' // Admin created raids are automatically approved
    });

    await raid.save();
    
    // Send Telegram notification (admin raids go to all groups)
    telegramService.sendRaidNotification({
      raidId: raid._id.toString(),
      tweetUrl: raid.tweetUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      isAdmin: true
    });
    
    // Emit socket event for real-time update (populate createdBy for frontend)
    const populatedRaid = await TwitterRaid.findById(raid._id).populate('createdBy', 'username');
    emitRaidUpdate('created', populatedRaid, 'twitter');
    
    res.status(201).json(raid);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Twitter raid' });
  }
});


// Create a new Twitter raid using affiliate points (users)
router.post('/points', auth, requireEmailVerification, async (req, res) => {
  try {
    const { tweetUrl, title, description } = req.body;
    const POINTS_REQUIRED = 2000; // Points required to create a raid

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
      points: 20, // Fixed points for raids
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
    
    // Send Telegram notification (use user's linked group if available)
    const sourceChatId = user.telegramGroupId || null;
    telegramService.sendRaidNotification({
      raidId: raid._id.toString(),
      tweetUrl: raid.tweetUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      sourceChatId: sourceChatId,
      isAdmin: false
    });
    
    // Build response message with group setup tip if needed
    let responseMessage = `Twitter raid created successfully! ${POINTS_REQUIRED} points have been deducted from your account.`;
    
    if (!sourceChatId) {
      responseMessage += `\n\n💡 Tip: Link your Telegram group to receive raids! Go to your Telegram group and use /raidin or /raidout to connect your group.`;
    } else {
      // Check if group is opted-in
      const isOptedIn = telegramService.raidCrossPostingGroups.has(sourceChatId);
      if (!isOptedIn) {
        responseMessage += `\n\n💡 Tip: Use /raidin in your Telegram group to share raids with other groups, or /raidout to keep raids private.`;
      }
    }
    
    // Emit socket event for real-time update (populate createdBy for frontend)
    const populatedRaid = await TwitterRaid.findById(raid._id).populate('createdBy', 'username');
    emitRaidUpdate('created', populatedRaid, 'twitter');
    
    res.status(201).json({ 
      message: responseMessage,
      raid,
      pointsRemaining: user.points,
      groupLinked: !!sourceChatId
    });
      } catch (error) {
      res.status(500).json({ error: 'Failed to create Twitter raid' });
    }
});


// Delete/Cancel a Twitter raid (admin or raid owner)
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    const raid = await TwitterRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Twitter raid not found' });
    }

    // Check if user is admin or the raid owner
    const isAdmin = req.user.isAdmin;
    const isOwner = raid.createdBy.toString() === req.user.id.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Only admins or the raid creator can cancel this raid' });
    }

    // Delete Telegram messages for this raid
    try {
      await telegramService.deleteRaidMessagesByRaidId(raid._id.toString());
    } catch (telegramError) {
      console.error('Error deleting Telegram messages:', telegramError.message);
      // Continue with raid cancellation even if Telegram deletion fails
    }

    // Instead of deleting, mark as inactive
    raid.active = false;
    await raid.save();
    
    // Emit socket event for real-time update (convert ObjectId to string)
    emitRaidUpdate('cancelled', { _id: raid._id.toString() }, 'twitter');
    
    res.json({ message: 'Twitter raid cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel Twitter raid' });
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
router.post('/:id/complete', auth, requireEmailVerification, twitterRaidRateLimit, async (req, res) => {
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
      const pointsAmount = raid.points || 20;
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      // Record the completion as pending approval - DO NOT award points yet
      const newCompletion = {
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
      };
      
      raid.completions.push(newCompletion);
      
      // Update user's last activity for accurate fraud detection
      await User.findByIdAndUpdate(userId, {
        lastActivity: new Date()
      });
      
      // Save the raid with the pending completion
      await raid.save();
      
      // Calculate trust score for the new completion
      const userTrustScore = await calculateUserTrustScore(userId);
      
      emitNewTwitterRaidCompletion({
        completionId: raid.completions[raid.completions.length - 1]._id,
        raidId: raid._id,
        raidTitle: raid.title,
        raidTweetUrl: raid.tweetUrl,
        pointsAmount: raid.points || 20,
        user: {
          _id: userId,
          username: user.username,
          email: user.email
        },
        twitterUsername: cleanUsername,
        verificationMethod: verificationMethod,
        verificationNote: verificationNote,
        iframeVerified: iframeVerified || false,
        completedAt: new Date(),
        ipAddress: ipAddress,
        trustScore: userTrustScore
      });

      // Send Telegram notification to all groups
      telegramService.sendRaidCompletionNotification({
        userId: userId,
        raidId: raid._id.toString(),
        raidTitle: raid.title,
        platform: 'Twitter',
        points: raid.points || 20
      }).catch(err => {
        console.error('Error sending raid completion notification:', err);
      });
      
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

    // Award points to user - check if admin specified custom points (for verified accounts)
    const user = await User.findById(completion.userId);
    if (user) {
      // Use admin-specified points if provided, otherwise use raid default or 20
      const points = req.body.points || raid.points || 20;
      const isVerifiedBonus = req.body.points === 50;
      user.points = (user.points || 0) + points;
      user.lastActivity = new Date(); // Update activity when points are awarded
      user.pointsHistory.push({
        amount: points,
        reason: `Twitter raid approved${isVerifiedBonus ? ' (verified account)' : ''}: ${raid.title}`,
        socialRaidId: raid._id,
        createdAt: new Date()
      });
      await user.save();
      
        // Emit real-time update for points awarded
        emitAffiliateEarningUpdate({
          affiliateId: completion.userId,
          type: 'points_awarded',
          pointsAwarded: points,
          newTotalPoints: user.points,
          reason: `Twitter raid approved${isVerifiedBonus ? ' (verified account)' : ''}: ${raid.title}`
        });
         }

    await raid.save({ validateBeforeSave: false });

    // Emit real-time update to all connected clients
    emitTwitterRaidApproved({
      completionId: completion._id,
      raidId: raid._id,
      raidTitle: raid.title,
      userId: completion.userId,
      approvedBy: req.user.id,
      approvedAt: completion.approvedAt
    });

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
  
    } catch (notificationError) {
      // Continue execution even if notification fails
    }

    // Emit real-time update to all connected clients
    emitTwitterRaidRejected({
      completionId: completion._id,
      raidId: raid._id,
      raidTitle: raid.title,
      userId: completion.userId,
      rejectedBy: req.user.id,
      rejectedAt: completion.approvedAt,
      rejectionReason: rejectionReason || 'No reason provided'
    });

    res.json({
      success: true,
      message: 'Completion rejected successfully'
    });

  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to reject' });
  }
});

// Admin endpoint to get all pending completions
// Test bot functionality (admin only)
router.get('/test-bot', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await telegramService.testBotManually();
    res.json({ success: true, message: 'Bot test completed, check logs for results' });
  } catch (error) {
    res.status(500).json({ error: 'Bot test failed' });
  }
});

router.get('/completions/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can view pending completions' });
    }

    // Get raids with pending completions using optimized query
    const raids = await TwitterRaid.find({
      completions: {
        $elemMatch: {
          approvalStatus: 'pending'
        }
      }
    })
    .populate('completions.userId', 'username email')
    .populate('createdBy', 'username')
    .lean();

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

    // Calculate trust scores using optimized database query
    const userTrustScores = {};
    if (userIds.size > 0) {
      try {
        const allRaidsWithCompletions = await TwitterRaid.find({
          'completions.userId': { $in: Array.from(userIds).map(id => new mongoose.Types.ObjectId(id)) }
        })
        .select('completions')
        .lean();

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
      } catch (error) {
        console.error('Error calculating trust scores:', error);
        // Fallback to empty trust scores if query fails
        userIds.forEach(userId => {
          userTrustScores[userId] = {
            totalCompletions: 0,
            approvedCompletions: 0,
            approvalRate: 0,
            trustLevel: 'new'
          };
        });
      }
    }
    
    raids.forEach(raid => {
      // Process each completion in the raid
      raid.completions.forEach(completion => {
        if (completion.approvalStatus === 'pending') {
          const userId = completion.userId ? completion.userId._id.toString() : null;
          const trustScore = userId ? userTrustScores[userId] : null;
          
          pendingCompletions.push({
            completionId: completion._id,
            raidId: raid._id,
            raidTitle: raid.title,
            raidTweetUrl: raid.tweetUrl,
            pointsAmount: raid.points || 20,
            user: completion.userId,
            twitterUsername: completion.twitterUsername,
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

// Create a new free Twitter raid (for lifetime bumped projects or manually approved free raid projects)
router.post('/free', auth, requireEmailVerification, async (req, res) => {
  try {
    const { tweetUrl, title, description } = req.body;

    if (!tweetUrl || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is eligible for free raids
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine eligibility - only lifetime bumped projects get free raids
    const hasLifetimeBumpedAd = await checkUserHasLifetimeBumpedAd(user.username);
    
    if (!hasLifetimeBumpedAd) {
      return res.status(400).json({ 
        error: 'Not eligible for free raids. You must have an active project with a lifetime bump in the bubbles.',
        eligible: false 
      });
    }
    
    const dailyLimit = LIFETIME_BUMP_FREE_RAID_LIMIT; // 20 raids for lifetime bumped projects
    const eligibilitySource = 'lifetime_bump';

    // Check eligibility with the determined daily limit
    const eligibility = user.checkFreeRaidEligibility(dailyLimit);
    if (!eligibility.eligible) {
      return res.status(400).json({ 
        error: eligibility.reason,
        raidsRemaining: eligibility.raidsRemaining,
        raidsUsedToday: eligibility.raidsUsedToday,
        dailyLimit: eligibility.dailyLimit
      });
    }

    // Extract tweet ID from URL
    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    if (!tweetIdMatch || !tweetIdMatch[1]) {
      return res.status(400).json({ error: 'Invalid Twitter URL' });
    }

    const tweetId = tweetIdMatch[1];

    // Use a free raid with the appropriate daily limit
    const usage = await user.useFreeRaid(dailyLimit);

    // Create the raid
    const raid = new TwitterRaid({
      tweetId,
      tweetUrl,
      title,
      description,
      points: 20, // Fixed points for free raids
      createdBy: req.user.id,
      isPaid: false,
      paymentStatus: 'approved', // Free raids are automatically approved
      paidWithPoints: false,
      pointsSpent: 0,
      active: true
    });

    await raid.save();
    
    // Send Telegram notification (use user's linked group if available)
    const sourceChatId = user.telegramGroupId || null;
    telegramService.sendRaidNotification({
      raidId: raid._id.toString(),
      tweetUrl: raid.tweetUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      sourceChatId: sourceChatId,
      isAdmin: false
    });
    
    // Build response message with group setup tip if needed
    let responseMessage = 'Free Twitter raid created successfully!';
    
    if (!sourceChatId) {
      responseMessage += `\n\n💡 Tip: Link your Telegram group to receive raids! Go to your Telegram group and use /raidin or /raidout to connect your group.`;
    } else {
      // Check if group is opted-in
      const isOptedIn = telegramService.raidCrossPostingGroups.has(sourceChatId);
      if (!isOptedIn) {
        responseMessage += `\n\n💡 Tip: Use /raidin in your Telegram group to share raids with other groups, or /raidout to keep raids private.`;
      }
    }
    
    // Emit socket event for real-time update (populate createdBy for frontend)
    const populatedRaid = await TwitterRaid.findById(raid._id).populate('createdBy', 'username');
    emitRaidUpdate('created', populatedRaid, 'twitter');
    
    res.status(201).json({
      message: responseMessage,
      raid,
      usage: {
        ...usage,
        eligibilitySource
      }
    });
  } catch (error) {
    console.error('Error creating free raid:', error);
    res.status(500).json({ error: 'Failed to create free Twitter raid' });
  }
});

// Check free raid eligibility status (for frontend display)
router.get('/free/eligibility', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check eligibility sources
    // Check if user has a lifetime bumped project
    const hasLifetimeBumpedAd = await checkUserHasLifetimeBumpedAd(user.username);
    
    if (!hasLifetimeBumpedAd) {
      return res.json({
        eligible: false,
        reason: 'You must have an active project with a lifetime bump in the bubbles to create free raids.',
        dailyLimit: 0,
        raidsRemaining: 0,
        raidsUsedToday: 0,
        eligibilitySource: null
      });
    }

    // User has lifetime bump - 20 free raids per day
    const dailyLimit = LIFETIME_BUMP_FREE_RAID_LIMIT;
    const eligibilitySource = 'lifetime_bump';

    // Get current usage
    const eligibility = user.checkFreeRaidEligibility(dailyLimit);
    
    res.json({
      eligible: eligibility.eligible,
      reason: eligibility.eligible ? null : eligibility.reason,
      dailyLimit: eligibility.dailyLimit,
      raidsRemaining: eligibility.raidsRemaining,
      raidsUsedToday: eligibility.raidsUsedToday,
      eligibilitySource
    });
  } catch (error) {
    console.error('Error checking free raid eligibility:', error);
    res.status(500).json({ error: 'Failed to check free raid eligibility' });
  }
});

module.exports = router; 