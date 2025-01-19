const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: '/uploads/default-avatar.png'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
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