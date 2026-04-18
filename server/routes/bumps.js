const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { emitAdEvent } = require('../middleware/socketEmitter');
const { emitBumpRequestUpdate } = require('../socket');
const BumpRequest = require('../models/BumpRequest');
const Ad = require('../models/Ad');
const { getBumpSyncUpdate, BUMP_VOTE_THRESHOLD } = require('../utils/bumpFromVotes');

// Get all pending bump requests
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const bumpRequests = await BumpRequest.find(query).sort({ createdAt: -1 });
    res.json(bumpRequests);
  } catch (error) {
    console.error('Error fetching bump requests:', error);
    res.status(500).json({ error: 'Failed to fetch bump requests' });
  }
});

// Create a new bump request (disabled — bumps are earned via bullish votes)
router.post('/', async (req, res) => {
  res.status(410).json({
    error: 'Paid bumps are no longer available.',
    message: `Bubbles bump automatically at ${BUMP_VOTE_THRESHOLD}+ bullish votes (organic votes and vote boosts both count).`
  });
});

// Approve a bump request (disabled — paid bumps removed)
router.post('/approve', auth, emitAdEvent('update'), async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.status(410).json({
    error: 'Paid bump approval is no longer supported.',
    message: `Bumps are based on ${BUMP_VOTE_THRESHOLD}+ bullish votes. Reject legacy pending requests if needed.`
  });
});

// Reject a bump request
router.post('/reject', auth, emitAdEvent('update'), async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { adId, processedBy, reason } = req.body;

    if (!adId || !processedBy) {
      return res.status(400).json({ error: 'Missing required fields: adId or processedBy' });
    }

    // Find and update the bump request
    const bumpRequest = await BumpRequest.findOneAndUpdate(
      { adId, status: 'pending' },
      { 
        status: 'rejected',
        processedAt: new Date(),
        processedBy,
        rejectionReason: reason || 'Rejected by admin'
      },
      { new: true }
    );

    if (!bumpRequest) {
      return res.status(404).json({ error: 'No pending bump request found for this ad' });
    }

    const ad = await Ad.findOne({ id: adId });

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found. The bump request exists but the ad may have been deleted.' });
    }

    const { $set } = getBumpSyncUpdate(ad, ad.bullishVotes);
    const updatedAd = await Ad.findOneAndUpdate(
      { id: adId },
      { $set: { ...$set, status: 'active' } },
      { new: true }
    );

    // Emit socket event for rejected bump request
    emitBumpRequestUpdate('reject', bumpRequest);
    
    // Also emit ad update immediately so all clients see the rejection
    const socket = require('../socket');
    if (updatedAd) {
      socket.emitAdUpdate('update', updatedAd);
    }

    res.json({ bumpRequest, ad: updatedAd });
  } catch (error) {
    console.error('Error rejecting bump request:', error);
    res.status(500).json({ error: error.message || 'Failed to reject bump request' });
  }
});

module.exports = router; 