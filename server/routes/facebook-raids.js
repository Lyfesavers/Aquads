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
      description: raid.description,
      platform: 'Facebook'
    });
    
    res.status(201).json(raid);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Facebook raid' });
  }
});

// Create a new Facebook raid using points
router.post('/points', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description } = req.body;

    if (!postUrl || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract post ID from URL
    const postId = extractFacebookPostId(postUrl);
    if (!postId) {
      return res.status(400).json({ error: 'Invalid Facebook URL. Please provide a valid Facebook post URL.' });
    }

    // Check if user has enough points
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.points < 2000) {
      return res.status(400).json({ error: 'Insufficient points. You need 2000 points to create a Facebook raid.' });
    }

    // Deduct points from user
    user.points -= 2000;
    await user.save();

    // Create affiliate earning record
    const affiliateEarning = new AffiliateEarning({
      userId: req.user.id,
      amount: 2000,
      type: 'facebook_raid_creation',
      description: `Facebook raid creation: ${title}`,
      status: 'completed'
    });
    await affiliateEarning.save();

    const raid = new FacebookRaid({
      postId,
      postUrl,
      title,
      description,
      points: 50,
      createdBy: req.user.id,
      isPaid: true,
      paymentStatus: 'approved'
    });

    await raid.save();
    
    // Send Telegram notification
    telegramService.sendRaidNotification({
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      platform: 'Facebook'
    });
    
    res.status(201).json(raid);
  } catch (error) {
    console.error('Error creating Facebook raid with points:', error);
    res.status(500).json({ error: 'Failed to create Facebook raid' });
  }
});

// Create a new paid Facebook raid
router.post('/paid', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description, points, paymentChain, txSignature } = req.body;

    if (!postUrl || !title || !description || !points || !paymentChain || !txSignature) {
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
      points,
      createdBy: req.user.id,
      isPaid: true,
      paymentStatus: 'pending',
      paymentChain,
      txSignature
    });

    await raid.save();
    
    // Send Telegram notification
    telegramService.sendRaidNotification({
      postUrl: raid.postUrl,
      points: raid.points,
      title: raid.title,
      description: raid.description,
      platform: 'Facebook'
    });
    
    res.status(201).json(raid);
  } catch (error) {
    console.error('Error creating paid Facebook raid:', error);
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
      description: raid.description,
      platform: 'Facebook'
    });
    
    res.status(201).json({ 
      message: 'Free Facebook raid created successfully!',
      raid,
      usage
    });
  } catch (error) {
    console.error('Error creating free Facebook raid:', error);
    res.status(500).json({ error: 'Failed to create free Facebook raid' });
  }
});

// Create a new paid Facebook raid (users)
router.post('/paid', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description, points, txSignature, paymentChain, chainSymbol, chainAddress } = req.body;

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
      points: points || 50,
      createdBy: req.user.id,
      isPaid: true,
      paymentStatus: 'pending',
      txSignature,
      paymentChain,
      chainSymbol,
      chainAddress
    });

    await raid.save();
    
    res.status(201).json(raid);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create paid Facebook raid' });
  }
});

// Create a points-based Facebook raid
router.post('/points', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description } = req.body;

    if (!postUrl || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user has enough points
    const user = await User.findById(req.user.id);
    if (!user || user.points < 2000) {
      return res.status(400).json({ error: 'Not enough points. You need 2000 points to create a Facebook raid.' });
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
      points: 50,
      createdBy: req.user.id,
      isPaid: false,
      paymentStatus: 'approved',
      paidWithPoints: true,
      pointsSpent: 2000
    });

    await raid.save();

    // Deduct points from user
    user.points -= 2000;
    await user.save();

    // Create affiliate earning record
    const affiliateEarning = new AffiliateEarning({
      userId: req.user.id,
      type: 'facebook_raid_creation',
      amount: 2000,
      description: `Facebook raid creation: ${title}`,
      status: 'completed'
    });
    await affiliateEarning.save();

    res.status(201).json({
      raid,
      message: 'Facebook raid created successfully using your affiliate points!'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create points-based Facebook raid' });
  }
});

// Create a free Facebook raid (for eligible users)
router.post('/free', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description } = req.body;

    if (!postUrl || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is eligible for free raids
    const currentDate = new Date();
    const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const raidsUsedToday = await FacebookRaid.countDocuments({
      createdBy: req.user.id,
      paidWithPoints: false,
      isPaid: false,
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });

    if (raidsUsedToday >= 2) {
      return res.status(400).json({ error: 'You have already used your 2 free Facebook raids for today.' });
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
      points: 50,
      createdBy: req.user.id,
      isPaid: false,
      paymentStatus: 'approved'
    });

    await raid.save();

    res.status(201).json({
      raid,
      message: 'Free Facebook raid created successfully!'
    });
  } catch (error) {
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
      type: 'facebook_raid_completion',
      title: 'Facebook Raid Completed',
      message: `User ${req.user.username} completed Facebook raid: ${raid.title}`,
      data: {
        raidId: raid._id,
        raidTitle: raid.title,
        facebookUsername: completion.facebookUsername
      }
    });
    await notification.save();

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

    // Award points to user
    if (!completion.pointsAwarded) {
      const user = await User.findById(completion.userId);
      if (user) {
        user.points += raid.points;
        await user.save();
        completion.pointsAwarded = true;

        // Create notification for user
        const notification = new Notification({
          userId: completion.userId,
          type: 'facebook_raid_approved',
          title: 'Facebook Raid Approved!',
          message: `Your Facebook raid completion for "${raid.title}" has been approved! You earned ${raid.points} points.`,
          data: {
            raidId: raid._id,
            raidTitle: raid.title,
            pointsEarned: raid.points
          }
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
      type: 'facebook_raid_rejected',
      title: 'Facebook Raid Rejected',
      message: `Your Facebook raid completion for "${raid.title}" was rejected. Reason: ${completion.rejectionReason}`,
      data: {
        raidId: raid._id,
        raidTitle: raid.title,
        rejectionReason: completion.rejectionReason
      }
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

module.exports = router;
