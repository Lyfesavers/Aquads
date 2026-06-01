const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ad = require('../models/Ad');
const TwitterRaid = require('../models/TwitterRaid');
const FacebookRaid = require('../models/FacebookRaid');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const { emitAdEvent } = require('../middleware/socketEmitter');
const { awardListingPoints, creditReferrerBonus } = require('./points');
const AffiliateEarning = require('../models/AffiliateEarning');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const socket = require('../socket');
const telegramService = require('../utils/telegramService');
const {
  isValidDeepDiveIntroVideoUrl,
  MAX_BRANDING_VIDEO_URL_LENGTH
} = require('../utils/brandingMedia');
const { isValidProjectUrl, normalizeProjectUrl } = require('../utils/listingValidation');
const {
  isVoteBumped,
  getBumpSyncUpdate,
  computeShrunkSize,
  BUMP_VOTE_THRESHOLD
} = require('../utils/bumpFromVotes');
const { normalizeBlockchainSlug } = require('../constants/blockchains');
const {
  LISTING_TIER_STARTER,
  LISTING_TIER_PREMIUM,
  PREMIUM_LISTING_FEE_USDC,
  getListingTier
} = require('../utils/listingTier');
const { grantStarterIfNeeded } = require('../services/projectAgentWallet');

const LAUNCH_CHECKLIST_STEPS = [
  'telegram_bot',
  'discord_bot',
  'chart_link',
  'deep_dive_form',
  'share_blog',
  'link_in_bio',
  'link_in_bio_socials',
  'aquapay',
  'mintfunnel_credit',
  'skipper_posts',
  'daily_raids',
  'free_ama',
  'x_spaces',
  'banner_ad',
  'chrome_extension'
];

// Aquads-branded marketing add-on packages (server-side)
const ADDON_PACKAGES = [
  {
    id: 'aqua_splash',
    name: 'AquaSplash',
    originalPrice: 99,
    price: 99,
    features: [
      'Newsroom Press Release',
      'Leading Web3 Press Release Site',
      'Approx. Monthly Visitors: 15000',
      'Includes Social Media Posting',
      'Domain Authority: 43'
    ]
  },
  {
    id: 'aqua_ripple',
    name: 'AquaRipple',
    originalPrice: 299,
    price: 284,
    features: [
      '4+ Media Pickups Guaranteed',
      'Estimated Reach: 5k-15k',
      '<24 Hour Distribution',
    ]
  },
  {
    id: 'aqua_wave',
    name: 'AquaWave',
    originalPrice: 1399,
    price: 1329,
    features: [
      '9+ Media Pickups Guaranteed',
      'Estimated Reach: 75k-250k',
      '24-72 Hour Distribution'
    ]
  },
  {
    id: 'aqua_flow',
    name: 'AquaFlow',
    originalPrice: 2899,
    price: 2754,
    features: [
      'CoinMarketCap (Community Section)',
      'CryptoPolitan',
      'CoinCodex',
      'BraveNewCoin',
      'Bitcolumnist',
      '24-72 Hour Distribution',
      'SEO Optimizations'
    ]
  },
  {
    id: 'aqua_storm',
    name: 'AquaStorm',
    originalPrice: 6499,
    price: 6174,
    features: [
      'Everything from AquaWave, plus:',
      'CoinMarketCap (Community Section)',
      'CryptoPolitan',
      'CoinCodex',
      'BraveNewCoin',
      'Bitcolumnist',
      '24-72 Hour Distribution',
      'SEO Optimizations'
    ]
  }
];

// Skip auth for GET requests
router.use((req, res, next) => {
  next(); // Allow all requests for now
});

// Constants for shrinking logic
const SHRINK_INTERVAL = 15000; // 15 seconds - faster updates for real-time feel
const MAX_SIZE = 100; // This will be maximum size, client may request smaller for mobile
const MIN_SIZE = 50;
const SHRINK_PERCENTAGE = 0.9; // Shrink by 10% each interval

const sizeOptsForBump = (now = Date.now()) => ({
  SHRINK_INTERVAL,
  MAX_SIZE,
  MIN_SIZE,
  SHRINK_PERCENTAGE,
  now
});

const finalizeAdBumpAfterVote = async (adDoc) => {
  const bumpSync = getBumpSyncUpdate(adDoc, adDoc.bullishVotes, sizeOptsForBump());
  if (!bumpSync.changed) {
    return adDoc;
  }
  const synced = await Ad.findByIdAndUpdate(adDoc._id, { $set: bumpSync.$set }, { new: true });
  socket.emitAdUpdate('update', synced);
  return synced;
};

