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



module.exports = mongoose.model('Game', gameSchema); 