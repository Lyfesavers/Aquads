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
    const postIdMatch = postUrl.match(/\/posts\/(\d+)/);
    if (!postIdMatch || !postIdMatch[1]) {
      return res.status(400).json({ error: 'Invalid Facebook URL' });
    }

    const postId = postIdMatch[1];

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

// Create a new paid Facebook raid (users)
router.post('/paid', auth, requireEmailVerification, async (req, res) => {
  try {
    const { postUrl, title, description, paymentData } = req.body;

    if (!postUrl || !title || !description || !paymentData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract post ID from URL
    const postIdMatch = postUrl.match(/\/posts\/(\d+)/);
    if (!postIdMatch || !postIdMatch[1]) {
      return res.status(400).json({ error: 'Invalid Facebook URL' });
    }

    const postId = postIdMatch[1];

    const raid = new FacebookRaid({
      postId,
      postUrl,
      title,
      description,
      points: 50,
      createdBy: req.user.id,
      isPaid: true,
      paymentStatus: 'pending',
      txSignature: paymentData.txSignature,
      paymentChain: paymentData.chain,
      chainSymbol: paymentData.symbol,
      chainAddress: paymentData.address
    });

    await raid.save();
    
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
    const postIdMatch = postUrl.match(/\/posts\/(\d+)/);
    if (!postIdMatch || !postIdMatch[1]) {
      return res.status(400).json({ error: 'Invalid Facebook URL' });
    }

    const postId = postIdMatch[1];

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
      description: raid.description,
      platform: 'Facebook'
    });
    
    res.status(201).json({ 
      message: 'Facebook raid created using your affiliate points!',
      raid,
      pointsSpent: POINTS_REQUIRED,
      remainingPoints: user.points
    });
  } catch (error) {
    console.error('Error creating points-based Facebook raid:', error);
    res.status(500).json({ error: 'Failed to create Facebook raid' });
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
    
    if (iframeVerified && iframeInteractions >= 3) {
      verificationMethod = 'iframe_interaction';
      verificationNote = 'User completed all required Facebook interactions through iframe';
    }

    // Create completion record
    const completion = {
      userId: userId,
      facebookUsername: cleanUsername,
      postUrl: postUrl || raid.postUrl,
      postId: postId || raid.postId,
      verificationCode: verificationCode || null,
      verificationMethod: verificationMethod,
      verified: true,
      approvalStatus: 'pending',
      ipAddress: ipAddress,
      iframeVerified: iframeVerified || false,
      iframeInteractions: iframeInteractions || 0,
      verificationNote: verificationNote,
      completedAt: new Date()
    };

    raid.completions.push(completion);
    await raid.save();

    // Step 1: Update user data with saved Facebook username
    const savedUsername = facebookUsername.trim().replace(/^@/, '');
    
    // Update localStorage with the new Facebook username
    try {
      const storedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (storedUser) {
        storedUser.facebookUsername = savedUsername;
        localStorage.setItem('currentUser', JSON.stringify(storedUser));
      }
    } catch (e) {
      // Silently handle localStorage errors
    }

    // Create notification for admin
    const notification = new Notification({
      userId: req.user.id,
      type: 'facebook_raid_completion',
      title: 'Facebook Raid Completed',
      message: `User ${cleanUsername} completed Facebook raid: ${raid.title}`,
      data: {
        raidId: raid._id,
        completionId: completion._id,
        platform: 'Facebook'
      }
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Facebook raid submitted successfully! Pending admin approval.',
      completion: completion
    });

  } catch (error) {
    console.error('Error completing Facebook raid:', error);
    
    if (error.message && error.message.includes('FacebookRaid validation failed')) {
      return res.status(400).json({ error: 'Invalid Facebook raid data. Please check your inputs.' });
    }
    
    res.status(500).json({ error: 'Failed to complete Facebook raid' });
  }
});

// Approve a Facebook raid completion (admin only)
router.post('/:raidId/approve/:completionId', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve Facebook raid completions' });
    }

    const { raidId, completionId } = req.params;

    const raid = await FacebookRaid.findById(raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    const completion = raid.completions.id(completionId);
    if (!completion) {
      return res.status(404).json({ error: 'Completion not found' });
    }

    if (completion.approvalStatus === 'approved') {
      return res.status(400).json({ error: 'Completion already approved' });
    }

    // Award points to user
    try {
      const updatedUser = await awardSocialMediaPoints(completion.userId, 'Facebook', raidId);
      
      // Update completion status
      completion.approvalStatus = 'approved';
      completion.approvedBy = req.user.id;
      completion.approvedAt = new Date();
      completion.pointsAwarded = true;
      
      await raid.save();

      res.json({
        success: true,
        message: 'Facebook raid completion approved and points awarded!',
        userPoints: updatedUser.points
      });
    } catch (pointsError) {
      console.error('Error awarding points:', pointsError);
      res.status(500).json({ error: 'Failed to award points' });
    }

  } catch (error) {
    console.error('Error approving Facebook raid completion:', error);
    res.status(500).json({ error: 'Failed to approve Facebook raid completion' });
  }
});

// Reject a Facebook raid completion (admin only)
router.post('/:raidId/reject/:completionId', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject Facebook raid completions' });
    }

    const { raidId, completionId } = req.params;
    const { rejectionReason } = req.body;

    const raid = await FacebookRaid.findById(raidId);
    if (!raid) {
      return res.status(404).json({ error: 'Facebook raid not found' });
    }

    const completion = raid.completions.id(completionId);
    if (!completion) {
      return res.status(404).json({ error: 'Completion not found' });
    }

    if (completion.approvalStatus === 'rejected') {
      return res.status(400).json({ error: 'Completion already rejected' });
    }

    // Update completion status
    completion.approvalStatus = 'rejected';
    completion.rejectionReason = rejectionReason || 'No reason provided';
    completion.approvedBy = req.user.id;
    completion.approvedAt = new Date();
    
    await raid.save();

    res.json({
      success: true,
      message: 'Facebook raid completion rejected'
    });

  } catch (error) {
    console.error('Error rejecting Facebook raid completion:', error);
    res.status(500).json({ error: 'Failed to reject Facebook raid completion' });
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
    const postIdMatch = postUrl.match(/\/posts\/(\d+)/);
    if (!postIdMatch || !postIdMatch[1]) {
      return res.status(400).json({ error: 'Invalid Facebook URL' });
    }

    const postId = postIdMatch[1];

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

// Delete a Facebook raid (admin only)
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete Facebook raids' });
    }

    if (!window.confirm('Are you sure you want to delete this Facebook raid?')) {
      return res.status(400).json({ error: 'Deletion cancelled' });
    }

    const response = await fetch(`${API_URL}/api/facebook-raids/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${currentUser.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete Facebook raid');
    }

    showNotification('Facebook raid deleted successfully!', 'success');
    fetchRaids(); // Refresh the raids list
  } catch (err) {
    showNotification(err.message || 'Failed to delete Facebook raid', 'error');
  }
});

module.exports = router;