// Function to calculate and update ad size (bump = bullishVotes >= BUMP_VOTE_THRESHOLD)
const updateAdSize = async (ad) => {
  const now = Date.now();

  try {
    const sizeOpts = sizeOptsForBump(now);
    const { changed, $set } = getBumpSyncUpdate(ad, ad.bullishVotes, sizeOpts);

    if (changed) {
      const result = await Ad.findByIdAndUpdate(ad._id, { $set }, { new: true });
      if (result) {
        invalidateAdsCache();
        socket.emitAdUpdate('update', result);
      }
      return;
    }

    if (isVoteBumped(ad.bullishVotes)) {
      if (ad.size !== MAX_SIZE) {
        const result = await Ad.findByIdAndUpdate(ad._id, {
          $set: { size: MAX_SIZE }
        }, { new: true });
        if (result) {
          socket.emitAdUpdate('update', result);
        }
      }
      return;
    }

    const timeSinceCreation = now - new Date(ad.createdAt).getTime();
    const shrinkIntervals = Math.floor(timeSinceCreation / SHRINK_INTERVAL);
    let newSize = MAX_SIZE;
    for (let i = 0; i < shrinkIntervals; i++) {
      newSize *= SHRINK_PERCENTAGE;
    }
    newSize = Math.max(MIN_SIZE, Math.round(newSize * 10) / 10);

    if (newSize !== ad.size) {
      const result = await Ad.findByIdAndUpdate(ad._id, {
        $set: { size: newSize }
      }, { new: true });
      if (result) {
        socket.emitAdUpdate('update', result);
      }
    }
  } catch (error) {
    // Error updating ad
  }
};

// Periodic check
setInterval(async () => {
  try {
    const ads = await Ad.find({});
    
    for (const ad of ads) {
      await updateAdSize(ad);
    }
  } catch (error) {
    // Periodic check error
  }
}, SHRINK_INTERVAL);

// Cache for the ads (bubbles) list — short TTL because vote counts matter.
// Votes also emit socket events so clients see real-time updates regardless of cache age.
let adsListCache = null;
let adsListCacheTime = 0;
let adsListRefreshing = false;
const ADS_LIST_CACHE_TTL = 30 * 1000; // 30 seconds

const invalidateAdsCache = () => {
  adsListCache = null;
  adsListCacheTime = 0;
};

const fetchAndCacheAds = async () => {
  const ads = await Ad.find({ status: { $in: ['active', 'approved'] } });
  const currentTime = Date.now();
  const processedAds = ads.map((ad) => {
    const voteBumped = isVoteBumped(ad.bullishVotes);
    const adObject = typeof ad.toObject === 'function' ? ad.toObject() : { ...ad };
    adObject.isBumped = voteBumped;
    if (!voteBumped) {
      const calculatedSize = computeShrunkSize(ad.createdAt, currentTime, {
        shrinkInterval: SHRINK_INTERVAL,
        maxSize: MAX_SIZE,
        minSize: MIN_SIZE,
        shrinkPercentage: SHRINK_PERCENTAGE
      });
      if (calculatedSize !== ad.size) {
        adObject.size = calculatedSize;
      }
      return adObject;
    }
    if (adObject.size !== MAX_SIZE) {
      adObject.size = MAX_SIZE;
    }
    return adObject;
  });
  adsListCache = processedAds;
  adsListCacheTime = Date.now();
  return processedAds;
};

