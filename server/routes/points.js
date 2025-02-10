const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Test route to verify points router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Points router is working' });
});

// Get user's points and history
router.get('/my-points', auth, async (req, res) => {
  try {
    console.log('Fetching points for user:', req.user);
    const user = await User.findById(req.user.userId)
      .select('points pointsHistory giftCardRedemptions')
      .populate('pointsHistory.referredUser', 'username');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      points: user.points,
      pointsHistory: user.pointsHistory,
      giftCardRedemptions: user.giftCardRedemptions
    });
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// Request gift card redemption
router.post('/redeem', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.points < 10000) {
      return res.status(400).json({ 
        error: 'Insufficient points. You need 10,000 points to redeem a gift card.' 
      });
    }

    // Create redemption request
    user.giftCardRedemptions.push({
      amount: 100,
      status: 'pending'
    });

    // Deduct points
    user.points -= 10000;
    user.pointsHistory.push({
      amount: -10000,
      reason: 'Gift card redemption request'
    });

    await user.save();
    res.json({ message: 'Redemption request submitted successfully', user });
  } catch (error) {
    console.error('Error redeeming points:', error);
    res.status(500).json({ error: 'Failed to process redemption' });
  }
});

// Admin: Get all pending redemptions
router.get('/redemptions/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const users = await User.find({
      'giftCardRedemptions.status': 'pending'
    }).select('username giftCardRedemptions');

    res.json(users);
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    res.status(500).json({ error: 'Failed to fetch redemptions' });
  }
});

// Admin: Process redemption
router.post('/redemptions/:userId/process', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const redemption = user.giftCardRedemptions.find(r => r.status === 'pending');
    if (!redemption) {
      return res.status(404).json({ error: 'No pending redemption found' });
    }

    redemption.status = status;
    redemption.processedAt = new Date();
    redemption.processedBy = req.user.username;

    // If rejected, refund points
    if (status === 'rejected') {
      user.points += 10000;
      user.pointsHistory.push({
        amount: 10000,
        reason: 'Gift card redemption rejected - points refunded'
      });
    }

    await user.save();
    res.json({ message: 'Redemption processed successfully', user });
  } catch (error) {
    console.error('Error processing redemption:', error);
    res.status(500).json({ error: 'Failed to process redemption' });
  }
});

// Helper functions for awarding points
function awardAffiliatePoints(referrerId, referredUserId) {
  return User.findByIdAndUpdate(referrerId, {
    $inc: { points: 100 },
    $push: {
      pointsHistory: {
        amount: 100,
        reason: 'New affiliate referral',
        referredUser: referredUserId
      }
    }
  });
}

function awardListingPoints(userId) {
  return User.findById(userId)
    .then(user => {
      if (user && user.referredBy) {
        return User.findByIdAndUpdate(user.referredBy, {
          $inc: { points: 200 },
          $push: {
            pointsHistory: {
              amount: 200,
              reason: 'Referred user listed service/ad',
              referredUser: userId
            }
          }
        });
      }
    });
}

// Export only the router
module.exports = router; 