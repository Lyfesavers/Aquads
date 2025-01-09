const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Improve the ads fetch route
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

    console.log(`Sending ${ads.length} ads to client`);
    res.json(ads);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
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