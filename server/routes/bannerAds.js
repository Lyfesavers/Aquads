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
    const { title, gif, url, duration, price, status, transactionSignature, paymentChain } = req.body;
    
    const bannerAd = new BannerAd({
      title,
      gif,
      url,
      duration,
      status: 'pending',
      transactionSignature,
      paymentChain,
      owner: req.user.id
    });

    const savedBanner = await bannerAd.save();
    res.status(201).json(savedBanner);
  } catch (error) {
    console.error('Error creating banner ad:', error);
    res.status(500).json({ message: error.message });
  }
});

// Approve banner ad
router.post('/approve', auth, async (req, res) => {
  try {
    console.log('Approving banner ad:', req.body);
    const { _id, processedBy } = req.body;

    if (!_id || !processedBy) {
      return res.status(400).json({ error: 'Missing _id or processedBy' });
    }

    const banner = await BannerAd.findById(_id);
    if (!banner) {
      console.error('Banner not found:', _id);
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
    const { _id, processedBy } = req.body;

    if (!_id || !processedBy) {
      return res.status(400).json({ error: 'Missing _id or processedBy' });
    }

    const banner = await BannerAd.findByIdAndUpdate(
      _id,
      {
        status: 'expired',
        processedAt: new Date(),
        processedBy
      },
      { new: true }
    );

    if (!banner) {
      console.error('Banner not found:', _id);
      return res.status(404).json({ error: 'Banner not found' });
    }

    console.log('Banner rejected successfully:', banner);
    res.json(banner);
  } catch (error) {
    console.error('Error rejecting banner:', error);
    res.status(500).json({ error: 'Failed to reject banner' });
  }
});

// Delete banner ad (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
      console.log('Non-admin user attempted to delete banner:', req.user);
      return res.status(403).json({ error: 'Only admins can delete banner ads' });
    }

    const banner = await BannerAd.findByIdAndDelete(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    console.log('Banner deleted successfully by admin:', req.user.username);
    res.json({ message: 'Banner deleted successfully', banner });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

module.exports = router; 