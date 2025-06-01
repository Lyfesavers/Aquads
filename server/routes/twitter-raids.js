const express = require('express');
const router = express.Router();
const TwitterRaid = require('../models/TwitterRaid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const pointsModule = require('./points');
const axios = require('axios');
const { twitterRaidRateLimit } = require('../middleware/rateLimiter');
const AffiliateEarning = require('../models/AffiliateEarning');
const rateLimit = require('express-rate-limit');

// Use the imported module function
const awardSocialMediaPoints = pointsModule.awardSocialMediaPoints;

// Add Twitter API client
const { TwitterApi } = require('twitter-api-v2');

// Initialize Twitter client with your API credentials
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// Function to verify if user completed Twitter actions
const verifyTwitterActions = async (tweetId, twitterUsername) => {
  try {
    const results = {
      liked: false,
      retweeted: false,
      commented: false,
      error: null
    };

    if (!twitterUsername) {
      results.error = 'Twitter username required for verification';
      return results;
    }

    // Get user ID from username
    let userId;
    try {
      const userResponse = await twitterClient.v2.userByUsername(twitterUsername);
      userId = userResponse.data?.id;
      
      if (!userId) {
        results.error = 'Twitter user not found';
        return results;
      }
    } catch (error) {
      results.error = 'Failed to find Twitter user: ' + error.message;
      return results;
    }

    // Check if user liked the tweet
    try {
      const likedTweets = await twitterClient.v2.userLikedTweets(userId, {
        max_results: 100, // Check last 100 liked tweets
        'tweet.fields': ['id']
      });
      
      if (likedTweets.data) {
        results.liked = likedTweets.data.some(tweet => tweet.id === tweetId);
      }
    } catch (error) {
      console.log('Error checking likes:', error.message);
    }

    // Check if user retweeted the tweet
    try {
      const userTweets = await twitterClient.v2.userTimeline(userId, {
        max_results: 100, // Check last 100 tweets
        'tweet.fields': ['referenced_tweets', 'created_at']
      });
      
      if (userTweets.data) {
        results.retweeted = userTweets.data.some(tweet => 
          tweet.referenced_tweets?.some(ref => 
            ref.type === 'retweeted' && ref.id === tweetId
          )
        );
      }
    } catch (error) {
      console.log('Error checking retweets:', error.message);
    }

    // Check if user replied to the tweet
    try {
      const userTweets = await twitterClient.v2.userTimeline(userId, {
        max_results: 100, // Check last 100 tweets
        'tweet.fields': ['referenced_tweets', 'in_reply_to_user_id']
      });
      
      if (userTweets.data) {
        results.commented = userTweets.data.some(tweet => 
          tweet.referenced_tweets?.some(ref => 
            ref.type === 'replied_to' && ref.id === tweetId
          )
        );
      }
    } catch (error) {
      console.log('Error checking replies:', error.message);
    }

    return results;
  } catch (error) {
    return {
      liked: false,
      retweeted: false,
      commented: false,
      error: 'Twitter API verification failed: ' + error.message
    };
  }
};

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
    const { twitterUsername, verificationCode, tweetUrl, iframeVerified, iframeInteractions, tweetId, autoCompleted } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Get the user ID safely - checking both possible locations
    const userId = req.user.id || req.user.userId || req.user._id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
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

    // For auto-completed tasks, require Twitter username for verification
    if (autoCompleted && !twitterUsername) {
      return res.status(400).json({ 
        error: 'Twitter username is required for automatic verification. Please provide your Twitter username.',
        requiresUsername: true
      });
    }

    let verificationMethod = 'manual';
    let verificationNote = 'User verification was not validated';
    let verified = false;
    let detectedTweetId = null;
    let twitterVerification = null;

    // Extract tweet ID first
    if (tweetId) {
      detectedTweetId = tweetId;
    } else if (raid.tweetUrl) {
      const urlMatch = raid.tweetUrl.match(/\/status\/(\d+)/i);
      if (urlMatch && urlMatch[1]) {
        detectedTweetId = urlMatch[1];
      }
    }

    // If this is an auto-completed task with Twitter username, verify with Twitter API
    if (autoCompleted && twitterUsername && detectedTweetId) {
      try {
        console.log(`Verifying Twitter actions for user ${twitterUsername} on tweet ${detectedTweetId}`);
        twitterVerification = await verifyTwitterActions(detectedTweetId, twitterUsername);
        
        if (twitterVerification.error) {
          return res.status(400).json({ 
            error: `Twitter verification failed: ${twitterVerification.error}`,
            success: false
          });
        }

        // Check if user completed all required actions
        const allActionsCompleted = twitterVerification.liked && 
                                   twitterVerification.retweeted && 
                                   twitterVerification.commented;

        if (!allActionsCompleted) {
          const missingActions = [];
          if (!twitterVerification.liked) missingActions.push('like');
          if (!twitterVerification.retweeted) missingActions.push('retweet');
          if (!twitterVerification.commented) missingActions.push('comment/reply');
          
          return res.status(400).json({ 
            error: `Twitter verification failed. Missing actions: ${missingActions.join(', ')}. Please complete all three actions on Twitter and try again.`,
            success: false,
            verification: twitterVerification
          });
        }

        verificationMethod = 'twitter_api_verified';
        verificationNote = `All actions verified via Twitter API: liked=${twitterVerification.liked}, retweeted=${twitterVerification.retweeted}, commented=${twitterVerification.commented}`;
        verified = true;

      } catch (error) {
        console.error('Twitter API verification error:', error);
        return res.status(500).json({ 
          error: 'Twitter verification service temporarily unavailable. Please try again later.',
          success: false
        });
      }
    }
    // Fallback to iframe verification for non-auto-completed tasks
    else if (iframeVerified === true && iframeInteractions >= 3) {
      verificationMethod = 'iframe_interaction';
      verificationNote = `Verified through iframe interaction (${iframeInteractions} interactions)`;
      verified = true;
      detectedTweetId = tweetId || null;
    }
    // Check tweet URL format for manual submissions
    else if (tweetUrl) {
      const isValidFormat = !!tweetUrl.match(/(?:twitter\.com|x\.com)\/[^\/]+\/status\/\d+/i);
      
      if (!isValidFormat) {
        return res.status(400).json({ 
          error: 'Invalid tweet URL format. URL should look like: https://twitter.com/username/status/1234567890 or https://x.com/username/status/1234567890',
          success: false
        });
      }

      try {
        const urlMatch = tweetUrl.match(/\/status\/(\d+)/i);
        if (urlMatch && urlMatch[1]) {
          detectedTweetId = urlMatch[1];
        } else if (tweetId) {
          detectedTweetId = tweetId;
        }
      } catch (error) {
        detectedTweetId = tweetId || null;
      }

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

    // Award points and save completion
    try {
      const pointsAmount = raid.points || 50;
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      // Award points directly on the user object
      const previousPoints = user.points;
      user.points += pointsAmount;
      user.pointsHistory.push({
        amount: pointsAmount,
        reason: `Completed Twitter raid: ${raid.title}`,
        socialRaidId: raid._id,
        createdAt: new Date()
      });
      
      await user.save();
      
      // Record the completion with verification data
      raid.completions.push({
        userId: userId,
        twitterUsername: twitterUsername || '',
        verificationCode,
        verificationMethod,
        tweetUrl: tweetUrl || null,
        tweetId: detectedTweetId,
        verified: verified,
        ipAddress,
        verificationNote,
        iframeVerified: iframeVerified || false,
        iframeInteractions: iframeInteractions || 0,
        twitterVerification: twitterVerification, // Store the API verification results
        autoCompleted: autoCompleted || false,
        completedAt: new Date()
      });
      
      await raid.save();
      
      // Success response
      const successResponse = {
        success: true,
        message: `Twitter raid completed successfully! You earned ${pointsAmount} points.`,
        note: verified ? 'Your submission has been verified via Twitter API.' : 'Your submission has been recorded.',
        pointsAwarded: pointsAmount,
        currentPoints: user.points,
        verificationMethod: verificationMethod,
        twitterVerification: twitterVerification
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