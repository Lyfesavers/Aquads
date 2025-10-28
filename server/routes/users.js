const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const { awardAffiliatePoints, awardPendingAffiliatePoints } = require('./points');
const { createNotification } = require('./notifications');
const rateLimit = require('express-rate-limit');
const ipLimiter = require('../middleware/ipLimiter');
const deviceLimiter = require('../middleware/deviceLimiter');
const { emitAffiliateEarningUpdate } = require('../socket');

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
    const { username, fullName, email, password, image, referralCode, deviceFingerprint, country } = req.body;


    // Enhanced validation
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required for verification' });
    }

    // Full name validation
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required (at least 2 characters)' });
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

    // Validate and check email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create user object
    const userData = {
      username,
      password,
      email: email.toLowerCase(),
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: verificationExpiry,
      emailVerified: false,
      image: image || undefined,
      userType: req.body.userType || 'freelancer', // Add userType with default fallback
      ipAddress: req.clientIp, // Store client IP address
      deviceFingerprint: req.deviceFingerprint || deviceFingerprint || null, // Store device fingerprint
      country: country || null, // Store country code
      tokens: (req.body.userType || 'freelancer') === 'freelancer' ? 5 : 0, // Only give tokens to freelancers
      tokenHistory: (req.body.userType || 'freelancer') === 'freelancer' ? [{
        type: 'purchase',
        amount: 5,
        reason: 'Signup bonus tokens',
        relatedId: null,
        balanceBefore: 0,
        balanceAfter: 5,
        createdAt: new Date()
      }] : [], // Empty token history for non-freelancers
      cv: {
        fullName: fullName.trim() // Save full name to cv object
      }
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


    // If user was referred, update affiliate relationship and award points
    if (user.referredBy) {
      try {
        const referringUser = await User.findById(user.referredBy);
        if (referringUser) {
          // Add new user to referrer's affiliates list
          await referringUser.addAffiliate(user._id);
          
          // Emit real-time update for affiliate count change
          emitAffiliateEarningUpdate({
            affiliateId: referringUser._id,
            type: 'newAffiliate',
            affiliateCount: referringUser.affiliateCount,
            newAffiliateId: user._id,
            newAffiliateUsername: user.username
          });
          
          // Points will be awarded after email verification

          
          // Create notification for the referrer about new affiliate
          try {
            await createNotification(
              referringUser._id,
              'affiliate',
              `🎉 New affiliate joined! ${user.username} has signed up using your referral code.`,
              '/dashboard'
            );

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

    // Signup bonus points will be awarded after email verification


    // Generate JWT token (don't include emailVerified since user hasn't verified yet)
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin, emailVerified: false, userType: user.userType, referredBy: user.referredBy },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    // Return user data and token with verification info
    return res.status(201).json({
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      referralCode: user.referralCode,
      referredBy: user.referredBy, // Include referredBy for affiliate detection
      userType: user.userType,
      cv: user.cv, // Include CV data for display name functionality
      token,
      emailVerified: false,
      verificationRequired: true,
      verificationCode: verificationCode, // Send code to frontend for EmailJS
      message: 'Account created! Please check your email for verification code.'
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

    // Check if email verification is required (ALL users must verify)
    if (user.email && !user.emailVerified) {
      return res.status(403).json({ 
        error: 'Email verification required',
        message: 'Please verify your email before logging in. Check your inbox for the verification code.',
        emailVerificationRequired: true,
        email: user.email
      });
    }

    // Update last activity on successful login
    user.lastActivity = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin, emailVerified: user.emailVerified, userType: user.userType, referredBy: user.referredBy },
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
      emailVerified: user.emailVerified,
      userType: user.userType,
      referredBy: user.referredBy, // Include referredBy for affiliate detection
      cv: user.cv, // Include CV data for display name functionality
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
    const { username, fullName, email, image, currentPassword, newPassword, country } = req.body;
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

    // Update fullName if provided (stored in cv object)
    if (fullName !== undefined) {
      if (!user.cv) {
        user.cv = {};
      }
      user.cv.fullName = fullName.trim();
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
      referralCode: user.referralCode,
      cv: user.cv // Include cv data so frontend gets fullName
    };

    res.json(userData);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Get user CV
router.get('/cv/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('cv username');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ cv: user.cv || {}, username: user.username });
  } catch (error) {
    console.error('Get CV error:', error);
    res.status(500).json({ error: 'Error fetching CV' });
  }
});

// Update user CV
router.put('/cv', auth, async (req, res) => {
  try {
    const { fullName, summary, education, experience, skills } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize CV object if it doesn't exist
    if (!user.cv) {
      user.cv = {};
    }

    // Update CV fields
    if (fullName !== undefined) user.cv.fullName = fullName;
    if (summary !== undefined) user.cv.summary = summary;
    if (education) user.cv.education = education;
    if (experience) user.cv.experience = experience;
    if (skills) user.cv.skills = skills;
    
    user.cv.lastUpdated = new Date();

    await user.save();

    res.json({ 
      message: 'CV updated successfully',
      cv: user.cv 
    });
  } catch (error) {
    console.error('CV update error:', error);
    res.status(500).json({ error: 'Error updating CV' });
  }
});

// Delete user CV
router.delete('/cv', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.cv = undefined;
    await user.save();

    res.json({ message: 'CV deleted successfully' });
  } catch (error) {
    console.error('CV delete error:', error);
    res.status(500).json({ error: 'Error deleting CV' });
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

    // Also get the current user's stored affiliateCount for comparison
    const currentUser = await User.findById(req.user.userId).select('affiliateCount');
    
    // Check if there's a discrepancy between the actual count and stored count
    const actualCount = affiliates.length;
    const storedCount = currentUser.affiliateCount || 0;
    
    // If there's a discrepancy, fix it
    if (actualCount !== storedCount) {
      console.warn(`Affiliate count mismatch for user ${req.user.userId}: actual=${actualCount}, stored=${storedCount}. Fixing...`);
      
      // Update the stored count to match the actual count
      try {
        await User.findByIdAndUpdate(req.user.userId, { 
          affiliateCount: actualCount,
          affiliates: affiliates.map(affiliate => affiliate._id)
        });
      } catch (updateError) {
        console.error('Error updating affiliate count:', updateError);
        // Don't fail the request if update fails, just log it
      }
    }

    res.json({
      affiliateCount: actualCount, // Always return the actual count
      affiliates: affiliates,
      syncStatus: actualCount === storedCount ? 'synced' : 'fixed'
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

// Email verification endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Update user as verified
    user.emailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpiry = null;
    await user.save();

    // Award pending affiliate points to referrer
    if (user.referredBy) {
      try {
        await awardPendingAffiliatePoints(user._id);

      } catch (error) {
        console.error('Error awarding pending affiliate points:', error);
      }
    }

    // Award signup bonus points to new user
    if (user.referredBy) {
      await User.findByIdAndUpdate(
        user._id,
        {
          $inc: { points: 1000 },
          $push: {
            pointsHistory: {
              amount: 1000,
              reason: 'Signup bonus with affiliate code (email verified)',
              createdAt: new Date()
            }
          }
        },
        { new: true }
      );
    }

    // Update last activity for email verification
    user.lastActivity = new Date();
    await user.save();

    // Generate new JWT token with updated verification status
    const newToken = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin, emailVerified: true, userType: user.userType, referredBy: user.referredBy },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    // Create message based on user type
    const message = user.userType === 'freelancer' 
      ? 'Email verified successfully! Points have been awarded. You also received 5 bonus tokens on signup.'
      : 'Email verified successfully! Points have been awarded.';

    res.json({ 
      message: message,
      emailVerified: true,
      token: newToken,
      userId: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      isAdmin: user.isAdmin,
      userType: user.userType,
      referredBy: user.referredBy // Include referredBy for affiliate detection
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Error verifying email' });
  }
});

// Resend verification code endpoint
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      emailVerified: false
    });

    if (!user) {
      return res.status(400).json({ error: 'User not found or already verified' });
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpiry = verificationExpiry;
    await user.save();

    res.json({ 
      message: 'Verification code resent successfully!',
      verificationCode: verificationCode // Send to frontend for EmailJS
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Error resending verification code' });
  }
});

// Simple AquaFi deposit tracking
router.post('/aquafi-deposit', auth, async (req, res) => {
  const { poolId, userAddress, depositAmount, tokenSymbol } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Initialize array if it doesn't exist
    if (!user.aquafiBaselines) {
      user.aquafiBaselines = [];
    }

    // Find existing entry for this pool
    const existingIndex = user.aquafiBaselines.findIndex(
      b => b.poolId === poolId && b.userAddress.toLowerCase() === userAddress.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Add to existing deposit amount
      user.aquafiBaselines[existingIndex].originalAmount += depositAmount;
      user.aquafiBaselines[existingIndex].updatedAt = new Date();
    } else {
      // Create new entry
      user.aquafiBaselines.push({
        poolId,
        userAddress: userAddress.toLowerCase(),
        originalAmount: depositAmount,
        tokenSymbol,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving deposit:', err.message);
    res.status(500).send('Server Error');
  }
});

// Remove AquaFi baseline after withdrawal
router.delete('/aquafi-baseline', auth, async (req, res) => {
  const { poolId, userAddress } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Initialize array if it doesn't exist
    if (!user.aquafiBaselines) {
      user.aquafiBaselines = [];
    }

    // Remove the baseline entry for this pool
    user.aquafiBaselines = user.aquafiBaselines.filter(
      b => !(b.poolId === poolId && b.userAddress.toLowerCase() === userAddress.toLowerCase())
    );

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing baseline:', err.message);
    res.status(500).send('Server Error');
  }
});

// Partner Store Management Routes (following existing patterns)

// Create/Update partner store (for project users)
router.post('/partner-store', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { storeName, storeDescription, storeLogo, storeWebsite, storeCategory, discountOffers } = req.body;
    
    // Validate required fields
    if (!storeName || !storeDescription || !storeLogo || !storeWebsite || !storeCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is project type
    if (user.userType !== 'project') {
      return res.status(403).json({ error: 'Only project users can create partner stores' });
    }
    
    // Update user's partner store info
    user.partnerStore = {
      isPartner: true,
      storeName,
      storeDescription,
      storeLogo,
      storeWebsite,
      storeCategory,
      discountOffers: discountOffers || [],
      partnerStatus: 'pending',
      partnerSince: new Date()
    };
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Partner store created successfully! Awaiting admin approval.',
      partnerStore: user.partnerStore 
    });
  } catch (error) {
    console.error('Error creating partner store:', error);
    res.status(500).json({ error: 'Failed to create partner store' });
  }
});

