const express = require('express');
const router = express.Router();
const PartnerStore = require('../models/PartnerStore');
const PartnerRedemption = require('../models/PartnerRedemption');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Test route to verify partners router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Partners router is working' });
});

// Get all active partner stores (public)
router.get('/', async (req, res) => {
  try {
    const partners = await PartnerStore.find({ isActive: true })
      .sort({ name: 1 })
      .select('name description logo website category discountOffers totalRedemptions');
    
    res.json(partners);
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Failed to fetch partner stores' });
  }
});

// Get partner categories
router.get('/categories', async (req, res) => {
  try {
    // Return the predefined categories since we have a fixed enum
    const categories = [
      'DeFi & Crypto',
      'NFT & Gaming', 
      'Web3 Services',
      'Crypto Hardware',
      'Food & Beverage',
      'Clothing & Fashion',
      'Books & Education',
      'Technology & Software',
      'Health & Fitness',
      'Travel & Tourism',
      'Entertainment & Media',
      'Home & Garden',
      'Business Services',
      'Financial Services',
      'Marketing & Design',
      'Development & IT',
      'Electronics & Gadgets',
      'Sports & Outdoors',
      'Beauty & Personal Care',
      'Automotive',
      'Subscriptions & SaaS',
      'Gift Cards & Vouchers',
      'Other'
    ];
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Redeem points for discount code (authenticated)
router.post('/:partnerId/redeem', auth, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { offerId } = req.body;
    const userId = req.user.userId;
    
    // Get user and partner
    const [user, partner] = await Promise.all([
      User.findById(userId),
      PartnerStore.findById(partnerId)
    ]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!partner || !partner.isActive) {
      return res.status(404).json({ error: 'Partner store not found or inactive' });
    }
    
    // Find the specific offer
    const offer = partner.discountOffers.id(offerId);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    // Check if user can redeem this offer
    const canRedeem = partner.canUserRedeem(offerId, user.points);
    if (!canRedeem.canRedeem) {
      return res.status(400).json({ error: canRedeem.reason });
    }
    
    // Generate unique discount code (if single-use) or use existing code
    let discountCode = offer.discountCode;
    if (offer.usageType === 'single-use') {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 4);
      discountCode = `${offer.discountCode}-${timestamp}${random}`.toUpperCase();
    }
    
    // Create redemption record
    const redemption = new PartnerRedemption({
      userId,
      partnerId,
      offerId,
      pointsUsed: offer.pointTier,
      discountCode,
      offerTitle: offer.title,
      offerDescription: offer.description,
      expiresAt: offer.expiryDate,
      userPointsBalance: user.points
    });
    
    // Update user points and history
    user.points -= offer.pointTier;
    user.pointsHistory.push({
      amount: -offer.pointTier,
      reason: `Redeemed for ${partner.name}: ${offer.title}`,
      createdAt: new Date()
    });
    
    // Update partner stats
    offer.currentRedemptions += 1;
    partner.totalRedemptions += 1;
    
    // Save all changes
    await Promise.all([
      redemption.save(),
      user.save(),
      partner.save()
    ]);
    
    res.json({
      success: true,
      redemption: {
        id: redemption._id,
        discountCode,
        offerTitle: offer.title,
        offerDescription: offer.description,
        pointsUsed: offer.pointTier,
        expiresAt: offer.expiryDate,
        partnerName: partner.name,
        partnerWebsite: partner.website
      },
      newPointsBalance: user.points
    });
    
  } catch (error) {
    console.error('Error redeeming offer:', error);
    res.status(500).json({ error: 'Failed to redeem offer' });
  }
});

// Get user's redemption history (authenticated)
router.get('/my-redemptions', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status = 'all', limit = 50 } = req.query;
    
    let query = { userId };
    if (status !== 'all') {
      query.status = status;
    }
    
    const redemptions = await PartnerRedemption.find(query)
      .populate('partnerId', 'name logo website')
      .sort({ redeemedAt: -1 })
      .limit(parseInt(limit));
    
    res.json(redemptions);
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    res.status(500).json({ error: 'Failed to fetch redemption history' });
  }
});

// Validate discount code (for partners - no auth required)
router.get('/validate-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const redemption = await PartnerRedemption.findValidRedemption(code);
    
    if (!redemption) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Code not found or expired' 
      });
    }
    
    res.json({
      valid: true,
      redemption: {
        id: redemption._id,
        discountCode: redemption.discountCode,
        offerTitle: redemption.offerTitle,
        offerDescription: redemption.offerDescription,
        partnerName: redemption.partnerId.name,
        userName: redemption.userId.username,
        redeemedAt: redemption.redeemedAt,
        expiresAt: redemption.expiresAt,
        status: redemption.status
      }
    });
  } catch (error) {
    console.error('Error validating code:', error);
    res.status(500).json({ error: 'Failed to validate code' });
  }
});

// Mark code as used (for partners - no auth required for now)
router.post('/mark-used/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { markedBy } = req.body;
    
    const redemption = await PartnerRedemption.findValidRedemption(code);
    
    if (!redemption) {
      return res.status(404).json({ 
        success: false, 
        error: 'Code not found or already used/expired' 
      });
    }
    
    await redemption.markAsUsed(markedBy);
    
    res.json({
      success: true,
      message: 'Code marked as used successfully'
    });
  } catch (error) {
    console.error('Error marking code as used:', error);
    res.status(500).json({ error: 'Failed to mark code as used' });
  }
});

// ADMIN ROUTES

// Get all partners (admin only)
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status = 'all' } = req.query;
    let query = {};
    
    if (status !== 'all') {
      query.isActive = status === 'active';
    }
    
    const partners = await PartnerStore.find(query)
      .populate('approvedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json(partners);
  } catch (error) {
    console.error('Error fetching all partners:', error);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

// Create new partner (admin only)
router.post('/admin/create', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const partnerData = req.body;
    partnerData.approvedBy = req.user.userId;
    partnerData.approvedAt = new Date();
    partnerData.isActive = true;
    
    const partner = new PartnerStore(partnerData);
    await partner.save();
    
    res.json({ success: true, partner });
  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({ error: 'Failed to create partner' });
  }
});

// Update partner (admin only)
router.put('/admin/:partnerId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { partnerId } = req.params;
    const updates = req.body;
    
    const partner = await PartnerStore.findByIdAndUpdate(
      partnerId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    res.json({ success: true, partner });
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({ error: 'Failed to update partner' });
  }
});

// Delete partner (admin only)
router.delete('/admin/:partnerId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { partnerId } = req.params;
    
    const partner = await PartnerStore.findByIdAndDelete(partnerId);
    
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    res.json({ success: true, message: 'Partner deleted successfully' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({ error: 'Failed to delete partner' });
  }
});

// Get partner analytics (admin only)
router.get('/admin/:partnerId/analytics', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { partnerId } = req.params;
    
    const analytics = await PartnerRedemption.getPartnerAnalytics(partnerId);
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching partner analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