// GET bubble + raid analytics for the logged-in project owner (dashboard)
router.get('/my-analytics', auth, async (req, res) => {
  try {
    const username = req.user.username;
    const userId = req.user.userId || req.user.id;

    const [userAds, allMapAds] = await Promise.all([
      Ad.find({ owner: username })
        .select('id clicks bullishVotes bearishVotes isBumped status voterData')
        .lean(),
      Ad.find({ status: { $in: ['active', 'approved'] } })
        .select('id bullishVotes isBumped')
        .lean()
    ]);

    const sortedMapAds = [...allMapAds].sort((a, b) => {
      if (a.isBumped && !b.isBumped) return -1;
      if (!a.isBumped && b.isBumped) return 1;
      return (b.bullishVotes || 0) - (a.bullishVotes || 0);
    });

    const rankByAdId = {};
    sortedMapAds.forEach((ad, index) => {
      rankByAdId[ad.id] = index + 1;
    });

    const bubbles = {};
    userAds.forEach((ad) => {
      bubbles[ad.id] = {
        clicks: ad.clicks || 0,
        uniqueVoters: (ad.voterData || []).length,
        mapRank: rankByAdId[ad.id] || null,
        totalOnMap: sortedMapAds.length,
        bullishVotes: ad.bullishVotes || 0,
        bearishVotes: ad.bearishVotes || 0,
        isBumped: !!ad.isBumped,
        status: ad.status
      };
    });

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [twitterRaids, facebookRaids] = await Promise.all([
      TwitterRaid.find({ createdBy: userObjectId })
        .select('createdAt completions.approvalStatus completions.userId')
        .lean(),
      FacebookRaid.find({ createdBy: userObjectId })
        .select('createdAt completions.approvalStatus completions.userId')
        .lean()
    ]);

    const allRaids = [...twitterRaids, ...facebookRaids];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const uniqueRaiderIds = new Set();
    let approvedCompletions = 0;
    let pendingCompletions = 0;

    allRaids.forEach((raid) => {
      (raid.completions || []).forEach((completion) => {
        if (completion.approvalStatus === 'approved') {
          approvedCompletions += 1;
          if (completion.userId) {
            uniqueRaiderIds.add(completion.userId.toString());
          }
        } else if (completion.approvalStatus === 'pending') {
          pendingCompletions += 1;
        }
      });
    });

    res.json({
      bubbles,
      raids: {
        totalRaids: allRaids.length,
        approvedCompletions,
        uniqueRaiders: uniqueRaiderIds.size,
        pendingCompletions,
        raidsThisWeek: allRaids.filter((r) => new Date(r.createdAt) >= oneWeekAgo).length
      }
    });
  } catch (error) {
    console.error('My bubble analytics error:', error);
    res.status(500).json({ error: 'Failed to load bubble analytics' });
  }
});

