const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');
const { awardListingPoints } = require('./points');

// Skip auth for GET requests
router.use((req, res, next) => {
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

// GET route
router.get('/', async (req, res) => {
  try {
    // Show all ads without status filter
    const ads = await Ad.find({});
    console.log(`Found ${ads.length} total ads`);
    res.json(ads);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST route for creating new ad
router.post('/', auth, async (req, res) => {
  try {
    const { title, logo, url, contractAddress } = req.body;
    
    console.log('Creating ad with data:', req.body); // Debug log

    const ad = new Ad({
      id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      logo,
      url,
      contractAddress,
      size: MAX_SIZE,
      x: 0,
      y: 0,
      owner: req.user.username,
      status: 'active'
    });

    const savedAd = await ad.save();
    
    if (!savedAd) {
      throw new Error('Failed to save ad');
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

module.exports = router; 