const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const userSkillTestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: Schema.Types.ObjectId,
    ref: 'SkillTest',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number, // in seconds
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  badgeEarned: {
    name: String,
    description: String,
    icon: String,
    color: String,
    earnedAt: {
      type: Date,
      default: Date.now
    }
  },
  answers: [{
    questionIndex: Number,
    selectedAnswer: Number,
    isCorrect: Boolean,
    timeSpent: Number // in seconds
  }],
  attempts: {
    type: Number,
    default: 1
  },
  bestScore: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one completion record per user per test
userSkillTestSchema.index({ userId: 1, testId: 1 }, { unique: true });

module.exports = mongoose.model('UserSkillTest', userSkillTestSchema);
