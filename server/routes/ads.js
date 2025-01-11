const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Add a function to check bump expiration
const checkBumpExpiration = async (ad) => {
  const now = new Date();
  if (ad.isBumped && ad.bumpExpiresAt && new Date(ad.bumpExpiresAt) < now) {
    console.log(`Checking bump expiration for ad: ${ad.id}`);
    console.log(`Bump expired at: ${new Date(ad.bumpExpiresAt)}`);
    console.log(`Current time: ${now}`);
    
    try {
      // Update the document in MongoDB
      const result = await Ad.findOneAndUpdate(
        { id: ad.id },
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
        { new: true }
      ).exec(); // Add .exec() to ensure the query executes
      
      console.log('Updated ad status:', result?.isBumped);
      return result;
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