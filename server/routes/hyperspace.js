const express = require('express');
const router = express.Router();
const HyperSpaceOrder = require('../models/HyperSpaceOrder');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');
const AffiliateEarning = require('../models/AffiliateEarning');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const socialplugService = require('../services/socialplugService');
const socket = require('../socket');

/**
 * HyperSpace Routes - Twitter Space Listeners Service
 * Powered by Socialplug API (white-label)
 */

// GET /api/hyperspace/packages - Get all available packages with pricing
router.get('/packages', async (req, res) => {
  try {
    const packages = socialplugService.getAllPackages();
    
    // Group by duration for easier frontend display
    const grouped = {
      '30': packages.filter(p => p.duration === 30),
      '60': packages.filter(p => p.duration === 60),
      '120': packages.filter(p => p.duration === 120)
    };
    
    res.json({
      success: true,
      packages,
      grouped,
      durations: [
        { value: 30, label: '30 Minutes', icon: '⚡' },
        { value: 60, label: '1 Hour', icon: '🔥' },
        { value: 120, label: '2 Hours', icon: '💎' }
      ],
      listeners: [100, 200, 500, 1000, 2500, 5000]
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch packages' });
  }
});

// GET /api/hyperspace/price - Get price for specific package
router.get('/price', async (req, res) => {
  try {
    const { listeners, duration } = req.query;
    
    const listenersNum = parseInt(listeners);
    const durationNum = parseInt(duration);
    
    const cost = socialplugService.getSocialplugCost(listenersNum, durationNum);
    const price = socialplugService.getCustomerPrice(listenersNum, durationNum);
    
    if (cost === null || price === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid package selection' 
      });
    }
    
    res.json({
      success: true,
      listeners: listenersNum,
      duration: durationNum,
      price,
      cost // Only for debugging, remove in production if needed
    });
  } catch (error) {
    console.error('Error fetching price:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch price' });
  }
});

// GET /api/hyperspace/balance - Check Socialplug balance (admin only)
router.get('/balance', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const result = await socialplugService.checkBalance();
    res.json(result);
  } catch (error) {
    console.error('Error checking balance:', error);
    res.status(500).json({ success: false, error: 'Failed to check balance' });
  }
});

// POST /api/hyperspace/order - Create a new order
router.post('/order', auth, requireEmailVerification, async (req, res) => {
  try {
    const {
      spaceUrl,
      listeners,
      duration,
      paymentMethod,
      txSignature,
      paymentChain,
      chainSymbol,
      paypalOrderId,
      discountCode
    } = req.body;

    // Validate required fields
    if (!spaceUrl || !listeners || !duration || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: spaceUrl, listeners, duration, paymentMethod'
      });
    }

    // Validate package
    const listenersNum = parseInt(listeners);
    const durationNum = parseInt(duration);
    
    const cost = socialplugService.getSocialplugCost(listenersNum, durationNum);
    const price = socialplugService.getCustomerPrice(listenersNum, durationNum);
    
    if (cost === null || price === null) {
      return res.status(400).json({
        success: false,
        error: 'Invalid package selection'
      });
    }

    // Validate Space URL
    if (!spaceUrl.includes('twitter.com') && !spaceUrl.includes('x.com')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Twitter Space URL. Must be from twitter.com or x.com'
      });
    }

    // Apply discount if provided
    let discountAmount = 0;
    let appliedDiscountCode = null;
    
    if (discountCode) {
      try {
        const DiscountCode = require('../models/DiscountCode');
        const validDiscountCode = await DiscountCode.findValidCode(discountCode, 'hyperspace');
        
        if (validDiscountCode) {
          discountAmount = validDiscountCode.calculateDiscount(price);
          appliedDiscountCode = validDiscountCode.code;
          await validDiscountCode.incrementUsage();
        }
      } catch (discountError) {
        // Discount code not found or invalid - continue without discount
      }
    }

    const finalPrice = price - discountAmount;

    // Generate unique order ID
    const orderId = HyperSpaceOrder.generateOrderId();

    // Create the order
    const order = new HyperSpaceOrder({
      orderId,
      userId: req.user.userId,
      username: req.user.username,
      spaceUrl,
      listenerCount: listenersNum,
      duration: durationNum,
      socialplugCost: cost,
      customerPrice: finalPrice,
      profit: finalPrice - cost,
      paymentMethod,
      txSignature: txSignature || null,
      paymentChain: paymentChain || null,
      chainSymbol: chainSymbol || null,
      paypalOrderId: paypalOrderId || null,
      discountCode: appliedDiscountCode,
      discountAmount,
      status: 'awaiting_payment'
    });

    await order.save();

    res.status(201).json({
      success: true,
      order: {
        orderId: order.orderId,
        spaceUrl: order.spaceUrl,
        listeners: order.listenerCount,
        duration: order.duration,
        price: order.customerPrice,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating HyperSpace order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      message: error.message
    });
  }
});

