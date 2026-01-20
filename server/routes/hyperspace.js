const express = require('express');
const router = express.Router();
const HyperSpaceOrder = require('../models/HyperSpaceOrder');
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
        console.log('Discount code not found or invalid:', discountCode);
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

// POST /api/hyperspace/order/:orderId/confirm-payment - Confirm payment and auto-fulfill
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

    // Update payment info
    if (txSignature) order.txSignature = txSignature;
    if (paypalOrderId) order.paypalOrderId = paypalOrderId;
    
    order.paymentStatus = 'completed';
    order.paymentReceivedAt = new Date();
    order.status = 'payment_received';
    
    await order.save();

    // Auto-fulfill: Place order on Socialplug immediately
    try {
      order.status = 'processing';
      await order.save();

      // Validate we have sufficient balance
      const balanceCheck = await socialplugService.validateBalance(order.listenerCount, order.duration);
      
      if (!balanceCheck.sufficient) {
        order.status = 'failed';
        order.errorMessage = `Insufficient Socialplug balance. Required: $${balanceCheck.required}, Available: $${balanceCheck.balance}`;
        await order.save();
        
        // Notify admin
        try {
          socket.getIO().emit('hyperspaceOrderFailed', {
            orderId: order.orderId,
            error: order.errorMessage
          });
        } catch (socketError) {
          console.error('Socket emit error:', socketError);
        }
        
        return res.status(500).json({
          success: false,
          error: 'Service temporarily unavailable. Please contact support.',
          orderId: order.orderId
        });
      }

      // Place order on Socialplug
      const socialplugResult = await socialplugService.placeOrder(
        order.spaceUrl,
        order.listenerCount,
        order.duration
      );

      if (socialplugResult.success) {
        order.socialplugOrderId = socialplugResult.orderId;
        order.socialplugCharge = socialplugResult.charge;
        order.socialplugStatus = socialplugResult.status || 'pending';
        order.socialplugOrderedAt = new Date();
        order.status = 'delivering';
        await order.save();

        // Notify via socket
        try {
          socket.getIO().emit('hyperspaceOrderProcessing', {
            orderId: order.orderId,
            username: order.username,
            status: 'delivering'
          });
        } catch (socketError) {
          console.error('Socket emit error:', socketError);
        }

        res.json({
          success: true,
          message: 'Payment confirmed and order is being delivered',
          order: {
            orderId: order.orderId,
            status: order.status,
            socialplugStatus: order.socialplugStatus,
            estimatedDelivery: '5-15 minutes'
          }
        });
      } else {
        order.status = 'failed';
        order.errorMessage = socialplugResult.error;
        order.retryCount += 1;
        await order.save();

        res.status(500).json({
          success: false,
          error: 'Failed to process order. Our team has been notified.',
          orderId: order.orderId
        });
      }
    } catch (fulfillError) {
      console.error('Auto-fulfillment error:', fulfillError);
      order.status = 'failed';
      order.errorMessage = fulfillError.message;
      await order.save();

      res.status(500).json({
        success: false,
        error: 'Order processing failed. Please contact support.',
        orderId: order.orderId
      });
    }
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
        errorMessage: order.errorMessage
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
      .skip((parseInt(page) - 1) * parseInt(limit));
    
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
        completedAt: order.completedAt
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
      .skip((parseInt(page) - 1) * parseInt(limit));
    
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

// POST /api/hyperspace/admin/retry/:orderId - Retry failed order (admin only)
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

    if (!order.canRetry()) {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be retried. Max retries reached or order not in failed state.'
      });
    }

    // Retry placing order on Socialplug
    order.status = 'processing';
    order.errorMessage = null;
    await order.save();

    const socialplugResult = await socialplugService.placeOrder(
      order.spaceUrl,
      order.listenerCount,
      order.duration
    );

    if (socialplugResult.success) {
      order.socialplugOrderId = socialplugResult.orderId;
      order.socialplugCharge = socialplugResult.charge;
      order.socialplugStatus = socialplugResult.status || 'pending';
      order.socialplugOrderedAt = new Date();
      order.status = 'delivering';
      order.retryCount += 1;
      await order.save();

      res.json({
        success: true,
        message: 'Order retry successful',
        order: {
          orderId: order.orderId,
          status: order.status,
          socialplugOrderId: order.socialplugOrderId
        }
      });
    } else {
      order.status = 'failed';
      order.errorMessage = socialplugResult.error;
      order.retryCount += 1;
      await order.save();

      res.status(500).json({
        success: false,
        error: socialplugResult.error
      });
    }
  } catch (error) {
    console.error('Error retrying order:', error);
    res.status(500).json({ success: false, error: 'Failed to retry order' });
  }
});

module.exports = router;

