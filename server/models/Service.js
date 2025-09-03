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
      // Web3/Crypto Categories
      'smart-contract',
      'audit',
      'tokenomics',
      'web3',
      'community',
      // Development Categories
      'web-developer',
      'mobile-developer',
      'software-developer',
      'database-admin',
      'devops-engineer',
      'qa-tester',
      // Design Categories
      'ui-ux-designer',
      'graphic-designer',
      'web-designer',
      'logo-designer',
      'video-editor',
      'photographer',
      // Marketing Categories
      'marketing',
      'seo-specialist',
      'social-media-manager',
      'content-creator',
      'copywriter',
      'email-marketing',
      'ppc-specialist',
      // Business/Admin Categories
      'virtual-assistant',
      'project-manager',
      'data-analyst',
      'business-analyst',
      'customer-support',
      'sales-specialist',
      // Content/Writing Categories
      'writing',
      'technical-writer',
      'translator',
      'voice-over',
      'consulting',
      'other'
    ]
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  hourlyRate: {
    type: Number,
    min: 0,
    default: null
  },
  currency: {
    type: String,
    required: true,
    default: 'USDC'
  },
  deliveryTime: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    trim: true,
    default: ''
  },
  requirements: {
    type: String,
    default: ''
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
  badge: {
    type: String,
    enum: [null, 'bronze', 'silver', 'gold'],
    default: null
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumPaymentId: {
    type: String,
    default: null
  },
  premiumStatus: {
    type: String,
    enum: ['pending', 'active', 'rejected'],
    default: null
  },
  premiumRequestedAt: {
    type: Date,
    default: null
  },
  premiumApprovedAt: {
    type: Date,
    default: null
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
serviceSchema.index({ category: 1 });
serviceSchema.index({ seller: 1 });
serviceSchema.index({ title: 'text', description: 'text' }); // For text search

// Add method to calculate badge
serviceSchema.methods.calculateBadge = function() {
  if (this.reviews >= 100 && this.rating >= 4.8) {
    return 'gold';
  } else if (this.reviews >= 50 && this.rating >= 4.5) {
    return 'silver';
  } else if (this.reviews >= 20 && this.rating >= 4.0) {
    return 'bronze';
  }
  return null;
};

// Update the updatedAt timestamp before saving
serviceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('rating') || this.isModified('reviews')) {
    this.badge = this.calculateBadge();
  }
  next();
});

module.exports = mongoose.models.Service || mongoose.model('Service', serviceSchema); 