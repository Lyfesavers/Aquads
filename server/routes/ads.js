const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Add constants for shrinking logic
const SHRINK_INTERVAL = 30000; // 30 seconds
const MAX_SIZE = 150;
const MIN_SIZE = 50;
const SHRINK_PERCENTAGE = 0.95;

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
  const timeSinceCreation = now - new Date(ad.createdAt).getTime();
  const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
  
  let newSize = ad.size * Math.pow(SHRINK_PERCENTAGE, shrinkIntervals);
  newSize = Math.max(newSize, MIN_SIZE);

  if (Math.abs(newSize - ad.size) > 0.1) {
    console.log(`Shrinking ad ${ad.id} from ${ad.size} to ${newSize}`);
    
    try {
      const updatedAd = await Ad.findByIdAndUpdate(
        ad._id,
        { $set: { size: newSize } },
        { new: true }
      );

      if (updatedAd) {
        console.log(`Successfully shrunk ad ${ad.id} to size ${newSize}`);
        return updatedAd;
      }
    } catch (error) {
      console.error(`Error shrinking ad ${ad.id}:`, error);
    }
  }
  return ad;
};

// Periodic check that handles both bump expiration and shrinking
setInterval(async () => {
  try {
    console.log('Running periodic checks...');
    const ads = await Ad.find({ status: 'active' });
    
    for (const ad of ads) {
      // First check bump expiration
      const updatedAd = await checkBumpExpiration(ad);
      // Then shrink if needed
      await shrinkAd(updatedAd);
    }
    console.log('Completed periodic checks');
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