const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');

// Add auth middleware only to routes that need it
router.use((req, res, next) => {
  // Skip auth for GET requests
  if (req.method === 'GET') {
    return next();
  }
  // Apply auth middleware for all other requests
  auth(req, res, next);
});

// Add constants for shrinking logic
const SHRINK_INTERVAL = 30000; // 30 seconds
const MAX_SIZE = 150;
const MIN_SIZE = 50;

// Simplified check and update function
const updateAdSize = async (ad) => {
  const now = Date.now();
  
  try {
    // Check if bump has expired
    if (ad.isBumped && ad.bumpExpiresAt && now > new Date(ad.bumpExpiresAt).getTime()) {
      console.log(`Bump expired for ad: ${ad.id}`);
      
      // Update ad when bump expires
      await Ad.findByIdAndUpdate(ad._id, {
        $set: {
          isBumped: false,
          size: MIN_SIZE,
          status: 'active'
        },
        $unset: {
          bumpedAt: "",
          bumpDuration: "",
          bumpExpiresAt: "",
          lastBumpTx: ""
        }
      });
      console.log(`Reset expired bump for ad ${ad.id}. Size set to ${MIN_SIZE}`);
      return;
    }

    // Update size based on bump status
    const correctSize = ad.isBumped ? MAX_SIZE : MIN_SIZE;
    if (ad.size !== correctSize) {
      await Ad.findByIdAndUpdate(ad._id, {
        $set: { size: correctSize }
      });
      console.log(`Updated ad ${ad.id} size to ${correctSize} (isBumped: ${ad.isBumped})`);
    }
  } catch (error) {
    console.error(`Error updating ad ${ad.id}:`, error);
  }
};

// Periodic check to update all ad sizes
setInterval(async () => {
  try {
    console.log('\n=== Checking ad sizes ===');
    const ads = await Ad.find({ status: 'active' });
    
    for (const ad of ads) {
      await updateAdSize(ad);
    }
  } catch (error) {
    console.error('Periodic check error:', error);
  }
}, SHRINK_INTERVAL);

// Update GET route to ensure sizes are correct when fetching
router.get('/', async (req, res) => {
  try {
    console.log('\nFetching ads...');
    const ads = await Ad.find({ status: 'active' });
    
    // Update any incorrect sizes before sending response
    for (const ad of ads) {
      await updateAdSize(ad);
    }
    
    // Get fresh data after updates
    const updatedAds = await Ad.find({ status: 'active' });
    res.json(updatedAds);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 