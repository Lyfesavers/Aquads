const express = require('express');
const router = express.Router();
const BannerAd = require('../models/BannerAd');
const auth = require('../middleware/auth');

// Get active banner ad
router.get('/active', async (req, res) => {
  try {
    const activeBanner = await BannerAd.findOne({
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    res.json(activeBanner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active banner' });
  }
});

// Get all banner ads (for admin)
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const banners = await BannerAd.find(query).sort({ createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Create new banner ad request
router.post('/', auth, async (req, res) => {
  try {
    const { title, gif, url, owner, txSignature, duration } = req.body;

    const bannerAd = new BannerAd({
      title,
      gif,
      url,
      owner,
      txSignature,
      duration: duration || 24 * 60 * 60 * 1000 // Default 24 hours
    });

    await bannerAd.save();
    res.status(201).json(bannerAd);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create banner ad request' });
  }
});

// Approve banner ad
router.post('/approve', auth, async (req, res) => {
  try {
    const { bannerId, processedBy } = req.body;

    const banner = await BannerAd.findById(bannerId);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    const now = new Date();
    banner.status = 'active';
    banner.processedAt = now;
    banner.processedBy = processedBy;
    banner.expiresAt = new Date(now.getTime() + banner.duration);

    await banner.save();
    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve banner' });
  }
});

// Reject banner ad
router.post('/reject', auth, async (req, res) => {
  try {
    const { bannerId, processedBy } = req.body;

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
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject banner' });
  }
});

module.exports = router; 