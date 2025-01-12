const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Add a function to check bump expiration
const checkBumpExpiration = async (ad) => {
  const now = Date.now();
  const expiresAt = new Date(ad.bumpExpiresAt).getTime();
  
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
          runValidators: true
        }
      );
      
      if (result) {
        console.log(`Successfully updated ad ${ad.id}. New isBumped status: ${result.isBumped}`);
        return result;
      } else {
        console.log(`No update performed for ad ${ad.id}`);
        return ad;
      }
    } catch (error) {
      console.error('Error updating expired bump:', error);
      return ad;
    }
  }
  return ad;
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
router.get('/ads', async (req, res) => {
  try {
    console.log('Fetching ads and checking bump expirations...');
    const ads = await Ad.find({}).lean();

    const checkedAds = await Promise.all(
      ads.map(async (ad) => {
        const updatedAd = await checkBumpExpiration(ad);
        return updatedAd;
      })
    );

    console.log(`Processed ${checkedAds.length} ads`);
    res.json(checkedAds);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

module.exports = router; 