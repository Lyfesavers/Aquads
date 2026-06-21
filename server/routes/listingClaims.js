const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const Ad = require('../models/Ad');
const ListingClaimRequest = require('../models/ListingClaimRequest');
const socket = require('../socket');
const { transferDexFeedListing } = require('../utils/transferDexFeedListing');
const {
  LISTING_SOURCE_DEX_FEED,
  CLAIM_STATUS_UNCLAIMED,
  DEX_FEED_OWNER_USERNAME
} = require('../constants/dexFeed');

const router = express.Router();

const CODE_TTL_MS = 48 * 60 * 60 * 1000;

function generateVerificationCode() {
  const chunk = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `AQ-${chunk}`;
}

function isValidTweetUrl(url) {
  try {
    const raw = String(url || '').trim();
    if (!raw) return false;
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'x.com' && host !== 'twitter.com') return false;
    return /\/status\/\d+/i.test(u.pathname);
  } catch {
    return false;
  }
}

async function findUnclaimedDexAd(query) {
  const q = String(query || '').trim();
  if (!q) return null;

  const baseFilter = {
    listingSource: LISTING_SOURCE_DEX_FEED,
    claimStatus: CLAIM_STATUS_UNCLAIMED,
    owner: DEX_FEED_OWNER_USERNAME,
    status: 'active'
  };

  const byId = await Ad.findOne({ ...baseFilter, id: q }).lean();
  if (byId) return byId;

  const lower = q.toLowerCase();
  return Ad.findOne({
    ...baseFilter,
    $or: [
      { contractAddress: { $regex: new RegExp(`^${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { pairAddress: { $regex: new RegExp(`^${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    ]
  }).lean();
}

function serializeClaimRequest(doc, ad) {
  const row = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return {
    ...row,
    ad: ad
      ? {
          id: ad.id,
          title: ad.title,
          logo: ad.logo,
          blockchain: ad.blockchain,
          contractAddress: ad.contractAddress,
          pairAddress: ad.pairAddress
        }
      : null
  };
}

async function loadAdForClaim(adId) {
  return Ad.findOne({
    id: adId,
    listingSource: LISTING_SOURCE_DEX_FEED,
    claimStatus: CLAIM_STATUS_UNCLAIMED,
    owner: DEX_FEED_OWNER_USERNAME,
    status: 'active'
  }).lean();
}

// GET lookup unclaimed dex listing by ad id or contract/pair address
router.get('/lookup', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const ad = await findUnclaimedDexAd(q);
    if (!ad) {
      return res.status(404).json({ error: 'No unclaimed dex-feed listing found for that query' });
    }

    res.json({
      ad: {
        id: ad.id,
        title: ad.title,
        logo: ad.logo,
        blockchain: ad.blockchain,
        contractAddress: ad.contractAddress,
        pairAddress: ad.pairAddress,
        claimStatus: ad.claimStatus,
        listingSource: ad.listingSource
      }
    });
  } catch (error) {
    console.error('[ListingClaims] lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup listing' });
  }
});

// POST prepare verification code for a claim
router.post('/prepare', auth, requireEmailVerification, async (req, res) => {
  try {
    const adId = String(req.body?.adId || '').trim();
    if (!adId) {
      return res.status(400).json({ error: 'adId is required' });
    }

    const ad = await loadAdForClaim(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Listing is not available to claim' });
    }

    const existingPending = await ListingClaimRequest.findOne({
      adId,
      status: 'pending'
    }).lean();
    if (existingPending) {
      return res.status(409).json({
        error: 'A claim request is already pending review for this listing'
      });
    }

    const userId = req.user.userId || req.user.id;
    const username = req.user.username;
    const codeExpiresAt = new Date(Date.now() + CODE_TTL_MS);
    const verificationCode = generateVerificationCode();

    let claim = await ListingClaimRequest.findOne({
      adId,
      requesterUserId: userId,
      status: 'prepared'
    });

    if (claim) {
      claim.verificationCode = verificationCode;
      claim.codeExpiresAt = codeExpiresAt;
      await claim.save();
    } else {
      claim = await ListingClaimRequest.create({
        adId,
        requesterUserId: userId,
        requesterUsername: username,
        verificationCode,
        codeExpiresAt,
        status: 'prepared'
      });
    }

    res.json({
      verificationCode: claim.verificationCode,
      codeExpiresAt: claim.codeExpiresAt,
      tweetTemplate: `Claiming our project bubble on @Aquads — verify ${claim.verificationCode}`,
      ad: {
        id: ad.id,
        title: ad.title,
        logo: ad.logo
      }
    });
  } catch (error) {
    console.error('[ListingClaims] prepare error:', error);
    res.status(500).json({ error: 'Failed to prepare claim verification' });
  }
});

// POST submit claim with X tweet URL
router.post('/submit', auth, requireEmailVerification, async (req, res) => {
  try {
    const adId = String(req.body?.adId || '').trim();
    const tweetUrl = String(req.body?.tweetUrl || '').trim();
    const verificationCode = String(req.body?.verificationCode || '').trim().toUpperCase();

    if (!adId || !tweetUrl || !verificationCode) {
      return res.status(400).json({ error: 'adId, tweetUrl, and verificationCode are required' });
    }
    if (!isValidTweetUrl(tweetUrl)) {
      return res.status(400).json({
        error: 'Tweet URL must be a valid X/Twitter post link (x.com/.../status/...)'
      });
    }

    const ad = await loadAdForClaim(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Listing is not available to claim' });
    }

    const existingPending = await ListingClaimRequest.findOne({
      adId,
      status: 'pending'
    }).lean();
    if (existingPending) {
      return res.status(409).json({
        error: 'A claim request is already pending review for this listing'
      });
    }

    const userId = req.user.userId || req.user.id;
    const claim = await ListingClaimRequest.findOne({
      adId,
      requesterUserId: userId,
      status: 'prepared'
    });

    if (!claim) {
      return res.status(400).json({ error: 'Generate a verification code first' });
    }
    if (new Date(claim.codeExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification code expired — generate a new one' });
    }
    if (claim.verificationCode.toUpperCase() !== verificationCode) {
      return res.status(400).json({ error: 'Verification code does not match' });
    }

    claim.tweetUrl = tweetUrl;
    claim.status = 'pending';
    claim.verificationCode = verificationCode;
    await claim.save();

    try {
      const io = socket.getIO();
      io.emit('newListingClaimPending', {
        claim: serializeClaimRequest(claim, ad)
      });
    } catch (socketErr) {
      console.error('[ListingClaims] socket emit failed:', socketErr.message);
    }

    res.status(201).json({
      message: 'Claim submitted for review',
      claimId: claim._id,
      status: claim.status
    });
  } catch (error) {
    console.error('[ListingClaims] submit error:', error);
    res.status(500).json({ error: 'Failed to submit claim request' });
  }
});

// GET user's own claim requests
router.get('/mine', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const claims = await ListingClaimRequest.find({ requesterUserId: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const adIds = [...new Set(claims.map((c) => c.adId))];
    const ads = await Ad.find({ id: { $in: adIds } })
      .select('id title logo blockchain contractAddress pairAddress')
      .lean();
    const adMap = Object.fromEntries(ads.map((a) => [a.id, a]));

    res.json({
      claims: claims.map((c) => serializeClaimRequest(c, adMap[c.adId]))
    });
  } catch (error) {
    console.error('[ListingClaims] mine error:', error);
    res.status(500).json({ error: 'Failed to fetch your claim requests' });
  }
});

// GET pending claims (admin)
router.get('/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const claims = await ListingClaimRequest.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .lean();

    const adIds = [...new Set(claims.map((c) => c.adId))];
    const ads = await Ad.find({ id: { $in: adIds } }).lean();
    const adMap = Object.fromEntries(ads.map((a) => [a.id, a]));

    res.json({
      claims: claims.map((c) => serializeClaimRequest(c, adMap[c.adId])),
      total: claims.length
    });
  } catch (error) {
    console.error('[ListingClaims] pending list error:', error);
    res.status(500).json({ error: 'Failed to fetch pending claims' });
  }
});

