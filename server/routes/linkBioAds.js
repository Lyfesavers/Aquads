const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const LinkInBioBannerAd = require('../models/LinkInBioBannerAd');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sanitizeForRegex } = require('../utils/security');

const DURATION_OPTIONS = {
  day: 24 * 60 * 60 * 1000,
  threeDays: 3 * 24 * 60 * 60 * 1000,
  sevenDays: 7 * 24 * 60 * 60 * 1000
};

// Per-username in-memory cache for active ads (avoids DB hit on every page load)
const activeAdsCache = new Map();
const ADS_CACHE_TTL = 30 * 1000; // 30 seconds

const getActiveAdsFromCache = async (username) => {
  const key = username.toLowerCase();
  const cached = activeAdsCache.get(key);
  if (cached && Date.now() - cached.time < ADS_CACHE_TTL) {
    return cached.data;
  }
  const ads = await LinkInBioBannerAd.find({
    targetUsername: { $regex: new RegExp(`^${sanitizeForRegex(username)}$`, 'i') },
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 }).lean();
  activeAdsCache.set(key, { data: ads, time: Date.now() });
  return ads;
};

const invalidateAdsCache = (username) => {
  activeAdsCache.delete(username.toLowerCase());
};

// Rate limiter for ad creation (public endpoint)
const createAdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many ad requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// GET /active/:username - Public: get active ads for display
router.get('/active/:username', async (req, res) => {
  try {
    const username = req.params.username.trim();
    if (!username) return res.status(400).json({ error: 'Username required' });
    const ads = await getActiveAdsFromCache(username);
    res.json(ads);
  } catch (error) {
    console.error('Error fetching active link bio ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// GET /config/:username - Public: get ad config for purchase modal
router.get('/config/:username', async (req, res) => {
  try {
    const username = req.params.username.trim();
    if (!username) return res.status(400).json({ error: 'Username required' });

    const sanitized = sanitizeForRegex(username);
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${sanitized}$`, 'i') }
    }).select('username linkInBioAdsEnabled linkInBioAdPricing aquaPay.isEnabled aquaPay.paymentSlug aquaPay.wallets').lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.linkInBioAdsEnabled) {
      return res.json({ enabled: false });
    }

    const hasAquaPay = user.aquaPay?.isEnabled && user.aquaPay?.paymentSlug && (
      user.aquaPay.wallets?.solana ||
      user.aquaPay.wallets?.ethereum ||
      user.aquaPay.wallets?.bitcoin ||
      user.aquaPay.wallets?.tron
    );

    if (!hasAquaPay) {
      return res.json({ enabled: false });
    }

    res.json({
      enabled: true,
      pricing: user.linkInBioAdPricing || { day: 10, threeDays: 20, sevenDays: 40 },
      aquaPaySlug: user.aquaPay.paymentSlug || user.username.toLowerCase()
    });
  } catch (error) {
    console.error('Error fetching link bio ad config:', error);
    res.status(500).json({ error: 'Failed to fetch ad config' });
  }
});

// POST / - Public (rate-limited): create a pending ad
router.post('/', createAdLimiter, async (req, res) => {
  try {
    const { title, gif, url, targetUsername, durationKey, advertiserName, advertiserEmail } = req.body;

    if (!title || !gif || !url || !targetUsername || !durationKey) {
      return res.status(400).json({ error: 'Missing required fields: title, gif, url, targetUsername, durationKey' });
    }

    if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 100) {
      return res.status(400).json({ error: 'Title must be 1-100 characters' });
    }

    // Validate URLs are http(s) only
    for (const [fieldName, fieldValue] of [['gif', gif], ['url', url]]) {
      if (typeof fieldValue !== 'string' || !/^https?:\/\//i.test(fieldValue.trim())) {
        return res.status(400).json({ error: `${fieldName} must be a valid http(s) URL` });
      }
      if (fieldValue.length > 2048) {
        return res.status(400).json({ error: `${fieldName} URL too long` });
      }
    }

    if (!DURATION_OPTIONS[durationKey]) {
      return res.status(400).json({ error: 'Invalid durationKey. Must be: day, threeDays, or sevenDays' });
    }

    // Look up target user and verify ads are enabled + AquaPay configured
    const sanitized = sanitizeForRegex(targetUsername.trim());
    const targetUser = await User.findOne({
      username: { $regex: new RegExp(`^${sanitized}$`, 'i') }
    }).select('username linkInBioAdsEnabled linkInBioAdPricing aquaPay.isEnabled aquaPay.paymentSlug aquaPay.wallets').lean();

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    if (!targetUser.linkInBioAdsEnabled) {
      return res.status(400).json({ error: 'This user has not enabled ads on their page' });
    }

    const hasAquaPay = targetUser.aquaPay?.isEnabled && targetUser.aquaPay?.paymentSlug && (
      targetUser.aquaPay.wallets?.solana ||
      targetUser.aquaPay.wallets?.ethereum ||
      targetUser.aquaPay.wallets?.bitcoin ||
      targetUser.aquaPay.wallets?.tron
    );

    if (!hasAquaPay) {
      return res.status(400).json({ error: 'This user has not configured their payment settings' });
    }

    const pricing = targetUser.linkInBioAdPricing || { day: 10, threeDays: 20, sevenDays: 40 };
    const price = pricing[durationKey];
    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Invalid pricing for selected duration' });
    }

    const duration = DURATION_OPTIONS[durationKey];

    const ad = new LinkInBioBannerAd({
      title: title.trim().slice(0, 100),
      gif: gif.trim(),
      url: url.trim(),
      targetUser: targetUser._id,
      targetUsername: targetUser.username,
      duration,
      price,
      txSignature: 'aquapay-pending',
      paymentChain: 'AquaPay',
      chainSymbol: 'USDC',
      chainAddress: '',
      advertiserInfo: {
        name: advertiserName ? String(advertiserName).trim().slice(0, 100) : undefined,
        email: advertiserEmail ? String(advertiserEmail).trim().slice(0, 200) : undefined
      }
    });

    await ad.save();

    res.status(201).json({
      _id: ad._id,
      price,
      duration,
      aquaPaySlug: targetUser.aquaPay.paymentSlug || targetUser.username.toLowerCase()
    });
  } catch (error) {
    console.error('Error creating link bio ad:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

// GET /my-page-ads - Auth: pending ads on the logged-in user's page (owner management)
router.get('/my-page-ads', auth, async (req, res) => {
  try {
    const ads = await LinkInBioBannerAd.find({
      targetUser: req.user.userId,
      status: 'pending'
    }).sort({ createdAt: -1 }).limit(50).lean();

    res.json(ads);
  } catch (error) {
    console.error('Error fetching my page ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// POST /:id/approve - Auth: page owner manually approves a pending ad
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const ad = await LinkInBioBannerAd.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });

    if (ad.targetUser.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized — only the page owner can approve ads' });
    }

    if (ad.status !== 'pending') {
      return res.status(400).json({ error: `Ad is already ${ad.status}` });
    }

    ad.status = 'active';
    ad.expiresAt = new Date(Date.now() + ad.duration);
    if (ad.txSignature === 'aquapay-pending') {
      ad.txSignature = 'manual-approval';
    }
    await ad.save();

    invalidateAdsCache(ad.targetUsername);

    res.json({ success: true, ad });
  } catch (error) {
    console.error('Error approving link bio ad:', error);
    res.status(500).json({ error: 'Failed to approve ad' });
  }
});

// POST /:id/cancel - Auth: page owner cancels a pending ad
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const ad = await LinkInBioBannerAd.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });

    if (ad.targetUser.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized — only the page owner can cancel ads' });
    }

    if (ad.status !== 'pending') {
      return res.status(400).json({ error: `Ad is already ${ad.status}` });
    }

    ad.status = 'cancelled';
    await ad.save();

    res.json({ success: true, ad });
  } catch (error) {
    console.error('Error cancelling link bio ad:', error);
    res.status(500).json({ error: 'Failed to cancel ad' });
  }
});

module.exports = router;
module.exports.invalidateAdsCache = invalidateAdsCache;