// Get all approved partner stores (public)
router.get('/partner-stores', async (req, res) => {
  try {
    const partners = await User.find({
      'partnerStore.isPartner': true,
      'partnerStore.partnerStatus': 'approved'
    }).select('username partnerStore');
    
    res.json(partners);
  } catch (error) {
    console.error('Error fetching partner stores:', error);
    res.status(500).json({ error: 'Failed to fetch partner stores' });
  }
});

// Redeem points for partner discount (authenticated users)
router.post('/redeem-partner/:partnerId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { partnerId } = req.params;
    const { offerId } = req.body;
    
    const [user, partner] = await Promise.all([
      User.findById(userId),
      User.findById(partnerId)
    ]);
    
    if (!user || !partner) {
      return res.status(404).json({ error: 'User or partner not found' });
    }
    
    if (!partner.partnerStore.isPartner || partner.partnerStore.partnerStatus !== 'approved') {
      return res.status(400).json({ error: 'Partner store not available' });
    }
    
    const offer = partner.partnerStore.discountOffers.id(offerId);
    if (!offer || !offer.isActive) {
      return res.status(400).json({ error: 'Offer not available' });
    }
    
    if (user.points < offer.pointTier) {
      return res.status(400).json({ error: 'Insufficient points' });
    }
    
    // Create redemption
    const redemption = {
      partnerId: partnerId,
      partnerName: partner.partnerStore.storeName,
      offerTitle: offer.title,
      offerDescription: offer.description,
      pointsUsed: offer.pointTier,
      discountCode: offer.discountCode
    };
    
    // Update user points and add redemption
    user.points -= offer.pointTier;
    user.pointsHistory.push({
      amount: -offer.pointTier,
      reason: `Redeemed for ${partner.partnerStore.storeName}: ${offer.title}`,
      createdAt: new Date()
    });
    user.partnerRedemptions.push(redemption);
    
    // Update partner stats
    offer.redemptionCount += 1;
    partner.partnerStore.totalRedemptions += 1;
    
    await Promise.all([user.save(), partner.save()]);
    
    res.json({
      success: true,
      redemption: {
        ...redemption,
        partnerWebsite: partner.partnerStore.storeWebsite
      },
      newPointsBalance: user.points
    });
  } catch (error) {
    console.error('Error redeeming partner offer:', error);
    res.status(500).json({ error: 'Failed to redeem offer' });
  }
});

