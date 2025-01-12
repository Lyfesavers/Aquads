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
      // Update directly with findByIdAndUpdate for more reliable updates
      const result = await Ad.findByIdAndUpdate(
        ad._id,
        { 
          $set: {
            isBumped: false,
            status: 'active',
            size: MIN_SIZE // Use MIN_SIZE constant
          },
          $unset: {
            bumpedAt: "",
            bumpDuration: "",
            bumpExpiresAt: "",
            lastBumpTx: ""
          }
        },
        { new: true }
      ).exec();
      
      if (result) {
        console.log(`Reset ad ${ad.id} after bump expiration. New size: ${result.size}`);
        return result;
      }
    } catch (error) {
      console.error('Error updating expired bump:', error);
    }
  }
  return ad;
};

// Update the shrinkAd function to handle bumped vs non-bumped ads
const shrinkAd = async (ad) => {
  // If ad is bumped, maintain MAX_SIZE
  if (ad.isBumped) {
    // Only update if size isn't already MAX_SIZE
    if (ad.size !== MAX_SIZE) {
      try {
        const result = await Ad.findByIdAndUpdate(
          ad._id,
          { $set: { size: MAX_SIZE } },
          { new: true }
        ).exec();
        console.log(`Set bumped ad ${ad.id} size to ${MAX_SIZE}`);
        return result;
      } catch (error) {
        console.error(`Error updating bumped ad size:`, error);
      }
    }
    return ad;
  }

  // For non-bumped ads, set to MIN_SIZE
  if (!ad.isBumped && ad.size !== MIN_SIZE) {
    try {
      const result = await Ad.findByIdAndUpdate(
        ad._id,
        { $set: { size: MIN_SIZE } },
        { new: true }
      ).exec();
      console.log(`Set non-bumped ad ${ad.id} size to ${MIN_SIZE}`);
      return result;
    } catch (error) {
      console.error(`Error updating non-bumped ad size:`, error);
    }
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