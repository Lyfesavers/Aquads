const mongoose = require('mongoose');

const projectAgentThreadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New chat',
    trim: true,
    maxlength: 200
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

projectAgentThreadSchema.index({ userId: 1, adId: 1, updatedAt: -1 });

projectAgentThreadSchema.pre('save', function preSave(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ProjectAgentThread', projectAgentThreadSchema);