// Admin: Get pending partner stores
router.get('/admin/pending-partners', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const pendingPartners = await User.find({
      'partnerStore.isPartner': true,
      'partnerStore.partnerStatus': 'pending'
    }).select('username email partnerStore createdAt');
    
    res.json(pendingPartners);
  } catch (error) {
    console.error('Error fetching pending partners:', error);
    res.status(500).json({ error: 'Failed to fetch pending partners' });
  }
});

// Admin: Get all partner stores by status
router.get('/admin/all-partners', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status } = req.query;
    const query = {
      'partnerStore.isPartner': true
    };
    
    if (status && status !== 'all') {
      query['partnerStore.partnerStatus'] = status;
    }
    
    const partners = await User.find(query)
      .select('username email partnerStore createdAt')
      .populate('partnerStore.approvedBy', 'username')
      .sort({ 'partnerStore.partnerSince': -1, createdAt: -1 });
    
    res.json(partners);
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

// Admin: Approve partner store
router.post('/admin/approve-partner/:partnerId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const partner = await User.findById(req.params.partnerId);
    if (!partner || !partner.partnerStore.isPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    partner.partnerStore.partnerStatus = 'approved';
    partner.partnerStore.approvedBy = req.user.userId;
    partner.partnerStore.approvedAt = new Date();
    
    await partner.save();
    
    res.json({ success: true, message: 'Partner approved successfully' });
  } catch (error) {
    console.error('Error approving partner:', error);
    res.status(500).json({ error: 'Failed to approve partner' });
  }
});

