const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Add constants for shrinking logic
const SHRINK_INTERVAL = 30000; // 30 seconds
const MAX_SIZE = 150;
const MIN_SIZE = 50;
const SHRINK_PERCENTAGE = 0.95;
const REFERENCE_DATE = new Date('2024-01-01').getTime(); // Reference date for shrinking

// Add a function to check bump expiration and handle shrinking
const checkBumpExpiration = async (ad) => {
  const now = Date.now();
  const expiresAt = new Date(ad.bumpExpiresAt).getTime();
  
  if (ad.isBumped && ad.bumpExpiresAt && now > expiresAt) {
    console.log(`Checking bump expiration for ad: ${ad.id}`);
    
    try {
      const result = await Ad.findOneAndUpdate(
        { 
          id: ad.id,
          isBumped: true,
          bumpExpiresAt: { $lt: new Date(now) }
        },
        { 
          $set: {
            isBumped: false,
            status: 'active',
            size: 50
          },
          $unset: {
            bumpedAt: "",
            bumpDuration: "",
            bumpExpiresAt: "",
            lastBumpTx: ""
          }
        },
        { new: true, runValidators: true }
      );
      
      if (result) {
        console.log(`Successfully reset ad ${ad.id} after bump expiration`);
        return result;
      }
    } catch (error) {
      console.error('Error updating expired bump:', error);
    }
  }
  return ad;
};

// Separate shrinking function
const shrinkAd = async (ad) => {
  const now = Date.now();
  const createdTime = new Date(ad.createdAt).getTime();
  
  // Debug logging
  console.log(`\nShrink calculation for ad ${ad.id}:`, {
    currentTime: new Date(now).toISOString(),
    createdAt: new Date(createdTime).toISOString(),
    referenceDate: new Date(REFERENCE_DATE).toISOString(),
    initialSize: MAX_SIZE
  });

  // Calculate time since reference date instead of creation
  const timeSinceReference = now - REFERENCE_DATE;
  const shrinkIntervals = Math.floor(timeSinceReference / SHRINK_INTERVAL);
  
  console.log('Shrink details:', {
    timeSinceReference: `${timeSinceReference/1000} seconds`,
    shrinkIntervals,
    currentSize: ad.size,
    shrinkPercentage: SHRINK_PERCENTAGE
  });
  
  let newSize = MAX_SIZE * Math.pow(SHRINK_PERCENTAGE, shrinkIntervals);
  newSize = Math.max(newSize, MIN_SIZE);

  console.log(`Calculated new size: ${newSize}`);

  if (Math.abs(newSize - ad.size) > 0.1) {
    console.log(`Size difference (${Math.abs(newSize - ad.size)}) exceeds threshold, updating...`);
    
    try {
      const updatedAd = await Ad.findByIdAndUpdate(
        ad._id,
        { 
          $set: { 
            size: newSize,
            lastShrinkAt: new Date(now)
          }
        },
        { new: true }
      );

      if (updatedAd) {
        console.log(`Successfully shrunk ad ${ad.id} from ${ad.size} to ${newSize}`);
        return updatedAd;
      } else {
        console.log(`No ad found with id ${ad._id}`);
      }
    } catch (error) {
      console.error(`Error shrinking ad ${ad.id}:`, error);
    }
  } else {
    console.log(`Size difference (${Math.abs(newSize - ad.size)}) too small, skipping update`);
  }
  return ad;
};

// Periodic check that handles both bump expiration and shrinking
setInterval(async () => {
  try {
    console.log('\n=== Running periodic checks ===');
    const ads = await Ad.find({ status: 'active' });
    console.log(`Found ${ads.length} active ads to process`);
    
    for (const ad of ads) {
      console.log(`\nProcessing ad: ${ad.id}`);
      // First check bump expiration
      const updatedAd = await checkBumpExpiration(ad);
      // Then shrink if needed
      await shrinkAd(updatedAd);
    }
    console.log('\n=== Completed periodic checks ===');
  } catch (error) {
    console.error('Error in periodic checks:', error);
  }
}, SHRINK_INTERVAL);

// Single route handler for ads
router.get('/', async (req, res) => {
  try {
    const ads = await Ad.find({ status: 'active' });
    
    const updatedAds = await Promise.all(ads.map(async (ad) => {
      const afterBumpCheck = await checkBumpExpiration(ad);
      return await shrinkAd(afterBumpCheck);
    }));

    console.log('Found ads:', updatedAds);
    res.json(updatedAds);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

module.exports = router; 