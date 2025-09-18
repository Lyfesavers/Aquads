const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user's AquaFi baselines
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('aquafiBaselines');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.aquafiBaselines || []);
  } catch (error) {
    console.error('Error fetching AquaFi baselines:', error);
    res.status(500).json({ error: 'Failed to fetch baselines' });
  }
});

// Save or update baseline for a position
router.post('/', auth, async (req, res) => {
  try {
    const { poolId, userAddress, baseline } = req.body;
    
    if (!poolId || !userAddress || baseline === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize aquafiBaselines if it doesn't exist
    if (!user.aquafiBaselines) {
      user.aquafiBaselines = [];
    }
    
    // Check if baseline already exists for this pool+address
    const existingIndex = user.aquafiBaselines.findIndex(
      b => b.poolId === poolId && b.userAddress.toLowerCase() === userAddress.toLowerCase()
    );
    
    if (existingIndex !== -1) {
      // Update existing baseline
      user.aquafiBaselines[existingIndex].baseline = baseline;
      user.aquafiBaselines[existingIndex].createdAt = new Date();
    } else {
      // Add new baseline
      user.aquafiBaselines.push({
        poolId,
        userAddress: userAddress.toLowerCase(),
        baseline,
        createdAt: new Date()
      });
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      baseline: { poolId, userAddress, baseline }
    });
  } catch (error) {
    console.error('Error saving AquaFi baseline:', error);
    res.status(500).json({ error: 'Failed to save baseline' });
  }
});

// Remove baseline (on withdrawal)
router.delete('/:poolId/:userAddress', auth, async (req, res) => {
  try {
    const { poolId, userAddress } = req.params;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.aquafiBaselines) {
      return res.json({ success: true, message: 'No baselines to remove' });
    }
    
    // Remove the baseline
    user.aquafiBaselines = user.aquafiBaselines.filter(
      b => !(b.poolId === poolId && b.userAddress.toLowerCase() === userAddress.toLowerCase())
    );
    
    await user.save();
    
    res.json({ success: true, message: 'Baseline removed' });
  } catch (error) {
    console.error('Error removing AquaFi baseline:', error);
    res.status(500).json({ error: 'Failed to remove baseline' });
  }
});

module.exports = router;