// Admin: Reject partner store
router.post('/admin/reject-partner/:partnerId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const partner = await User.findById(req.params.partnerId);
    if (!partner || !partner.partnerStore.isPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    partner.partnerStore.partnerStatus = 'rejected';
    
    await partner.save();
    
    res.json({ success: true, message: 'Partner rejected successfully' });
  } catch (error) {
    console.error('Error rejecting partner:', error);
    res.status(500).json({ error: 'Failed to reject partner' });
  }
});

// Admin: Create partner store directly
router.post('/admin/create-partner', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { storeName, storeDescription, storeLogo, storeWebsite, storeCategory, discountOffers } = req.body;
    
    // Validate required fields
    if (!storeName || !storeDescription || !storeLogo || !storeWebsite || !storeCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create a new user account for this partner
    const partnerUser = new User({
      username: storeName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_partner',
      email: `${storeName.toLowerCase().replace(/[^a-z0-9]/g, '')}@partner.aquads.com`,
      password: 'admin_created_partner_' + Date.now(), // Temporary password
      userType: 'project',
      isEmailVerified: true,
      partnerStore: {
        isPartner: true,
        storeName,
        storeDescription,
        storeLogo,
        storeWebsite,
        storeCategory,
        discountOffers: discountOffers || [],
        partnerStatus: 'approved', // Auto-approve admin-created partners
        approvedBy: req.user.userId,
        approvedAt: new Date(),
        partnerSince: new Date()
      }
    });
    
    await partnerUser.save();
    
    res.json({ 
      success: true, 
      message: 'Partner store created and approved successfully!',
      partner: {
        id: partnerUser._id,
        username: partnerUser.username,
        partnerStore: partnerUser.partnerStore
      }
    });
  } catch (error) {
    console.error('Error creating partner store:', error);
    res.status(500).json({ error: 'Failed to create partner store' });
  }
});

