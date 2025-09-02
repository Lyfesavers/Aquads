const express = require('express');
const router = express.Router();
const BubbleDuel = require('../models/BubbleDuel');
const Ad = require('../models/Ad');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const socket = require('../socket');

// GET /api/bubble-duels - Get all active battles
router.get('/', async (req, res) => {
  try {
    const battles = await BubbleDuel.find({ 
      status: { $in: ['waiting', 'active'] } 
    })
    .sort({ createdAt: -1 })
    .limit(10);
    
    // Add remaining time for each battle
    const battlesWithTime = battles.map(battle => ({
      ...battle.toObject(),
      remainingTime: battle.getRemainingTime()
    }));
    
    res.json(battlesWithTime);
  } catch (error) {
    console.error('Error fetching battles:', error);
    res.status(500).json({ error: 'Failed to fetch battles' });
  }
});

// GET /api/bubble-duels/history - Get completed battles
router.get('/history', async (req, res) => {
  try {
    const battles = await BubbleDuel.find({ 
      status: 'completed' 
    })
    .sort({ endTime: -1 })
    .limit(20);
    
    res.json(battles);
  } catch (error) {
    console.error('Error fetching battle history:', error);
    res.status(500).json({ error: 'Failed to fetch battle history' });
  }
});

// GET /api/bubble-duels/:battleId - Get specific battle
router.get('/:battleId', async (req, res) => {
  try {
    const battle = await BubbleDuel.findOne({ battleId: req.params.battleId });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    const battleData = {
      ...battle.toObject(),
      remainingTime: battle.getRemainingTime()
    };
    
    res.json(battleData);
  } catch (error) {
    console.error('Error fetching battle:', error);
    res.status(500).json({ error: 'Failed to fetch battle' });
  }
});

// POST /api/bubble-duels/create - Create new battle
router.post('/create', auth, requireEmailVerification, async (req, res) => {
  try {
    const { project1AdId, project2AdId, duration = 3600, targetVotes = 100 } = req.body;
    
    // Validate input
    if (!project1AdId || !project2AdId) {
      return res.status(400).json({ error: 'Both projects are required' });
    }
    
    if (project1AdId === project2AdId) {
      return res.status(400).json({ error: 'Projects must be different' });
    }
    
    // Get the ads
    const [ad1, ad2] = await Promise.all([
      Ad.findOne({ id: project1AdId }),
      Ad.findOne({ id: project2AdId })
    ]);
    
    if (!ad1 || !ad2) {
      return res.status(404).json({ error: 'One or both projects not found' });
    }
    
    // Check if projects are eligible (active status)
    if (ad1.status !== 'active') {
      return res.status(400).json({ error: `${ad1.title} is not eligible for battle (must be active)` });
    }
    
    if (ad2.status !== 'active') {
      return res.status(400).json({ error: `${ad2.title} is not eligible for battle (must be active)` });
    }
    
    // Check if either project is already in an active battle
    const existingBattle = await BubbleDuel.findOne({
      status: { $in: ['waiting', 'active'] },
      $or: [
        { 'project1.adId': project1AdId },
        { 'project2.adId': project1AdId },
        { 'project1.adId': project2AdId },
        { 'project2.adId': project2AdId }
      ]
    });
    
    if (existingBattle) {
      return res.status(400).json({ error: 'One of the projects is already in an active battle' });
    }
    
    // Create battle
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const battle = new BubbleDuel({
      battleId,
      project1: {
        adId: ad1.id,
        title: ad1.title,
        logo: ad1.logo,
        votes: 0
      },
      project2: {
        adId: ad2.id,
        title: ad2.title,
        logo: ad2.logo,
        votes: 0
      },
      duration,
      targetVotes,
      status: 'waiting',
      createdBy: req.user.userId
    });
    
    await battle.save();
    
    // Emit socket event for real-time updates
    socket.getIO().emit('battleCreated', battle);
    
    res.status(201).json(battle);
  } catch (error) {
    console.error('Error creating battle:', error);
    res.status(500).json({ error: 'Failed to create battle' });
  }
});

// POST /api/bubble-duels/:battleId/start - Start a battle
router.post('/:battleId/start', auth, requireEmailVerification, async (req, res) => {
  try {
    const battle = await BubbleDuel.findOne({ battleId: req.params.battleId });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    if (battle.status !== 'waiting') {
      return res.status(400).json({ error: 'Battle cannot be started' });
    }
    
    // Start the battle
    battle.status = 'active';
    battle.startTime = new Date();
    await battle.save();
    
    // Emit socket event
    socket.getIO().emit('battleStarted', {
      battleId: battle.battleId,
      startTime: battle.startTime
    });
    
    // Auto-end battle after duration
    setTimeout(async () => {
      try {
        const activeBattle = await BubbleDuel.findOne({ battleId: req.params.battleId });
        if (activeBattle && activeBattle.status === 'active') {
          activeBattle.endBattle();
          await activeBattle.save();
          
          // Emit battle ended event
          socket.getIO().emit('battleEnded', {
            battleId: activeBattle.battleId,
            winner: activeBattle.winner,
            finalScores: activeBattle.finalScores
          });
        }
      } catch (error) {
        console.error('Error auto-ending battle:', error);
      }
    }, battle.duration * 1000);
    
    res.json({ 
      message: 'Battle started!',
      battle: {
        ...battle.toObject(),
        remainingTime: battle.getRemainingTime()
      }
    });
  } catch (error) {
    console.error('Error starting battle:', error);
    res.status(500).json({ error: 'Failed to start battle' });
  }
});

