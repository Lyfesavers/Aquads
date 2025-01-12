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
const SHRINK_PERCENTAGE = 0.95; // Shrink by 5% each interval

// Function to calculate and update ad size
const updateAdSize = async (ad) => {
  const now = Date.now();

  try {
    // If ad is bumped, ensure MAX_SIZE
    if (ad.isBumped) {
      if (ad.size !== MAX_SIZE) {
        await Ad.findByIdAndUpdate(ad._id, {
          $set: { size: MAX_SIZE }
        });
        console.log(`Set bumped ad ${ad.id} size to ${MAX_SIZE}`);
      }
      return;
    }

    // Check if bump expired
    if (ad.bumpExpiresAt && now > new Date(ad.bumpExpiresAt).getTime()) {
      await Ad.findByIdAndUpdate(ad._id, {
        $set: {
          isBumped: false,
          status: 'active'
        },
        $unset: {
          bumpedAt: "",
          bumpDuration: "",
          bumpExpiresAt: "",
          lastBumpTx: ""
        }
      });
      console.log(`Bump expired for ad ${ad.id}`);
    }

    // Calculate shrink size for non-bumped ads
    const timeSinceCreation = now - new Date(ad.createdAt).getTime();
    const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
    
    // Start from MAX_SIZE and apply shrinking
    let newSize = MAX_SIZE;
    for (let i = 0; i < shrinkIntervals; i++) {
      newSize *= SHRINK_PERCENTAGE;
    }
    
    // Ensure size doesn't go below minimum
    newSize = Math.max(MIN_SIZE, Math.round(newSize * 100) / 100);

    // Update if size changed
    if (newSize !== ad.size) {
      await Ad.findByIdAndUpdate(ad._id, {
        $set: { size: newSize }
      });
      console.log(`Shrunk ad ${ad.id} to ${newSize}`);
    }
  } catch (error) {
    console.error(`Error updating ad ${ad.id}:`, error);
  }
};

// Periodic check
setInterval(async () => {
  try {
    const ads = await Ad.find({ status: 'active' });
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
    const ads = await Ad.find({ status: 'active' });
    
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