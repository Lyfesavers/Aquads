const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Initialize temporary token store (this should be replaced with a proper solution in production)
const tempTokenStore = new Map();

// Register new user
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt with data:', { 
      username: req.body.username,
      email: req.body.email,
      hasPassword: !!req.body.password,
      image: req.body.image,
      referralCode: req.body.referralCode
    });

    const { username, email, password, image, referralCode } = req.body;

    // Validate required fields
    if (!username || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log('Username already exists:', username);
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists (only if email is provided)
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        console.log('Email already exists:', email);
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Create user object
    const userData = {
      username,
      password,
      email,
      image: image || undefined
    };

    // If referral code provided, find referring user
    if (referralCode) {
      const referringUser = await User.findOne({ referralCode });
      if (referringUser) {
        userData.referredBy = referringUser._id;
      }
    }

    console.log('Creating new user with data:', {
      username: userData.username,
      email: userData.email,
      hasImage: !!userData.image,
      hasReferral: !!userData.referredBy
    });

    // Create and save new user
    const user = new User(userData);
    await user.save();

    console.log('User created successfully:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.status(201).json({
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      token
    });

  } catch (error) {
    console.error('Registration error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Send appropriate error response
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    
    res.status(500).json({ 
      error: 'Registration failed. Please try again.',
      details: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.json({
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, email, image, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If updating email, check if it's already in use
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email.toLowerCase();
    }

    // If updating username, check if it's already in use
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already in use' });
      }
      user.username = username;
    }

    // Update image if provided
    if (image) {
      user.image = image;
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      user.password = newPassword;
    }

    await user.save();

    // Return updated user data without password
    const userData = {
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      referralCode: user.referralCode
    };

    res.json(userData);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Find user by username (case-insensitive)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 10);

      // Store hashed token and expiry
      user.resetToken = hashedToken;
      user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
      await user.save();

      // Store the token temporarily (this will be cleared after use or expiry)
      tempTokenStore.set(username.toLowerCase(), resetToken);
    }

    // For security, always return the same message
    res.json({ 
      message: 'If this username exists, you will receive password reset instructions.',
      token: tempTokenStore.get(username.toLowerCase()) // Only for development!
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Error processing password reset request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }

    // Find user by username
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

module.exports = router; 