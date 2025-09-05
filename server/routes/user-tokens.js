const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const User = require('../models/User');
const Booking = require('../models/Booking');
const TokenPurchase = require('../models/TokenPurchase');
const Notification = require('../models/Notification');

// Get user's token balance and history
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('tokens tokenHistory');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get pending purchases
    const pendingPurchases = await TokenPurchase.find({ 
      userId: req.user.userId, 
      status: 'pending' 
    }).sort({ createdAt: -1 });

    // Add pending purchases to history with special formatting
    const combinedHistory = [...user.tokenHistory];
    
    pendingPurchases.forEach(purchase => {
      combinedHistory.push({
        type: 'pending',
        amount: purchase.amount,
        reason: `Token purchase pending approval (${purchase.amount} tokens - $${purchase.cost})`,
        relatedId: purchase._id.toString(),
        balanceBefore: user.tokens,
        balanceAfter: user.tokens, // No change yet
        createdAt: purchase.createdAt
      });
    });

    res.json({
      tokens: user.tokens,
      history: combinedHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      pendingPurchases: pendingPurchases.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch token balance' });
  }
});

// Create token purchase order
router.post('/purchase', auth, requireEmailVerification, async (req, res) => {
  try {
    const { amount, paymentMethod = 'crypto', txSignature, paymentChain, chainSymbol, chainAddress } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid token amount' });
    }

    if (!txSignature) {
      return res.status(400).json({ error: 'Transaction signature is required' });
    }

    const cost = amount; // 1 token = 1 USDC
    const tokenPurchase = new TokenPurchase({
      userId: req.user.userId,
      amount,
      cost,
      paymentMethod,
      txSignature,
      paymentChain,
      chainSymbol,
      chainAddress,
      status: 'pending' // Requires admin approval
    });

    // Update user's last activity for accurate fraud detection
    await User.findByIdAndUpdate(req.user.userId, {
      lastActivity: new Date()
    });

    await tokenPurchase.save();

    // Create notification for admins
    try {
      const admins = await User.find({ isAdmin: true });
      
      // Get the user who made the purchase to get their username
      const purchaseUser = await User.findById(req.user.userId).select('username');
      const username = purchaseUser ? purchaseUser.username : 'Unknown User';
      
      for (const admin of admins) {
        const notification = new Notification({
          userId: admin._id,
          type: 'admin',
          message: `New token purchase pending approval: ${amount} tokens ($${cost}) from ${username}`,
          link: '/admin/token-purchases',
          relatedId: tokenPurchase._id,
          relatedModel: 'TokenPurchase'
        });
        await notification.save();
      }
    } catch (notificationError) {
      // Don't fail the purchase if notifications fail
    }

    res.status(201).json({
      message: 'Token purchase created successfully! It will be processed once payment is approved.',
      purchase: tokenPurchase
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create token purchase' });
  }
});

// Admin approve token purchase
router.post('/purchase/:purchaseId/approve', auth, async (req, res) => {
  try {

    
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve token purchases' });
    }

    const { purchaseId } = req.params;

    const tokenPurchase = await TokenPurchase.findById(purchaseId).populate('userId', 'username');

    
    if (!tokenPurchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    if (tokenPurchase.status !== 'pending') {
      return res.status(400).json({ error: 'Purchase already processed' });
    }

    // Update purchase status

    tokenPurchase.status = 'approved';
    tokenPurchase.approvedBy = req.user.userId;
    tokenPurchase.approvedAt = new Date();
    tokenPurchase.completedAt = new Date();
    await tokenPurchase.save();


    // Add tokens to user account

    const user = await User.findById(tokenPurchase.userId);
    if (!user) {

      return res.status(404).json({ error: 'User not found' });
    }

    
    const balanceBefore = user.tokens || 0;
    user.tokens = (user.tokens || 0) + tokenPurchase.amount;
    user.lastActivity = new Date(); // Update activity when tokens are approved

    
    // Add to token history
    user.tokenHistory.push({
      type: 'purchase',
      amount: tokenPurchase.amount,
      reason: `Token purchase approved (${tokenPurchase.amount} tokens)`,
      relatedId: tokenPurchase._id.toString(),
      balanceBefore,
      balanceAfter: user.tokens
    });


    await user.save();


    // Create notification for user (with error handling)
    try {

      const notification = new Notification({
        userId: tokenPurchase.userId,
        type: 'tokens',
        message: `Your token purchase has been approved! ${tokenPurchase.amount} tokens added to your account`,
        link: '/dashboard?tab=tokens',
        relatedId: tokenPurchase._id,
        relatedModel: 'TokenPurchase'
      });
      await notification.save();

    } catch (notificationError) {
      // Don't fail the entire request if notification fails
    }


    res.json({
      message: 'Token purchase approved successfully',
      purchase: tokenPurchase
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve token purchase' });
  }
});

// Admin reject token purchase
router.post('/purchase/:purchaseId/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject token purchases' });
    }

    const { purchaseId } = req.params;
    const { rejectionReason } = req.body;
    const tokenPurchase = await TokenPurchase.findById(purchaseId).populate('userId', 'username');
    
    if (!tokenPurchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    if (tokenPurchase.status !== 'pending') {
      return res.status(400).json({ error: 'Purchase already processed' });
    }

    // Update purchase status
    tokenPurchase.status = 'rejected';
    tokenPurchase.rejectionReason = rejectionReason || 'Payment verification failed';
    await tokenPurchase.save();

    // Create notification for user (with error handling)
    try {
      const notification = new Notification({
        userId: tokenPurchase.userId,
        type: 'tokens',
        message: `Your token purchase was rejected: ${tokenPurchase.rejectionReason}`,
        link: '/dashboard?tab=tokens',
        relatedId: tokenPurchase._id,
        relatedModel: 'TokenPurchase'
      });
      await notification.save();
    } catch (notificationError) {
      // Don't fail the entire request if notification fails
    }

    res.json({
      message: 'Token purchase rejected',
      purchase: tokenPurchase
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject token purchase' });
  }
});

// Get all pending token purchases (admin only)
router.get('/admin/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingPurchases = await TokenPurchase.find({ status: 'pending' })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    res.json(pendingPurchases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending purchases' });
  }
});