// GET route
router.get('/', async (req, res) => {
  try {
    const now = Date.now();

    if (adsListCache) {
      res.set('X-Cache', now - adsListCacheTime < ADS_LIST_CACHE_TTL ? 'HIT' : 'STALE');
      res.json(adsListCache);
      if (!adsListRefreshing && now - adsListCacheTime >= ADS_LIST_CACHE_TTL) {
        adsListRefreshing = true;
        fetchAndCacheAds().catch(err =>
          console.error('[Ads Cache] Background refresh failed:', err.message)
        ).finally(() => { adsListRefreshing = false; });
      }
      return;
    }

    // No cache — must wait
    const processedAds = await fetchAndCacheAds();
    res.set('X-Cache', 'MISS');
    res.json(processedAds);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upgrade Starter → Premium (same payment verification workflow as new Premium listings)
router.post('/upgrade-premium', auth, requireEmailVerification, emitAdEvent('update'), async (req, res) => {
  try {
    const { adId, txSignature, paymentChain, chainSymbol, chainAddress } = req.body;
    if (!adId) {
      return res.status(400).json({ error: 'adId is required' });
    }

    const ad = await Ad.findOne({ id: adId, owner: req.user.username });
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    if (!['active', 'approved'].includes(ad.status)) {
      return res.status(400).json({ error: 'Listing must be live (approved) before upgrading to Premium' });
    }
    if (getListingTier(ad) !== LISTING_TIER_STARTER) {
      return res.status(400).json({ error: 'This listing is already Premium or cannot use this upgrade path' });
    }

    const currentUser = await User.findById(req.user.userId);
    const AFFILIATE_DISCOUNT_RATE = 0.05;
    const userIsAffiliate = Boolean(currentUser?.referredBy);
    const affiliateDiscountOnPremium = userIsAffiliate ? PREMIUM_LISTING_FEE_USDC * AFFILIATE_DISCOUNT_RATE : 0;
    const calculatedListingFee = PREMIUM_LISTING_FEE_USDC - affiliateDiscountOnPremium;

    const addonCosts = (ad.selectedAddons || []).reduce((total, addonId) => {
      const addon = ADDON_PACKAGES.find(pkg => pkg.id === addonId);
      return total + (addon ? addon.price : 0);
    }, 0);

    ad.listingTier = LISTING_TIER_PREMIUM;
    ad.listingFee = calculatedListingFee;
    ad.totalAmount = calculatedListingFee + addonCosts;
    ad.txSignature = txSignature || 'aquapay-pending';
    ad.paymentChain = paymentChain || null;
    ad.chainSymbol = chainSymbol || null;
    ad.chainAddress = chainAddress || null;

    await ad.save();

    try {
      await grantStarterIfNeeded(req.user.userId, ad);
    } catch (grantErr) {
      console.error('Upgrade Premium: Skipper Agent bonus failed', grantErr.message);
    }

    try {
      if (currentUser?.referredBy) {
        await awardListingPoints(req.user.userId);
      }
    } catch (pointsErr) {
      console.error('Upgrade Premium: listing referrer points failed', pointsErr.message);
    }

    try {
      const referrerAffiliateId = currentUser?.referredBy;
      if (referrerAffiliateId && calculatedListingFee > 0) {
        const commissionRate = await AffiliateEarning.calculateCommissionRate(referrerAffiliateId);
        const commissionEarned = AffiliateEarning.calculateCommission(calculatedListingFee, commissionRate);
        await new AffiliateEarning({
          affiliateId: referrerAffiliateId,
          referredUserId: req.user.userId,
          adId: ad._id,
          adAmount: calculatedListingFee,
          commissionRate,
          commissionEarned
        }).save();
      }
    } catch (earnErr) {
      console.error('Upgrade Premium: affiliate earning failed', earnErr.message);
    }

    invalidateAdsCache();
    socket.getIO().emit('adsUpdated', { type: 'update', ad });
    res.json(ad);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upgrade listing', message: error.message });
  }
});

// POST route for creating new ad
router.post('/', auth, requireEmailVerification, emitAdEvent('create'), async (req, res) => {
  try {
    const {
      title,
      logo,
      url,
      pairAddress,
      blockchain,
      x,
      y,
      preferredSize,
      txSignature,
      paymentChain,
      chainSymbol,
      chainAddress,
      selectedAddons,
      isAffiliate,
      affiliateDiscount,
      discountCode,
      listingTier: listingTierRaw
    } = req.body;
    
    // Use client's preferred size if provided, otherwise use MAX_SIZE
    const bubbleSize = preferredSize || MAX_SIZE;
    
    // Validate size is within acceptable range
    const validatedSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, bubbleSize));

    // Get current user to verify affiliate status
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const listingTier = listingTierRaw === LISTING_TIER_STARTER ? LISTING_TIER_STARTER : LISTING_TIER_PREMIUM;

    const AFFILIATE_DISCOUNT_RATE = 0.05; // 5%
    const userIsAffiliate = Boolean(currentUser.referredBy);
    const calculatedAffiliateDiscount =
      listingTier === LISTING_TIER_PREMIUM && userIsAffiliate
        ? PREMIUM_LISTING_FEE_USDC * AFFILIATE_DISCOUNT_RATE
        : 0;
    const calculatedListingFee =
      listingTier === LISTING_TIER_STARTER ? 0 : PREMIUM_LISTING_FEE_USDC - calculatedAffiliateDiscount;

    // Calculate addon costs
    const addonCosts = selectedAddons ? selectedAddons.reduce((total, addonId) => {
      const addon = ADDON_PACKAGES.find(pkg => pkg.id === addonId);
      return total + (addon ? addon.price : 0);
    }, 0) : 0;

    // Calculate total before discount codes
    const totalBeforeDiscount = calculatedListingFee + addonCosts;

    // Apply discount code if provided
    let discountAmount = 0;
    let appliedDiscountCode = null;
    
    if (discountCode) {
      const DiscountCode = require('../models/DiscountCode');
      const validDiscountCode = await DiscountCode.findValidCode(discountCode, 'listing');
      
      if (validDiscountCode) {
        // Check if discount code applies to add-ons
        const appliesToAddons = validDiscountCode.applicableTo.includes('addons');
        
        // Calculate the amount to apply discount to
        let discountableAmount;
        if (appliesToAddons) {
          // Apply discount to total amount (base + add-ons)
          discountableAmount = totalBeforeDiscount;
        } else {
          discountableAmount = calculatedListingFee;
        }
        
        discountAmount = validDiscountCode.calculateDiscount(discountableAmount);
        appliedDiscountCode = validDiscountCode;
        
        // Increment usage count
        await validDiscountCode.incrementUsage();
      }
    }

    const finalAmount = totalBeforeDiscount - discountAmount;

    const starterFreeNoPayment =
      listingTier === LISTING_TIER_STARTER && addonCosts === 0 && finalAmount === 0;
    if (starterFreeNoPayment) {
      const sig = (txSignature || '').trim();
      if (sig && sig !== 'starter-free') {
        return res.status(400).json({ error: 'Free Starter listings do not require payment' });
      }
    }

    const normalizedUrl = url ? normalizeProjectUrl(url) : '';
    if (normalizedUrl && !isValidProjectUrl(normalizedUrl)) {
      return res.status(400).json({ error: 'Invalid website URL' });
    }

    // Server always uses its own affiliate calculations for security
    // No client-side validation needed since server values are authoritative
  
    const ad = new Ad({
      id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      logo,
      url: normalizedUrl,
      pairAddress,
      blockchain: normalizeBlockchainSlug(blockchain),
      size: validatedSize, // Use validated size
      x: x || 0,
      y: y || 0,
      owner: req.user.username,
      txSignature: starterFreeNoPayment ? 'starter-free' : txSignature,
      paymentChain,
      chainSymbol,
      chainAddress,
      selectedAddons: selectedAddons || [],
      totalAmount: finalAmount,
      listingFee: calculatedListingFee,
      listingTier,
      appliedDiscountCode: appliedDiscountCode ? appliedDiscountCode.code : null,
      discountAmount: discountAmount,
      // All listings go through approval (including admins) for proper tracking
      status: 'pending'
    });

    const savedAd = await ad.save();

    if (!savedAd) {
      throw new Error('Failed to save ad');
    }

    // Emit socket event for real-time updates
    socket.getIO().emit('adsUpdated', { type: 'create', ad: savedAd });

    // If the ad is pending (non-admin user), notify admins
    if (savedAd.status === 'pending') {
      try {
        socket.getIO().emit('newPendingAd', {
          ad: savedAd,
          createdAt: new Date()
        });
      } catch (socketError) {
        console.error('Error emitting new pending ad:', socketError);
        // Don't fail the creation if socket emission fails
      }
    }

    // Award points to affiliate if the user was referred by someone
    try {
      // Find the current user to check if they were referred by an affiliate
      const user = await User.findById(req.user.userId);
      if (user) {
        // Update user's last activity for accurate fraud detection
        user.lastActivity = new Date();
        await user.save();
        
        if (user.referredBy && listingTier === LISTING_TIER_PREMIUM) {
          await awardListingPoints(req.user.userId);
        }
      }
    } catch (pointsError) {
      // Don't fail the ad creation if points award fails
    }

    try {
      const referrerAffiliateId = currentUser.referredBy;
      const listingCommissionBase =
        listingTier === LISTING_TIER_PREMIUM ? calculatedListingFee : 0;
      if (referrerAffiliateId && listingCommissionBase > 0) {
        const commissionRate = await AffiliateEarning.calculateCommissionRate(referrerAffiliateId);
        const commissionEarned = AffiliateEarning.calculateCommission(listingCommissionBase, commissionRate);
        await new AffiliateEarning({
          affiliateId: referrerAffiliateId,
          referredUserId: req.user.userId,
          adId: savedAd._id,
          adAmount: listingCommissionBase,
          commissionRate,
          commissionEarned
        }).save();
      }
    } catch (affiliateErr) {
      console.error('Ad create: affiliate earning failed', affiliateErr.message);
    }

    invalidateAdsCache();
    res.status(201).json(savedAd);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create ad', 
      message: error.message 
    });
  }
});

