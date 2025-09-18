const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user's AquaFi baselines
router.get('/baselines', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('aquafiBaselines');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Initialize aquafiBaselines if it doesn't exist for existing users
    if (!user.aquafiBaselines) {
      user.aquafiBaselines = [];
      await user.save();
    }
    
    res.json(user.aquafiBaselines);
  } catch (err) {
    console.error('Error fetching baselines:', err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// Save or update baseline for a pool
router.post('/baselines', auth, async (req, res) => {
  const { poolId, userAddress, depositAmount, tokenSymbol } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Initialize array if it doesn't exist for existing users
    if (!user.aquafiBaselines) {
      user.aquafiBaselines = [];
    }

    // Find existing baseline for this pool
    const existingIndex = user.aquafiBaselines.findIndex(
      b => b.poolId === poolId && b.userAddress.toLowerCase() === userAddress.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Update existing baseline - ADD to original amount
      user.aquafiBaselines[existingIndex].originalAmount += parseFloat(depositAmount);
      user.aquafiBaselines[existingIndex].updatedAt = new Date();
    } else {
      // Create new baseline for this pool
      user.aquafiBaselines.push({
        poolId,
        userAddress: userAddress.toLowerCase(),
        originalAmount: parseFloat(depositAmount),
        tokenSymbol,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await user.save();
    res.json({ success: true, baselines: user.aquafiBaselines });
  } catch (err) {
    console.error('Error saving baseline:', err.message);
    res.status(500).send('Server Error');
  }
});

// Remove baseline (on full withdrawal)
router.delete('/baselines/:poolId/:userAddress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Remove the specific pool baseline
    user.aquafiBaselines = user.aquafiBaselines.filter(
      b => !(b.poolId === req.params.poolId && b.userAddress.toLowerCase() === req.params.userAddress.toLowerCase())
    );

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing baseline:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
