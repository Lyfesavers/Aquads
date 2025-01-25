const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, image, referralCode } = req.body;

    console.log('Registration attempt:', { username, email, hasPassword: !!password, image: !!image, hasReferralCode: !!referralCode });

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Validate referral code if provided
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
      referredBy = referrer.username;
    }

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      image: image || undefined,
      referredBy
    });

    console.log('Creating user with data:', {
      username: user.username,
      email: user.email,
      hasImage: !!user.image,
      referredBy: user.referredBy
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userData = {
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      referralCode: user.referralCode,
      token
    };

    res.status(201).json(userData);
  } catch (error) {
    console.error('Registration error details:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error creating user account: ' + error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userData = {
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      referralCode: user.referralCode,
      token
    };

    res.json(userData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
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

module.exports = router; 