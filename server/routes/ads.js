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

// Simplify the shrinkAd function to just handle size based on bump status
const shrinkAd = async (ad) => {
  // Determine the correct size based on bump status
  const targetSize = ad.isBumped ? MAX_SIZE : MIN_SIZE;
  
  // Only update if the size needs to change
  if (ad.size !== targetSize) {
    try {
      const result = await Ad.updateOne(
        { _id: ad._id },
        { $set: { size: targetSize } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`Updated ad ${ad.id} size to ${targetSize} (isBumped: ${ad.isBumped})`);
        return {
          ...ad.toObject(),
          size: targetSize
        };
      }
    } catch (error) {
      console.error(`Error updating ad ${ad.id} size:`, error);
    }
  }
  
  return ad;
};

// Simplify the periodic check to focus on bump status
setInterval(async () => {
  try {
    console.log('\n=== Running periodic checks ===');
    const ads = await Ad.find({ status: 'active' });
    
    for (const ad of ads) {
      // Force update based on bump status
      const shouldBeBumped = ad.isBumped && ad.bumpExpiresAt && new Date(ad.bumpExpiresAt).getTime() > Date.now();
      const targetSize = shouldBeBumped ? MAX_SIZE : MIN_SIZE;
      
      if (ad.size !== targetSize) {
        await Ad.findOneAndUpdate(
          { _id: ad._id },
          { 
            $set: { 
              size: targetSize,
              isBumped: shouldBeBumped
            }
          },
          { new: true }
        );
        console.log(`Updated ad ${ad.id}: isBumped=${shouldBeBumped}, size=${targetSize}`);
      }
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