const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');
const { awardListingPoints } = require('./points');
const AffiliateEarning = require('../models/AffiliateEarning');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const socket = require('../socket');

// Skip auth for GET requests
router.use((req, res, next) => {
  next(); // Allow all requests for now
});

// Constants for shrinking logic
const SHRINK_INTERVAL = 30000; // 30 seconds
const MAX_SIZE = 100; // This will be maximum size, client may request smaller for mobile
const MIN_SIZE = 50;
const SHRINK_PERCENTAGE = 0.9; // Shrink by 5% each interval

// Function to calculate and update ad size
const updateAdSize = async (ad) => {
  const now = Date.now();

  try {
    // Check if bumped ad has expired
    if (ad.isBumped && ad.bumpExpiresAt) {
      const currentDate = new Date();
      const expiryDate = new Date(ad.bumpExpiresAt);
      
      console.log('\n=== EXPIRY CHECK ===');
      console.log('Ad ID:', ad.id);
      console.log('Current Time:', currentDate.toISOString());
      console.log('Expiry Time:', expiryDate.toISOString());
      console.log('Current Timestamp:', currentDate.getTime());
      console.log('Expiry Timestamp:', expiryDate.getTime());
      console.log('Difference (ms):', currentDate.getTime() - expiryDate.getTime());
      
      // Force comparison using timestamps
      const isExpired = currentDate.getTime() > expiryDate.getTime();
      console.log('Is Expired:', isExpired);
      
      if (isExpired) {
        console.log('\n=== UPDATING EXPIRED AD ===');
        try {
          // Calculate the correct size based on time since creation
          const timeSinceCreation = now - new Date(ad.createdAt).getTime();
          const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
          
          // Start from MAX_SIZE and apply continuous shrinking
          let newSize = MAX_SIZE;
          for (let i = 0; i < shrinkIntervals; i++) {
            newSize *= SHRINK_PERCENTAGE;
          }
          
          // Ensure size doesn't go below minimum and round to 1 decimal
          newSize = Math.max(MIN_SIZE, Math.round(newSize * 10) / 10);
          
          const result = await Ad.findByIdAndUpdate(
            ad._id,
            {
              $set: { 
                isBumped: false,
                status: 'active',
                size: newSize
              }
            },
            { new: true }
          );
          console.log('Update successful:', result !== null);
          console.log('Updated document:', result);
          return;
        } catch (updateError) {
          console.error('Update failed:', updateError);
        }
      }
    }

    // Rest of the existing updateAdSize logic...
    if (ad.isBumped) {
      if (ad.size !== MAX_SIZE) {
        await Ad.findByIdAndUpdate(ad._id, {
          $set: { size: MAX_SIZE }
        });
        console.log(`Reset bumped ad ${ad.id} to MAX_SIZE`);
      }
      return;
    }

    // Calculate shrink size for non-bumped ads
    const timeSinceCreation = now - new Date(ad.createdAt).getTime();
    const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
    
    // Start from MAX_SIZE and apply continuous shrinking
    let newSize = MAX_SIZE;
    for (let i = 0; i < shrinkIntervals; i++) {
      newSize *= SHRINK_PERCENTAGE;
    }

    // Ensure size doesn't go below minimum and round to 1 decimal
    newSize = Math.max(MIN_SIZE, Math.round(newSize * 10) / 10);

    // Debug logging
    console.log(`Shrink calculation for ad ${ad.id}:`, {
      currentSize: ad.size,
      newSize: newSize,
      timeSinceCreation: Math.floor(timeSinceCreation / 1000),
      intervals: shrinkIntervals
    });

    // Update if size changed
    if (newSize !== ad.size) {
      await Ad.findByIdAndUpdate(ad._id, {
        $set: { size: newSize }
      });
      console.log(`Updated ad ${ad.id} size to ${newSize}`);
    }
  } catch (error) {
    console.error(`Error updating ad ${ad.id}:`, error);
  }
};

