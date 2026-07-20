const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const VoteBoost = require('../models/VoteBoost');
const Ad = require('../models/Ad');
const { emitVoteBoostUpdate } = require('../socket');

// Checkout/cancel must read the primary — avoid replica lag returning "not found" right after create.
const voteBoostFindOnePrimary = (filter) => VoteBoost.findOne(filter).read('primary');
const voteBoostFindManyPrimary = (filter) => VoteBoost.find(filter).read('primary');

// Vote boost packages with pricing
const VOTE_BOOST_PACKAGES = [
  { 
    id: 'starter',
    name: 'Starter', 
    votes: 100, 
    price: 20, 
    originalPrice: 20,
    discountPercent: 0,
    description: '100 bullish votes + group members'
  },
  { 
    id: 'basic',
    name: 'Basic', 
    votes: 250, 
    price: 40, 
    originalPrice: 50, // Would be $50 at base rate ($0.20/vote)
    discountPercent: 20,
    description: '250 bullish votes + group members - 20% OFF'
  },
  { 
    id: 'growth',
    name: 'Growth', 
    votes: 500, 
    price: 80, 
    originalPrice: 100, // Would be $100 at base rate
    discountPercent: 20,
    description: '500 bullish votes + group members - 20% OFF'
  },
  { 
    id: 'pro',
    name: 'Pro', 
    votes: 1000, 
    price: 150, 
    originalPrice: 200, // Would be $200 at base rate
    discountPercent: 25,
    description: '1,000 bullish votes + group members - 25% OFF'
  }
];

// Get all packages
router.get('/packages', (req, res) => {
  res.json(VOTE_BOOST_PACKAGES);
});

// Get all pending vote boost requests (admin only)
router.get('/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingBoosts = await VoteBoost.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(pendingBoosts);
  } catch (error) {
    console.error('Error fetching pending vote boosts:', error);
    res.status(500).json({ error: 'Failed to fetch pending vote boosts' });
  }
});

// Get active vote boosts (for background service)
router.get('/active', async (req, res) => {
  try {
    const activeBoosts = await VoteBoost.find({ 
      status: 'active',
      $expr: { $lt: ['$votesAdded', '$votesToAdd'] }
    }).lean();
    res.json(activeBoosts);
  } catch (error) {
    console.error('Error fetching active vote boosts:', error);
    res.status(500).json({ error: 'Failed to fetch active vote boosts' });
  }
});

// Get user's vote boosts
router.get('/my-boosts', auth, async (req, res) => {
  try {
    const boosts = await voteBoostFindManyPrimary({ owner: req.user.username })
      .sort({ createdAt: -1 })
      .lean();
    res.json(boosts);
  } catch (error) {
    console.error('Error fetching user vote boosts:', error);
    res.status(500).json({ error: 'Failed to fetch your vote boosts' });
  }
});

