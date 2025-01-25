const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: 'https://placehold.co/400x400?text=User'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  referredBy: {
    type: String,
    trim: true,
    default: null
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique referral code before saving
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = this.username.toLowerCase() + '-' + Math.random().toString(36).substring(2, 8);
  }
  next();
});

// Only hash password if it's not already hashed
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    // Skip hashing if it's the admin account or test account
    if (this.isAdmin || this.username === 'test') {
      return next();
    }
    try {
      // Check if password is already hashed
      if (!this.password.startsWith('$2b$')) {
        this.password = await bcrypt.hash(this.password, 10);
      }
    } catch (error) {
      console.error('Password hashing error:', error);
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema); 