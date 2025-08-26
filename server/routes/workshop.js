const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');

// Helper function to award workshop points using existing points system
const awardWorkshopPoints = async (userId, amount, reason, workshopSection = null) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { points: amount },
        $push: {
          pointsHistory: {
            amount: amount,
            reason: reason,
            workshopSection: workshopSection, // Track which workshop section this is from
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    return updatedUser;
  } catch (error) {
    console.error('Error awarding workshop points:', error);
    throw error;
  }
};

// Complete a workshop section
router.post('/complete-section', auth, requireEmailVerification, async (req, res) => {
  try {
    const { moduleId, sectionIndex, sectionTitle } = req.body;
    
    if (!moduleId || sectionIndex === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a unique identifier for this workshop section
    const workshopSection = `${moduleId}-section-${sectionIndex}`;
    const reason = `Workshop: ${sectionTitle || `${moduleId} Section ${sectionIndex + 1}`}`;
    
    // Check if user already completed this section
    const user = await User.findById(req.user.userId);
    const alreadyCompleted = user.pointsHistory.some(
      entry => entry.workshopSection === workshopSection
    );
    
    if (alreadyCompleted) {
      return res.json({ 
        success: true,
        message: 'Section already completed',
        user: user 
      });
    }
    
    // Just record completion without awarding points
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $push: {
          pointsHistory: {
            amount: 0, // No points awarded
            reason: reason,
            workshopSection: workshopSection,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: `Completed ${sectionTitle || 'workshop section'}!`,
      user: updatedUser
    });
    
  } catch (error) {
    console.error('Error completing workshop section:', error);
    res.status(500).json({ error: 'Failed to complete workshop section' });
  }
});

// Get user's workshop progress
router.get('/progress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get workshop-related points history
    const workshopHistory = user.pointsHistory.filter(
      entry => entry.reason && entry.reason.includes('Workshop')
    );
    
    // Get completed sections
    const completedSections = workshopHistory
      .filter(entry => entry.workshopSection)
      .map(entry => entry.workshopSection);
    
    res.json({
      totalPoints: user.points, // Total user points
      completedSections,
      workshopHistory: workshopHistory.map(entry => ({
        amount: entry.amount,
        reason: entry.reason,
        section: entry.workshopSection,
        date: entry.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error fetching workshop progress:', error);
    res.status(500).json({ error: 'Failed to fetch workshop progress' });
  }
});

// Award bonus achievement points
router.post('/achievement', auth, requireEmailVerification, async (req, res) => {
  try {
    const { achievementId, points, description } = req.body;
    
    if (!achievementId || !points || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user already earned this achievement
    const user = await User.findById(req.user.userId);
    const alreadyEarned = user.pointsHistory.some(
      entry => entry.reason && entry.reason.includes(`Achievement: ${achievementId}`)
    );
    
    if (alreadyEarned) {
      return res.status(400).json({ error: 'Achievement already earned' });
    }
    
    // Award achievement points
    const updatedUser = await awardWorkshopPoints(
      req.user.userId,
      points,
      `Achievement: ${achievementId} - ${description}`
    );
    
    res.json({
      success: true,
      points: updatedUser.points,
      pointsEarned: points,
      message: `Achievement unlocked! ${points} bonus points earned for ${description}`
    });
    
  } catch (error) {
    console.error('Error awarding achievement:', error);
    res.status(500).json({ error: 'Failed to award achievement' });
  }
});

// Get workshop leaderboard (top workshop participants)
router.get('/leaderboard', async (req, res) => {
  try {
    // Aggregate users by their workshop points
    const leaderboard = await User.aggregate([
      {
        $addFields: {
          workshopPoints: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$pointsHistory',
                    cond: {
                      $regexMatch: {
                        input: '$$this.reason',
                        regex: /Workshop/i
                      }
                    }
                  }
                },
                as: 'entry',
                in: '$$entry.amount'
              }
            }
          }
        }
      },
      {
        $match: {
          workshopPoints: { $gt: 0 }
        }
      },
      {
        $sort: { workshopPoints: -1 }
      },
      {
        $limit: 50
      },
      {
        $project: {
          username: 1,
          image: 1,
          workshopPoints: 1,
          totalPoints: '$points',
          country: 1
        }
      }
    ]);
    
    res.json(leaderboard);
    
  } catch (error) {
    console.error('Error fetching workshop leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
