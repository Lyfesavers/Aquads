const express = require('express');
const router = express.Router();
const BannerAd = require('../models/BannerAd');
const auth = require('../middleware/auth');

// Get active banner ad
router.get('/active', async (req, res) => {
  try {
    console.log('Fetching active banner ad');
    const activeBanner = await BannerAd.findOne({
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    console.log('Active banner found:', activeBanner);
    res.json(activeBanner);
  } catch (error) {
    console.error('Error fetching active banner:', error);
    res.status(500).json({ error: 'Failed to fetch active banner' });
  }
});

// Get all banner ads (for admin)
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching all banner ads');
    const { status } = req.query;
    const query = status ? { status } : {};
    const banners = await BannerAd.find(query).sort({ createdAt: -1 });
    console.log(`Found ${banners.length} banners`);
    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Create new banner ad request
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating new banner ad with data:', req.body);
    const { title, gif, url, owner, txSignature, duration, status } = req.body;

    // Detailed validation logging
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!gif) missingFields.push('gif');
    if (!url) missingFields.push('url');
    if (!owner) missingFields.push('owner');
    if (!txSignature) missingFields.push('txSignature');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      console.error('Received data:', req.body);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields,
        receivedData: req.body 
      });
    }

    // Create banner ad with all fields
    const bannerAd = new BannerAd({
      title,
      gif,
      url,
      owner,
      txSignature,
      duration: duration || 24 * 60 * 60 * 1000, // Default 24 hours
      status: status || 'pending'
    });

    console.log('Attempting to save banner ad:', bannerAd);
    await bannerAd.save();
    console.log('Banner ad created successfully:', bannerAd);
    res.status(201).json(bannerAd);
  } catch (error) {
    console.error('Error creating banner ad:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: error.message,
        validationErrors: error.errors,
        receivedData: req.body
      });
    }
    res.status(500).json({ error: 'Failed to create banner ad request' });
  }
});

// Approve banner ad
router.post('/approve', auth, async (req, res) => {
  try {
    console.log('Approving banner ad:', req.body);
    const { bannerId, processedBy } = req.body;

    if (!bannerId || !processedBy) {
      return res.status(400).json({ error: 'Missing bannerId or processedBy' });
    }

    const banner = await BannerAd.findById(bannerId);
    if (!banner) {
      console.error('Banner not found:', bannerId);
      return res.status(404).json({ error: 'Banner not found' });
    }

    const now = new Date();
    banner.status = 'active';
    banner.processedAt = now;
    banner.processedBy = processedBy;
    banner.expiresAt = new Date(now.getTime() + banner.duration);

    await banner.save();
    console.log('Banner approved successfully:', banner);
    res.json(banner);
  } catch (error) {
    console.error('Error approving banner:', error);
    res.status(500).json({ error: 'Failed to approve banner' });
  }
});

// Reject banner ad
router.post('/reject', auth, async (req, res) => {
  try {
    console.log('Rejecting banner ad:', req.body);
    const { bannerId, processedBy } = req.body;

    if (!bannerId || !processedBy) {
      return res.status(400).json({ error: 'Missing bannerId or processedBy' });
    }

    const banner = await BannerAd.findByIdAndUpdate(
      bannerId,
      {
        status: 'expired',
        processedAt: new Date(),
        processedBy
      },
      { new: true }
    );

    if (!banner) {
      console.error('Banner not found:', bannerId);
      return res.status(404).json({ error: 'Banner not found' });
    }

    console.log('Banner rejected successfully:', banner);
    res.json(banner);
  } catch (error) {
    console.error('Error rejecting banner:', error);
    res.status(500).json({ error: 'Failed to reject banner' });
  }
});

module.exports = router; 