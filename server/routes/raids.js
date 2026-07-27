const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getRaiderAnalytics } = require('../utils/raiderAnalytics');

// Raider-facing analytics (completions, quality score, badges)
router.get('/my-analytics', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }

    const analytics = await getRaiderAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    console.error('Raider analytics error:', error);
    res.status(500).json({ error: 'Failed to load raider analytics' });
  }
});

module.exports = router;