// PATCH launch checklist (honor-system step toggles + dismiss)
router.patch('/:id/launch-checklist', auth, requireEmailVerification, emitAdEvent('update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { completedSteps, dismiss } = req.body;

    const ad = await Ad.findOne({ id });
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    if (ad.owner !== req.user?.username && !req.user?.isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to update this ad' });
    }

    const update = {};
    if (completedSteps !== undefined) {
      if (!Array.isArray(completedSteps)) {
        return res.status(400).json({ message: 'completedSteps must be an array' });
      }
      const invalid = completedSteps.filter(s => !LAUNCH_CHECKLIST_STEPS.includes(s));
      if (invalid.length > 0) {
        return res.status(400).json({ message: 'Invalid checklist step(s)', invalid });
      }
      update['launchChecklist.completedSteps'] = completedSteps;
    }
    if (dismiss === true) {
      update['launchChecklist.dismissedAt'] = new Date();
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No checklist updates provided' });
    }

    const updatedAd = await Ad.findByIdAndUpdate(
      ad._id,
      { $set: update },
      { new: true, runValidators: false }
    );

    invalidateAdsCache();
    res.json(updatedAd);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating launch checklist',
      error: error.message
    });
  }
});

// PUT route for updating an ad
router.put('/:id', auth, requireEmailVerification, emitAdEvent('update'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If preferred size is provided, use it to validate the size
    if (updates.preferredSize) {
      updates.size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, updates.preferredSize));
      delete updates.preferredSize; // Remove from database fields
    }

    // Find the ad by ID
    const ad = await Ad.findOne({ id });
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    
    // Check if this is just a position update (x and y coordinates)
    const isPositionUpdate = Object.keys(updates).every(key => 
      ['x', 'y'].includes(key) || (updates[key] === ad[key])
    );
    
    // Skip authentication check for position updates only
    if (!isPositionUpdate && ad.owner !== req.user?.username && !req.user?.isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to update this ad' });
    }
    
    // Extract only allowed fields to update
    const updateData = {};
    const allowedUpdates = ['x', 'y', 'size', 'url', 'title', 'status', 'blockchain', 'logo', 'pairAddress', 'projectProfile'];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] =
          field === 'blockchain'
            ? normalizeBlockchainSlug(updates[field])
            : updates[field];
      }
    });

    if (updates.url !== undefined) {
      const normalizedUrl = updates.url ? normalizeProjectUrl(updates.url) : '';
      if (normalizedUrl && !isValidProjectUrl(normalizedUrl)) {
        return res.status(400).json({ message: 'Invalid website URL' });
      }
      updateData.url = normalizedUrl;
    }

    if (updateData.projectProfile && typeof updateData.projectProfile === 'object') {
      const raw = updateData.projectProfile.introVideoUrl;
      if (raw !== undefined) {
        if (typeof raw !== 'string' || raw.length > MAX_BRANDING_VIDEO_URL_LENGTH) {
          return res.status(400).json({ message: 'Invalid deep dive intro video URL' });
        }
        const trimmed = raw.trim();
        if (trimmed && !isValidDeepDiveIntroVideoUrl(trimmed)) {
          return res.status(400).json({
            message: 'Intro video must be a direct https link to a .mp4, .webm, or .ogg file (e.g. files.catbox.moe).'
          });
        }
        updateData.projectProfile = {
          ...updateData.projectProfile,
          introVideoUrl: trimmed
        };
      }
    }
    
    // Handle migration: if pairAddress is being updated, remove old contractAddress field
    if (updates.pairAddress !== undefined) {
      updateData.$unset = { contractAddress: "" };
    }
    
    // Prepare update operations
    const updateOperations = {};
    
    // Separate $set and $unset operations
    const { $unset, ...setData } = updateData;
    if (Object.keys(setData).length > 0) {
      updateOperations.$set = setData;
    }
    if ($unset) {
      updateOperations.$unset = $unset;
    }
    
    // Use the already-fetched _id (primary index) instead of re-scanning the secondary id index
    const updatedAd = await Ad.findByIdAndUpdate(
      ad._id,
      updateOperations,
      { new: true, runValidators: false }
    );
    
    if (!updatedAd) {
      return res.status(404).json({ message: 'Ad not found after update attempt' });
    }

    // Bubble list is cached (GET /); must invalidate so projectProfile.introVideoUrl etc. appear immediately
    invalidateAdsCache();
    
    res.json(updatedAd);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating ad', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST route for bumping an ad (legacy — paid bumps removed; bumps come from bullish votes)
