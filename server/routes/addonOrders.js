const express = require('express');
const router = express.Router();
const AddonOrder = require('../models/AddonOrder');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const socket = require('../socket');

// Aquads-branded marketing add-on packages (server-side pricing)
const ADDON_PACKAGES = [
  { id: 'aqua_splash', name: 'AquaSplash', price: 99 },
  { id: 'aqua_ripple', name: 'AquaRipple', price: 284 },
  { id: 'aqua_wave', name: 'AquaWave', price: 1329 },
  { id: 'aqua_flow', name: 'AquaFlow', price: 2754 },
  { id: 'aqua_storm', name: 'AquaStorm', price: 6174 }
];

// POST - Create new add-on order
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const { 
      projectId, 
      projectTitle, 
      projectLogo,
      selectedAddons, 
      txSignature, 
      paymentMethod,
      paymentChain, 
      chainSymbol, 
      chainAddress,
      discountCode 
    } = req.body;

    // Validate required fields
    if (!projectId || !projectTitle || !selectedAddons || selectedAddons.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: projectId, projectTitle, and at least one addon required' });
    }

    // Calculate addon costs server-side for security
    const addonCosts = selectedAddons.reduce((total, addonId) => {
      const addon = ADDON_PACKAGES.find(pkg => pkg.id === addonId);
      return total + (addon ? addon.price : 0);
    }, 0);

    // Apply discount code if provided
    let discountAmount = 0;
    let appliedDiscountCode = null;
    
    if (discountCode) {
      const DiscountCode = require('../models/DiscountCode');
      const validDiscountCode = await DiscountCode.findValidCode(discountCode, 'addons');
      
      if (validDiscountCode) {
        discountAmount = validDiscountCode.calculateDiscount(addonCosts);
        appliedDiscountCode = validDiscountCode;
        await validDiscountCode.incrementUsage();
      }
    }

    const finalAmount = addonCosts - discountAmount;

    const addonOrder = new AddonOrder({
      id: `addon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      projectTitle,
      projectLogo: projectLogo || null,
      owner: req.user.username,
      selectedAddons,
      totalAmount: finalAmount,
      txSignature: txSignature || null,
      paymentMethod: paymentMethod || 'crypto',
      paymentChain: paymentChain || null,
      chainSymbol: chainSymbol || null,
      chainAddress: chainAddress || null,
      appliedDiscountCode: appliedDiscountCode ? appliedDiscountCode.code : null,
      discountAmount,
      status: 'pending'
    });

    const savedOrder = await addonOrder.save();

    // Notify admins of new pending add-on order
    try {
      socket.getIO().emit('newPendingAddonOrder', {
        order: savedOrder,
        createdAt: new Date()
      });
    } catch (socketError) {
      console.error('Error emitting new addon order:', socketError);
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error creating addon order:', error);
    res.status(500).json({ error: 'Failed to create addon order', message: error.message });
  }
});

// GET - Get pending add-on orders (admin only)
router.get('/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingOrders = await AddonOrder.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(pendingOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending addon orders' });
  }
});

// GET - Get user's add-on orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await AddonOrder.find({ owner: req.user.username }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your addon orders' });
  }
});

// POST - Approve add-on order (admin only)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const order = await AddonOrder.findOne({ id: req.params.id });
    if (!order) {
      return res.status(404).json({ error: 'Addon order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order is already ${order.status}` });
    }

    order.status = 'approved';
    order.approvedAt = new Date();
    await order.save();

    // Notify via socket
    try {
      socket.getIO().emit('addonOrderApproved', {
        orderId: order.id,
        projectTitle: order.projectTitle,
        owner: order.owner,
        approvedAt: order.approvedAt
      });
    } catch (socketError) {
      console.error('Error emitting addon order approval:', socketError);
    }

    res.json({ message: 'Addon order approved successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve addon order' });
  }
});

// POST - Reject add-on order (admin only)
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { rejectionReason } = req.body;
    const order = await AddonOrder.findOne({ id: req.params.id });
    
    if (!order) {
      return res.status(404).json({ error: 'Addon order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order is already ${order.status}` });
    }

    order.status = 'rejected';
    order.rejectionReason = rejectionReason || 'Rejected by admin';
    await order.save();

    // Notify via socket
    try {
      socket.getIO().emit('addonOrderRejected', {
        orderId: order.id,
        projectTitle: order.projectTitle,
        owner: order.owner,
        rejectionReason: order.rejectionReason
      });
    } catch (socketError) {
      console.error('Error emitting addon order rejection:', socketError);
    }

    res.json({ message: 'Addon order rejected', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject addon order' });
  }
});

// POST - Mark order as completed (admin only)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const order = await AddonOrder.findOne({ id: req.params.id });
    if (!order) {
      return res.status(404).json({ error: 'Addon order not found' });
    }

    if (order.status !== 'approved') {
      return res.status(400).json({ error: 'Order must be approved before completing' });
    }

    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    res.json({ message: 'Addon order marked as completed', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete addon order' });
  }
});

module.exports = router;