// POST /api/bubble-duels/:battleId/vote - Vote in a battle
router.post('/:battleId/vote', auth, requireEmailVerification, async (req, res) => {
  try {
    const { projectSide } = req.body; // 'project1' or 'project2'
    const battleId = req.params.battleId;
    const userId = req.user.userId;
    
    // Validate vote
    if (projectSide !== 'project1' && projectSide !== 'project2') {
      return res.status(400).json({ error: 'Invalid vote. Must be "project1" or "project2"' });
    }
    
    // Get battle
    const battle = await BubbleDuel.findOne({ battleId });
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    // Check if battle is active
    if (battle.status !== 'active') {
      return res.status(400).json({ error: 'Battle is not active' });
    }
    
    // Check if battle time is up
    if (battle.getRemainingTime() <= 0) {
      return res.status(400).json({ error: 'Battle time has expired' });
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Add vote
    const voteResult = battle.addVote(userId, user.username, projectSide);
    
    if (!voteResult.success) {
      return res.status(400).json({ error: voteResult.message });
    }
    
    // Save battle
    await battle.save();
    
    // Award points for voting (same as bubble voting)
    const alreadyReceivedPoints = user.pointsHistory.some(
      entry => entry.reason === `Bubble Duel vote: ${battleId}`
    );
    
    if (!alreadyReceivedPoints) {
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: { points: 20 },
          $push: {
            pointsHistory: {
              amount: 20,
              reason: `Bubble Duel vote: ${battleId}`,
              createdAt: new Date()
            }
          }
        }
      );
    }
    
    // Emit real-time vote update
    socket.getIO().emit('battleVoteUpdate', {
      battleId: battle.battleId,
      project1Votes: battle.project1.votes,
      project2Votes: battle.project2.votes,
      totalVotes: battle.totalVotes,
      remainingTime: battle.getRemainingTime()
    });
    
    // Check if battle ended due to target votes reached
    if (battle.status === 'completed') {
      socket.getIO().emit('battleEnded', {
        battleId: battle.battleId,
        winner: battle.winner,
        finalScores: battle.finalScores,
        reason: 'Target votes reached'
      });
    }
    
    res.json({
      success: true,
      message: 'Vote counted!',
      battle: {
        battleId: battle.battleId,
        project1Votes: battle.project1.votes,
        project2Votes: battle.project2.votes,
        totalVotes: battle.totalVotes,
        remainingTime: battle.getRemainingTime(),
        userVote: projectSide
      },
      pointsAwarded: alreadyReceivedPoints ? 0 : 20
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// POST /api/bubble-duels/:battleId/share - Track social shares
router.post('/:battleId/share', async (req, res) => {
  try {
    const { platform } = req.body; // 'twitter' or 'telegram'
    const battleId = req.params.battleId;
    
    if (platform !== 'twitter' && platform !== 'telegram') {
      return res.status(400).json({ error: 'Invalid platform' });
    }
    
    const battle = await BubbleDuel.findOne({ battleId });
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    // Increment share count
    battle.socialShares[platform] += 1;
    await battle.save();
    
    res.json({ success: true, message: 'Share tracked' });
  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({ error: 'Failed to track share' });
  }
});

// GET /api/bubble-duels/stats/global - Get global battle statistics
router.get('/stats/global', async (req, res) => {
  try {
    const [totalBattles, activeBattles, completedBattles, totalVotes] = await Promise.all([
      BubbleDuel.countDocuments({}),
      BubbleDuel.countDocuments({ status: 'active' }),
      BubbleDuel.countDocuments({ status: 'completed' }),
      BubbleDuel.aggregate([
        { $group: { _id: null, total: { $sum: '$totalVotes' } } }
      ])
    ]);
    
    const stats = {
      totalBattles,
      activeBattles,
      completedBattles,
      totalVotes: totalVotes[0]?.total || 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/bubble-duels/:id/cancel - Cancel a battle
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const battle = await BubbleDuel.findOne({ battleId: id });
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    // Check if user has permission to cancel (only battle creator)
    if (battle.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only the battle creator can cancel this battle' });
    }

    // Update battle status to cancelled
    battle.status = 'cancelled';
    battle.endTime = new Date();
    await battle.save();

    // Emit socket event
    socket.getIO().emit('bubbleDuelUpdate', { 
      type: 'cancel', 
      battle: battle,
      cancelledBy: user.username 
    });

    res.json({ message: 'Battle cancelled successfully', battle: battle });
  } catch (error) {
    console.error('Error cancelling battle:', error);
    res.status(500).json({ error: 'Failed to cancel battle' });
  }
});

module.exports = router;
