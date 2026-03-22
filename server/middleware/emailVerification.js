const requireEmailVerification = (req, res, next) => {
  // This middleware must be used after auth middleware
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // auth middleware already fetches the user and sets req.user.emailVerified
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email before accessing this feature. Check your inbox for the verification code.',
      emailVerificationRequired: true
    });
  }

  next();
};

module.exports = requireEmailVerification; 