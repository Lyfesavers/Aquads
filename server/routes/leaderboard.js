const express = require('express');
const router = express.Router();
const LeaderboardEntry = require('../models/LeaderboardEntry');
const auth = require('../middleware/auth');

// GET /api/leaderboard/:game
// Optional query: limit, difficulty, grid
router.get('/:game', async (req, res) => {
  try {
    const { game } = req.params;
    const { limit = 50, difficulty, grid } = req.query;
    const query = { game };
    if (difficulty) query.difficulty = difficulty;
    if (grid) query.grid = grid;

    const entries = await LeaderboardEntry.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200));

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
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

module.exports = router;


