const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const { awardAffiliatePoints } = require('./points');
const { createNotification } = require('./notifications');
const rateLimit = require('express-rate-limit');
const ipLimiter = require('../middleware/ipLimiter');
const deviceLimiter = require('../middleware/deviceLimiter');

// Modify the rate limiting for registration
const registrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hour window
  max: 10, // increase from 5 to 10 attempts per day
  message: 'Too many accounts created from this IP, please try again after 24 hours',
  standardHeaders: true,
  legacyHeaders: false
});

// Initialize temporary token store (this should be replaced with a proper solution in production)
const tempTokenStore = new Map();

// Register new user
router.post('/register', registrationLimiter, ipLimiter(3), deviceLimiter(2), async (req, res) => {
  try {
    const { username, email, password, image, referralCode, deviceFingerprint, country } = req.body;
    console.log('Registration attempt for username:', username);

    // Enhanced validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Username requirements
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores and hyphens' });
    }

    // Password requirements
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character' 
      });
    }

    // Check if username already exists (case-insensitive)
    const existingUsername = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists (only if email is provided)
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Create user object
    const userData = {
      username,
      password,
      email: email ? email.toLowerCase() : undefined,
      image: image || undefined,
      userType: req.body.userType || 'freelancer', // Add userType with default fallback
      ipAddress: req.clientIp, // Store client IP address
      deviceFingerprint: req.deviceFingerprint || deviceFingerprint || null, // Store device fingerprint
      country: country || null // Store country code
    };

    // If referral code provided, find referring user by username
    if (referralCode) {
      const referringUser = await User.findOne({ username: referralCode });
      if (referringUser) {
        userData.referredBy = referringUser._id;
      }
    }

    // Create and save new user
    const user = new User(userData);
    await user.save();
    console.log('User saved successfully:', { username: user.username });

    // If user was referred, update affiliate relationship and award points
    if (user.referredBy) {
      try {
        const referringUser = await User.findById(user.referredBy);
        if (referringUser) {
          // Add new user to referrer's affiliates list
          await referringUser.addAffiliate(user._id);
          // Award points to referrer
          await awardAffiliatePoints(user.referredBy, user._id);
          console.log('Affiliate points awarded for:', username);
          
          // Create notification for the referrer about new affiliate
          try {
            await createNotification(
              referringUser._id,
              'affiliate',
              `🎉 New affiliate joined! ${user.username} has signed up using your referral code.`,
              '/dashboard'
            );
            console.log('Affiliate notification created for user:', referringUser.username);
          } catch (notificationError) {
            console.error('Error creating affiliate notification:', notificationError);
            // Don't fail registration if notification creation fails
          }
        }
      } catch (error) {
        console.error('Error handling affiliate relationship:', error);
        // Don't fail registration if affiliate handling fails
      }
    }

    // If user was referred, award them points
    if (user.referredBy) {
      // Update the new user's points
      await User.findByIdAndUpdate(
        user._id,
        {
          $inc: { points: 1000 },
          $push: {
            pointsHistory: {
              amount: 1000,
              reason: 'Signup bonus with affiliate code',
              createdAt: new Date()
            }
          }
        },
        { new: true }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    // Return user data and token
    return res.status(201).json({
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      referralCode: user.referralCode,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Error registering user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { identifier, username, password } = req.body;
    
    // Support both old 'username' field and new 'identifier' field for backward compatibility
    const loginIdentifier = identifier || username;

    // Validate required fields
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    // Determine if the identifier is an email or username
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier);
    
    let user;
    if (isEmail) {
      // Find user by email (case-insensitive)
      user = await User.findOne({ 
        email: { $regex: new RegExp(`^${loginIdentifier}$`, 'i') }
      });
    } else {
      // Find user by username (case-insensitive)
      user = await User.findOne({ 
        username: { $regex: new RegExp(`^${loginIdentifier}$`, 'i') }
      });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Handle different password formats
    let isMatch = false;
    
    // For admin or test account with plain text password
    if ((user.isAdmin || user.username === 'test') && password === user.password) {
      isMatch = true;
    } 
    // For hashed passwords
    else if (user.password.startsWith('$2b$')) {
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (error) {
        console.error('Password comparison error:', error);
      }
    }
    // For any other plain text passwords
    else {
      isMatch = password === user.password;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.json({
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      isAdmin: user.isAdmin,
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
    const { username, email, image, currentPassword, newPassword, country } = req.body;
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

    // Update country if provided
    if (country !== undefined) {
      user.country = country;
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      let isValidPassword = false;
      
      // For admin or test account with plain text password
      if ((user.isAdmin || user.username === 'test') && currentPassword === user.password) {
        isValidPassword = true;
      } 
      // For hashed passwords
      else if (user.password.startsWith('$2b$')) {
        isValidPassword = await bcrypt.compare(currentPassword, user.password);
      }
      // For any other plain text passwords
      else {
        isValidPassword = currentPassword === user.password;
      }

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
      country: user.country,
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
    const { username, referralCode } = req.body;

    if (!username || !referralCode) {
      return res.status(400).json({ error: 'Username and referral code are required' });
    }

    // Find user by username and verify referral code (case-insensitive for username)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user || user.referralCode !== referralCode) {
      return res.status(400).json({ error: 'Invalid username or referral code' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Store hashed token and expiry
    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    // Store the token temporarily (this will be cleared after use or expiry)
    tempTokenStore.set(username.toLowerCase(), resetToken);

    // Return success with token (only for development)
    res.json({ 
      message: 'Password reset token generated successfully',
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
    const { username, referralCode, newPassword } = req.body;

    if (!username || !newPassword || !referralCode) {
      return res.status(400).json({ error: 'Username, referral code, and new password are required' });
    }

    // Find user by username and verify referral code
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user || user.referralCode !== referralCode || !user.resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid credentials or expired reset token' });
    }

    // Update password
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // Clear the temporary token
    tempTokenStore.delete(username.toLowerCase());

    res.json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

// Verify referral code
router.post('/verify-referral', auth, async (req, res) => {
  try {
    const { username, referralCode } = req.body;

    if (!username || !referralCode) {
      return res.status(400).json({ error: 'Username and referral code are required' });
    }

    // Find user by username
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Verify the referral code
    if (user.referralCode !== referralCode) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    res.json({ message: 'Referral code verified successfully' });
  } catch (error) {
    console.error('Referral code verification error:', error);
    res.status(500).json({ error: 'Error verifying referral code' });
  }
});

// Add new endpoint for affiliate info
router.get('/affiliates', auth, async (req, res) => {
  try {
    // Find all users who have the current user as their referredBy
    const affiliates = await User.find({ referredBy: req.user.userId })
      .select('username createdAt')
      .sort({ createdAt: -1 });

    res.json({
      affiliateCount: affiliates.length,
      affiliates: affiliates
    });
  } catch (error) {
    console.error('Error fetching affiliate info:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate information' });
  }
});

// Add this new route
router.get('/by-username/:username', auth, async (req, res) => {
  try {
    // Only allow admins to access this route
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Don't remove the @ symbol, just trim whitespace
    const cleanUsername = req.params.username.trim();

    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') }  // Case-insensitive match
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get accounts by IP address (admin only)
router.get('/ip/:ipAddress', auth, async (req, res) => {
  try {
    // Only allow admins to access this route
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const ipAddress = req.params.ipAddress.trim();
    
    const users = await User.find({ ipAddress })
      .select('username email createdAt image userType referredBy')
      .populate('referredBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({
      ipAddress,
      accountCount: users.length,
      accounts: users
    });
  } catch (error) {
    console.error('Error finding users by IP:', error);
    res.status(500).json({ error: 'Failed to fetch users by IP' });
  }
});

// Get multiple registrations (admin only)
router.get('/multiple-registrations', auth, async (req, res) => {
  try {
    // Only allow admins to access this route
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Find IPs with multiple accounts
    const ipCounts = await User.aggregate([
      { $match: { ipAddress: { $ne: null } } },
      { $group: { _id: "$ipAddress", count: { $sum: 1 }, users: { $push: "$username" } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      multipleRegistrations: ipCounts,
      count: ipCounts.length
    });
  } catch (error) {
    console.error('Error finding multiple registrations:', error);
    res.status(500).json({ error: 'Failed to fetch multiple registrations' });
  }
});

// Get accounts by device fingerprint (admin only)
router.get('/device/:fingerprint', auth, async (req, res) => {
  try {
    // Only allow admins to access this route
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const fingerprint = req.params.fingerprint.trim();
    
    const users = await User.find({ deviceFingerprint: fingerprint })
      .select('username email createdAt image userType referredBy ipAddress')
      .populate('referredBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({
      deviceFingerprint: fingerprint,
      accountCount: users.length,
      accounts: users
    });
  } catch (error) {
    console.error('Error finding users by device fingerprint:', error);
    res.status(500).json({ error: 'Failed to fetch users by device fingerprint' });
  }
});

// Get multiple device registrations (admin only)
router.get('/multiple-device-registrations', auth, async (req, res) => {
  try {
    // Only allow admins to access this route
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Find device fingerprints with multiple accounts
    const deviceCounts = await User.aggregate([
      { $match: { deviceFingerprint: { $ne: null } } },
      { $group: { _id: "$deviceFingerprint", count: { $sum: 1 }, users: { $push: "$username" } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      multipleDeviceRegistrations: deviceCounts,
      count: deviceCounts.length
    });
  } catch (error) {
    console.error('Error finding multiple device registrations:', error);
    res.status(500).json({ error: 'Failed to fetch multiple device registrations' });
  }
});

// Verify user status (public endpoint for checking verified users)
router.get('/verify/:username', async (req, res) => {
  try {
    const username = req.params.username.trim();

    // Find user by username (case-insensitive)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).select('username image createdAt isVipAffiliate isAdmin userType');
    
    if (!user) {
      return res.status(404).json({
        username: username,
        isVerified: false,
        message: 'User not found in our database'
      });
    }

    // All registered users are considered "verified" users of Aquads
    // Determine the role and status based on user properties
    let role = 'Registered Affiliate/Listing Agent';
    let hasVipStatus = false;
    
    if (user.isAdmin) {
      role = 'Admin';
    } else if (user.isVipAffiliate) {
      role = 'VIP Affiliate';
      hasVipStatus = true;
    }

    return res.json({
      username: user.username,
      isVerified: true, // All registered users are verified
      role: role,
      hasVipStatus: hasVipStatus,
      profileImage: user.image || 'https://i.imgur.com/6VBx3io.png',
      joinDate: user.createdAt,
      verificationDate: user.createdAt,
      status: 'Active'
    });

  } catch (error) {
    console.error('User verification error:', error);
    res.status(500).json({ 
      error: 'Error verifying user status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user online status
router.get('/status/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username isOnline lastSeen lastActivity');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      userId: user._id,
      username: user.username,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      lastActivity: user.lastActivity
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    res.status(500).json({ message: 'Error fetching user status', error: error.message });
  }
});

// Get multiple users' online status
router.post('/status/bulk', async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('username isOnline lastSeen lastActivity');
    
    const statusMap = {};
    users.forEach(user => {
      statusMap[user._id] = {
        userId: user._id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        lastActivity: user.lastActivity
      };
    });

    res.json(statusMap);
  } catch (error) {
    console.error('Error fetching bulk user status:', error);
    res.status(500).json({ message: 'Error fetching user status', error: error.message });
  }
});

module.exports = router; 