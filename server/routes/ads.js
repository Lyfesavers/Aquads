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
  const now = new Date();
  const timeSinceCreation = now - new Date(ad.createdAt);
  const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
  
  // Calculate new size based on intervals passed
  let newSize = ad.size * Math.pow(SHRINK_PERCENTAGE, shrinkIntervals);
  newSize = Math.max(newSize, MIN_SIZE); // Don't go below minimum size

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

// Add periodic check for shrinking (every 30 seconds)
setInterval(async () => {
  try {
    console.log('Running periodic size check...');
    const ads = await Ad.find({ status: 'active' }).lean();
    
    for (const ad of ads) {
      await checkBumpExpiration(ad);
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
    
    // Update sizes for all active ads
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