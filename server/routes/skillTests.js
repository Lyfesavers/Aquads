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
      .sort({ category: 1, difficulty: 1 })
      .lean();
    
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skill tests' });
  }
});

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get a specific skill test by ID (randomly selects questions from pool)
router.get('/:testId', async (req, res) => {
  try {
    const test = await SkillTest.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Randomly select questions from the pool
    const questionsPerTest = test.questionsPerTest || 8;
    const totalQuestions = test.questions.length;
    
    // Create array of indices and shuffle
    const allIndices = Array.from({ length: totalQuestions }, (_, i) => i);
    const shuffledIndices = shuffleArray(allIndices);
    
    // Select the required number of questions
    const selectedIndices = shuffledIndices.slice(0, Math.min(questionsPerTest, totalQuestions));
    
    // Sort indices to maintain some order consistency
    selectedIndices.sort((a, b) => a - b);
    
    // Map selected questions (without correct answers)
    const selectedQuestions = selectedIndices.map((originalIndex, displayIndex) => ({
      displayIndex, // The index shown to user (0, 1, 2...)
      originalIndex, // The actual index in the question pool
      question: test.questions[originalIndex].question,
      options: test.questions[originalIndex].options
    }));
    
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
      questionsPerTest,
      totalQuestionsInPool: totalQuestions,
      questions: selectedQuestions,
      servedQuestionIndices: selectedIndices // Send this so client can include in submission
    };
    
    res.json(testForClient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skill test' });
  }
});

// Submit test answers and get results
router.post('/:testId/submit', auth, async (req, res) => {
  try {
    const { answers, timeTaken, servedQuestionIndices } = req.body;
    const testId = req.params.testId;
    const userId = req.user.userId;

    // Get the test
    const test = await SkillTest.findById(testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Validate served question indices
    if (!servedQuestionIndices || !Array.isArray(servedQuestionIndices)) {
      return res.status(400).json({ error: 'Invalid test submission - missing question indices' });
    }

    // Grade the test using the served question indices
    let correctAnswers = 0;
    const questionsServed = servedQuestionIndices.length;
    
    const gradedAnswers = answers.map((answer, displayIndex) => {
      // Get the original question index from servedQuestionIndices
      const originalIndex = servedQuestionIndices[displayIndex];
      const question = test.questions[originalIndex];
      
      if (!question) {
        return {
          questionIndex: originalIndex,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: false,
          timeSpent: answer.timeSpent || 0
        };
      }
      
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers++;
      
      return {
        questionIndex: originalIndex, // Store the original pool index
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeSpent: answer.timeSpent || 0
      };
    });

    const score = Math.round((correctAnswers / questionsServed) * 100);
    const passed = score >= test.passingScore;

    // Check if user already completed this test (for retake handling)
    const existingCompletion = await UserSkillTest.findOne({ userId, testId });
    
    let completion;
    let isRetake = false;
    let newBadgeEarned = false;
    
    if (existingCompletion) {
      // This is a retake - update existing record
      isRetake = true;
      const newBestScore = Math.max(existingCompletion.bestScore || existingCompletion.score, score);
      
      // Check if this is the first time passing (for badge award)
      const wasAlreadyPassed = existingCompletion.passed;
      newBadgeEarned = passed && !wasAlreadyPassed;
      
      existingCompletion.score = score;
      existingCompletion.totalQuestions = questionsServed;
      existingCompletion.correctAnswers = correctAnswers;
      existingCompletion.timeTaken = timeTaken;
      existingCompletion.passed = existingCompletion.passed || passed; // Once passed, stays passed
      existingCompletion.answers = gradedAnswers;
      existingCompletion.servedQuestionIndices = servedQuestionIndices;
      existingCompletion.attempts = (existingCompletion.attempts || 1) + 1;
      existingCompletion.bestScore = newBestScore;
      existingCompletion.completedAt = new Date();
      
      // Only update badge if this is first time passing
      if (newBadgeEarned) {
        existingCompletion.badgeEarned = test.badge;
      }
      
      await existingCompletion.save();
      completion = existingCompletion;
    } else {
      // First attempt - create new completion record
      completion = new UserSkillTest({
        userId,
        testId,
        score,
        totalQuestions: questionsServed,
        correctAnswers,
        timeTaken,
        passed,
        badgeEarned: passed ? test.badge : null,
        answers: gradedAnswers,
        servedQuestionIndices,
        attempts: 1,
        bestScore: score
      });

      await completion.save();
      newBadgeEarned = passed;
    }

    // If passed for the first time, add badge to user profile
    if (newBadgeEarned) {
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
      totalQuestions: questionsServed,
      correctAnswers,
      passed,
      timeTaken,
      badgeEarned: newBadgeEarned ? test.badge : null,
      isRetake,
      attempts: completion.attempts,
      bestScore: completion.bestScore,
      answers: gradedAnswers.map((answer, displayIndex) => ({
        displayIndex,
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
      .sort({ completedAt: -1 })
      .lean();
    
    res.json(completions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch completions' });
  }
});

// Get user's badges
router.get('/user/badges', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('skillBadges').lean();
    res.json(user.skillBadges || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

module.exports = router;