// Create a new vote boost request
router.post('/', auth, async (req, res) => {
  try {
    const { adId, packageId, txSignature, paymentChain, chainSymbol, chainAddress } = req.body;
    
    if (!adId || !packageId || !txSignature) {
      return res.status(400).json({ error: 'Missing required fields: adId, packageId, or txSignature' });
    }

    // Find the package
    const selectedPackage = VOTE_BOOST_PACKAGES.find(p => p.id === packageId);
    if (!selectedPackage) {
      return res.status(400).json({ error: 'Invalid package selected' });
    }

    // Verify ad exists and belongs to user
    const ad = await Ad.findOne({ id: adId });
    if (!ad) {
      return res.status(404).json({ error: 'Bubble not found' });
    }

    if (ad.owner !== req.user.username && !req.user.isAdmin) {
      return res.status(403).json({ error: 'You can only boost your own bubbles' });
    }

    const isAquaPayPending = txSignature === 'aquapay-pending';
    const owner = req.user.username;

    if (isAquaPayPending) {
      const existingAquaPay = await voteBoostFindOnePrimary({
        adId,
        owner,
        status: 'pending',
        txSignature: 'aquapay-pending'
      });

      if (existingAquaPay) {
        const samePackage =
          existingAquaPay.packageName === selectedPackage.name &&
          existingAquaPay.votesToAdd === selectedPackage.votes &&
          existingAquaPay.price === selectedPackage.price;

        if (samePackage) {
          return res.status(200).json({ ...existingAquaPay.toObject(), reusedCheckout: true });
        }

        return res.status(409).json({
          error: 'You already have an unpaid checkout for this bubble. Continue payment or cancel it first.',
          pendingBoost: existingAquaPay
        });
      }
    }

    // Block non-AquaPay checkout if any other pending request exists for this bubble
    const existingPending = await voteBoostFindOnePrimary({
      adId,
      owner,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({ error: 'There is already a pending boost request for this bubble' });
    }

    const voteBoost = new VoteBoost({
      adId,
      owner,
      txSignature,
      packageName: selectedPackage.name,
      votesToAdd: selectedPackage.votes,
      price: selectedPackage.price,
      originalPrice: selectedPackage.originalPrice,
      discountPercent: selectedPackage.discountPercent,
      paymentChain: isAquaPayPending ? 'AquaPay' : (paymentChain || 'Solana'),
      chainSymbol: chainSymbol || 'USDC',
      chainAddress: chainAddress || null,
      status: 'pending'
    });

    let savedBoost;
    try {
      savedBoost = await voteBoost.save();
    } catch (saveError) {
      if (saveError.code === 11000 && isAquaPayPending) {
        const raced = await voteBoostFindOnePrimary({
          adId,
          owner,
          status: 'pending',
          txSignature: 'aquapay-pending'
        });
        if (raced) {
          return res.status(200).json({ ...raced.toObject(), reusedCheckout: true });
        }
      }
      throw saveError;
    }

    // Emit socket event for new boost request
    emitVoteBoostUpdate('create', savedBoost, ad);

    res.status(201).json(savedBoost);
  } catch (error) {
    console.error('Error creating vote boost request:', error);
    res.status(500).json({ error: error.message || 'Failed to create vote boost request' });
  }
});

// Approve a vote boost request (admin only)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const boost = await VoteBoost.findById(req.params.id);
    
    if (!boost) {
      return res.status(404).json({ error: 'Vote boost request not found' });
    }

    if (boost.status !== 'pending') {
      return res.status(400).json({ error: 'This boost request has already been processed' });
    }

    // Verify ad still exists
    const ad = await Ad.findOne({ id: boost.adId });
    if (!ad) {
      return res.status(404).json({ error: 'Associated bubble not found' });
    }

    // Update boost status to active
    boost.status = 'active';
    boost.approvedAt = new Date();
    boost.processedBy = req.user.username;
    boost.lastVoteAt = new Date(); // Initialize for interval tracking
    
    await boost.save();

    // Emit socket event for approved boost
    emitVoteBoostUpdate('approve', boost, ad);

    res.json({ boost, ad });
  } catch (error) {
    console.error('Error approving vote boost request:', error);
    res.status(500).json({ error: error.message || 'Failed to approve vote boost request' });
  }
});

// Reject a vote boost request (admin only)
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { reason } = req.body;

    const boost = await VoteBoost.findById(req.params.id);
    
    if (!boost) {
      return res.status(404).json({ error: 'Vote boost request not found' });
    }

    if (boost.status !== 'pending') {
      return res.status(400).json({ error: 'This boost request has already been processed' });
    }

    // Update boost status to rejected
    boost.status = 'rejected';
    boost.processedBy = req.user.username;
    boost.rejectionReason = reason || 'No reason provided';
    
    await boost.save();

    // Get ad for socket emission
    const ad = await Ad.findOne({ id: boost.adId });

    // Emit socket event for rejected boost
    emitVoteBoostUpdate('reject', boost, ad);

    res.json({ boost });
  } catch (error) {
    console.error('Error rejecting vote boost request:', error);
    res.status(500).json({ error: error.message || 'Failed to reject vote boost request' });
  }
});

// Cancel an unpaid AquaPay checkout (owner only, before payment — same as Telegram boost_cancel)
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid vote boost id' });
    }

    const owner = req.user.username;
    const deleteQuery = req.user.isAdmin
      ? { _id: id, status: 'pending', txSignature: 'aquapay-pending' }
      : { _id: id, owner, status: 'pending', txSignature: 'aquapay-pending' };

    const deleted = await VoteBoost.findOneAndDelete(deleteQuery).read('primary');

    if (deleted) {
      return res.json({ success: true, cancelled: true, id: deleted._id.toString() });
    }

    const existing = await voteBoostFindOnePrimary({ _id: id }).select('owner status txSignature').lean();
    if (!existing) {
      // Already removed (e.g. Telegram cancel, stale UI, or race) — idempotent success.
      return res.json({ success: true, cancelled: true, alreadyGone: true, id });
    }

    if (!req.user.isAdmin && existing.owner !== owner) {
      return res.status(403).json({ error: 'You can only cancel your own boost requests' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'This order is no longer pending and cannot be cancelled' });
    }

    if (existing.txSignature !== 'aquapay-pending') {
      return res.status(400).json({
        error: 'This order is awaiting manual payment review and cannot be cancelled here. Contact support if you need help.'
      });
    }

    return res.status(409).json({ error: 'Could not cancel this checkout. Please refresh and try again.' });
  } catch (error) {
    console.error('Error cancelling vote boost request:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel vote boost request' });
  }
});

// Export packages for use in other modules
router.VOTE_BOOST_PACKAGES = VOTE_BOOST_PACKAGES;

module.exports = router;