// Admin: Delete partner store
router.delete('/admin/delete-partner/:partnerId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const partner = await User.findById(req.params.partnerId);
    if (!partner || !partner.partnerStore.isPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    // Reset partner store data
    partner.partnerStore = {
      isPartner: false,
      partnerStatus: 'pending'
    };
    
    await partner.save();
    
    res.json({ 
      success: true, 
      message: 'Partner store deleted successfully!' 
    });
  } catch (error) {
    console.error('Error deleting partner store:', error);
    res.status(500).json({ error: 'Failed to delete partner store' });
  }
});

// ===== MEMBERSHIP SYSTEM ENDPOINTS =====

// Subscribe to membership
router.post('/membership/subscribe', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already has active membership
    if (user.membership.isActive) {
      return res.status(400).json({ error: 'You already have an active membership' });
    }
    
    // Check if user has enough points
    if (user.points < user.membership.monthlyCost) {
      return res.status(400).json({ 
        error: `Insufficient points. You need ${user.membership.monthlyCost} points to subscribe.` 
      });
    }
    
    // Generate member ID
    const memberId = user.generateMemberId();
    
    // Calculate dates
    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    
    // Activate membership
    user.membership = {
      isActive: true,
      memberId: memberId,
      startDate: now,
      nextBillingDate: nextBilling,
      autoRenew: true,
      gracePeriodEnds: null,
      monthlyCost: 1000
    };
    
    // Deduct points
    user.points -= user.membership.monthlyCost;
    
    // Add to points history
    user.pointsHistory.push({
      amount: -user.membership.monthlyCost,
      reason: 'Monthly membership subscription',
      createdAt: now
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Membership activated successfully!',
      membership: user.membership,
      pointsRemaining: user.points
    });
  } catch (error) {
    console.error('Error subscribing to membership:', error);
    res.status(500).json({ error: 'Failed to subscribe to membership' });
  }
});

// Cancel membership
router.post('/membership/cancel', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.membership.isActive) {
      return res.status(400).json({ error: 'No active membership to cancel' });
    }
    
    // Disable auto-renewal
    user.membership.autoRenew = false;
    user.membership.isActive = false;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Membership cancelled successfully. Access will continue until your current billing period ends.',
      membership: user.membership
    });
  } catch (error) {
    console.error('Error cancelling membership:', error);
    res.status(500).json({ error: 'Failed to cancel membership' });
  }
});

// Get membership status
router.get('/membership/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      membership: user.membership,
      points: user.points,
      canSubscribe: user.points >= user.membership.monthlyCost && !user.membership.isActive
    });
  } catch (error) {
    console.error('Error getting membership status:', error);
    res.status(500).json({ error: 'Failed to get membership status' });
  }
});

// Partner: Verify membership
router.post('/membership/verify', async (req, res) => {
  try {
    const { memberId } = req.body;
    
    if (!memberId) {
      return res.status(400).json({ error: 'Member ID is required' });
    }
    
    const user = await User.findOne({ 'membership.memberId': memberId });
    
    if (!user) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Invalid member ID' 
      });
    }
    
    // Check if membership is active
    const now = new Date();
    const isActive = user.membership.isActive && 
                    user.membership.nextBillingDate > now;
    
    res.json({
      valid: isActive,
      member: {
        username: user.username,
        memberId: user.membership.memberId,
        isActive: isActive,
        nextBillingDate: user.membership.nextBillingDate
      }
    });
  } catch (error) {
    console.error('Error verifying membership:', error);
    res.status(500).json({ error: 'Failed to verify membership' });
  }
});

module.exports = router; 