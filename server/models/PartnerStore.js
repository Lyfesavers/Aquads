const mongoose = require('mongoose');
const { Schema } = mongoose;

const partnerStoreSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Logo must be a valid image URL'
    }
  },
  website: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/i.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  category: {
    type: String,
    required: true,
    enum: [
      // Crypto & Web3
      'DeFi & Crypto',
      'NFT & Gaming',
      'Web3 Services',
      'Crypto Hardware',
      
      // Essential Categories
      'Food & Beverage',
      'Clothing & Fashion',
      'Books & Education',
      'Technology & Software',
      
      // Lifestyle & Services
      'Health & Fitness',
      'Travel & Tourism',
      'Entertainment & Media',
      'Home & Garden',
      
      // Professional Services
      'Business Services',
      'Financial Services',
      'Marketing & Design',
      'Development & IT',
      
      // Retail
      'Electronics & Gadgets',
      'Sports & Outdoors',
      'Beauty & Personal Care',
      'Automotive',
      
      // Other
      'Subscriptions & SaaS',
      'Gift Cards & Vouchers',
      'Other'
    ]
  },
  
  // Available discount offers
  discountOffers: [{
    pointTier: {
      type: Number,
      required: true,
      enum: [2000, 4000, 6000, 8000, 10000]
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    discountCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    terms: {
      type: String,
      default: 'Standard terms and conditions apply'
    },
    expiryDate: {
      type: Date,
      required: true
    },
    usageType: {
      type: String,
      enum: ['single-use', 'multi-use'],
      default: 'multi-use'
    },
    maxRedemptions: {
      type: Number,
      default: null // null means unlimited
    },
    currentRedemptions: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Partner contact info
  contactEmail: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  
  // Admin fields
  isActive: {
    type: Boolean,
    default: false // Requires admin approval
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  
  // Analytics
  totalRedemptions: {
    type: Number,
    default: 0
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

// Update the updatedAt field on save
partnerStoreSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for performance
partnerStoreSchema.index({ isActive: 1, category: 1 });
partnerStoreSchema.index({ 'discountOffers.pointTier': 1 });
partnerStoreSchema.index({ name: 'text', description: 'text' });

// Virtual for active offers
partnerStoreSchema.virtual('activeOffers').get(function() {
  return this.discountOffers.filter(offer => 
    offer.isActive && 
    offer.expiryDate > new Date() &&
    (offer.maxRedemptions === null || offer.currentRedemptions < offer.maxRedemptions)
  );
});

// Method to check if user can redeem an offer
partnerStoreSchema.methods.canUserRedeem = function(offerId, userPoints) {
  const offer = this.discountOffers.id(offerId);
  if (!offer || !offer.isActive || offer.expiryDate <= new Date()) {
    return { canRedeem: false, reason: 'Offer not available' };
  }
  
  if (offer.maxRedemptions && offer.currentRedemptions >= offer.maxRedemptions) {
    return { canRedeem: false, reason: 'Offer limit reached' };
  }
  
  if (userPoints < offer.pointTier) {
    return { canRedeem: false, reason: 'Insufficient points' };
  }
  
  return { canRedeem: true };
};

module.exports = mongoose.model('PartnerStore', partnerStoreSchema);