// POST approve claim (admin)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const claim = await ListingClaimRequest.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Claim request not found' });
    }
    if (claim.status !== 'pending') {
      return res.status(400).json({ error: 'Claim is not pending review' });
    }

    const ad = await transferDexFeedListing(claim.adId, claim.requesterUsername);

    claim.status = 'approved';
    claim.reviewedAt = new Date();
    claim.reviewedBy = req.user.username;
    await claim.save();

    await ListingClaimRequest.updateMany(
      {
        adId: claim.adId,
        _id: { $ne: claim._id },
        status: { $in: ['pending', 'prepared'] }
      },
      {
        $set: {
          status: 'rejected',
          rejectionReason: 'Another claim was approved for this listing',
          reviewedAt: new Date(),
          reviewedBy: req.user.username
        }
      }
    );

    try {
      const io = socket.getIO();
      io.emit('listingClaimApproved', {
        claimId: claim._id.toString(),
        adId: claim.adId,
        username: claim.requesterUsername
      });
    } catch (socketErr) {
      console.error('[ListingClaims] approve socket failed:', socketErr.message);
    }

    res.json({ message: 'Claim approved and ownership transferred', ad, claim });
  } catch (error) {
    console.error('[ListingClaims] approve error:', error);
    res.status(400).json({ error: error.message || 'Failed to approve claim' });
  }
});

// POST reject claim (admin)
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const claim = await ListingClaimRequest.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Claim request not found' });
    }
    if (claim.status !== 'pending') {
      return res.status(400).json({ error: 'Claim is not pending review' });
    }

    const rejectionReason = String(req.body?.rejectionReason || 'Rejected by admin').trim();

    claim.status = 'rejected';
    claim.rejectionReason = rejectionReason;
    claim.reviewedAt = new Date();
    claim.reviewedBy = req.user.username;
    await claim.save();

    try {
      const io = socket.getIO();
      io.emit('listingClaimRejected', {
        claimId: claim._id.toString(),
        adId: claim.adId,
        username: claim.requesterUsername
      });
    } catch (socketErr) {
      console.error('[ListingClaims] reject socket failed:', socketErr.message);
    }

    res.json({ message: 'Claim rejected', claim });
  } catch (error) {
    console.error('[ListingClaims] reject error:', error);
    res.status(500).json({ error: 'Failed to reject claim' });
  }
});

module.exports = router;
