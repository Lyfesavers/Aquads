const express = require('express');
const router = express.Router();
const LeaderboardEntry = require('../models/LeaderboardEntry');
const auth = require('../middleware/auth');
const { getIO } = require('../socket');

// GET /api/leaderboard/:game
// Optional query: limit, difficulty, grid
router.get('/:game', async (req, res) => {
  try {
    const { game } = req.params;
    const limitNum = Math.min(Number(req.query.limit) || 20, 200);

    if (game === 'sludo') {
      const rows = await LeaderboardEntry.aggregate([
        { $match: { game: 'sludo', result: 'Win', userId: { $ne: null } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$userId',
            username: { $first: '$username' },
            wins: { $sum: 1 },
            lastWin: { $max: '$createdAt' },
          },
        },
        { $sort: { wins: -1, lastWin: -1 } },
        { $limit: limitNum },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            username: 1,
            wins: 1,
            lastWin: 1,
          },
        },
      ]);
      return res.json(rows);
    }

    const { limit = 20, difficulty, grid } = req.query;
    const query = { game, result: 'Win' }; // Only show wins
    if (difficulty && difficulty !== 'All') query.difficulty = difficulty;
    if (grid && grid !== 'All') query.grid = grid;

    const entries = await LeaderboardEntry.find(query)
      .sort({ you: -1, createdAt: -1 }) // Sort by player score (highest first), then newest
      .limit(Math.min(Number(limit) || 20, 200));

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST /api/leaderboard/:game
// Body: { result, you, ai, grid, difficulty }
router.post('/:game', auth, async (req, res) => {
  try {
    const { game } = req.params;
    if (game === 'sludo') {
      return res.status(403).json({ error: 'Sludo wins are recorded automatically when you finish a game.' });
    }
    const { result, you, ai, grid, difficulty } = req.body || {};
    if (!result || you == null || ai == null || !grid || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const entry = new LeaderboardEntry({
      game,
      result,
      you,
      ai,
      grid,
      difficulty,
      userId: req.user?.userId || null,
      username: req.user?.username || 'Guest',
    });
    await entry.save();
    
    // Simple broadcast to all clients
    try {
      const io = getIO();
      io.emit('leaderboardUpdated', {
        game,
        entry: {
          _id: entry._id,
          username: entry.username,
          result: entry.result,
          you: entry.you,
          ai: entry.ai,
          grid: entry.grid,
          difficulty: entry.difficulty,
          createdAt: entry.createdAt
        }
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }
    
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

module.exports = router;


