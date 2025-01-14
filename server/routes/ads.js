const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');

// Skip auth for GET requests
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  auth(req, res, next);
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
      
      console.log('\nExpiry Check Details:');
      console.log('Ad ID:', ad.id);
      console.log('Current Time:', currentDate.toISOString());
      console.log('Expiry Time:', expiryDate.toISOString());
      console.log('Time Difference (ms):', currentDate.getTime() - expiryDate.getTime());
      console.log('Is Expired:', currentDate.getTime() > expiryDate.getTime());
      
      if (currentDate.getTime() > expiryDate.getTime()) {
        console.log('UPDATING EXPIRED AD...');
        const updated = await Ad.findByIdAndUpdate(
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
        
        console.log('Update Result:', updated);
        return;
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
    const ads = await Ad.find({});
    
    // Update sizes before sending response
    for (const ad of ads) {
      await updateAdSize(ad);
    }
    
    // Get fresh data
    const updatedAds = await Ad.find({ status: 'active' });
    res.json(updatedAds);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 