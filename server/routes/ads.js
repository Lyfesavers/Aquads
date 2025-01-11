const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Add a function to check and update expired bumps
const updateExpiredBumps = async (ad) => {
  const now = new Date();
  if (ad.isBumped && ad.bumpExpiresAt && new Date(ad.bumpExpiresAt) < now) {
    // Bump has expired, update the ad
    const updatedAd = await Ad.findOneAndUpdate(
      { id: ad.id },
      { 
        $set: { 
          isBumped: false,
          status: 'active',
          size: 50 // Reset to default size
        },
        $unset: { 
          bumpedAt: "",
          bumpDuration: "",
          bumpExpiresAt: "",
          lastBumpTx: ""
        }
      },
      { new: true }
    );
    return updatedAd;
  }
  return ad;
};

// Improve the ads fetch route
router.get('/ads', async (req, res) => {
  try {
    let ads = await Ad.find();
    
    // Check and update expired bumps
    const updatedAds = await Promise.all(
      ads.map(async (ad) => {
        return await updateExpiredBumps(ad);
      })
    );

    // Filter out any null results and send response
    res.json(updatedAds.filter(Boolean));
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Add a health check route
router.get('/health', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ status: 'ok', connection: 'connected' });
  } else {
    res.status(503).json({ status: 'error', connection: 'disconnected' });
  }
});

module.exports = router; 
router.get('/ads', handleAdsError); 