// Periodic check
setInterval(async () => {
  try {
    const ads = await Ad.find({});
    console.log(`\nChecking ${ads.length} ads for size updates...`);
    
    for (const ad of ads) {
      await updateAdSize(ad);
    }
  } catch (error) {
    console.error('Periodic check error:', error);
  }
}, SHRINK_INTERVAL);

// GET route
router.get('/', async (req, res) => {
  try {
    // Only show active or approved ads (not pending or rejected)
    const ads = await Ad.find({ status: { $in: ['active', 'approved'] } });
    console.log(`Found ${ads.length} approved/active ads`);
    
    // Ensure all ad sizes are up-to-date before sending to clients
    // This prevents the "large then small" visual bug when loading the page
    const currentTime = Date.now();
    const processedAds = ads.map(ad => {
      // Don't modify the database here, just return properly sized ad objects
      
      // Only process non-bumped ads or expired bumped ads
      if (ad.isBumped && ad.bumpExpiresAt) {
        const expiryDate = new Date(ad.bumpExpiresAt);
        if (currentTime <= expiryDate.getTime()) {
          // Bumped ad that hasn't expired
          return ad;
        }
      }
      
      // For non-bumped ads or expired bumped ads
      if (!ad.isBumped) {
        const timeSinceCreation = currentTime - new Date(ad.createdAt).getTime();
        const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
        
        // Start from MAX_SIZE and apply continuous shrinking
        let calculatedSize = MAX_SIZE;
        for (let i = 0; i < shrinkIntervals; i++) {
          calculatedSize *= SHRINK_PERCENTAGE;
        }
        
        // Ensure size doesn't go below minimum and round to 1 decimal
        calculatedSize = Math.max(MIN_SIZE, Math.round(calculatedSize * 10) / 10);
        
        // Return adjusted ad with correct size (but don't modify DB)
        if (calculatedSize !== ad.size) {
          // Clone the ad object and modify the size property
          const adObject = ad.toObject();
          adObject.size = calculatedSize;
          return adObject;
        }
      }
      
      return ad;
    });
    
    res.json(processedAds);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bump ad specific pricing
const calculateBumpAmount = (type) => {
  switch (type) {
    case 'bump_24h':
      return 5;  // 5 USDC for 24h bump
    case 'bump_3d':
      return 15; // 15 USDC for 3 day bump
    case 'bump_7d':
      return 35; // 35 USDC for 7 day bump
    default:
      return 5;  // Default to 24h price
  }
};

// POST route for creating new ad
router.post('/', auth, async (req, res) => {
  try {
    const { title, logo, url, pairAddress, blockchain, referredBy, x, y, preferredSize, txSignature, paymentChain, chainSymbol, chainAddress } = req.body;
    
    // Use client's preferred size if provided, otherwise use MAX_SIZE
    const bubbleSize = preferredSize || MAX_SIZE;
    
    // Validate size is within acceptable range
    const validatedSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, bubbleSize));
    
    console.log('Creating ad with data:', req.body);
  
    const ad = new Ad({
      id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      logo,
      url,
      pairAddress,
      blockchain,
      size: validatedSize, // Use validated size
      x: x || 0,
      y: y || 0,
      owner: req.user.username,
      txSignature,
      paymentChain,
      chainSymbol,
      chainAddress,
      // Set status to 'pending' for non-admin users, 'active' for admins
      status: req.user.isAdmin ? 'active' : 'pending'
    });

    const savedAd = await ad.save();

    if (!savedAd) {
      throw new Error('Failed to save ad');
    }

    // Award points to affiliate if the user was referred by someone
    try {
      // Find the current user to check if they were referred by an affiliate
      const user = await User.findById(req.user.userId);
      if (user && user.referredBy) {
        console.log('User was referred - awarding 200 points to affiliate', user.referredBy);
        await awardListingPoints(req.user.userId);
        console.log('Successfully awarded 200 points to affiliate for listing');
      } else {
        console.log('User was not referred by an affiliate - no points awarded');
      }
    } catch (pointsError) {
      console.error('Error awarding affiliate points:', pointsError);
      // Don't fail the ad creation if points award fails
    }

    // Check if there's a referral and handle affiliate earnings
    if (referredBy) {
      const adAmount = calculateBumpAmount(referredBy);
      console.log('Bump amount calculated:', adAmount, 'USDC');
      
      const commissionRate = await AffiliateEarning.calculateCommissionRate(referredBy);
      console.log('Commission rate calculated:', commissionRate);
      
      const commissionEarned = AffiliateEarning.calculateCommission(adAmount, commissionRate);
      console.log('Commission earned calculated:', commissionEarned, 'USDC');

      const affiliateEarning = new AffiliateEarning({
        affiliateId: referredBy,
        referredUserId: req.user.userId,
        adId: savedAd._id,
        adAmount: adAmount,
        commissionRate,
        commissionEarned
      });

      console.log('Saving affiliate earning:', affiliateEarning);
      await affiliateEarning.save();
      console.log('Affiliate earning saved successfully');
    }

    res.status(201).json(savedAd);
  } catch (error) {
    console.error('Server error creating ad:', error);
    res.status(500).json({ 
      error: 'Failed to create ad', 
      message: error.message 
    });
  }
});

// PUT route for updating an ad
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Update request for ad:', id);
    console.log('Update data:', JSON.stringify(updates));
    
    // If preferred size is provided, use it to validate the size
    if (updates.preferredSize) {
      updates.size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, updates.preferredSize));
      delete updates.preferredSize; // Remove from database fields
    }

    // Find the ad by ID
    const ad = await Ad.findOne({ id });
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    
    // Check if this is just a position update (x and y coordinates)
    const isPositionUpdate = Object.keys(updates).every(key => 
      ['x', 'y'].includes(key) || (updates[key] === ad[key])
    );
    
    // Skip authentication check for position updates only
    if (!isPositionUpdate && ad.owner !== req.user?.username && !req.user?.isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to update this ad' });
    }
    
    // Extract only allowed fields to update
    const updateData = {};
    const allowedUpdates = ['x', 'y', 'size', 'url', 'title', 'status', 'blockchain', 'logo', 'pairAddress'];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });
    
    // Handle migration: if pairAddress is being updated, remove old contractAddress field
    if (updates.pairAddress !== undefined) {
      updateData.$unset = { contractAddress: "" };
    }
    
    console.log('Filtered update data:', JSON.stringify(updateData));
    
    // Prepare update operations
    const updateOperations = {};
    
    // Separate $set and $unset operations
    const { $unset, ...setData } = updateData;
    if (Object.keys(setData).length > 0) {
      updateOperations.$set = setData;
    }
    if ($unset) {
      updateOperations.$unset = $unset;
    }
    
    // Use findOneAndUpdate which is more resilient to validation issues
    const updatedAd = await Ad.findOneAndUpdate(
      { id },
      updateOperations,
      { new: true, runValidators: false }
    );
    
    if (!updatedAd) {
      return res.status(404).json({ message: 'Ad not found after update attempt' });
    }
    
    console.log('Ad updated successfully');
    res.json(updatedAd);
  } catch (error) {
    console.error('Error updating ad:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error updating ad', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST route for bumping an ad
router.post('/bump', auth, async (req, res) => {
  try {
    // ... existing bump validation code ...

    // Get the correct USDC amount based on bump duration
    const adAmount = calculateBumpAmount(req.body.duration);
    console.log('Bump amount before affiliate earning:', adAmount); // Debug log

    if (req.body.referredBy) {
      const commissionRate = await AffiliateEarning.calculateCommissionRate(req.body.referredBy);
      const commissionEarned = AffiliateEarning.calculateCommission(adAmount, commissionRate);

      const affiliateEarning = new AffiliateEarning({
        affiliateId: req.body.referredBy,
        referredUserId: req.user.userId,
        adId: ad._id,
        adAmount: adAmount, // This should be 20, 40, or 80 USDC
        commissionRate,
        commissionEarned
      });

      console.log('Saving affiliate earning with amount:', adAmount, 'USDC'); // Debug log
      await affiliateEarning.save();
    }

    // ... rest of bump code ...
  } catch (error) {
    console.error('Error processing bump:', error);
    res.status(500).json({ error: 'Failed to process bump' });
  }
});

// Special route for position updates only (no auth required)
router.put('/:id/position', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    
    console.log('Position update for ad:', id, 'New position:', x, y);
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ message: 'Position update requires x and y coordinates' });
    }

    // Find the ad by ID
    const ad = await Ad.findOne({ id });
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    
    // Update only position fields
    const updatedAd = await Ad.findOneAndUpdate(
      { id },
      { $set: { x, y } },
      { new: true, runValidators: false }
    );
    
    if (!updatedAd) {
      return res.status(404).json({ message: 'Ad not found after update attempt' });
    }
    
    console.log('Ad position updated successfully');
    res.json(updatedAd);
  } catch (error) {
    console.error('Error updating ad position:', error);
    res.status(500).json({ message: 'Error updating ad position', error: error.message });
  }
});

