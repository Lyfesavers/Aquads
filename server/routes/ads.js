const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

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
  
  // Debug logging
  console.log(`\nShrink calculation for ad ${ad.id}:`, {
    currentTime: new Date(now).toISOString(),
    fixedStartDate: new Date(FIXED_START_DATE).toISOString(),
    currentSize: ad.size
  });

  // Calculate time since fixed start date
  const timeSinceStart = now - FIXED_START_DATE;
  const shrinkIntervals = Math.floor(timeSinceStart / SHRINK_INTERVAL);
  
  // Calculate new size using compound shrinking
  let newSize = MAX_SIZE;
  for (let i = 0; i < shrinkIntervals; i++) {
    newSize = Math.max(MIN_SIZE, newSize * SHRINK_PERCENTAGE);
  }
  
  // Round newSize to 2 decimal places
  newSize = Math.round(newSize * 100) / 100;
  
  console.log('Shrink details:', {
    timeSinceStart: `${timeSinceStart/1000} seconds`,
    shrinkIntervals,
    currentSize: ad.size,
    newSize: newSize,
    shrinkPercentage: SHRINK_PERCENTAGE
  });

  // Only update if size change is significant
  if (Math.abs(newSize - ad.size) > 0.1) {
    try {
      console.log(`Attempting to update ad ${ad.id} in database...`);
      
      // Use updateOne for more direct control
      const result = await Ad.updateOne(
        { _id: ad._id },
        { $set: { size: newSize } }
      );
      
      console.log('Update result:', result);
      
      if (result.modifiedCount > 0) {
        console.log(`Successfully updated ad size from ${ad.size} to ${newSize}`);
        // Fetch the updated document
        return await Ad.findById(ad._id);
      } else {
        console.log(`No changes made to ad ${ad.id}`);
        return ad;
      }
    } catch (error) {
      console.error(`Error updating ad size in database:`, error);
      return ad;
    }
  } else {
    console.log(`Size change too small (${Math.abs(newSize - ad.size)}), skipping update`);
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
      const afterBumpCheck = await checkBumpExpiration(ad);
      // Then shrink if needed
      const updatedAd = await shrinkAd(afterBumpCheck);
      
      // Force save the changes
      if (updatedAd.size !== ad.size) {
        await Ad.findByIdAndUpdate(
          ad._id,
          { $set: { size: updatedAd.size } },
          { new: true }
        ).exec();
        console.log(`Forced save of new size ${updatedAd.size} for ad ${ad.id}`);
      }
    }
    console.log('\n=== Completed periodic checks ===');
  } catch (error) {
    console.error('Error in periodic checks:', error);
  }
}, SHRINK_INTERVAL);

// Single route handler for ads
router.get('/', async (req, res) => {
  try {
    console.log('\nFetching and processing ads...');
    const ads = await Ad.find({ status: 'active' });
    
    // Process ads sequentially to avoid race conditions
    const updatedAds = [];
    for (const ad of ads) {
      const afterBumpCheck = await checkBumpExpiration(ad);
      const updatedAd = await shrinkAd(afterBumpCheck);
      updatedAds.push(updatedAd);
    }

    // Force a database save for each updated ad
    for (const ad of updatedAds) {
      try {
        await Ad.findByIdAndUpdate(
          ad._id,
          { $set: { size: ad.size } },
          { new: true, upsert: false }
        ).exec();
      } catch (err) {
        console.error(`Error saving ad ${ad.id}:`, err);
      }
    }

    // Fetch fresh data after updates
    const finalAds = await Ad.find({ status: 'active' });
    
    console.log('Final ad sizes:', finalAds.map(ad => ({
      id: ad.id,
      size: ad.size
    })));
    
    res.json(finalAds);
  } catch (error) {
    console.error('Error processing ads:', error);
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

module.exports = router; 