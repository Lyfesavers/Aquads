const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');

const buildSectionKey = (moduleId, sectionIndex) => `${moduleId}-section-${sectionIndex}`;

const formatProgressResponse = (entries) => {
  const sectionCompletions = (entries || []).map((entry) => ({
    sectionKey: entry.sectionKey,
    moduleId: entry.moduleId,
    sectionIndex: entry.sectionIndex,
    sectionTitle: entry.sectionTitle,
    date: entry.completedAt
  }));
  return {
    completedSections: sectionCompletions.map((e) => e.sectionKey),
    sectionCompletions
  };
};

/** One-time migration from legacy pointsHistory workshop rows (amount 0). */
async function ensureWorkshopProgress(user) {
  if (user.workshopProgress?.length) {
    return user.workshopProgress;
  }

  const legacyKeys = [
    ...new Set(
      (user.pointsHistory || [])
        .filter((entry) => entry.workshopSection)
        .map((entry) => entry.workshopSection)
    )
  ];

  if (!legacyKeys.length) {
    return [];
  }

  const migrated = legacyKeys.map((sectionKey) => {
    const [moduleId, , sectionIndexStr] = sectionKey.split('-');
    return {
      sectionKey,
      moduleId,
      sectionIndex: parseInt(sectionIndexStr, 10),
      sectionTitle: null,
      completedAt: new Date()
    };
  });

  await User.findByIdAndUpdate(user._id, { workshopProgress: migrated });
  return migrated;
}

// Complete a workshop section
router.post('/complete-section', auth, requireEmailVerification, async (req, res) => {
  try {
    const { moduleId, sectionIndex, sectionTitle } = req.body;

    if (!moduleId || sectionIndex === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sectionKey = buildSectionKey(moduleId, sectionIndex);
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const progress = await ensureWorkshopProgress(user);
    const alreadyCompleted = progress.some((entry) => entry.sectionKey === sectionKey);

    if (alreadyCompleted) {
      return res.json({
        success: true,
        message: 'Section already completed',
        ...formatProgressResponse(progress)
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $push: {
          workshopProgress: {
            sectionKey,
            moduleId,
            sectionIndex: Number(sectionIndex),
            sectionTitle: sectionTitle || null,
            completedAt: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: `Completed ${sectionTitle || 'workshop section'}!`,
      ...formatProgressResponse(updatedUser.workshopProgress)
    });
  } catch (error) {
    console.error('Error completing workshop section:', error);
    res.status(500).json({ error: 'Failed to complete workshop section' });
  }
});

// Get user's workshop progress
router.get('/progress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const progress = await ensureWorkshopProgress(user);
    res.json(formatProgressResponse(progress));
  } catch (error) {
    console.error('Error fetching workshop progress:', error);
    res.status(500).json({ error: 'Failed to fetch workshop progress' });
  }
});

// Leaderboard by sections completed (not affiliate points)
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await User.aggregate([
      {
        $addFields: {
          sectionsCompleted: { $size: { $ifNull: ['$workshopProgress', []] } }
        }
      },
      { $match: { sectionsCompleted: { $gt: 0 } } },
      { $sort: { sectionsCompleted: -1 } },
      { $limit: 50 },
      {
        $project: {
          username: 1,
          image: 1,
          sectionsCompleted: 1,
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
