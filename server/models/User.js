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
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String,
    default: null
  },
  emailVerificationExpiry: {
    type: Date,
    default: null
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
  ipAddress: {
    type: String,
    default: null
  },
  country: {
    type: String,
    default: null
  },
  deviceFingerprint: {
    type: String,
    default: null,
    index: true
  },
  telegramId: {
    type: String,
    default: null,
    index: true
  },
  twitterUsername: {
    type: String,
    default: null,
    trim: true
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
  tokens: {
    type: Number,
    default: 0
  },
  powerUps: {
    twoMoves: { type: Number, default: 0 },
    fourMoves: { type: Number, default: 0 }
  },
  tokenHistory: [{
    type: {
      type: String,
      enum: ['purchase', 'spend', 'refund'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    relatedId: {
      type: String,
      default: null
    },
    balanceBefore: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
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
  xpxCardClaimed: {
    type: Boolean,
    default: false
  },
  xpxCardClaimedAt: {
    type: Date,
    default: null
  },
  xpxCardClaims: [{
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
  },
  // Online status tracking fields
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
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