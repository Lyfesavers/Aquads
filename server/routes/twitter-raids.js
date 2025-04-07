const express = require('express');
const router = express.Router();
const TwitterRaid = require('../models/TwitterRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const pointsModule = require('./points');
const axios = require('axios');
const { twitterRaidRateLimit } = require('../middleware/rateLimiter');
const { verifyTweetOwnership } = require('../utils/tweetUtils');

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

// Twitter Raid completion endpoint with rate limiting and security
router.post('/complete/:id', [auth, twitterRaidRateLimit], async (req, res) => {
  try {
    const { tweetUrl, twitterUsername } = req.body;
    
    if (!tweetUrl || !twitterUsername) {
      return res.status(400).json({ 
        error: 'Missing required fields: tweetUrl and twitterUsername are required.' 
      });
    }
    
    // Extract the request IP address (using headers for proxied setups)
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Validate tweet URL format before proceeding
    if (!tweetUrl.includes('/status/')) {
      return res.status(400).json({
        error: 'Invalid tweet URL format. URL must include "/status/" and be a direct link to the tweet.'
      });
    }
    
    // Verify that the tweet URL belongs to the provided Twitter username
    const ownershipVerification = verifyTweetOwnership(tweetUrl, twitterUsername);
    
    // Check for verification failures
    if (!ownershipVerification.success) {
      // Log the verification attempt for suspicious activity monitoring
      console.log(`Tweet ownership verification failed for user ${req.user.id}:`, ownershipVerification.message);
      
      return res.status(400).json({
        error: `Tweet ownership verification failed: ${ownershipVerification.message}`
      });
    }
    
    const raid = await TwitterRaid.findById(req.params.id);
    
    if (!raid) {
      return res.status(404).json({ error: 'Twitter raid not found.' });
    }
    
    // Check if user has already completed this raid
    const existingCompletion = raid.completions.find(
      completion => completion.userId.toString() === req.user.id
    );
    
    if (existingCompletion) {
      return res.status(400).json({ error: 'You have already completed this raid.' });
    }
    
    // Add the completion with IP address for tracking
    raid.completions.push({
      userId: req.user.id,
      tweetUrl,
      twitterUsername,
      status: 'pending',
      ipAddress,
      completedAt: new Date(),
      ownershipVerified: ownershipVerification.success
    });
    
    await raid.save();
    
    // Return success without details about IP tracking to the user
    res.json({
      success: true,
      message: 'Twitter raid completed successfully. Verification pending.'
    });
  } catch (error) {
    console.error('Error completing Twitter raid:', error);
    res.status(500).json({ error: 'An error occurred while completing the Twitter raid' });
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
    
    // Track suspicious activities
    const suspiciousActivities = {
      multipleAccountsPerIP: {},
      rapidCompletions: []
    };
    
    // Map to store completions by IP address
    const ipMap = {};
    
    // Process each raid
    raids.forEach(raid => {
      if (!raid.completions || raid.completions.length === 0) return;
      
      // Sort completions by timestamp
      const sortedCompletions = [...raid.completions].sort((a, b) => 
        new Date(a.completedAt) - new Date(b.completedAt)
      );
      
      // Check for rapid completions (within 5 seconds)
      for (let i = 0; i < sortedCompletions.length - 1; i++) {
        const current = sortedCompletions[i];
        const next = sortedCompletions[i + 1];
        
        const timeDiff = new Date(next.completedAt) - new Date(current.completedAt);
        
        // If completions are less than 5 seconds apart and by different users
        if (timeDiff < 5000 && current.userId.toString() !== next.userId.toString()) {
          suspiciousActivities.rapidCompletions.push({
            raidId: raid._id,
            title: raid.title,
            timeDiff: `${timeDiff}ms`,
            user1: {
              id: current.userId._id || current.userId,
              username: current.userId.username || 'Unknown',
              timestamp: current.completedAt
            },
            user2: {
              id: next.userId._id || next.userId,
              username: next.userId.username || 'Unknown',
              timestamp: next.completedAt
            }
          });
        }
      }
      
      // Track completions by IP
      sortedCompletions.forEach(completion => {
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
    Object.keys(ipMap).forEach(ip => {
      const completions = ipMap[ip];
      
      // Extract unique user IDs for this IP
      const userIds = new Set(completions.map(c => c.userId.toString()));
      
      // If more than one user has completed raids from this IP
      if (userIds.size > 1) {
        suspiciousActivities.multipleAccountsPerIP[ip] = completions;
      }
    });
    
    res.json({
      success: true,
      suspiciousActivities
    });
  } catch (error) {
    console.error('Error checking for suspicious activity:', error);
    res.status(500).json({ error: 'Failed to check for suspicious activity' });
  }
});

module.exports = router; 