const express = require('express');
const router = express.Router();
const SkillTest = require('../models/SkillTest');
const UserSkillTest = require('../models/UserSkillTest');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all available skill tests
router.get('/', async (req, res) => {
  try {
    const tests = await SkillTest.find({ isActive: true })
      .select('title description category difficulty timeLimit passingScore badge')
      .sort({ category: 1, difficulty: 1 });
    
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skill tests' });
  }
});

// Get a specific skill test by ID
router.get('/:testId', async (req, res) => {
  try {
    const test = await SkillTest.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Don't send correct answers to client
    const testForClient = {
      _id: test._id,
      title: test.title,
      description: test.description,
      category: test.category,
      difficulty: test.difficulty,
      timeLimit: test.timeLimit,
      passingScore: test.passingScore,
      badge: test.badge,
      questions: test.questions.map(q => ({
        question: q.question,
        options: q.options
      }))
    };
    
    res.json(testForClient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skill test' });
  }
});

// Submit test answers and get results
router.post('/:testId/submit', auth, async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;
    const testId = req.params.testId;
    const userId = req.user.userId;

    // Get the test
    const test = await SkillTest.findById(testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Check if user already completed this test
    const existingCompletion = await UserSkillTest.findOne({ userId, testId });
    if (existingCompletion) {
      return res.status(400).json({ error: 'Test already completed' });
    }

    // Grade the test
    let correctAnswers = 0;
    const gradedAnswers = answers.map((answer, index) => {
      const question = test.questions[index];
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers++;
      
      return {
        questionIndex: index,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeSpent: answer.timeSpent || 0
      };
    });

    const score = Math.round((correctAnswers / test.questions.length) * 100);
    const passed = score >= test.passingScore;

    // Create completion record
    const completion = new UserSkillTest({
      userId,
      testId,
      score,
      totalQuestions: test.questions.length,
      correctAnswers,
      timeTaken,
      passed,
      badgeEarned: passed ? test.badge : null,
      answers: gradedAnswers,
      bestScore: score
    });

    await completion.save();

    // If passed, add badge to user profile
    if (passed) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          skillBadges: {
            testId: test._id,
            badgeName: test.badge.name,
            badgeDescription: test.badge.description,
            badgeIcon: test.badge.icon,
            badgeColor: test.badge.color,
            score: score
          }
        }
      });
    }

    // Prepare response with results
    const results = {
      score,
      totalQuestions: test.questions.length,
      correctAnswers,
      passed,
      timeTaken,
      badgeEarned: passed ? test.badge : null,
      answers: gradedAnswers.map(answer => ({
        questionIndex: answer.questionIndex,
        isCorrect: answer.isCorrect,
        correctAnswer: test.questions[answer.questionIndex].correctAnswer,
        explanation: test.questions[answer.questionIndex].explanation
      }))
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit test' });
  }
});

// Get user's test completions
router.get('/user/completions', auth, async (req, res) => {
  try {
    const completions = await UserSkillTest.find({ userId: req.user.userId })
      .populate('testId', 'title category badge')
      .sort({ completedAt: -1 });
    
    res.json(completions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch completions' });
  }
});

// Get user's badges
router.get('/user/badges', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('skillBadges');
    res.json(user.skillBadges || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

module.exports = router;
