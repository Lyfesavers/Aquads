const express = require('express');
const router = express.Router();
const BountyEscrow = require('../models/BountyEscrow');
const Bounty = require('../models/Bounty');
const bountyEscrowService = require('../services/bountyEscrowService');
const auth = require('../middleware/auth');

function emitBounty(type, bounty, extra = {}) {
  try {
    const { emitBountyUpdate } = require('../socket');
    emitBountyUpdate(type, bounty, extra);
  } catch (err) {
    console.error('Bounty socket emit error:', err.message);
  }
}

async function finalizeFunded(escrow) {
  const bounty = await Bounty.findById(escrow.bountyId).lean();
  if (bounty) {
    const publicBounty = { ...bounty };
    delete publicBounty.submissions;
    publicBounty.status = 'open';
    // Announce the newly funded, now-public bounty to all clients.
    emitBounty('created', publicBounty);
  }
}

function scheduleBackgroundVerification(escrowId, attempt = 0) {
  const maxAttempts = 10;
  const delay = Math.min(10000 * Math.pow(1.5, attempt), 60000);

  setTimeout(async () => {
    try {
      const escrow = await BountyEscrow.findById(escrowId);
      if (!escrow || escrow.status !== 'deposit_pending') return;

      const verification = await bountyEscrowService.verifyDeposit(escrowId);
      if (verification.verified) {
        const updated = await BountyEscrow.findById(escrowId);
        await finalizeFunded(updated);
      } else if (attempt < maxAttempts - 1) {
        scheduleBackgroundVerification(escrowId, attempt + 1);
      }
    } catch (err) {
      console.error(`Bounty escrow background verification error for ${escrowId}:`, err.message);
      if (attempt < maxAttempts - 1) {
        scheduleBackgroundVerification(escrowId, attempt + 1);
      }
    }
  }, delay);
}

// ADMIN: list bounty escrows (disputes) — must be before /:escrowId
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { status, disputesOnly } = req.query;
    const filter = {};
    if (disputesOnly === 'true') {
      filter.status = { $in: ['disputed', 'resolved_seller', 'resolved_buyer'] };
    } else if (status) {
      filter.status = status;
    }
    const escrows = await BountyEscrow.find(filter)
      .populate('buyerId', 'username email')
      .populate('sellerId', 'username email')
      .populate('bountyId', 'title status')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, escrows });
  } catch (error) {
    console.error('Error fetching admin bounty escrows:', error);
    res.status(500).json({ error: 'Failed to fetch escrows' });
  }
});

// ADMIN: resolve dispute — release to winner
router.post('/admin/:escrowId/release', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { notes } = req.body;
    const result = await bountyEscrowService.adminResolveForWinner(req.params.escrowId, req.user.userId, notes);

    const escrow = await BountyEscrow.findById(req.params.escrowId);
    if (escrow) {
      const bounty = await Bounty.findById(escrow.bountyId);
      if (bounty && !['completed', 'cancelled'].includes(bounty.status)) {
        bounty.status = 'completed';
        bounty.winnerId = escrow.sellerId;
        bounty.completedAt = new Date();
        await bounty.save();
      }
    }
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error releasing bounty escrow:', error);
    res.status(500).json({ error: error.message || 'Failed to release escrow' });
  }
});

// ADMIN: resolve dispute — refund to poster
router.post('/admin/:escrowId/refund', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { notes } = req.body;
    const result = await bountyEscrowService.refundToPoster(req.params.escrowId, req.user.userId, notes);

    const escrow = await BountyEscrow.findById(req.params.escrowId);
    if (escrow) {
      const bounty = await Bounty.findById(escrow.bountyId);
      if (bounty && !['completed', 'cancelled'].includes(bounty.status)) {
        bounty.status = 'cancelled';
        await bounty.save();
      }
    }
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error refunding bounty escrow:', error);
    res.status(500).json({ error: error.message || 'Failed to refund escrow' });
  }
});

