const jwt = require('jsonwebtoken');
const User = require('../models/User');

// In-memory cache to track last update times per user (prevents excessive DB writes)
const lastUpdateCache = new Map();

// Clean up cache every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  for (const [userId, lastUpdate] of lastUpdateCache.entries()) {
    if (lastUpdate < oneHourAgo) {
      lastUpdateCache.delete(userId);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get the user ID from the token
    const userId = decoded._id || decoded.userId;
    
    if (!userId) {
      throw new Error('Invalid token: No user ID found');
    }
    
    // Check if user is suspended - Fetch user from database
    const user = await User.findById(userId).select('suspended suspendedReason suspendedAt isAdmin emailVerified referredBy username');
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check suspension status
    if (user.suspended) {
      return res.status(403).json({ 
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support for more information.',
        suspendedReason: user.suspendedReason,
        suspendedAt: user.suspendedAt
      });
    }
    
    // Set both userId and id for better compatibility with different code styles
    req.user = {
      userId: userId,
      id: userId,  // Add this for compatibility
      username: user.username,
      isAdmin: Boolean(user.isAdmin),  // Ensure boolean conversion
      emailVerified: Boolean(user.emailVerified),  // Include email verification status
      referredBy: user.referredBy  // Include referredBy for affiliate detection
    };

    // Update user's lastActivity (rate limited to prevent excessive DB writes)
    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000; // 2 minutes in milliseconds
    
    const lastUpdate = lastUpdateCache.get(userId) || 0;
    
    if (lastUpdate < twoMinutesAgo) {
      // Update the cache first to prevent race conditions
      lastUpdateCache.set(userId, now);
      
      // Update user's lastActivity in database (non-blocking)
      User.findByIdAndUpdate(userId, { lastActivity: new Date() })
        .catch(error => {
          // Silent error handling - don't break the request if update fails
          console.error('Activity update failed for user:', userId, error.message);
        });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth; 