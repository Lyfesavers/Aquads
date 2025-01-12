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
            size: 50
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
  try {
    const timeSinceCreation = now - new Date(ad.createdAt).getTime();
    const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
    
    console.log(`Ad ${ad.id} stats:`, {
      currentSize: ad.size,
      timeSinceCreation: timeSinceCreation / 1000, // in seconds
      shrinkIntervals,
      shrinkPercentage: SHRINK_PERCENTAGE
    });
    
    let newSize = ad.size * Math.pow(SHRINK_PERCENTAGE, shrinkIntervals);
    newSize = Math.max(newSize, MIN_SIZE);

    // Only update if size has changed
    if (Math.abs(newSize - ad.size) > 0.1) {
      console.log(`Updating size for ad ${ad.id} from ${ad.size} to ${newSize}`);
      
      try {
        const updatedAd = await Ad.findByIdAndUpdate(
          ad._id,
          { $set: { size: newSize } },
          { 
            new: true,
            runValidators: true 
          }
        );

        if (updatedAd) {
          console.log(`Successfully updated ad size to ${updatedAd.size}`);
          return updatedAd;
        } else {
          console.log(`Failed to update ad ${ad.id} - no document returned`);
        }
      } catch (dbError) {
        console.error(`Database error updating ad ${ad.id}:`, dbError);
      }
    } else {
      console.log(`No size update needed for ad ${ad.id} (current: ${ad.size}, calculated: ${newSize})`);
    }
    return ad;
  } catch (error) {
    console.error('Error in size calculation:', error);
    return ad;
  }
};

// Add periodic checks
setInterval(async () => {
  try {
    console.log('Running periodic size check...');
    const ads = await Ad.find({ status: 'active' });
    
    for (const ad of ads) {
      const now = Date.now();
      const timeSinceCreation = now - new Date(ad.createdAt).getTime();
      const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
      
      // Calculate new size
      let newSize = ad.size * Math.pow(SHRINK_PERCENTAGE, shrinkIntervals);
      newSize = Math.max(newSize, MIN_SIZE);

      // Only update if size needs to change
      if (Math.abs(newSize - ad.size) > 0.1) {
        console.log(`Shrinking ad ${ad.id} from ${ad.size} to ${newSize}`);
        
        await Ad.findByIdAndUpdate(
          ad._id,
          { $set: { size: newSize } },
          { new: true }
        );
      }
    }
    console.log('Completed periodic size check');
  } catch (error) {
    console.error('Error in periodic size check:', error);
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