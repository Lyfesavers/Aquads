const express = require('express');
const router = express.Router();
const FacebookRaid = require('../models/FacebookRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const pointsModule = require('./points');
const axios = require('axios');
const { facebookRaidRateLimit } = require('../middleware/rateLimiter');
const AffiliateEarning = require('../models/AffiliateEarning');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const telegramService = require('../utils/telegramService');

// Use the imported module function
const awardSocialMediaPoints = pointsModule.awardSocialMediaPoints;

// Helper function to extract Facebook post ID from URL
const extractFacebookPostId = (url) => {
  if (!url) return null;
  
  // Try multiple patterns for Facebook URLs
  const patterns = [
    /facebook\.com\/[^\/]+\/posts\/(\d+)/i,
    /mobile\.facebook\.com\/[^\/]+\/posts\/(\d+)/i,
    /\/posts\/(\d+)/i,
    /facebook\.com\/share\/p\/([^\/]+)/i, // Facebook share post URLs
    /\/share\/p\/([^\/]+)/i, // Facebook share post URLs (shorter pattern)
    /facebook\.com\/share\/v\/([^\/]+)/i, // Facebook share video URLs
    /\/share\/v\/([^\/]+)/i, // Facebook share video URLs (shorter pattern)
    /facebook\.com\/[^\/]+\/videos\/(\d+)/i, // Facebook video URLs
    /mobile\.facebook\.com\/[^\/]+\/videos\/(\d+)/i, // Mobile Facebook video URLs
    /\/videos\/(\d+)/i, // Video URLs (shorter pattern)
    /(\d{10,20})/ // Fallback for just numbers
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

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

// Check free raid eligibility
router.get('/free-eligibility', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const eligibility = user.checkFreeRaidEligibility();
    res.json({ eligibility });
  } catch (error) {
    console.error('Error checking free raid eligibility:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
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
    const postId = extractFacebookPostId(postUrl);
    if (!postId) {
      return res.status(400).json({ error: 'Invalid Facebook URL. Please provide a valid Facebook post URL.' });
    }

    const raid = new FacebookRaid({
      postId,
      postUrl,
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
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      platform: 'Facebook',
      isAdmin: true
    });
    
    res.status(201).json(raid);
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
    const postId = extractFacebookPostId(postUrl);
    if (!postId) {
      return res.status(400).json({ error: 'Invalid Facebook URL. Please provide a valid Facebook post URL.' });
    }

    // Create the raid
    const raid = new FacebookRaid({
      postId,
      postUrl,
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
      reason: 'Created Facebook raid with points',
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
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      platform: 'Facebook',
      sourceChatId: sourceChatId,
      isAdmin: false
    });
    
    // Build response message with group setup tip if needed
    let responseMessage = `Facebook raid created successfully! ${POINTS_REQUIRED} points have been deducted from your account.`;
    
    if (!sourceChatId) {
      responseMessage += `\n\n💡 Tip: Link your Telegram group to receive raids! Go to your Telegram group and use /raidin or /raidout to connect your group.`;
    } else {
      // Check if group is opted-in
      const isOptedIn = telegramService.raidCrossPostingGroups.has(sourceChatId);
      if (!isOptedIn) {
        responseMessage += `\n\n💡 Tip: Use /raidin in your Telegram group to share raids with other groups, or /raidout to keep raids private.`;
      }
    }
    
    res.status(201).json({ 
      message: responseMessage,
      raid,
      pointsRemaining: user.points,
      groupLinked: !!sourceChatId
    });
  } catch (error) {
    console.error('Error creating Facebook raid with points:', error);
    res.status(500).json({ error: 'Failed to create Facebook raid' });
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
    const postId = extractFacebookPostId(postUrl);
    if (!postId) {
      return res.status(400).json({ error: 'Invalid Facebook URL. Please provide a valid Facebook post URL.' });
    }

    // Use a free raid
    const usage = await user.useFreeRaid();

    // Create the raid
    const raid = new FacebookRaid({
      postId,
      postUrl,
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
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      platform: 'Facebook',
      sourceChatId: sourceChatId,
      isAdmin: false
    });
    
    // Build response message with group setup tip if needed
    let responseMessage = 'Free Facebook raid created successfully!';
    
    if (!sourceChatId) {
      responseMessage += `\n\n💡 Tip: Link your Telegram group to receive raids! Go to your Telegram group and use /raidin or /raidout to connect your group.`;
    } else {
      // Check if group is opted-in
      const isOptedIn = telegramService.raidCrossPostingGroups.has(sourceChatId);
      if (!isOptedIn) {
        responseMessage += `\n\n💡 Tip: Use /raidin in your Telegram group to share raids with other groups, or /raidout to keep raids private.`;
      }
    }
    
    res.status(201).json({ 
      message: responseMessage,
      raid,
      usage
    });
  } catch (error) {
    console.error('Error creating free Facebook raid:', error);
    res.status(500).json({ error: 'Failed to create free Facebook raid' });
  }
});

// Complete a Facebook raid
router.post('/:raidId/complete', auth, requireEmailVerification, facebookRaidRateLimit, async (req, res) => {
  try {
    const { postUrl, facebookUsername, iframeVerified, directInteractions, postId } = req.body;
    
    if (!facebookUsername || !postUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const raid = await FacebookRaid.findById(req.params.raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    if (!raid.active) {
      return res.status(400).json({ error: 'This Facebook raid is no longer active' });
    }

    // Check if user already completed this raid
    const existingCompletion = raid.completions.find(
      completion => completion.userId && completion.userId.toString() === req.user.id
    );

    if (existingCompletion) {
      return res.status(400).json({ error: 'You have already completed this Facebook raid' });
    }

    // Create completion record
    const completion = {
      userId: req.user.id,
      facebookUsername: facebookUsername.trim().replace(/^@/, ''),
      postUrl: postUrl,
      postId: postId,
      verificationMethod: 'iframe_interaction',
      iframeVerified: iframeVerified || false,
      iframeInteractions: directInteractions ? Object.keys(directInteractions).filter(key => directInteractions[key]).length : 0,
      ipAddress: req.ip,
      completedAt: new Date()
    };

    raid.completions.push(completion);
    await raid.save();

    // Create notification for admin
    const notification = new Notification({
      userId: req.user.id,
      type: 'status',
      message: `User ${req.user.username} completed Facebook raid: ${raid.title}`,
      relatedId: raid._id,
      relatedModel: 'FacebookRaid'
    });
    await notification.save();

    // Send Telegram notification to all groups
    telegramService.sendRaidCompletionNotification({
      userId: req.user.id,
      raidId: raid._id.toString(),
      raidTitle: raid.title,
      platform: 'Facebook',
      points: raid.points || 20
    }).catch(err => {
      console.error('Error sending raid completion notification:', err);
    });

    res.json({
      message: 'Facebook raid completed successfully! Your submission is pending admin approval.',
      completion
    });
  } catch (error) {
    console.error('Facebook raid completion error:', error);
    res.status(500).json({ error: 'Failed to complete Facebook raid' });
  }
});

// Approve a Facebook raid completion (admin only)
router.post('/:raidId/approve/:completionId', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve Facebook raid completions' });
    }

    const raid = await FacebookRaid.findById(req.params.raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    const completion = raid.completions.id(req.params.completionId);
    if (!completion) {
      return res.status(404).json({ error: 'Completion not found' });
    }

    if (completion.approvalStatus === 'approved') {
      return res.status(400).json({ error: 'Completion already approved' });
    }

    // Update completion status
    completion.approvalStatus = 'approved';
    completion.approvedBy = req.user.id;
    completion.approvedAt = new Date();
    completion.verified = true;

    // Award points to user - check if admin specified custom points (for verified accounts)
    if (!completion.pointsAwarded) {
      const user = await User.findById(completion.userId);
      if (user) {
        // Use admin-specified points if provided, otherwise use raid default
        const points = req.body.points || raid.points || 20;
        const isVerifiedBonus = req.body.points === 50;
        user.points += points;
        await user.save();
        completion.pointsAwarded = true;

        // Create notification for user
        const notification = new Notification({
          userId: completion.userId,
          type: 'status',
          message: `Your Facebook raid completion for "${raid.title}" has been approved! You earned ${points} points${isVerifiedBonus ? ' (verified account bonus)' : ''}.`,
          relatedId: raid._id,
          relatedModel: 'FacebookRaid'
        });
        await notification.save();
      }
    }

    await raid.save();

    res.json({
      message: 'Facebook raid completion approved successfully!',
      completion
    });
  } catch (error) {
    console.error('Facebook raid approval error:', error);
    res.status(500).json({ error: 'Failed to approve Facebook raid completion' });
  }
});

// Reject a Facebook raid completion (admin only)
router.post('/:raidId/reject/:completionId', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject Facebook raid completions' });
    }

    const { rejectionReason } = req.body;

    const raid = await FacebookRaid.findById(req.params.raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    const completion = raid.completions.id(req.params.completionId);
    if (!completion) {
      return res.status(404).json({ error: 'Completion not found' });
    }

    if (completion.approvalStatus === 'rejected') {
      return res.status(400).json({ error: 'Completion already rejected' });
    }

    // Update completion status
    completion.approvalStatus = 'rejected';
    completion.rejectionReason = rejectionReason || 'No reason provided';

    // Create notification for user
    const notification = new Notification({
      userId: completion.userId,
      type: 'status',
      message: `Your Facebook raid completion for "${raid.title}" was rejected. Reason: ${completion.rejectionReason}`,
      relatedId: raid._id,
      relatedModel: 'FacebookRaid'
    });
    await notification.save();

    await raid.save();

    res.json({
      message: 'Facebook raid completion rejected successfully!',
      completion
    });
  } catch (error) {
    console.error('Facebook raid rejection error:', error);
    res.status(500).json({ error: 'Failed to reject Facebook raid completion' });
  }
});

