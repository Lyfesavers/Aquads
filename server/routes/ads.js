const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Add a function to check bump expiration
const checkBumpExpiration = async (ad) => {
  const now = new Date();
  if (ad.isBumped && ad.bumpExpiresAt && new Date(ad.bumpExpiresAt) < now) {
    await Ad.updateOne(
      { id: ad.id },
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
      }
    );
    return {
      ...ad.toObject(),
      isBumped: false,
      status: 'active',
      size: 50,
      bumpedAt: undefined,
      bumpDuration: undefined,
      bumpExpiresAt: undefined,
      lastBumpTx: undefined
    };
  }
  return ad;
};

// Keep the existing ads fetch route, just add bump expiration check
router.get('/ads', async (req, res) => {
  try {
    // Add timeout and lean for better performance
    const ads = await Ad.find({})
      .lean()
      .maxTimeMS(20000)
      .sort({ createdAt: -1 });

    if (!ads || ads.length === 0) {
      return res.status(200).json([]); // Return empty array instead of 404
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
router.get('/ads', handleAdsError); 