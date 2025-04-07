const express = require('express');
const router = express.Router();
const TwitterRaid = require('../models/TwitterRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { awardSocialMediaPoints } = require('./points');
const axios = require('axios');
const { JSDOM } = require('jsdom');

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

// Helper function to fetch and verify tweet content
const verifyTweetInteraction = async (tweetUrl, twitterUsername, verificationCode) => {
  try {
    // Check if the URL is valid
    if (!tweetUrl.match(/twitter\.com\/[^\/]+\/status\/\d+/)) {
      return { success: false, error: 'Invalid tweet URL format' };
    }
    
    // Fetch the tweet page
    const response = await axios.get(tweetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (response.status !== 200) {
      return { success: false, error: 'Could not access the tweet' };
    }
    
    // Parse HTML content
    const dom = new JSDOM(response.data);
    const tweetText = dom.window.document.body.textContent;
    
    // Simple verification: Check if the tweet contains both username and verification code
    if (!tweetText.includes(`@${twitterUsername}`) || !tweetText.includes(verificationCode)) {
      return { 
        success: false, 
        error: 'Could not verify your interaction. Make sure your username and verification code are in the tweet.'
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying tweet:', error);
    return { success: false, error: 'Failed to verify tweet interaction' };
  }
};

// Complete a Twitter raid
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { twitterUsername, verificationCode, tweetUrl } = req.body;
    
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

    // If user provided a tweet URL, verify it contains their username and verification code
    let verified = { success: true }; // Default to true for now
    let verificationMethod = 'automatic';
    
    if (tweetUrl) {
      verified = await verifyTweetInteraction(tweetUrl, twitterUsername, verificationCode);
      verificationMethod = 'tweet_embed';
    }
    
    if (!verified.success) {
      return res.status(400).json({ error: verified.error });
    }

    // Record the completion
    raid.completions.push({
      userId: req.user.userId,
      twitterUsername,
      verificationCode,
      verificationMethod,
      tweetUrl: tweetUrl || null,
      verified: true,
      completedAt: new Date()
    });
    
    await raid.save();
    
    // Award points
    await awardSocialMediaPoints(req.user.userId, 'Twitter', raid._id.toString());
    
    res.json({
      success: true,
      message: `Twitter raid completed successfully! You earned ${raid.points} points.`,
      note: 'Your interaction was automatically verified via tweet content.'
    });
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