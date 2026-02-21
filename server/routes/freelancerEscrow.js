const express = require('express');
const router = express.Router();
const FreelancerEscrow = require('../models/FreelancerEscrow');
const Booking = require('../models/Booking');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const auth = require('../middleware/auth');
const escrowService = require('../services/escrowService');

const FEE_PERCENTAGE = 0.0125;

// Get escrow details for a booking
router.get('/booking/:bookingId', auth, async (req, res) => {
  try {
    const escrow = await FreelancerEscrow.findOne({ bookingId: req.params.bookingId })
      .populate('buyerId', 'username')
      .populate('sellerId', 'username');

    if (!escrow) {
      return res.status(404).json({ error: 'No escrow found for this booking' });
    }

    if (escrow.buyerId._id.toString() !== req.user.userId &&
        escrow.sellerId._id.toString() !== req.user.userId &&
        !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ success: true, escrow });
  } catch (error) {
    console.error('Error fetching escrow:', error);
    res.status(500).json({ error: 'Failed to fetch escrow details' });
  }
});

// ADMIN: Get all escrows (for admin dispute panel) — must be before /:escrowId
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const escrows = await FreelancerEscrow.find(filter)
      .populate('buyerId', 'username email')
      .populate('sellerId', 'username email')
      .populate('bookingId', 'status serviceId')
      .populate('invoiceId', 'invoiceNumber amount')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, escrows });
  } catch (error) {
    console.error('Error fetching admin escrows:', error);
    res.status(500).json({ error: 'Failed to fetch escrows' });
  }
});

// ADMIN: Resolve dispute - release to seller
router.post('/admin/:escrowId/release', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { notes } = req.body;
    const result = await escrowService.adminResolveForSeller(req.params.escrowId, req.user.userId, notes);

    const escrow = await FreelancerEscrow.findById(req.params.escrowId);
    if (escrow) {
      try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) {
          io.to(`user_${escrow.sellerId}`).emit('escrowUpdated', { type: 'released', escrow: escrow.toObject(), bookingId: escrow.bookingId });
          io.to(`user_${escrow.buyerId}`).emit('escrowUpdated', { type: 'released', escrow: escrow.toObject(), bookingId: escrow.bookingId });
        }
      } catch (socketErr) { console.error('Socket emit error:', socketErr); }
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error releasing escrow:', error);
    res.status(500).json({ error: error.message || 'Failed to release escrow' });
  }
});

// ADMIN: Resolve dispute - refund to buyer
router.post('/admin/:escrowId/refund', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { notes } = req.body;
    const result = await escrowService.adminRefund(req.params.escrowId, req.user.userId, notes);

    const escrow = await FreelancerEscrow.findById(req.params.escrowId);
    if (escrow) {
      try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) {
          io.to(`user_${escrow.sellerId}`).emit('escrowUpdated', { type: 'refunded', escrow: escrow.toObject(), bookingId: escrow.bookingId });
          io.to(`user_${escrow.buyerId}`).emit('escrowUpdated', { type: 'refunded', escrow: escrow.toObject(), bookingId: escrow.bookingId });
        }
      } catch (socketErr) { console.error('Socket emit error:', socketErr); }
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error refunding escrow:', error);
    res.status(500).json({ error: error.message || 'Failed to refund escrow' });
  }
});

// Get escrow by ID (for the custodial payment page)
router.get('/:escrowId', auth, async (req, res) => {
  try {
    const escrow = await FreelancerEscrow.findById(req.params.escrowId)
      .populate('buyerId', 'username image')
      .populate('sellerId', 'username image aquaPay')
      .populate('bookingId', 'serviceId status')
      .populate('invoiceId', 'invoiceNumber amount currency');

    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    if (escrow.buyerId._id.toString() !== req.user.userId &&
        escrow.sellerId._id.toString() !== req.user.userId &&
        !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ success: true, escrow });
  } catch (error) {
    console.error('Error fetching escrow:', error);
    res.status(500).json({ error: 'Failed to fetch escrow' });
  }
});