// Vote on ad sentiment (bullish/bearish)
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { voteType } = req.body;
    const adId = req.params.id;
    const userId = req.user.userId;

    // Validate vote type
    if (voteType !== 'bullish' && voteType !== 'bearish') {
      return res.status(400).json({ error: 'Invalid vote type. Must be "bullish" or "bearish".' });
    }

    // Get the ad
    const ad = await Ad.findOne({ id: adId });
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    // Get user to check points history
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already voted
    const existingVote = ad.voterData.find(voter => voter.userId === userId);
    
    // Flag to determine if we need to award points
    let shouldAwardPoints = false;
    
    // Check if user has already received points for voting on this ad
    const alreadyReceivedPoints = user.pointsHistory.some(
      entry => entry.reason === `Voted on bubble: ${adId}`
    );
    
    if (existingVote) {
      // If voting the same way, do nothing
      if (existingVote.voteType === voteType) {
        return res.json({
          success: true,
          adId: ad.id,
          bullishVotes: ad.bullishVotes,
          bearishVotes: ad.bearishVotes,
          userVote: voteType
        });
      }
      
      // User is changing their vote - remove old vote and add new one
      let updates = {};
      
      // Decrement old vote type
      if (existingVote.voteType === 'bullish') {
        updates.bullishVotes = ad.bullishVotes - 1;
      } else {
        updates.bearishVotes = ad.bearishVotes - 1;
      }
      
      // Increment new vote type
      if (voteType === 'bullish') {
        updates.bullishVotes = (updates.bullishVotes !== undefined ? updates.bullishVotes : ad.bullishVotes) + 1;
      } else {
        updates.bearishVotes = (updates.bearishVotes !== undefined ? updates.bearishVotes : ad.bearishVotes) + 1;
      }
      
      // Update the voter's vote type in voterData
      updates.$set = { 'voterData.$[elem].voteType': voteType };
      
      const updatedAd = await Ad.findByIdAndUpdate(
        ad._id,
        updates,
        { 
          arrayFilters: [{ 'elem.userId': userId }],
          new: true 
        }
      );
      
      // Award points if they haven't received them before
      shouldAwardPoints = !alreadyReceivedPoints;
      
      if (shouldAwardPoints) {
        // Award 20 points for voting on this ad
        await User.findByIdAndUpdate(
          userId,
          {
            $inc: { points: 20 },
            $push: {
              pointsHistory: {
                amount: 20,
                reason: `Voted on bubble: ${adId}`,
                createdAt: new Date()
              }
            }
          }
        );
      }
      
      // Emit socket event for real-time updates
      socket.getIO().emit('adVoteUpdated', {
        adId: updatedAd.id,
        bullishVotes: updatedAd.bullishVotes,
        bearishVotes: updatedAd.bearishVotes
      });
      
      return res.json({
        success: true,
        adId: updatedAd.id,
        bullishVotes: updatedAd.bullishVotes,
        bearishVotes: updatedAd.bearishVotes,
        userVote: voteType,
        pointsAwarded: shouldAwardPoints ? 20 : 0
      });
    } else {
      // New vote - update vote counts and add user to voterData
      let updates = {};
      
      if (voteType === 'bullish') {
        updates.bullishVotes = ad.bullishVotes + 1;
      } else {
        updates.bearishVotes = ad.bearishVotes + 1;
      }
      
      updates.$push = { voterData: { userId, voteType } };
      
      const updatedAd = await Ad.findByIdAndUpdate(
        ad._id,
        updates,
        { new: true }
      );
      
      // Award points for first vote on this ad
      shouldAwardPoints = !alreadyReceivedPoints;
      
      if (shouldAwardPoints) {
        // Award 20 points for voting on this ad
        await User.findByIdAndUpdate(
          userId,
          {
            $inc: { points: 20 },
            $push: {
              pointsHistory: {
                amount: 20,
                reason: `Voted on bubble: ${adId}`,
                createdAt: new Date()
              }
            }
          }
        );
      }
      
      // Emit socket event for real-time updates
      socket.getIO().emit('adVoteUpdated', {
        adId: updatedAd.id,
        bullishVotes: updatedAd.bullishVotes,
        bearishVotes: updatedAd.bearishVotes
      });
      
      return res.json({
        success: true,
        adId: updatedAd.id,
        bullishVotes: updatedAd.bullishVotes,
        bearishVotes: updatedAd.bearishVotes,
        userVote: voteType,
        pointsAwarded: shouldAwardPoints ? 20 : 0
      });
    }
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// Get vote counts for an ad
router.get('/:id/votes', async (req, res) => {
  try {
    const adId = req.params.id;
    const userId = req.user?.userId;
    
    // Get the ad
    const ad = await Ad.findOne({ id: adId });
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    // Check if the user has voted
    let userVote = null;
    if (userId) {
      const existingVote = ad.voterData.find(voter => voter.userId === userId);
      if (existingVote) {
        userVote = existingVote.voteType;
      }
    }

    res.json({
      adId: ad.id,
      bullishVotes: ad.bullishVotes,
      bearishVotes: ad.bearishVotes,
      // Calculate sentiment percentage
      sentiment: ad.bullishVotes + ad.bearishVotes > 0 
        ? Math.round((ad.bullishVotes / (ad.bullishVotes + ad.bearishVotes)) * 100) 
        : 50, // Default to neutral if no votes
      userVote
    });
  } catch (error) {
    console.error('Error getting ad votes:', error);
    res.status(500).json({ error: 'Failed to get vote data' });
  }
});