// Get escrow by ID (for the funding page). Poster/winner/admin only.
router.get('/:escrowId', auth, async (req, res) => {
  try {
    const escrow = await BountyEscrow.findById(req.params.escrowId)
      .populate('buyerId', 'username image')
      .populate('sellerId', 'username image aquaPay')
      .populate('bountyId', 'title category amount')
      .lean();

    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }
    const isBuyer = escrow.buyerId?._id?.toString() === req.user.userId;
    const isSeller = escrow.sellerId?._id?.toString() === req.user.userId;
    if (!isBuyer && !isSeller && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    res.json({ success: true, escrow });
  } catch (error) {
    console.error('Error fetching bounty escrow:', error);
    res.status(500).json({ error: 'Failed to fetch escrow' });
  }
});

// Record the poster's deposit and verify it on-chain.
router.post('/deposit', auth, async (req, res) => {
  try {
    const { escrowId, txHash, chain, token, amount, senderAddress } = req.body;
    if (!escrowId || !txHash || !chain || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const escrow = await BountyEscrow.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }
    if (escrow.buyerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the poster can deposit' });
    }
    if (escrow.status !== 'awaiting_deposit') {
      return res.status(400).json({ error: 'Escrow is not awaiting deposit' });
    }

    escrow.depositTxHash = txHash;
    escrow.chain = chain;
    escrow.token = token || 'USDC';
    escrow.depositAmount = parseFloat(amount);
    escrow.buyerWalletAddress = senderAddress;
    escrow.status = 'deposit_pending';
    await escrow.save();

    let verified = false;
    try {
      const verification = await bountyEscrowService.verifyDeposit(escrow._id);
      verified = verification.verified;
    } catch (verifyErr) {
      console.error('Bounty deposit verification error:', verifyErr.message);
    }

    if (verified) {
      const fresh = await BountyEscrow.findById(escrow._id);
      await finalizeFunded(fresh);
      return res.json({ success: true, message: 'Deposit verified and bounty funded', escrow: fresh });
    }

    scheduleBackgroundVerification(escrow._id, 0);
    return res.json({
      success: true,
      message: 'Deposit recorded, verification in progress',
      escrow,
      verificationPending: true
    });
  } catch (error) {
    console.error('Error recording bounty deposit:', error);
    res.status(500).json({ error: 'Failed to record deposit' });
  }
});

// Retry verification.
router.post('/:escrowId/verify', auth, async (req, res) => {
  try {
    const escrow = await BountyEscrow.findById(req.params.escrowId);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }
    if (escrow.status !== 'deposit_pending') {
      return res.status(400).json({ error: 'Escrow is not pending verification' });
    }
    const verification = await bountyEscrowService.verifyDeposit(escrow._id);
    if (verification.verified) {
      const updated = await BountyEscrow.findById(req.params.escrowId);
      await finalizeFunded(updated);
    }
    res.json({ success: true, verification });
  } catch (error) {
    console.error('Error verifying bounty deposit:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Open a dispute (poster or winner, once funded).
router.post('/:escrowId/dispute', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const escrow = await BountyEscrow.findById(req.params.escrowId);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }
    const isBuyer = escrow.buyerId.toString() === req.user.userId;
    const isSeller = escrow.sellerId && escrow.sellerId.toString() === req.user.userId;
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (escrow.status !== 'funded') {
      return res.status(400).json({ error: 'Cannot dispute escrow in current status' });
    }

    escrow.status = 'disputed';
    escrow.disputeReason = reason || 'No reason provided';
    escrow.disputeOpenedBy = req.user.userId;
    escrow.disputeOpenedAt = new Date();
    await escrow.save();

    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) io.emit('adminBountyEscrowUpdate', { type: 'disputed', escrowId: escrow._id });
    } catch { /* non-fatal */ }

    res.json({ success: true, message: 'Dispute opened', escrow });
  } catch (error) {
    console.error('Error opening bounty dispute:', error);
    res.status(500).json({ error: 'Failed to open dispute' });
  }
});

module.exports = router;