// Record deposit (called after buyer completes on-chain transaction)
router.post('/deposit', auth, async (req, res) => {
  try {
    const { escrowId, txHash, chain, token, amount, senderAddress } = req.body;

    if (!escrowId || !txHash || !chain || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const escrow = await FreelancerEscrow.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    if (escrow.buyerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the buyer can deposit' });
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

    // Verify the deposit on-chain
    try {
      const verification = await escrowService.verifyDeposit(escrow._id);
      if (verification.verified) {
        // Update booking to reflect escrow is funded
        const booking = await Booking.findById(escrow.bookingId);
        if (booking) {
          booking.escrowId = escrow._id;

          // If buyer is depositing, count as buyer accepting
          if (booking.status === 'pending' || booking.status === 'accepted_by_seller') {
            if (booking.status === 'accepted_by_seller') {
              booking.status = 'confirmed';
            } else {
              booking.status = 'accepted_by_buyer';
            }
          }
          await booking.save();
        }

        // Emit socket event
        try {
          const { getIO } = require('../socket');
          const io = getIO();
          if (io) {
            io.to(`user_${escrow.sellerId}`).emit('escrowUpdated', {
              type: 'funded',
              escrow: escrow.toObject(),
              bookingId: escrow.bookingId
            });
            io.to(`user_${escrow.buyerId}`).emit('escrowUpdated', {
              type: 'funded',
              escrow: escrow.toObject(),
              bookingId: escrow.bookingId
            });
          }
        } catch (socketErr) {
          console.error('Socket emit error:', socketErr);
        }

        return res.json({
          success: true,
          message: 'Deposit verified and escrow funded',
          escrow
        });
      } else {
        return res.json({
          success: true,
          message: 'Deposit recorded, verification pending',
          escrow,
          verificationPending: true
        });
      }
    } catch (verifyErr) {
      console.error('Deposit verification error:', verifyErr);
      return res.json({
        success: true,
        message: 'Deposit recorded, verification will retry',
        escrow,
        verificationPending: true
      });
    }
  } catch (error) {
    console.error('Error recording deposit:', error);
    res.status(500).json({ error: 'Failed to record deposit' });
  }
});

// Retry deposit verification
router.post('/:escrowId/verify', auth, async (req, res) => {
  try {
    const escrow = await FreelancerEscrow.findById(req.params.escrowId);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    if (escrow.status !== 'deposit_pending') {
      return res.status(400).json({ error: 'Escrow is not pending verification' });
    }

    const verification = await escrowService.verifyDeposit(escrow._id);
    res.json({ success: true, verification });
  } catch (error) {
    console.error('Error verifying deposit:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Open dispute
router.post('/:escrowId/dispute', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const escrow = await FreelancerEscrow.findById(req.params.escrowId);

    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    if (escrow.buyerId.toString() !== req.user.userId &&
        escrow.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!['funded'].includes(escrow.status)) {
      return res.status(400).json({ error: 'Cannot dispute escrow in current status' });
    }

    escrow.status = 'disputed';
    escrow.disputeReason = reason || 'No reason provided';
    escrow.disputeOpenedBy = req.user.userId;
    escrow.disputeOpenedAt = new Date();
    await escrow.save();

    // Emit socket events
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to(`user_${escrow.sellerId}`).emit('escrowUpdated', {
          type: 'disputed',
          escrow: escrow.toObject(),
          bookingId: escrow.bookingId
        });
        io.to(`user_${escrow.buyerId}`).emit('escrowUpdated', {
          type: 'disputed',
          escrow: escrow.toObject(),
          bookingId: escrow.bookingId
        });
      }
    } catch (socketErr) {
      console.error('Socket emit error:', socketErr);
    }

    res.json({ success: true, message: 'Dispute opened', escrow });
  } catch (error) {
    console.error('Error opening dispute:', error);
    res.status(500).json({ error: 'Failed to open dispute' });
  }
});

module.exports = router;
