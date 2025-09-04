const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true 
  },
  bannerType: {
    type: String,
    enum: ['image', 'video'],
    required: true,
    default: 'image'
  },
  bannerUrl: { 
    type: String, 
    required: true 
  },
  gameUrl: { 
    type: String, 
    required: true 
  },
  projectName: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  tags: [{ 
    type: String 
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  votes: {
    type: Number,
    default: 0
  },
  blockchain: {
    type: String,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  }
});

// Add index for queries
gameSchema.index({ title: 'text', description: 'text', projectName: 'text', tags: 'text' });

// Performance indexes for common queries
gameSchema.index({ status: 1, createdAt: -1 }); // For active games by date
gameSchema.index({ owner: 1 }); // For user's games
gameSchema.index({ category: 1, status: 1 }); // For category filtering
gameSchema.index({ blockchain: 1, status: 1 }); // For blockchain filtering
gameSchema.index({ votes: -1, status: 1 }); // For top voted games
gameSchema.index({ status: 1, votes: -1 }); // For status + votes sorting


module.exports = mongoose.model('Game', gameSchema); 