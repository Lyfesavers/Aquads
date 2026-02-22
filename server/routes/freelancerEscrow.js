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

    const { status, disputesOnly } = req.query;
    const filter = {};
    if (disputesOnly === 'true') {
      filter.status = { $in: ['disputed', 'resolved_seller', 'resolved_buyer'] };
    } else if (status) {
      filter.status = status;
    }

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
      // Close the booking as completed (dispute resolved in seller's favor)
      const booking = await Booking.findById(escrow.bookingId);
      if (booking && !['completed', 'cancelled'].includes(booking.status)) {
        booking.status = 'completed';
        booking.completedAt = new Date();
        await booking.save();
      }

      try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) {
          io.to(`user_${escrow.sellerId}`).emit('escrowUpdated', { type: 'resolved_seller', escrow: escrow.toObject(), bookingId: escrow.bookingId });
          io.to(`user_${escrow.buyerId}`).emit('escrowUpdated', { type: 'resolved_seller', escrow: escrow.toObject(), bookingId: escrow.bookingId });
          io.emit('adminEscrowUpdate', { type: 'resolved_seller', escrowId: escrow._id });

          const populatedBooking = await Booking.findById(escrow.bookingId)
            .populate('serviceId')
            .populate('sellerId', 'username email cv aquaPay')
            .populate('buyerId', 'username email cv')
            .populate('escrowId');
          if (populatedBooking) {
            const bObj = populatedBooking.toObject();
            if (bObj.escrowId && typeof bObj.escrowId === 'object') {
              bObj.escrowStatus = bObj.escrowId.status;
              bObj.escrowId = bObj.escrowId._id;
            }
            io.to(`user_${escrow.sellerId}`).emit('bookingUpdated', { type: 'dispute_resolved', booking: bObj });
            io.to(`user_${escrow.buyerId}`).emit('bookingUpdated', { type: 'dispute_resolved', booking: bObj });
          }
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
      // Close the booking as cancelled (dispute resolved in buyer's favor)
      const booking = await Booking.findById(escrow.bookingId);
      if (booking && !['completed', 'cancelled'].includes(booking.status)) {
        booking.status = 'cancelled';
        await booking.save();
      }

      // Also mark the invoice as cancelled
      if (escrow.invoiceId) {
        await Invoice.findByIdAndUpdate(escrow.invoiceId, { status: 'cancelled' });
      }

      try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) {
          io.to(`user_${escrow.sellerId}`).emit('escrowUpdated', { type: 'resolved_buyer', escrow: escrow.toObject(), bookingId: escrow.bookingId });
          io.to(`user_${escrow.buyerId}`).emit('escrowUpdated', { type: 'resolved_buyer', escrow: escrow.toObject(), bookingId: escrow.bookingId });
          io.emit('adminEscrowUpdate', { type: 'resolved_buyer', escrowId: escrow._id });

          const populatedBooking = await Booking.findById(escrow.bookingId)
            .populate('serviceId')
            .populate('sellerId', 'username email cv aquaPay')
            .populate('buyerId', 'username email cv')
            .populate('escrowId');
          if (populatedBooking) {
            const bObj = populatedBooking.toObject();
            if (bObj.escrowId && typeof bObj.escrowId === 'object') {
              bObj.escrowStatus = bObj.escrowId.status;
              bObj.escrowId = bObj.escrowId._id;
            }
            io.to(`user_${escrow.sellerId}`).emit('bookingUpdated', { type: 'dispute_resolved', booking: bObj });
            io.to(`user_${escrow.buyerId}`).emit('bookingUpdated', { type: 'dispute_resolved', booking: bObj });
          }
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

// Helper: update booking + invoice + emit sockets after escrow is funded
async function finalizeEscrowFunded(escrow) {
  const booking = await Booking.findById(escrow.bookingId);
  if (booking) {
    booking.escrowId = escrow._id;
    if (booking.status === 'pending' || booking.status === 'accepted_by_seller') {
      booking.status = booking.status === 'accepted_by_seller' ? 'confirmed' : 'accepted_by_buyer';
    }
    await booking.save();
  }

  try {
    const { getIO } = require('../socket');
    const io = getIO();
    if (io) {
      const freshEscrow = await FreelancerEscrow.findById(escrow._id);
      const escrowObj = freshEscrow ? freshEscrow.toObject() : escrow.toObject();

      io.to(`user_${escrow.sellerId}`).emit('escrowUpdated', {
        type: 'funded',
        escrow: escrowObj,
        bookingId: escrow.bookingId
      });
      io.to(`user_${escrow.buyerId}`).emit('escrowUpdated', {
        type: 'funded',
        escrow: escrowObj,
        bookingId: escrow.bookingId
      });

      const populatedBooking = await Booking.findById(escrow.bookingId)
        .populate('serviceId')
        .populate('sellerId', 'username email cv aquaPay')
        .populate('buyerId', 'username email cv')
        .populate('escrowId');
      if (populatedBooking) {
        const bObj = populatedBooking.toObject();
        if (bObj.escrowId && typeof bObj.escrowId === 'object') {
          bObj.escrowStatus = bObj.escrowId.status;
          bObj.escrowId = bObj.escrowId._id;
        }
        io.to(`user_${escrow.sellerId}`).emit('bookingUpdated', { type: 'escrow_funded', booking: bObj });
        io.to(`user_${escrow.buyerId}`).emit('bookingUpdated', { type: 'escrow_funded', booking: bObj });
      }
    }
  } catch (socketErr) {
    console.error('Socket emit error:', socketErr);
  }
}

// Background verification retry for deposit_pending escrows
function scheduleBackgroundVerification(escrowId, attempt = 0) {
  const maxAttempts = 10;
  const delay = Math.min(10000 * Math.pow(1.5, attempt), 60000);

  setTimeout(async () => {
    try {
      const escrow = await FreelancerEscrow.findById(escrowId);
      if (!escrow || escrow.status !== 'deposit_pending') return;

      console.log(`Background verification attempt ${attempt + 1}/${maxAttempts} for escrow ${escrowId}`);
      const verification = await escrowService.verifyDeposit(escrowId);

      if (verification.verified) {
        console.log(`Background verification succeeded for escrow ${escrowId}`);
        const updatedEscrow = await FreelancerEscrow.findById(escrowId);
        await finalizeEscrowFunded(updatedEscrow);
      } else if (attempt < maxAttempts - 1) {
        scheduleBackgroundVerification(escrowId, attempt + 1);
      } else {
        console.error(`Background verification exhausted for escrow ${escrowId}`);
      }
    } catch (err) {
      console.error(`Background verification error for escrow ${escrowId}:`, err.message);
      if (attempt < maxAttempts - 1) {
        scheduleBackgroundVerification(escrowId, attempt + 1);
      }
    }
  }, delay);
}

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

    console.log(`Deposit recorded for escrow ${escrowId}, txHash: ${txHash}, starting verification...`);

    // Verify the deposit on-chain (with retries built into verifyDeposit)
    let verified = false;
    try {
      const verification = await escrowService.verifyDeposit(escrow._id);
      verified = verification.verified;
      if (verified) {
        console.log(`Deposit verified inline for escrow ${escrowId}`);
      } else {
        console.log(`Inline verification not confirmed for escrow ${escrowId}: ${verification.reason}`);
      }
    } catch (verifyErr) {
      console.error('Deposit verification error:', verifyErr.message);
    }

    if (verified) {
      const freshEscrow = await FreelancerEscrow.findById(escrow._id);
      await finalizeEscrowFunded(freshEscrow);
      return res.json({
        success: true,
        message: 'Deposit verified and escrow funded',
        escrow: freshEscrow
      });
    }

    // Verification didn't confirm yet — schedule background retries
    scheduleBackgroundVerification(escrow._id, 0);

    // Still update booking to reflect deposit was made (buyer committed funds)
    const booking = await Booking.findById(escrow.bookingId);
    if (booking) {
      booking.escrowId = escrow._id;
      await booking.save();
    }

    // Emit events so the frontend knows deposit was made (even if not fully verified yet)
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        const escrowObj = escrow.toObject();
        io.to(`user_${escrow.sellerId}`).emit('escrowUpdated', {
          type: 'deposit_pending',
          escrow: escrowObj,
          bookingId: escrow.bookingId
        });
        io.to(`user_${escrow.buyerId}`).emit('escrowUpdated', {
          type: 'deposit_pending',
          escrow: escrowObj,
          bookingId: escrow.bookingId
        });
      }
    } catch (socketErr) {
      console.error('Socket emit error:', socketErr);
    }

    return res.json({
      success: true,
      message: 'Deposit recorded, verification in progress',
      escrow,
      verificationPending: true
    });
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

    if (verification.verified) {
      const updatedEscrow = await FreelancerEscrow.findById(req.params.escrowId);
      await finalizeEscrowFunded(updatedEscrow);
    }

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
        io.emit('adminEscrowUpdate', { type: 'disputed', escrowId: escrow._id });
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
