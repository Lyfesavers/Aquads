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
  facebookUsername: {
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
    workshopSection: {
      type: String,
      default: null
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
  },
  // Free raid project status
  isFreeRaidProject: {
    type: Boolean,
    default: false
  },
  freeRaidsUsedToday: {
    type: Number,
    default: 0
  },
  lastFreeRaidDate: {
    type: Date,
    default: null
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
  },
  // Skills and badges
  skillBadges: [{
    testId: {
      type: Schema.Types.ObjectId,
      ref: 'SkillTest'
    },
    badgeName: String,
    badgeDescription: String,
    badgeIcon: String,
    badgeColor: String,
    score: Number,
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // CV Data
  cv: {
    fullName: {
      type: String,
      default: ''
    },
    summary: {
      type: String,
      default: ''
    },
    education: [{
      institution: {
        type: String,
        required: true
      },
      degree: {
        type: String,
        required: true
      },
      field: {
        type: String,
        required: true
      },
      startDate: {
        type: Date,
        required: true
      },
      endDate: Date,
      current: {
        type: Boolean,
        default: false
      },
      description: String,
      // Verification contacts
      contactName: {
        type: String,
        required: false
      },
      contactTitle: {
        type: String,
        required: false
      },
      contactEmail: {
        type: String,
        required: false
      },
      contactPhone: String,
      contactDepartment: {
        type: String,
        required: false
      }
    }],
    experience: [{
      company: {
        type: String,
        required: true
      },
      position: {
        type: String,
        required: true
      },
      startDate: {
        type: Date,
        required: true
      },
      endDate: Date,
      current: {
        type: Boolean,
        default: false
      },
      description: String,
      // Verification contacts
      contactName: {
        type: String,
        required: false
      },
      contactTitle: {
        type: String,
        required: false
      },
      contactEmail: {
        type: String,
        required: false
      },
      contactPhone: String,
      contactDepartment: {
        type: String,
        required: false
      }
    }],
    skills: [String],
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationNotes: String
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

// Check if user is eligible for free raid
userSchema.methods.checkFreeRaidEligibility = function() {
  if (!this.isFreeRaidProject) {
    return { eligible: false, reason: 'Not a free raid project' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if it's a new day
  if (!this.lastFreeRaidDate || this.lastFreeRaidDate < today) {
    return { eligible: true, raidsRemaining: 2, raidsUsedToday: 0 };
  }

  // Same day, check usage
  if (this.freeRaidsUsedToday >= 2) {
    return { eligible: false, reason: 'Daily limit reached', raidsRemaining: 0, raidsUsedToday: this.freeRaidsUsedToday };
  }

  return { 
    eligible: true, 
    raidsRemaining: 2 - this.freeRaidsUsedToday, 
    raidsUsedToday: this.freeRaidsUsedToday 
  };
};

// Use a free raid
userSchema.methods.useFreeRaid = async function() {
  const eligibility = this.checkFreeRaidEligibility();
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset if it's a new day
  if (!this.lastFreeRaidDate || this.lastFreeRaidDate < today) {
    this.freeRaidsUsedToday = 0;
  }

  this.freeRaidsUsedToday += 1;
  this.lastFreeRaidDate = new Date();
  await this.save();

  return { 
    raidsRemaining: 2 - this.freeRaidsUsedToday, 
    raidsUsedToday: this.freeRaidsUsedToday 
  };
};

// Add performance indexes for better query performance
userSchema.index({ isAdmin: 1 }); // For admin checks
userSchema.index({ userType: 1 }); // For user type filtering
userSchema.index({ isOnline: 1, lastActivity: 1 }); // For online status queries
userSchema.index({ referredBy: 1 }); // For affiliate queries
userSchema.index({ isFreeRaidProject: 1 }); // For free raid eligibility

module.exports = mongoose.model('User', userSchema); 