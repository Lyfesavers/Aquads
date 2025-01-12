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
const SHRINK_PERCENTAGE = 0.95;
const FIXED_START_DATE = new Date('2024-01-01').getTime(); // Fixed start date for all ads

// Add a function to check bump expiration and handle shrinking
const checkBumpExpiration = async (ad) => {
  const now = Date.now();
  const expiresAt = new Date(ad.bumpExpiresAt).getTime();
  
  if (ad.isBumped && ad.bumpExpiresAt && now > expiresAt) {
    console.log(`Bump expired for ad: ${ad.id}`);
    
    try {
      // Force update when bump expires
      const result = await Ad.findOneAndUpdate(
        { _id: ad._id },
        { 
          $set: {
            isBumped: false,
            status: 'active',
            size: MIN_SIZE
          },
          $unset: {
            bumpedAt: "",
            bumpDuration: "",
            bumpExpiresAt: "",
            lastBumpTx: ""
          }
        },
        { new: true }
      );
      
      if (result) {
        console.log(`Reset expired bump for ad ${ad.id}. New size: ${MIN_SIZE}`);
        return result;
      }
    } catch (error) {
      console.error('Error updating expired bump:', error);
    }
  }
  
  // If ad is not bumped, ensure size is MIN_SIZE
  if (!ad.isBumped && ad.size !== MIN_SIZE) {
    try {
      const result = await Ad.findOneAndUpdate(
        { _id: ad._id },
        { $set: { size: MIN_SIZE } },
        { new: true }
      );
      console.log(`Set non-bumped ad ${ad.id} size to ${MIN_SIZE}`);
      return result;
    } catch (error) {
      console.error('Error updating non-bumped ad size:', error);
    }
  }
  
  return ad;
};

// Simplify the shrinkAd function to handle both bumped and non-bumped ads
const shrinkAd = async (ad) => {
  const now = Date.now();
  const createdAt = new Date(ad.createdAt).getTime();
  
  // If ad is bumped, maintain MAX_SIZE
  if (ad.isBumped) {
    if (ad.size !== MAX_SIZE) {
      try {
        const result = await Ad.findByIdAndUpdate(
          ad._id,
          { $set: { size: MAX_SIZE } },
          { new: true }
        );
        console.log(`Set bumped ad ${ad.id} size to ${MAX_SIZE}`);
        return result;
      } catch (error) {
        console.error('Error updating bumped ad size:', error);
      }
    }
    return ad;
  }

  // For non-bumped ads, calculate shrink size
  const timeSinceCreation = now - createdAt;
  const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
  
  let newSize = MAX_SIZE;
  for (let i = 0; i < shrinkIntervals; i++) {
    newSize = Math.max(MIN_SIZE, newSize * SHRINK_PERCENTAGE);
  }
  
  // Round to 2 decimal places
  newSize = Math.round(newSize * 100) / 100;
  
  // Update if size has changed
  if (newSize !== ad.size) {
    try {
      const result = await Ad.findByIdAndUpdate(
        ad._id,
        { $set: { size: newSize } },
        { new: true }
      );
      console.log(`Updated non-bumped ad ${ad.id} size to ${newSize}`);
      return result;
    } catch (error) {
      console.error('Error updating non-bumped ad size:', error);
    }
  }
  
  return ad;
};

// Update the periodic check
setInterval(async () => {
  try {
    console.log('\n=== Running periodic checks ===');
    const ads = await Ad.find({ status: 'active' });
    
    for (const ad of ads) {
      // First check bump expiration
      const afterBumpCheck = await checkBumpExpiration(ad);
      // Then handle shrinking
      await shrinkAd(afterBumpCheck);
    }
  } catch (error) {
    console.error('Periodic check error:', error);
  }
}, SHRINK_INTERVAL);

// Update the GET route to be more direct
router.get('/', async (req, res) => {
  try {
    console.log('\nFetching ads...');
    const ads = await Ad.find({ status: 'active' });
    
    // Update sizes based on bump status
    for (const ad of ads) {
      const targetSize = ad.isBumped ? MAX_SIZE : MIN_SIZE;
      
      if (ad.size !== targetSize) {
        await Ad.updateOne(
          { _id: ad._id },
          { $set: { size: targetSize } }
        );
        console.log(`Set ad ${ad.id} size to ${targetSize} based on bump status`);
      }
    }
    
    // Return fresh data
    const updatedAds = await Ad.find({ status: 'active' });
    res.json(updatedAds);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 