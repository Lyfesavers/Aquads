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
      // Force update the document in MongoDB
      const result = await Ad.findOneAndUpdate(
        { 
          id: ad.id,
          isBumped: true // Additional check to ensure we're updating the right document
        },
        {
          $set: {
            isBumped: false,
            status: 'active',
            size: 50
          },
          $unset: {
            bumpedAt: 1,
            bumpDuration: 1,
            bumpExpiresAt: 1,
            lastBumpTx: 1
          }
        },
        { 
          new: true,
          runValidators: true
        }
      );
      
      if (result) {
        console.log(`Successfully updated ad ${ad.id}. New isBumped status: ${result.isBumped}`);
      } else {
        console.log(`No update performed for ad ${ad.id}`);
      }
      
      return result || ad;
    } catch (error) {
      console.error('Error updating expired bump:', error);
      return ad;
    }
  }
  return ad;
};

// Single route handler for ads
router.get('/ads', async (req, res) => {
  try {
    const ads = await Ad.find({})
      .lean()
      .maxTimeMS(20000)
      .sort({ createdAt: -1 });

    if (!ads || ads.length === 0) {
      return res.status(200).json([]);
    }

    // Check for expired bumps
    const checkedAds = await Promise.all(
      ads.map(ad => checkBumpExpiration(ad))
    );

    console.log(`Sending ${checkedAds.length} ads to client`);
    res.json(checkedAds);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
  }
});

module.exports = router; 