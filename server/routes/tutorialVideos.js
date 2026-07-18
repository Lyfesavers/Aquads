const express = require('express');
const {
  TUTORIAL_PLAYLIST_ID,
  getTutorialVideos,
} = require('../services/tutorialVideos');

const router = express.Router();

// GET /api/tutorial-videos — live list from the Aquads "How To...?" YouTube playlist.
router.get('/', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1';
    const videos = await getTutorialVideos({ forceRefresh });
    res.json({
      playlistId: TUTORIAL_PLAYLIST_ID,
      videos,
    });
  } catch (err) {
    console.error('[tutorialVideos] GET /', err);
    res.status(500).json({ error: 'Failed to fetch tutorial videos' });
  }
});

module.exports = router;