// Unlock booking with tokens
router.post('/unlock-booking/:bookingId', auth, requireEmailVerification, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const tokensRequired = 2; // 2 tokens to unlock 1 lead

    const booking = await Booking.findById(bookingId)
      .populate('serviceId')
      .populate('sellerId', 'username');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user is the seller
    if (booking.sellerId._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the seller can unlock this booking' });
    }

    // Check if already unlocked
    if (booking.isUnlocked) {
      return res.status(400).json({ error: 'Booking already unlocked' });
    }

    // Get user and check token balance
    const user = await User.findById(req.user.userId);
    
    if (user.tokens < tokensRequired) {
      return res.status(400).json({ 
        error: 'Insufficient tokens',
        required: tokensRequired,
        available: user.tokens
      });
    }

    // Deduct tokens
    const balanceBefore = user.tokens;
    user.tokens -= tokensRequired;
    
    // Add to token history
    user.tokenHistory.push({
      type: 'spend',
      amount: tokensRequired,
      reason: `Unlocked booking lead for "${booking.serviceId.title}"`,
      relatedId: bookingId,
      balanceBefore,
      balanceAfter: user.tokens
    });

    await user.save();

    // Update booking
    booking.isUnlocked = true;
    booking.unlockedAt = new Date();
    booking.tokensSpent = tokensRequired;
    await booking.save();

    // Emit socket event for real-time updates
    const { getIO } = require('../socket');
    const io = getIO();
    if (io) {
      // Emit to the seller's room
      io.to(`user_${booking.sellerId}`).emit('bookingUpdated', {
        type: 'unlocked',
        booking: {
          ...booking.toObject(),
          isUnlocked: true
        }
      });
      
      // Emit to the buyer's room
      io.to(`user_${booking.buyerId}`).emit('bookingUpdated', {
        type: 'unlocked',
        booking: {
          ...booking.toObject(),
          isUnlocked: true
        }
      });
    }

    res.json({
      success: true,
      newBalance: user.tokens,
      tokensSpent: tokensRequired,
      booking: {
        ...booking.toObject(),
        isUnlocked: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlock booking' });
  }
});

// Get token packages/pricing
router.get('/packages', (req, res) => {
  const packages = [
    { tokens: 10, price: 10, popular: false },
    { tokens: 25, price: 25, popular: false, discount: 0 },
    { tokens: 50, price: 47.5, popular: true, discount: 5 }, // 5% discount
    { tokens: 100, price: 90, popular: false, discount: 10 }, // 10% discount
  ];

  res.json(packages);
});

module.exports = router; 