// Approve a pending paid Facebook raid (admin only)
router.post('/:raidId/approve', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve Facebook raids' });
    }

    const raid = await FacebookRaid.findById(req.params.raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    if (!raid.isPaid || raid.paymentStatus !== 'pending') {
      return res.status(400).json({ error: 'This Facebook raid is not pending approval' });
    }

    raid.paymentStatus = 'approved';
    raid.active = true;
    await raid.save();

    res.json({
      message: 'Facebook raid approved successfully!',
      raid
    });
  } catch (error) {
    console.error('Facebook raid approval error:', error);
    res.status(500).json({ error: 'Failed to approve Facebook raid' });
  }
});

// Reject a pending paid Facebook raid (admin only)
router.post('/:raidId/reject', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject Facebook raids' });
    }

    const { rejectionReason } = req.body;

    const raid = await FacebookRaid.findById(req.params.raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    if (!raid.isPaid || raid.paymentStatus !== 'pending') {
      return res.status(400).json({ error: 'This Facebook raid is not pending approval' });
    }

    raid.paymentStatus = 'rejected';
    raid.active = false;
    await raid.save();

    res.json({
      message: 'Facebook raid rejected successfully!',
      raid
    });
  } catch (error) {
    console.error('Facebook raid rejection error:', error);
    res.status(500).json({ error: 'Failed to reject Facebook raid' });
  }
});

