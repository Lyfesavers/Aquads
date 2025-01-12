const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Add a function to check bump expiration
const checkBumpExpiration = async (ad) => {
  const now = new Date();
  const timeSinceCreation = now - new Date(ad.createdAt);
  const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
  
  // Calculate new size based on intervals passed
  let newSize = MAX_SIZE * Math.pow(SHRINK_PERCENTAGE, shrinkIntervals);
  newSize = Math.max(newSize, MIN_SIZE); // Don't go below minimum size

  try {
    // Force immediate size reset when bump expires
    const result = await Ad.findOneAndUpdate(
      { _id: ad._id },
      { 
        $set: {
          size: newSize,
          isBumped: false 
        }
      },
      { new: true }
    );
    return result;
  } catch (error) {
    console.error('Error updating ad size:', error);
    return null;
  }
};

// Add periodic check for expired bumps (every minute)
setInterval(async () => {
  try {
    console.log('Running periodic bump expiration check...');
    const ads = await Ad.find({ isBumped: true }).lean();
    
    for (const ad of ads) {
      await checkBumpExpiration(ad);
    }
    console.log('Completed periodic bump check');
  } catch (error) {
    console.error('Error in periodic bump check:', error);
  }
}, 600000); // Check every 10 minutes


// Single route handler for ads
router.get('/', async (req, res) => {
  try {
    const ads = await Ad.find({ status: 'active' });
    
    // Update sizes for all active ads
    const updatedAds = await Promise.all(ads.map(async (ad) => {
      const now = new Date();
      const timeSinceCreation = now - new Date(ad.createdAt);
      const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
      
      if (shrinkIntervals > 0) {
        let newSize = MAX_SIZE * Math.pow(SHRINK_PERCENTAGE, shrinkIntervals);
        newSize = Math.max(newSize, MIN_SIZE);
        
        if (newSize !== ad.size) {
          ad.size = newSize;
          await ad.save();
        }
      }
      return ad;
    }));

    console.log('Found ads:', updatedAds);
    res.json(updatedAds);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

module.exports = router; 