// POST /api/hyperspace/order/:orderId/confirm-payment - Confirm payment (manual approval mode)
router.post('/order/:orderId/confirm-payment', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { txSignature, paypalOrderId } = req.body;

    const order = await HyperSpaceOrder.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Verify ownership
    if (order.userId.toString() !== req.user.userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (order.status !== 'awaiting_payment') {
      return res.status(400).json({
        success: false,
        error: `Order is already ${order.status}`
      });
    }

    // Update payment info - set to pending_approval for manual processing
    if (txSignature) order.txSignature = txSignature;
    if (paypalOrderId) order.paypalOrderId = paypalOrderId;
    
    order.paymentStatus = 'completed';
    order.paymentReceivedAt = new Date();
    order.status = 'pending_approval'; // Manual approval required
    
    await order.save();

    // Notify admin via socket (same event/payload as crypto flow so Dashboard shows the order)
    try {
      const io = socket.getIO();
      if (io) {
        io.emit('newHyperSpaceOrderPending', {
          orderId: order.orderId,
          username: order.username,
          listenerCount: order.listenerCount,
          duration: order.duration,
          spaceUrl: order.spaceUrl,
          customerPrice: order.customerPrice,
          socialplugCost: order.socialplugCost,
          createdAt: order.createdAt,
          status: order.status,
          errorMessage: order.errorMessage,
          paymentMethod: order.paymentMethod
        });
        // Notify user instantly via socket so they don't wait for polling
        socket.emitHyperSpaceOrderStatusChange(order.orderId, 'pending_approval', {
          message: 'Payment received! Your order is being processed.',
          listenerCount: order.listenerCount,
          duration: order.duration
        });
      }
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    res.json({
      success: true,
      message: 'Payment received! Your order is being processed and will be delivered shortly.',
      order: {
        orderId: order.orderId,
        status: order.status,
        estimatedDelivery: 'Within 24 hours'
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
      message: error.message
    });
  }
});

// GET /api/hyperspace/order/:orderId - Get order details
router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await HyperSpaceOrder.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Verify ownership or admin
    if (order.userId.toString() !== req.user.userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // If order is delivering, check status from Socialplug
    if (order.status === 'delivering' && order.socialplugOrderId) {
      try {
        const statusResult = await socialplugService.checkOrderStatus(order.socialplugOrderId);
        
        if (statusResult.success) {
          order.socialplugStatus = statusResult.status;
          
          // Update our status based on Socialplug status
          if (statusResult.status === 'completed') {
            order.status = 'completed';
            order.completedAt = new Date();
          } else if (statusResult.status === 'canceled' || statusResult.status === 'refunded') {
            order.status = 'failed';
            order.errorMessage = `Socialplug order ${statusResult.status}`;
          }
          
          await order.save();
        }
      } catch (statusError) {
        console.error('Error checking Socialplug status:', statusError);
      }
    }

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        spaceUrl: order.spaceUrl,
        listeners: order.listenerCount,
        duration: order.duration,
        durationLabel: order.durationLabel,
        price: order.customerPrice,
        status: order.status,
        socialplugStatus: order.socialplugStatus,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        errorMessage: order.errorMessage,
        // Timer data
        deliveryEndsAt: order.deliveryEndsAt,
        socialplugOrderedAt: order.socialplugOrderedAt,
        autoCompleted: order.autoCompleted
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// GET /api/hyperspace/my-orders - Get user's orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const orders = await HyperSpaceOrder.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const total = await HyperSpaceOrder.countDocuments({ userId: req.user.userId });

    res.json({
      success: true,
      orders: orders.map(order => ({
        orderId: order.orderId,
        spaceUrl: order.spaceUrl,
        listeners: order.listenerCount,
        duration: order.duration,
        price: order.customerPrice,
        status: order.status,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        // Timer data
        deliveryEndsAt: order.deliveryEndsAt,
        socialplugOrderedAt: order.socialplugOrderedAt,
        autoCompleted: order.autoCompleted
      })),
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// GET /api/hyperspace/admin/orders - Get all orders (admin only)
router.get('/admin/orders', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }

    const orders = await HyperSpaceOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const total = await HyperSpaceOrder.countDocuments(query);

    // Calculate stats
    const stats = await HyperSpaceOrder.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$customerPrice' },
          totalProfit: { $sum: '$profit' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          deliveringOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivering'] }, 1, 0] }
          },
          autoCompletedOrders: {
            $sum: { $cond: [{ $eq: ['$autoCompleted', true] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      orders,
      stats: stats[0] || { totalOrders: 0, totalRevenue: 0, totalProfit: 0, completedOrders: 0 },
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// POST /api/hyperspace/admin/approve/:orderId - Approve order and mark as delivering (admin only)
router.post('/admin/approve/:orderId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { orderId } = req.params;
    const { socialplugOrderId, adminNotes } = req.body;

    const order = await HyperSpaceOrder.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Allow pending_approval or PayPal orders still in awaiting_payment (admin verified payment)
    const canApprove = order.status === 'pending_approval' ||
      (order.status === 'awaiting_payment' && order.paymentMethod === 'paypal');
    if (!canApprove) {
      return res.status(400).json({
        success: false,
        error: `Order cannot be approved. Current status: ${order.status}`
      });
    }

    // If PayPal order was still awaiting_payment, confirm payment first
    if (order.status === 'awaiting_payment' && order.paymentMethod === 'paypal') {
      order.paymentStatus = 'completed';
      order.paymentReceivedAt = new Date();
      order.status = 'pending_approval';
    }

    // Mark as delivering (manually placed on Socialplug)
    order.status = 'delivering';
    order.socialplugOrderId = socialplugOrderId || `MANUAL-${Date.now()}`;
    order.socialplugOrderedAt = new Date();
    order.approvedBy = req.user.username;
    order.approvedAt = new Date();
    if (adminNotes) order.adminNotes = adminNotes;
    
    // Calculate delivery end time based on duration
    const deliveryEndsAt = new Date();
    deliveryEndsAt.setMinutes(deliveryEndsAt.getMinutes() + order.duration);
    order.deliveryEndsAt = deliveryEndsAt;
    
    await order.save();

    // Notify via socket
    try {
      socket.emitHyperSpaceOrderStatusChange(order.orderId, 'delivering', {
        message: 'Your listeners are being delivered!',
        deliveryEndsAt: order.deliveryEndsAt,
        duration: order.duration,
        listenerCount: order.listenerCount
      });
      socket.emitHyperSpaceOrderUpdate({ 
        orderId: order.orderId, 
        status: 'delivering',
        deliveryEndsAt: order.deliveryEndsAt
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    res.json({
      success: true,
      message: 'Order approved and marked as delivering',
      order: {
        orderId: order.orderId,
        status: order.status,
        socialplugOrderId: order.socialplugOrderId,
        deliveryEndsAt: order.deliveryEndsAt,
        duration: order.duration
      }
    });
  } catch (error) {
    console.error('Error approving order:', error);
    res.status(500).json({ success: false, error: 'Failed to approve order' });
  }
});

// POST /api/hyperspace/admin/complete/:orderId - Mark order as completed (admin only)
router.post('/admin/complete/:orderId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { orderId } = req.params;
    const { adminNotes } = req.body;

    const order = await HyperSpaceOrder.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (!['delivering', 'pending_approval', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: `Order cannot be completed. Current status: ${order.status}`
      });
    }

    order.status = 'completed';
    order.completedAt = new Date();
    order.socialplugStatus = 'completed';
    if (adminNotes) order.adminNotes = adminNotes;
    if (!order.approvedBy) {
      order.approvedBy = req.user.username;
      order.approvedAt = new Date();
    }
    
    await order.save();

    // Record affiliate commission if the ordering user was referred
    try {
      const orderingUser = await User.findById(order.userId);
      if (orderingUser && orderingUser.referredBy) {
        // Check if commission already recorded for this order
        const existingCommission = await HyperSpaceAffiliateEarning.findOne({ 
          hyperspaceOrderId: order._id 
        }).lean();
        
        if (!existingCommission) {
          // Calculate commission based on PROFIT, not gross amount
          const profitAmount = order.profit || (order.customerPrice - order.socialplugCost - (order.discountAmount || 0));
          
          if (profitAmount > 0) {
            const commissionRate = await AffiliateEarning.calculateCommissionRate(orderingUser.referredBy);
            const commissionEarned = HyperSpaceAffiliateEarning.calculateCommission(profitAmount, commissionRate);
            
            const affiliateEarning = new HyperSpaceAffiliateEarning({
              affiliateId: orderingUser.referredBy,
              referredUserId: orderingUser._id,
              hyperspaceOrderId: order._id,
              orderId: order.orderId,
              orderAmount: order.customerPrice,
              profitAmount: profitAmount,
              commissionRate,
              commissionEarned
            });
            
            await affiliateEarning.save();
            console.log(`HyperSpace affiliate commission recorded: $${commissionEarned} for order ${order.orderId}`);
            
            // Emit real-time update for affiliate
            try {
              socket.emitAffiliateEarningUpdate({
                affiliateId: orderingUser.referredBy.toString(),
                earningId: affiliateEarning._id,
                commissionEarned: affiliateEarning.commissionEarned,
                sourceType: 'hyperspace',
                sourceLabel: `HyperSpace: ${order.listenerCount} listeners`,
                profitAmount: profitAmount,
                commissionRate: commissionRate,
                createdAt: affiliateEarning.createdAt
              });
            } catch (emitError) {
              console.error('Error emitting affiliate earning update:', emitError);
            }
          }
        }
      }
    } catch (commissionError) {
      console.error('Error recording HyperSpace affiliate commission:', commissionError);
      // Don't fail the completion if commission recording fails
    }

    // Notify via socket
    try {
      socket.emitHyperSpaceOrderStatusChange(order.orderId, 'completed', {
        message: 'Your listeners have been delivered!'
      });
      socket.emitHyperSpaceOrderUpdate({ orderId: order.orderId, status: 'completed' });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    res.json({
      success: true,
      message: 'Order marked as completed',
      order: {
        orderId: order.orderId,
        status: order.status,
        completedAt: order.completedAt
      }
    });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ success: false, error: 'Failed to complete order' });
  }
});

// POST /api/hyperspace/admin/reject/:orderId - Reject/refund order (admin only)
router.post('/admin/reject/:orderId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { orderId } = req.params;
    const { reason, refund } = req.body;

    const order = await HyperSpaceOrder.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order.status = refund ? 'refunded' : 'cancelled';
    order.errorMessage = reason || 'Order rejected by admin';
    order.adminNotes = `Rejected by ${req.user.username}: ${reason || 'No reason provided'}`;
    
    await order.save();

    // Notify via socket
    try {
      socket.emitHyperSpaceOrderStatusChange(order.orderId, order.status, {
        message: refund ? 'Your order has been refunded' : 'Your order was cancelled'
      });
      socket.emitHyperSpaceOrderUpdate({ orderId: order.orderId, status: order.status });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    res.json({
      success: true,
      message: `Order ${refund ? 'refunded' : 'cancelled'}`,
      order: {
        orderId: order.orderId,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ success: false, error: 'Failed to reject order' });
  }
});

// POST /api/hyperspace/admin/retry/:orderId - Retry failed order (admin only)
// Note: Currently manual mode - this just resets to pending_approval
router.post('/admin/retry/:orderId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { orderId } = req.params;
    const order = await HyperSpaceOrder.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Only failed orders can be retried'
      });
    }

    // Reset to pending_approval for manual retry
    order.status = 'pending_approval';
    order.errorMessage = null;
    order.retryCount += 1;
    await order.save();

    res.json({
      success: true,
      message: 'Order reset to pending approval for retry',
      order: {
        orderId: order.orderId,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error retrying order:', error);
    res.status(500).json({ success: false, error: 'Failed to retry order' });
  }
});

module.exports = router;