// Delete a Facebook raid (admin only)
router.delete('/:raidId', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete Facebook raids' });
    }

    const raid = await FacebookRaid.findById(req.params.raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    await FacebookRaid.findByIdAndDelete(req.params.raidId);

    res.json({ message: 'Facebook raid deleted successfully!' });
  } catch (error) {
    console.error('Facebook raid deletion error:', error);
    res.status(500).json({ error: 'Failed to delete Facebook raid' });
  }
});

// Admin endpoint to get all pending Facebook raid completions
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
    
    raids.forEach(raid => {
      raid.completions.forEach(completion => {
        if (completion.approvalStatus === 'pending' && completion.userId) {
          pendingCompletions.push({
            completionId: completion._id,
            raidId: raid._id,
            raidTitle: raid.title,
            raidDescription: raid.description,
            raidPoints: raid.points,
            raidPostUrl: raid.postUrl,
            userId: completion.userId._id,
            username: completion.userId.username,
            email: completion.userId.email,
            facebookUsername: completion.facebookUsername,
            postUrl: completion.postUrl,
            postId: completion.postId,
            completedAt: completion.completedAt,
            ipAddress: completion.ipAddress
          });
        }
      });
    });

    res.json({ pendingCompletions });
  } catch (error) {
    console.error('Error fetching pending Facebook raid completions:', error);
    res.status(500).json({ error: 'Failed to fetch pending completions' });
  }
});

module.exports = router;
