const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = require('mongoose');

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  userType: {
    type: String,
    required: true,
    enum: ['freelancer', 'project'],
    default: 'freelancer'
  },
  password: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: 'https://i.imgur.com/6VBx3io.png'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  affiliates: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  affiliateCount: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  pointsHistory: [{
    amount: Number,
    reason: String,
    referredUser: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game'
    },
    socialRaidId: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  giftCardRedemptions: [{
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: Date,
    processedBy: String
  }],
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isVipAffiliate: {
    type: Boolean,
    default: false
  }
});

// Generate referral code before saving
userSchema.pre('save', function(next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = this.username + Math.random().toString(36).substring(2, 8);
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } else {
      next();
    }
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Update affiliate count when new affiliate is added
userSchema.methods.updateAffiliateCount = async function() {
  this.affiliateCount = this.affiliates.length;
  await this.save();
};

// Add affiliate to user's list
userSchema.methods.addAffiliate = async function(affiliateId) {
  if (!this.affiliates.includes(affiliateId)) {
    this.affiliates.push(affiliateId);
    await this.updateAffiliateCount();
  }
};

module.exports = mongoose.model('User', userSchema); 