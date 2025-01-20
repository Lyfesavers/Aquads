const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
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
    enum: [
      'smart-contract',
      'audit',
      'marketing',
      'community',
      'web3',
      'tokenomics',
      'writing',
      'consulting'
    ]
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'ETH'
  },
  deliveryTime: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    default: ''
  },
  telegramUsername: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
serviceSchema.index({ category: 1 });
serviceSchema.index({ seller: 1 });
serviceSchema.index({ title: 'text', description: 'text' }); // For text search

// Update the updatedAt timestamp before saving
serviceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Service || mongoose.model('Service', serviceSchema); 