const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DiscountCode = require('../models/DiscountCode');

// Get all discount codes (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const discountCodes = await DiscountCode.find().sort({ createdAt: -1 });
    res.json(discountCodes);
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    res.status(500).json({ error: 'Failed to fetch discount codes' });
  }
});

// Create a new discount code (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      applicableTo,
      usageLimit,
      validFrom,
      validUntil
    } = req.body;

    // Validate required fields
    if (!code || !description || !discountType || !discountValue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ error: 'Invalid discount type' });
    }

    // Validate discount value
    if (discountValue <= 0) {
      return res.status(400).json({ error: 'Discount value must be greater than 0' });
    }

    // Validate percentage discount
    if (discountType === 'percentage' && discountValue > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%' });
    }

    // Check if code already exists
    const existingCode = await DiscountCode.findOne({ code: code.toUpperCase() }).lean();
    if (existingCode) {
      return res.status(400).json({ error: 'Discount code already exists' });
    }

    const discountCode = new DiscountCode({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      maxDiscount,
      applicableTo: applicableTo || ['listing', 'bump', 'addons'],
      usageLimit,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      createdBy: req.user.username
    });

    const savedCode = await discountCode.save();
    res.status(201).json(savedCode);
  } catch (error) {
    console.error('Error creating discount code:', error);
    res.status(500).json({ error: error.message || 'Failed to create discount code' });
  }
});

// Update a discount code (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updates = req.body;

    // Validate discount type if provided
    if (updates.discountType && !['percentage', 'fixed'].includes(updates.discountType)) {
      return res.status(400).json({ error: 'Invalid discount type' });
    }

    // Validate discount value if provided
    if (updates.discountValue && updates.discountValue <= 0) {
      return res.status(400).json({ error: 'Discount value must be greater than 0' });
    }

    // Validate percentage discount if provided
    if (updates.discountType === 'percentage' && updates.discountValue > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%' });
    }

    // Convert code to uppercase if provided
    if (updates.code) {
      updates.code = updates.code.toUpperCase();
      
      // Check if new code already exists (excluding current code)
      const existingCode = await DiscountCode.findOne({ 
        code: updates.code,
        _id: { $ne: id }
      }).lean();
      if (existingCode) {
        return res.status(400).json({ error: 'Discount code already exists' });
      }
    }

    const discountCode = await DiscountCode.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!discountCode) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    res.json(discountCode);
  } catch (error) {
    console.error('Error updating discount code:', error);
    res.status(500).json({ error: error.message || 'Failed to update discount code' });
  }
});

// Delete a discount code (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const discountCode = await DiscountCode.findByIdAndDelete(id);

    if (!discountCode) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    res.json({ message: 'Discount code deleted successfully' });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    res.status(500).json({ error: error.message || 'Failed to delete discount code' });
  }
});

// Validate a discount code (public endpoint)
router.post('/validate', async (req, res) => {
  try {
    const { code, applicableTo, originalAmount, baseAmount, addonAmount } = req.body;

    if (!code || !originalAmount) {
      return res.status(400).json({ error: 'Missing required fields: code and originalAmount' });
    }

    const discountCode = await DiscountCode.findValidCode(code, applicableTo);

    if (!discountCode) {
      return res.status(404).json({ error: 'Invalid or expired discount code' });
    }

    // Check if discount code applies to add-ons
    const appliesToAddons = discountCode.applicableTo.includes('addons');
    
    // Calculate the amount to apply discount to
    let discountableAmount;
    if (appliesToAddons || applicableTo === 'bump') {
      // Apply discount to total amount (base + add-ons) or bump price
      discountableAmount = originalAmount;
    } else {
      // Apply discount only to base amount
      discountableAmount = baseAmount || originalAmount;
    }
    
    const discountAmount = discountCode.calculateDiscount(discountableAmount);
    const finalAmount = originalAmount - discountAmount;

    res.json({
      valid: true,
      discountCode: {
        code: discountCode.code,
        description: discountCode.description,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        maxDiscount: discountCode.maxDiscount,
        applicableTo: discountCode.applicableTo
      },
      discountAmount,
      finalAmount
    });
  } catch (error) {
    console.error('Error validating discount code:', error);
    res.status(500).json({ error: error.message || 'Failed to validate discount code' });
  }
});

// Apply a discount code (increment usage)
router.post('/apply', async (req, res) => {
  try {
    const { code, applicableTo } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing required field: code' });
    }

    const discountCode = await DiscountCode.findValidCode(code, applicableTo);

    if (!discountCode) {
      return res.status(404).json({ error: 'Invalid or expired discount code' });
    }

    // Increment usage count
    await discountCode.incrementUsage();

    res.json({ 
      message: 'Discount code applied successfully',
      remainingUses: discountCode.usageLimit ? discountCode.usageLimit - discountCode.usedCount - 1 : null
    });
  } catch (error) {
    console.error('Error applying discount code:', error);
    res.status(500).json({ error: error.message || 'Failed to apply discount code' });
  }
});

module.exports = router; 