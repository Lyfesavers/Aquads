const express = require('express');
const router = express.Router();
const TwitterRaid = require('../models/TwitterRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { awardSocialMediaPoints } = require('./points');
const axios = require('axios');

// Get all active Twitter raids
router.get('/', async (req, res) => {
  try {
    const raids = await TwitterRaid.find({ active: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username');
    
    res.json(raids);
  } catch (error) {
    console.error('Error fetching Twitter raids:', error);
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
      createdBy: req.user.userId
    });

    await raid.save();
    
    res.status(201).json(raid);
  } catch (error) {
    console.error('Error creating Twitter raid:', error);
    res.status(500).json({ error: 'Failed to create Twitter raid' });
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
    console.error('Error deleting Twitter raid:', error);
    res.status(500).json({ error: 'Failed to delete Twitter raid' });
  }
});

// Complete a Twitter raid
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { twitterUsername } = req.body;
    
    if (!twitterUsername) {
      return res.status(400).json({ error: 'Twitter username is required' });
    }

    const raid = await TwitterRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Twitter raid not found' });
    }

    if (!raid.active) {
      return res.status(400).json({ error: 'This Twitter raid is no longer active' });
    }

    // Check if user already completed this raid
    const alreadyCompleted = raid.completions.some(
      completion => completion.userId.toString() === req.user.userId
    );
    
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'You have already completed this raid' });
    }

    // Verify the user has interacted with the tweet
    try {
      // For now, we'll assume verification is successful
      // In a real implementation, you would use Twitter API to verify the interaction
      
      // *** Simplified verification logic ***
      // We assume the user is truthful about their Twitter username
      // In production, you'd use Twitter OAuth to verify ownership
      
      // Record the completion
      raid.completions.push({
        userId: req.user.userId,
        twitterUsername,
        completedAt: new Date()
      });
      
      await raid.save();
      
      // Award points
      await awardSocialMediaPoints(req.user.userId, 'Twitter', raid._id.toString());
      
      res.json({
        success: true,
        message: `Twitter raid completed successfully! You earned ${raid.points} points.`
      });
    } catch (verificationError) {
      console.error('Error verifying Twitter interaction:', verificationError);
      res.status(400).json({ error: 'Could not verify your interaction with this tweet' });
    }
  } catch (error) {
    console.error('Error completing Twitter raid:', error);
    res.status(500).json({ error: 'Failed to complete Twitter raid' });
  }
});

// Get user's completed Twitter raids
router.get('/user/completed', auth, async (req, res) => {
  try {
    const raids = await TwitterRaid.find({
      'completions.userId': req.user.userId
    }).sort({ createdAt: -1 });
    
    res.json(raids);
  } catch (error) {
    console.error('Error fetching completed Twitter raids:', error);
    res.status(500).json({ error: 'Failed to fetch completed Twitter raids' });
  }
});

module.exports = router; 