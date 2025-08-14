const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const skillTestSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['english', 'customer-service', 'communication', 'project-management', 'technical']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  timeLimit: {
    type: Number, // in minutes
    default: 30
  },
  passingScore: {
    type: Number,
    default: 80 // percentage
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctAnswer: {
      type: Number, // index of correct option
      required: true
    },
    explanation: {
      type: String,
      default: ''
    }
  }],
  badge: {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: '🏆'
    },
    color: {
      type: String,
      default: '#3B82F6'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

skillTestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SkillTest', skillTestSchema);
