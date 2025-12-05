const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const { emitAffiliateEarningUpdate } = require('../socket');

// Test route to verify points router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Points router is working' });
});

// Get user's points and history
router.get('/my-points', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('points pointsHistory giftCardRedemptions powerUps')
      .populate('pointsHistory.referredUser', 'username');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      points: user.points,
      pointsHistory: user.pointsHistory,
      giftCardRedemptions: user.giftCardRedemptions,
      powerUps: user.powerUps || { twoMoves: 0, fourMoves: 0 }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// Purchase power-ups with points
router.post('/buy-powerup', auth, async (req, res) => {
  try {
    const { type } = req.body; // 'twoMoves' | 'fourMoves'
    if (!['twoMoves', 'fourMoves'].includes(type)) {
      return res.status(400).json({ error: 'Invalid power-up type' });
    }
    const cost = type === 'twoMoves' ? 500 : 900;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if ((user.points || 0) < cost) {
      return res.status(400).json({ error: 'Insufficient points' });
    }
    user.points = (user.points || 0) - cost;
    user.pointsHistory.push({ amount: -cost, reason: `Purchased ${type} power-up`, createdAt: new Date() });
    if (!user.powerUps) user.powerUps = { twoMoves: 0, fourMoves: 0 };
    user.powerUps[type] = (user.powerUps[type] || 0) + 1;
    await user.save();
    res.json({ points: user.points, powerUps: user.powerUps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to purchase power-up' });
  }
});

// Use power-ups (consume them)
router.post('/use-powerup', auth, async (req, res) => {
  try {
    const { type } = req.body; // 'twoMoves' | 'fourMoves'
    if (!['twoMoves', 'fourMoves'].includes(type)) {
      return res.status(400).json({ error: 'Invalid power-up type' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.powerUps) user.powerUps = { twoMoves: 0, fourMoves: 0 };
    
    if ((user.powerUps[type] || 0) <= 0) {
      return res.status(400).json({ error: 'No power-ups available' });
    }
    
    // Decrement the power-up count
    user.powerUps[type] = (user.powerUps[type] || 0) - 1;
    await user.save();
    
    res.json({ powerUps: user.powerUps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to use power-up' });
  }
});

// Request Canadian dollars redemption
router.post('/redeem', auth, requireEmailVerification, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check account age
    const accountAge = Date.now() - user.createdAt.getTime();
    const minimumAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    if (accountAge < minimumAge) {
      return res.status(400).json({ 
        error: 'Account must be at least 7 days old to redeem points' 
      });
    }

    // Check if user has any previous pending redemptions
    const hasPendingRedemption = user.giftCardRedemptions.some(
      redemption => redemption.status === 'pending'
    );

    if (hasPendingRedemption) {
      return res.status(400).json({ 
        error: 'You already have a pending redemption request' 
      });
    }

    if (user.points < 10000) {
      return res.status(400).json({ 
        error: 'Insufficient points. You need 10,000 points to redeem $100 Canadian Dollars.' 
      });
    }

    // Check redemption frequency
    const lastRedemption = user.giftCardRedemptions[user.giftCardRedemptions.length - 1];
    if (lastRedemption) {
      const timeSinceLastRedemption = Date.now() - lastRedemption.requestedAt.getTime();
      const minimumInterval = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      
      if (timeSinceLastRedemption < minimumInterval) {
        return res.status(400).json({ 
          error: 'You can only redeem points once every 30 days' 
        });
      }
    }

    // Create redemption request
    user.giftCardRedemptions.push({
      amount: 100,
      status: 'pending',
      requestedAt: new Date()
    });

    // Deduct points
    user.points -= 10000;
    user.pointsHistory.push({
      amount: -10000,
      reason: '$100 Canadian Dollars redemption request',
      createdAt: new Date()
    });

    await user.save();
    res.json({ message: 'Redemption request submitted successfully', user });
  } catch (error) {
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
      'giftCardRedemptions': {
        $elemMatch: { status: 'pending' }
      }
    }).select('username giftCardRedemptions');

    const pendingUsers = users.filter(user => 
      user.giftCardRedemptions.some(redemption => redemption.status === 'pending')
    );

    res.json(pendingUsers);
  } catch (error) {
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
        reason: 'Canadian Dollars redemption rejected - points refunded'
      });
    }

    await user.save();
    res.json({ message: 'Redemption processed successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process redemption' });
  }
});




