const express = require('express');
const router = express.Router();
const TwitterRaid = require('../models/TwitterRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const pointsModule = require('./points');
const axios = require('axios');

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
      console.error('Error verifying tweet URL:', error);
      // If we can't connect to Twitter, we'll still accept it
      return { success: true, warning: 'Could not verify tweet existence, but accepting submission.' };
    }
  } catch (error) {
    console.error('Error in verifyTweetUrl:', error);
    return { success: true, warning: 'Verification skipped due to error' };
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

    // Verify tweet URL format only (skip API validation to avoid potential issues)
    let verificationMethod = 'client_side';
    let verificationNote = 'Verified through client-side tweet embedding';
    
    if (tweetUrl) {
      // Just check basic URL format
      const isValidFormat = !!tweetUrl.match(/(?:twitter\.com|x\.com)\/[^\/]+\/status\/\d+/i);
      
      if (!isValidFormat) {
        return res.status(400).json({ 
          error: 'Invalid tweet URL format. URL should look like: https://twitter.com/username/status/1234567890 or https://x.com/username/status/1234567890' 
        });
      }
      
      // Check if URL contains "aquads.xyz" (case insensitive) - only as a note, not a requirement
      const containsVerificationTag = tweetUrl.toLowerCase().includes('aquads.xyz');
      if (!containsVerificationTag) {
        verificationNote = 'URL does not contain verification tag, but accepted';
      } else {
        verificationNote = 'Tweet URL format verified with verification tag';
      }
    }

    // First award points directly to ensure the user gets them
    try {
      // Award points directly - this is the important part that needs to work
      const pointsAmount = raid.points || 50;
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Award points directly on the user object
      user.points += pointsAmount;
      user.pointsHistory.push({
        amount: pointsAmount,
        reason: `Completed Twitter raid: ${raid.title}`,
        socialRaidId: raid._id,
        createdAt: new Date()
      });
      
      // Save the user with new points
      await user.save();
      
      // Then record the completion
      raid.completions.push({
        userId: req.user.userId,
        twitterUsername,
        verificationCode,
        verificationMethod,
        tweetUrl: tweetUrl || null,
        verified: true,
        verificationNote,
        completedAt: new Date()
      });
      
      await raid.save();
      
      // Success response
      res.json({
        success: true,
        message: `Twitter raid completed successfully! You earned ${pointsAmount} points.`,
        note: 'Your submission has been recorded. Thank you for participating!',
        pointsAwarded: pointsAmount,
        currentPoints: user.points
      });
    } catch (error) {
      console.error('Error in Twitter raid completion:', error);
      res.status(500).json({ 
        error: 'Failed to complete Twitter raid: ' + (error.message || 'Unknown error')
      });
    }
  } catch (error) {
    console.error('Error completing Twitter raid:', error);
    res.status(500).json({ 
      error: 'Failed to complete Twitter raid: ' + (error.message || 'Unknown error') 
    });
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