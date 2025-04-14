const express = require('express');
const router = express.Router();
const TwitterRaid = require('../models/TwitterRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const pointsModule = require('./points');
const axios = require('axios');
const { twitterRaidRateLimit } = require('../middleware/rateLimiter');
const AffiliateEarning = require('../models/AffiliateEarning');

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
      createdBy: req.user.id,
      isPaid: false,
      paymentStatus: 'approved' // Admin created raids are automatically approved
    });

    await raid.save();
    
    res.status(201).json(raid);
  } catch (error) {
    console.error('Error creating Twitter raid:', error);
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
        console.log('Affiliate commission recorded for Twitter raid:', earning);
      }
    } catch (commissionError) {
      console.error('Error processing affiliate commission:', commissionError);
      // Continue despite commission error
    }
    
    res.status(201).json({ 
      message: 'Twitter raid created successfully! It will be active once payment is approved.',
      raid 
    });
  } catch (error) {
    console.error('Error creating paid Twitter raid:', error);
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
    console.error('Error approving Twitter raid:', error);
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
    console.error('Error rejecting Twitter raid:', error);
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

// Complete a Twitter raid with rate limiting
router.post('/:id/complete', auth, twitterRaidRateLimit, async (req, res) => {
  try {
    const { twitterUsername, verificationCode, tweetUrl, iframeVerified, iframeInteractions } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // DEBUG: Log request data
    console.log('Twitter raid completion request:', {
      raidId: req.params.id,
      user: req.user.id || req.user.userId || req.user._id,
      tweetUrl,
      iframeVerified,
      iframeInteractions,
      ipAddress
    });
    
    // Get the user ID safely - checking both possible locations
    const userId = req.user.id || req.user.userId || req.user._id;
    
    if (!userId) {
      console.error('Could not determine user ID from request:', req.user);
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const raid = await TwitterRaid.findById(req.params.id);
    console.log('Found raid:', raid ? raid._id : 'Not found');
    
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
      console.log(`User ${userId} already completed raid ${raid._id}`);
      return res.status(400).json({ error: 'You have already completed this raid' });
    }

    // Check verification method - either iframe or tweet URL
    let verificationMethod = 'manual';
    let verificationNote = 'User verification was not validated';
    let verified = false;
    
    // If iframe verification was used
    if (iframeVerified === true && iframeInteractions >= 3) {
      verificationMethod = 'iframe_interaction';
      verificationNote = `Verified through iframe interaction (${iframeInteractions} interactions)`;
      verified = true;
      console.log('User verified through iframe interactions:', iframeInteractions);
    }
    // If tweet URL was provided
    else if (tweetUrl) {
      // Just check basic URL format - be more flexible with validation
      const isValidFormat = !!tweetUrl.match(/(?:twitter\.com|x\.com)\/[^\/]+\/status\/\d+/i);
      
      if (!isValidFormat) {
        console.log('Invalid tweet URL format:', tweetUrl);
        return res.status(400).json({ 
          error: 'Invalid tweet URL format. URL should look like: https://twitter.com/username/status/1234567890 or https://x.com/username/status/1234567890',
          success: false
        });
      }
      
      // Check if URL contains "aquads.xyz" (case insensitive) - only as a note, not a requirement
      const containsVerificationTag = tweetUrl.toLowerCase().includes('aquads.xyz');
      if (!containsVerificationTag) {
        console.log('Tweet URL does not contain verification tag but accepting anyway:', tweetUrl);
        verificationMethod = 'tweet_embed';
        verificationNote = 'URL does not contain verification tag, but accepted';
        verified = true;
      } else {
        console.log('Tweet URL contains verification tag:', tweetUrl);
        verificationMethod = 'tweet_embed';
        verificationNote = 'Tweet URL format verified with verification tag';
        verified = true;
      }
    } else {
      console.log('No verification method provided');
      return res.status(400).json({ 
        error: 'Verification failed. Please provide a valid tweet URL or complete iframe verification.',
        success: false
      });
    }

    // First award points directly to ensure the user gets them
    try {
      // Award points directly - this is the important part that needs to work
      const pointsAmount = raid.points || 50;
      const user = await User.findById(userId);
      
      if (!user) {
        console.error(`User not found with ID: ${userId}`);
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      console.log(`Awarding ${pointsAmount} points to user:`, user.username || user.email || userId);
      
      // Award points directly on the user object
      const previousPoints = user.points;
      user.points += pointsAmount;
      user.pointsHistory.push({
        amount: pointsAmount,
        reason: `Completed Twitter raid: ${raid.title}`,
        socialRaidId: raid._id,
        createdAt: new Date()
      });
      
      // Save the user with new points - make sure this is awaited
      await user.save();
      console.log(`Successfully saved user with new points. Previous: ${previousPoints}, New: ${user.points}`);
      
      // Then record the completion with IP tracking
      raid.completions.push({
        userId: userId,
        twitterUsername: twitterUsername || '', // Make username optional
        verificationCode,
        verificationMethod,
        tweetUrl: tweetUrl || null,
        verified: verified,
        ipAddress, // Store IP address
        verificationNote,
        iframeVerified: iframeVerified || false, // Store iframe verification status
        iframeInteractions: iframeInteractions || 0, // Store interaction count
        completedAt: new Date()
      });
      
      // Make sure to await this save operation as well
      await raid.save();
      console.log(`Successfully saved raid completion for raid: ${raid.title}, ID: ${raid._id}`);
      
      // Success response
      const successResponse = {
        success: true,
        message: `Twitter raid completed successfully! You earned ${pointsAmount} points.`,
        note: 'Your submission has been recorded. Thank you for participating!',
        pointsAwarded: pointsAmount,
        currentPoints: user.points
      };
      
      console.log('Sending success response:', successResponse);
      res.json(successResponse);
    } catch (error) {
      console.error('Error in Twitter raid completion:', error);
      console.error('Error stack:', error.stack);
      let errorMessage = 'Failed to complete Twitter raid: ' + (error.message || 'Unknown error');
      res.status(500).json({ 
        error: errorMessage,
        success: false
      });
    }
  } catch (error) {
    console.error('Error completing Twitter raid:', error);
    console.error('Error stack:', error.stack);
    let errorMessage = 'Failed to complete Twitter raid: ' + (error.message || 'Unknown error');
    res.status(500).json({ 
      error: errorMessage,
      success: false 
    });
  }
});

// Get user's completed Twitter raids
router.get('/user/completed', auth, async (req, res) => {
  try {
    // Get the user ID safely - checking both possible locations
    const userId = req.user.id || req.user.userId || req.user._id;
    
    if (!userId) {
      console.error('Could not determine user ID from request:', req.user);
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    console.log(`Fetching completed raids for user ID: ${userId}`);
    
    const raids = await TwitterRaid.find({
      'completions.userId': userId
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${raids.length} completed raids for user ID: ${userId}`);
    
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
    console.error('Error checking for suspicious activity:', error);
    res.status(500).json({ error: 'Failed to check for suspicious activity' });
  }
});

module.exports = router; 