// GET pending ads (admin only)
router.get('/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingAds = await Ad.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(pendingAds);
  } catch (error) {
    console.error('Error fetching pending ads:', error);
    res.status(500).json({ error: 'Failed to fetch pending ads' });
  }
});

// Approve an ad (admin only)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const adId = req.params.id;
    const ad = await Ad.findOne({ id: adId });

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    if (ad.status !== 'pending') {
      return res.status(400).json({ error: `Ad is already ${ad.status}` });
    }

    ad.status = 'active';
    await ad.save();

    res.json({ 
      message: 'Ad approved successfully',
      ad
    });
  } catch (error) {
    console.error('Error approving ad:', error);
    res.status(500).json({ error: 'Failed to approve ad' });
  }
});

// Reject an ad (admin only)
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { rejectionReason } = req.body;
    const adId = req.params.id;
    const ad = await Ad.findOne({ id: adId });

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    if (ad.status !== 'pending') {
      return res.status(400).json({ error: `Ad is already ${ad.status}` });
    }

    // Instead of updating the status, delete the ad entirely
    await Ad.findByIdAndDelete(ad._id);

    res.json({ 
      message: 'Ad rejected and deleted successfully',
      adId: adId
    });
  } catch (error) {
    console.error('Error rejecting ad:', error);
    res.status(500).json({ error: 'Failed to reject ad' });
  }
});

module.exports = router; 