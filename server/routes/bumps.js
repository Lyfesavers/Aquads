const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BumpRequest = require('../models/BumpRequest');
const Ad = require('../models/Ad');
const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');

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

// Create a new bump request
router.post('/', async (req, res) => {
  try {
    const { adId, owner, txSignature, duration } = req.body;
    
    if (!adId || !owner || !txSignature || !duration) {
      return res.status(400).json({ error: 'Missing required fields: adId, owner, txSignature, or duration' });
    }

    // Check if there's already a pending bump request for this ad
    const existingRequest = await BumpRequest.findOne({ 
      adId, 
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'There is already a pending bump request for this ad' });
    }

    const bumpRequest = new BumpRequest({
      adId,
      owner,
      txSignature,
      duration,
      status: 'pending'
    });

    const savedRequest = await bumpRequest.save();
    res.status(201).json(savedRequest);
  } catch (error) {
    console.error('Error creating bump request:', error);
    res.status(500).json({ error: error.message || 'Failed to create bump request' });
  }
});

// Approve a bump request
router.post('/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { adId, processedBy } = req.body;

    if (!adId || !processedBy) {
      return res.status(400).json({ error: 'Missing required fields: adId or processedBy' });
    }

    // Find and update the bump request
    const bumpRequest = await BumpRequest.findOne({ adId, status: 'pending' });

    if (!bumpRequest) {
      return res.status(404).json({ error: 'No pending bump request found for this ad' });
    }

    // Validate and convert duration
    const duration = parseInt(bumpRequest.duration);
    if (isNaN(duration) || (duration <= 0 && duration !== -1)) {
      return res.status(400).json({ error: 'Invalid duration value' });
    }

    // Update bump request status
    bumpRequest.status = 'approved';
    bumpRequest.processedAt = new Date();
    bumpRequest.processedBy = processedBy;
    await bumpRequest.save();

    const now = new Date();
    // Handle lifetime bumps (duration = -1) by setting expiresAt to null
    const expiresAt = duration === -1 ? null : new Date(now.getTime() + duration);

    // Update the ad
    const ad = await Ad.findOneAndUpdate(
      { id: adId },
      { 
        size: 100, // MAX_SIZE
        isBumped: true,
        status: 'approved',
        bumpedAt: now,
        bumpDuration: duration,
        bumpExpiresAt: expiresAt,
        lastBumpTx: bumpRequest.txSignature
      },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found. The bump request exists but the ad may have been deleted.' });
    }

    console.log('Updated Ad:', {
      id: ad.id,
      bumpDuration: ad.bumpDuration,
      bumpedAt: ad.bumpedAt?.toISOString(),
      bumpExpiresAt: ad.bumpExpiresAt?.toISOString()
    });

    // Record affiliate commission if applicable
    try {
      const adOwner = await User.findOne({ username: ad.owner });
      if (adOwner && adOwner.referredBy) {
        // Calculate USDC amount based on bump duration
        let adAmount;
        if (duration === 90 * 24 * 60 * 60 * 1000) { // 3 months
          adAmount = 99; // 99 USDC
        } else if (duration === 180 * 24 * 60 * 60 * 1000) { // 6 months
          adAmount = 150; // 150 USDC
        } else if (duration === 365 * 24 * 60 * 60 * 1000) { // 1 year (legacy)
          adAmount = 300; // 300 USDC
        } else if (duration === -1) { // Lifetime
          adAmount = 300; // 300 USDC
        }

        const commissionRate = await AffiliateEarning.calculateCommissionRate(adOwner.referredBy);
        const commissionEarned = AffiliateEarning.calculateCommission(adAmount, commissionRate);
        
        const earning = new AffiliateEarning({
          affiliateId: adOwner.referredBy,
          referredUserId: adOwner._id,
          adId: ad._id,
          adAmount,           // This will now be in USDC
          currency: 'USDC',   // Specify USDC currency
          commissionRate,
          commissionEarned
        });
        
        await earning.save();
      }
    } catch (commissionError) {
      console.error('Error recording affiliate commission:', commissionError);
    }

    res.json({ bumpRequest, ad });
  } catch (error) {
    console.error('Error approving bump request:', error);
    res.status(500).json({ error: error.message || 'Failed to approve bump request' });
  }
});

// Reject a bump request
router.post('/reject', auth, async (req, res) => {
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

    // Update the ad status
    const ad = await Ad.findOneAndUpdate(
      { id: adId },
      { 
        status: 'active',
        isBumped: false
      },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found. The bump request exists but the ad may have been deleted.' });
    }

    res.json({ bumpRequest, ad });
  } catch (error) {
    console.error('Error rejecting bump request:', error);
    res.status(500).json({ error: error.message || 'Failed to reject bump request' });
  }
});

module.exports = router; 