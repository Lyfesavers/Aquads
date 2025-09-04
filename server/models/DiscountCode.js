const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscount: {
    type: Number,
    default: null // Maximum discount amount for percentage discounts
  },
  applicableTo: {
    type: [String],
    enum: ['listing', 'bump', 'addons'],
    default: ['listing', 'bump', 'addons']
  },
  usageLimit: {
    type: Number,
    default: null // null means unlimited usage
  },
  usedCount: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null // null means no expiration
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
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

// Update the updatedAt field before saving
discountCodeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if code is valid
discountCodeSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if code is active
  if (!this.isActive) return false;
  
  // Check if code has expired
  if (this.validUntil && now > this.validUntil) return false;
  
  // Check if code has reached usage limit
  if (this.usageLimit && this.usedCount >= this.usageLimit) return false;
  
  return true;
};

// Method to calculate discount amount
discountCodeSchema.methods.calculateDiscount = function(originalAmount) {
  if (!this.isValid()) return 0;
  
  let discountAmount = 0;
  
  if (this.discountType === 'percentage') {
    discountAmount = (originalAmount * this.discountValue) / 100;
    if (this.maxDiscount && discountAmount > this.maxDiscount) {
      discountAmount = this.maxDiscount;
    }
  } else if (this.discountType === 'fixed') {
    discountAmount = this.discountValue;
    if (discountAmount > originalAmount) {
      discountAmount = originalAmount;
    }
  }
  
  return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
};

// Method to increment usage count
discountCodeSchema.methods.incrementUsage = function() {
  this.usedCount += 1;
  return this.save();
};

// Static method to find valid discount code
discountCodeSchema.statics.findValidCode = async function(code, applicableTo = null) {
  const query = { code: code.toUpperCase() };
  if (applicableTo) {
    query.applicableTo = applicableTo;
  }
  
  const discountCode = await this.findOne(query);
  
  if (!discountCode || !discountCode.isValid()) {
    return null;
  }
  
  return discountCode;
};

// Performance indexes for common queries
// Note: code field already has unique index from schema
discountCodeSchema.index({ isActive: 1, validUntil: 1 }); // For valid codes
discountCodeSchema.index({ applicableTo: 1, isActive: 1 }); // For applicable codes
discountCodeSchema.index({ createdBy: 1, createdAt: -1 }); // For creator's codes
discountCodeSchema.index({ isActive: 1, createdAt: -1 }); // For active codes by date
discountCodeSchema.index({ validFrom: 1, validUntil: 1 }); // For validity period queries

module.exports = mongoose.model('DiscountCode', discountCodeSchema); 