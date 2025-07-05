const express = require('express');
const router = express.Router();
const BannerAd = require('../models/BannerAd');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const AffiliateEarning = require('../models/AffiliateEarning');

// Get active banner ads
router.get('/active', async (req, res) => {
  try {
    const activeBanners = await BannerAd.find({
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    res.json(activeBanners);
  } catch (error) {
    console.error('Error fetching active banners:', error);
    res.status(500).json({ error: 'Failed to fetch active banners' });
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
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Banner ad specific pricing
const calculateBannerAmount = (duration) => {
  switch (duration) {
    case '24 hours':
      return 40;  // 40 USDC for 24h banner
    case '3 days':
      return 80;  // 80 USDC for 3 day banner
    case '7 days':
      return 160; // 160 USDC for 7 day banner
    default:
      return 40;
  }
};

// Create new banner ad request
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const { title, gif, url, txSignature, duration, paymentChain, chainSymbol, chainAddress } = req.body;

    const banner = new BannerAd({
      title,
      gif,
      url,
      owner: req.user.userId,
      txSignature,
      paymentChain,
      chainSymbol,
      chainAddress,
      duration
    });

    await banner.save();

    if (referredBy) {
      const bannerAmount = calculateBannerAmount(req.body.duration);
      const commissionRate = await AffiliateEarning.calculateCommissionRate(referredBy._id);
      const commissionEarned = AffiliateEarning.calculateCommission(bannerAmount, commissionRate);

      const affiliateEarning = new AffiliateEarning({
        affiliateId: referredBy._id,
        referredUserId: req.user.userId,
        adId: banner._id,
        adAmount: bannerAmount, // Now in USDC
        commissionRate,
        commissionEarned
      });

      await affiliateEarning.save();
    }

    res.status(201).json(banner);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

// Admin: Approve banner
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve banners' });
    }

    const banner = await BannerAd.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    banner.status = 'active';
    banner.expiresAt = new Date(Date.now() + banner.duration);
    await banner.save();

    res.json(banner);
  } catch (error) {
    console.error('Error approving banner:', error);
    res.status(500).json({ error: 'Failed to approve banner' });
  }
});

// Admin: Reject banner
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject banners' });
    }

    const { reason } = req.body;
    const banner = await BannerAd.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    banner.status = 'rejected';
    banner.rejectionReason = reason;
    await banner.save();

    res.json(banner);
  } catch (error) {
    console.error('Error rejecting banner:', error);
    res.status(500).json({ error: 'Failed to reject banner' });
  }
});

// Delete banner ad (admin only)
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
  
      return res.status(403).json({ error: 'Only admins can delete banner ads' });
    }

    const banner = await BannerAd.findByIdAndDelete(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

  
    res.json({ message: 'Banner deleted successfully', banner });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

module.exports = router; 