// Helper functions for awarding points
function awardAffiliatePoints(referrerId, referredUserId) {
  return User.findById(referredUserId)
    .then(referredUser => {
      // Only award points if referred user has verified their email  
      if (!referredUser.emailVerified && referredUser.email) {

        return null; // Don't award points yet
      }
      
      return User.findByIdAndUpdate(
        referrerId,
        {
          $inc: { points: 20 },
          $push: {
            pointsHistory: {
              amount: 20,
              reason: 'New affiliate referral',
              referredUser: referredUserId,
              createdAt: new Date()
            }
          }
        },
        { new: true }
      );
    })
    .then(user => {
      return user;
    }).catch(error => {
      throw error;
    });
}

// New function to award pending affiliate points after email verification
function awardPendingAffiliatePoints(userId) {
  return User.findById(userId)
    .then(user => {
      if (!user || !user.referredBy) {
        return null;
      }
      
      // Award points to referrer now that email is verified
      return User.findByIdAndUpdate(
        user.referredBy,
        {
          $inc: { points: 20 },
          $push: {
            pointsHistory: {
              amount: 20,
              reason: 'New affiliate referral (email verified)',
              referredUser: userId,
              createdAt: new Date()
            }
          }
        },
        { new: true }
      );
    })
    .catch(error => {
      throw error;
    });
}

// Helper function to award points for social media raids
async function awardSocialMediaPoints(userId, platform, raidId) {
  try {
    // First check if user exists
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const pointAmount = 20; // Default point amount
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { points: pointAmount },
        $push: {
          pointsHistory: {
            amount: pointAmount,
            reason: `Completed ${platform} social media raid`,
            socialRaidId: raidId,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!updatedUser) {
      throw new Error(`Failed to update user points for user ID ${userId}`);
    }
    
    return updatedUser;
  } catch (error) {
    // Instead of throwing, return a rejection
    return Promise.reject(error);
  }
}

// Route to complete a social media raid
router.post('/social-raids/complete', auth, requireEmailVerification, async (req, res) => {
  try {
    const { raidId, platform, proof } = req.body;
    
    if (!raidId || !platform || !proof) {
      return res.status(400).json({ error: 'Missing required information' });
    }
    
    // Check if user already completed this raid
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user already got points for this raid
    const alreadyCompleted = user.pointsHistory.some(
      entry => entry.socialRaidId && entry.socialRaidId.toString() === raidId.toString()
    );
    
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'You have already completed this raid' });
    }
    
    // In a real implementation, you would verify the proof here
    // For now, we'll just award the points
    
    const updatedUser = await awardSocialMediaPoints(req.user.userId, platform, raidId);
    
    res.json({
      success: true,
      message: `Successfully completed ${platform} raid and earned 20 points!`,
      currentPoints: updatedUser.points
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to process social media raid' });
  }
});

// Route to award points for completed AquaSwap transaction
router.post('/swap-completed', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Award 5 points for completing a swap
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $inc: { points: 5 },
        $push: {
          pointsHistory: {
            amount: 5,
            reason: 'Completed AquaSwap transaction',
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    // Emit real-time socket update for points (for extension and website)
    emitAffiliateEarningUpdate({
      affiliateId: req.user.userId,
      type: 'swap_completed',
      pointsAwarded: 5,
      newTotalPoints: updatedUser.points,
      reason: 'Completed AquaSwap transaction'
    });
    
    res.json({
      success: true,
      message: 'Swap completed! +5 points earned',
      currentPoints: updatedUser.points
    });
    
  } catch (error) {
    console.error('Error awarding swap points:', error);
    res.status(500).json({ error: 'Failed to award swap points' });
  }
});

