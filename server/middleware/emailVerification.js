const User = require('../models/User');

const requireEmailVerification = async (req, res, next) => {
  try {
    // This middleware should be used after auth middleware
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user from database to check verification status
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has an email and if it's verified (ALL users must verify)
    if (user.email && !user.emailVerified) {
      return res.status(403).json({ 
        error: 'Email verification required',
        message: 'Please verify your email before accessing this feature. Check your inbox for the verification code.',
        emailVerificationRequired: true
      });
    }

    // If user has no email or email is verified, proceed
    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = requireEmailVerification; 