router.post('/bump', auth, async (req, res) => {
  res.status(410).json({
    error: 'Paid bumps are no longer available.',
    message: `Bubbles bump automatically at ${BUMP_VOTE_THRESHOLD}+ bullish votes (organic votes and vote boosts both count).`
  });
});

// Track bubble click (public — opens AquaSwap from bubble map)
router.post('/:id/click', async (req, res) => {
  try {
    const ad = await Ad.findOne({ id: req.params.id });
    if (!ad || !['active', 'approved'].includes(ad.status)) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    await Ad.updateOne({ id: ad.id }, { $inc: { clicks: 1 } });
    res.json({ ok: true, clicks: (ad.clicks || 0) + 1 });
  } catch (error) {
    console.error('Bubble click tracking error:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Special route for position updates only (no auth required)
router.put('/:id/position', emitAdEvent('update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ message: 'Position update requires x and y coordinates' });
    }

    // Find the ad by ID
    const ad = await Ad.findOne({ id });
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    
    // Update only position fields
    const updatedAd = await Ad.findOneAndUpdate(
      { id },
      { $set: { x, y } },
      { new: true, runValidators: false }
    );
    
    if (!updatedAd) {
      return res.status(404).json({ message: 'Ad not found after update attempt' });
    }
    
    res.json(updatedAd);
  } catch (error) {
    res.status(500).json({ message: 'Error updating ad position', error: error.message });
  }
});

// Vote on ad sentiment (bullish/bearish)
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { voteType } = req.body;
    const adId = req.params.id;
    const userId = req.user.userId;

    // Validate vote type
    if (voteType !== 'bullish' && voteType !== 'bearish') {
      return res.status(400).json({ error: 'Invalid vote type. Must be "bullish" or "bearish".' });
    }

    // Get the ad
    const ad = await Ad.findOne({ id: adId });
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    // Get user to check points history
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already voted
    const existingVote = ad.voterData.find(voter => voter.userId === userId);
    
    // Flag to determine if we need to award points
    let shouldAwardPoints = false;
    
    // One-time 20 pts per bubble (web uses `Voted on bubble:`; legacy Telegram used `Voted on project:` + title)
    const bubblePointsKey = `Voted on bubble: ${adId}`;
    const legacyProjectTitleReason = ad.title ? `Voted on project: ${ad.title}` : null;
    const alreadyReceivedPoints = user.pointsHistory.some(
      (entry) =>
        entry.reason === bubblePointsKey ||
        (legacyProjectTitleReason && entry.reason === legacyProjectTitleReason)
    );
    
    if (existingVote) {
      // If voting the same way, do nothing
      if (existingVote.voteType === voteType) {
        return res.json({
          success: true,
          voteUnchanged: true,
          pointsAwarded: 0,
          adId: ad.id,
          bullishVotes: ad.bullishVotes,
          bearishVotes: ad.bearishVotes,
          userVote: voteType,
          isBumped: isVoteBumped(ad.bullishVotes),
          size: isVoteBumped(ad.bullishVotes) ? MAX_SIZE : ad.size
        });
      }
      
      // User is changing their vote - remove old vote and add new one
      let updates = {};
      
      // Decrement old vote type
      if (existingVote.voteType === 'bullish') {
        updates.bullishVotes = ad.bullishVotes - 1;
      } else {
        updates.bearishVotes = ad.bearishVotes - 1;
      }
      
      // Increment new vote type
      if (voteType === 'bullish') {
        updates.bullishVotes = (updates.bullishVotes !== undefined ? updates.bullishVotes : ad.bullishVotes) + 1;
      } else {
        updates.bearishVotes = (updates.bearishVotes !== undefined ? updates.bearishVotes : ad.bearishVotes) + 1;
      }
      
      // Update the voter's vote type in voterData
      updates.$set = { 'voterData.$[elem].voteType': voteType };
      
      const updatedAd = await Ad.findByIdAndUpdate(
        ad._id,
        updates,
        { 
          arrayFilters: [{ 'elem.userId': userId }],
          new: true 
        }
      );
      
      // Award points if they haven't received them before
      shouldAwardPoints = !alreadyReceivedPoints;
      
      if (shouldAwardPoints) {
        // Award 20 points for voting on this ad
        await User.findByIdAndUpdate(
          userId,
          {
            $inc: { points: 20 },
            $push: {
              pointsHistory: {
                amount: 20,
                reason: `Voted on bubble: ${adId}`,
                createdAt: new Date()
              }
            }
          }
        );
        // Referrer bonus: when earner gets positive points, referrer gets 5 (additive only)
        await creditReferrerBonus(userId, `Voted on bubble: ${adId}`);
      }

      const finalAd = await finalizeAdBumpAfterVote(updatedAd);
      invalidateAdsCache();
      socket.getIO().emit('adVoteUpdated', {
        adId: finalAd.id,
        bullishVotes: finalAd.bullishVotes,
        bearishVotes: finalAd.bearishVotes,
        isBumped: finalAd.isBumped,
        size: finalAd.size
      });

      // Send notification to registered Telegram group about vote change
      telegramService.sendVoteNotificationToGroup(finalAd).catch(err => {
        console.error('Error sending telegram notification:', err);
      });
      
      return res.json({
        success: true,
        adId: finalAd.id,
        bullishVotes: finalAd.bullishVotes,
        bearishVotes: finalAd.bearishVotes,
        userVote: voteType,
        pointsAwarded: shouldAwardPoints ? 20 : 0,
        isBumped: finalAd.isBumped,
        size: finalAd.size
      });
    } else {
      // New vote - update vote counts and add user to voterData
      let updates = {};
      
      if (voteType === 'bullish') {
        updates.bullishVotes = ad.bullishVotes + 1;
      } else {
        updates.bearishVotes = ad.bearishVotes + 1;
      }
      
      updates.$push = { voterData: { userId, voteType } };
      
      const updatedAd = await Ad.findByIdAndUpdate(
        ad._id,
        updates,
        { new: true }
      );
      
      // Award points for first vote on this ad
      shouldAwardPoints = !alreadyReceivedPoints;
      
      if (shouldAwardPoints) {
        // Award 20 points for voting on this ad
        await User.findByIdAndUpdate(
          userId,
          {
            $inc: { points: 20 },
            $push: {
              pointsHistory: {
                amount: 20,
                reason: `Voted on bubble: ${adId}`,
                createdAt: new Date()
              }
            }
          }
        );
        // Referrer bonus: when earner gets positive points, referrer gets 5 (additive only)
        await creditReferrerBonus(userId, `Voted on bubble: ${adId}`);
      }

      const finalAd = await finalizeAdBumpAfterVote(updatedAd);
      invalidateAdsCache();
      socket.getIO().emit('adVoteUpdated', {
        adId: finalAd.id,
        bullishVotes: finalAd.bullishVotes,
        bearishVotes: finalAd.bearishVotes,
        isBumped: finalAd.isBumped,
        size: finalAd.size
      });

      // Send notification to registered Telegram group about new vote
      telegramService.sendVoteNotificationToGroup(finalAd).catch(err => {
        console.error('Error sending telegram notification:', err);
      });
      
      return res.json({
        success: true,
        adId: finalAd.id,
        bullishVotes: finalAd.bullishVotes,
        bearishVotes: finalAd.bearishVotes,
        userVote: voteType,
        pointsAwarded: shouldAwardPoints ? 20 : 0,
        isBumped: finalAd.isBumped,
        size: finalAd.size
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// Get vote counts for an ad
router.get('/:id/votes', async (req, res) => {
  try {
    const adId = req.params.id;
    const userId = req.user?.userId;
    
    // Get the ad
    const ad = await Ad.findOne({ id: adId });
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    // Check if the user has voted
    let userVote = null;
    if (userId) {
      const existingVote = ad.voterData.find(voter => voter.userId === userId);
      if (existingVote) {
        userVote = existingVote.voteType;
      }
    }

    res.json({
      adId: ad.id,
      bullishVotes: ad.bullishVotes,
      bearishVotes: ad.bearishVotes,
      isBumped: isVoteBumped(ad.bullishVotes),
      // Calculate sentiment percentage
      sentiment: ad.bullishVotes + ad.bearishVotes > 0 
        ? Math.round((ad.bullishVotes / (ad.bullishVotes + ad.bearishVotes)) * 100) 
        : 50, // Default to neutral if no votes
      userVote
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vote data' });
  }
});

// GET pending ads (admin only)
router.get('/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingAds = await Ad.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(pendingAds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending ads' });
  }
});

// Approve an ad (admin only)
router.post('/:id/approve', auth, emitAdEvent('update'), async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const adId = req.params.id;
    const ad = await Ad.findOne({ id: adId });

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    if (ad.status !== 'pending') {
      return res.status(400).json({ error: `Ad is already ${ad.status}` });
    }

    ad.status = 'active';
    await ad.save();

    // Emit real-time socket update for ad approval
    try {
      socket.getIO().emit('pendingAdApproved', {
        adId: ad.id,
        title: ad.title,
        owner: ad.owner,
        approvedBy: req.user.id,
        approvedAt: new Date()
      });
    } catch (socketError) {
      console.error('Error emitting ad approval:', socketError);
      // Don't fail the approval if socket emission fails
    }

    invalidateAdsCache();
    res.json({ 
      message: 'Ad approved successfully',
      ad
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve ad' });
  }
});

// Reject an ad (admin only)
router.post('/:id/reject', auth, emitAdEvent('delete'), async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { rejectionReason } = req.body;
    const adId = req.params.id;
    const ad = await Ad.findOne({ id: adId });

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    if (ad.status !== 'pending') {
      return res.status(400).json({ error: `Ad is already ${ad.status}` });
    }

    // Instead of updating the status, delete the ad entirely
    await Ad.findByIdAndDelete(ad._id);
    invalidateAdsCache();

    // Emit real-time socket update for ad rejection
    try {
      socket.getIO().emit('pendingAdRejected', {
        adId: ad.id,
        title: ad.title,
        owner: ad.owner,
        rejectedBy: req.user.id,
        rejectionReason: rejectionReason || 'Rejected by admin',
        rejectedAt: new Date()
      });
    } catch (socketError) {
      console.error('Error emitting ad rejection:', socketError);
      // Don't fail the rejection if socket emission fails
    }

    res.json({ 
      message: 'Ad rejected and deleted successfully',
      adId: adId
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject ad' });
  }
});

// Pre-warm the ads (bubbles) cache on startup.
const warmupAdsCache = async () => {
  try {
    const processedAds = await fetchAndCacheAds();
    console.log(`[Ads Cache] Warmed up ${processedAds.length} ads`);
  } catch (err) {
    console.error('[Ads Cache] Warmup failed (non-critical):', err.message);
  }
};

module.exports = router;
module.exports.warmupAdsCache = warmupAdsCache;
module.exports.invalidatePublicAdsCache = invalidateAdsCache;