// Route to award points for shilling a token (once daily)
router.post('/shill-completed', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user already claimed shill points today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.lastShillPointsDate && user.lastShillPointsDate >= today) {
      return res.json({
        success: true,
        alreadyClaimed: true,
        message: 'Points will be added after completion',
        currentPoints: user.points
      });
    }
    
    // Award 5 points for shilling
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $inc: { points: 5 },
        $set: { lastShillPointsDate: new Date() },
        $push: {
          pointsHistory: {
            amount: 5,
            reason: 'Shared token on social media (daily shill)',
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    // Emit real-time socket update for points
    emitAffiliateEarningUpdate({
      affiliateId: req.user.userId,
      type: 'shill_completed',
      pointsAwarded: 5,
      newTotalPoints: updatedUser.points,
      reason: 'Shared token on social media'
    });
    
    res.json({
      success: true,
      alreadyClaimed: false,
      message: 'Points will be added after completion',
      currentPoints: updatedUser.points
    });
    
  } catch (error) {
    console.error('Error awarding shill points:', error);
    res.status(500).json({ error: 'Failed to award shill points' });
  }
});

function awardListingPoints(userId) {
  return User.findById(userId)
    .then(user => {
      if (user && user.referredBy) {
        return User.findByIdAndUpdate(
          user.referredBy,
          {
            $inc: { points: 20 },
            $push: {
              pointsHistory: {
                amount: 20,
                reason: 'Referred user listed service/ad',
                referredUser: userId,
                createdAt: new Date()
              }
            }
          },
          { new: true }
        );
      }
    });
}

// Helper function to award points for affiliate reviews
const awardAffiliateReviewPoints = async (userId) => {
  try {
    // Update user points and add to history
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { points: 20 },
        $push: {
          pointsHistory: {
            amount: 20,
            reason: 'Left a service review as affiliate',
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return null;
    }
    
    return updatedUser;
  } catch (error) {
    return null;
  }
};

// Helper function to award points for game votes
const awardGameVotePoints = async (userId, gameId) => {
  try {
    // Check if user has already received points for this game
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }
    
    // Check if this game is already in the user's pointsHistory for a vote
    const alreadyReceivedPoints = user.pointsHistory.some(
      entry => entry.gameId && entry.gameId.toString() === gameId.toString() && 
              entry.reason === 'Voted for a game'
    );
    
    // Check if points were previously revoked for this game (user is re-voting)
    const previouslyRevokedPoints = user.pointsHistory.some(
      entry => entry.gameId && entry.gameId.toString() === gameId.toString() && 
              entry.reason === 'Removed vote for a game'
    );
    
    // If they already have active points and haven't had them revoked, don't give points again
    if (alreadyReceivedPoints && !previouslyRevokedPoints) {
      return user; // Don't award points again
    }
    
    // Update user points and add to history
    // If they're re-voting, we're restoring previously revoked points
    const reason = previouslyRevokedPoints 
      ? 'Restored points for re-voting on a game' 
      : 'Voted for a game';
      
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { points: 20 },
        lastActivity: new Date(), // Update activity when points are awarded
        $push: {
          pointsHistory: {
            amount: 20,
            reason: reason,
            gameId: gameId,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    return updatedUser;
  } catch (error) {
    return null;
  }
};

// Helper function to revoke points when a vote is removed
const revokeGameVotePoints = async (userId, gameId) => {
  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }
    
    // Check if the user has received points for this game
    const pointEntry = user.pointsHistory.find(
      entry => entry.gameId && entry.gameId.toString() === gameId.toString() && 
              entry.reason === 'Voted for a game'
    );
    
    if (!pointEntry) {
      return user; // No points to revoke
    }
    
    // Update user points and add a negative entry to history
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { points: -20 },
        lastActivity: new Date(), // Update activity when points are revoked
        $push: {
          pointsHistory: {
            amount: -20,
            reason: 'Removed vote for a game',
            gameId: gameId,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    return updatedUser;
  } catch (error) {
    return null;
  }
};

// Export the router directly
module.exports = router;

// Export helper functions separately
module.exports.awardAffiliatePoints = awardAffiliatePoints;
module.exports.awardListingPoints = awardListingPoints;
module.exports.awardAffiliateReviewPoints = awardAffiliateReviewPoints;
module.exports.awardGameVotePoints = awardGameVotePoints;
module.exports.revokeGameVotePoints = revokeGameVotePoints;
module.exports.awardSocialMediaPoints = awardSocialMediaPoints;
module.exports.awardPendingAffiliatePoints = awardPendingAffiliatePoints; 