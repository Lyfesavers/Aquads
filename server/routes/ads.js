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
  
  // First check bump expiration
  if (ad.isBumped && ad.bumpExpiresAt && now > expiresAt) {
    console.log(`Checking bump expiration for ad: ${ad.id}`);
    console.log(`Bump expired at: ${new Date(expiresAt).toISOString()}`);
    console.log(`Current time: ${new Date(now).toISOString()}`);
    
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
            size: 50  // Force size reset to 50
          },
          $unset: {
            bumpedAt: "",
            bumpDuration: "",
            bumpExpiresAt: "",
            lastBumpTx: ""
          }
        },
        { 
          new: true,
          runValidators: true,
          timestamps: true
        }
      );
      
      if (result) {
        console.log(`Successfully reset ad ${ad.id}. New size: ${result.size}, isBumped: ${result.isBumped}`);
        return result;
      }
    } catch (error) {
      console.error('Error updating expired bump:', error);
      return ad;
    }
  }

  // Then handle regular size shrinking
  const timeSinceCreation = now - new Date(ad.createdAt).getTime();
  const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
  
  let newSize = ad.size * Math.pow(SHRINK_PERCENTAGE, shrinkIntervals);
  newSize = Math.max(newSize, MIN_SIZE);

  try {
    if (newSize !== ad.size) {
      console.log(`Updating ad ${ad.id} size from ${ad.size} to ${newSize}`);
      const result = await Ad.findOneAndUpdate(
        { _id: ad._id },
        { 
          $set: {
            size: newSize
          }
        },
        { new: true }
      );
      return result;
    }
    return ad;
  } catch (error) {
    console.error('Error updating ad size:', error);
    return ad;
  }
};

// Add periodic checks
setInterval(async () => {
  try {
    console.log('Running periodic checks...');
    const ads = await Ad.find({ status: 'active' }).lean();
    
    for (const ad of ads) {
      await checkBumpExpiration(ad);
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
      return await checkBumpExpiration(ad);
    }));

    console.log('Found ads:', updatedAds);
    res.json(updatedAds);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

module.exports = router; 