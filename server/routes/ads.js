const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');
const { awardListingPoints } = require('./points');

// Skip auth for GET requests
router.use((req, res, next) => {
  // if (req.method === 'GET') return next();
  // auth(req, res, next);
  next(); // Allow all requests for now
});

// Constants for shrinking logic
const SHRINK_INTERVAL = 30000; // 30 seconds
const MAX_SIZE = 150;
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
          const result = await Ad.findByIdAndUpdate(
            ad._id,
            {
              $set: { 
                isBumped: false,
                status: 'active',
                size: MAX_SIZE
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

// At the top of the file, after the imports
const forceUpdateExpiredAd = async () => {
  try {
    console.log('Forcing immediate update...');
    const result = await Ad.updateOne(
      { id: 'ad-1736313718692-5gyn3pt2i' },
      {
        $set: {
          isBumped: false,
          status: 'active',
          size: MAX_SIZE
        }
      }
    );
    console.log('Force update result:', result);
  } catch (error) {
    console.error('Force update error:', error);
  }
};

// GET route
router.get('/', async (req, res) => {
  try {
    // Show all ads without status filter
    const ads = await Ad.find({})
      .populate('owner', 'username')
      .lean();

    // Transform the response to include username
    const transformedAds = ads.map(ad => ({
      ...ad,
      owner: ad.owner?.username || 'Unknown'
    }));

    console.log(`Found ${transformedAds.length} total ads`);
    res.json(transformedAds);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add this new route at the bottom before module.exports
router.post('/force-update/:id', async (req, res) => {
  try {
    console.log('Received force update request for:', req.params.id);
    
    const ad = await Ad.findOne({ id: req.params.id });
    if (!ad) {
      console.log('Ad not found:', req.params.id);
      return res.status(404).json({ error: 'Ad not found' });
    }

    console.log('\n=== FORCE UPDATE ATTEMPT ===');
    console.log('Ad before update:', ad);

    const result = await Ad.findByIdAndUpdate(
      ad._id,
      {
        $set: {
          isBumped: false,
          status: 'active',
          size: MAX_SIZE
        }
      },
      { new: true }
    );

    console.log('Update result:', result);
    
    // Send a direct response, no redirects
    return res.status(200).json(result);
  } catch (error) {
    console.error('Force update error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST route for creating new ad
router.post('/', auth, async (req, res) => {
  try {
    const { title, logo, url } = req.body;
    
    // Validate input
    if (!title || !logo || !url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure we have a valid user ID
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const ad = new Ad({
      id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      logo,
      url,
      size: MAX_SIZE,
      x: 0,
      y: 0,
      owner: new mongoose.Types.ObjectId(req.user.userId)
    });

    await ad.save();

    // Populate owner details before sending response
    const populatedAd = await Ad.findById(ad._id)
      .populate('owner', 'username')
      .lean();

    // Transform response to include username directly
    const transformedAd = {
      ...populatedAd,
      owner: populatedAd.owner?.username || 'Unknown'
    };

    // Award points for creating a listing
    try {
      await awardListingPoints(req.user.userId);
      console.log('Points awarded for ad listing');
    } catch (pointsError) {
      console.error('Error awarding points:', pointsError);
      // Don't fail the ad creation if points awarding fails
    }

    res.status(201).json(transformedAd);
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

module.exports = router; 