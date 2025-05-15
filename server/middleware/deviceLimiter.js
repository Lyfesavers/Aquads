const User = require('../models/User');

/**
 * Middleware to limit the number of accounts that can be created from a single device
 * @param {number} maxAccountsPerDevice - Maximum number of accounts allowed per device fingerprint
 * @returns {Function} Express middleware function
 */
const deviceLimiter = (maxAccountsPerDevice = 2) => {
  return async (req, res, next) => {
    try {
      // If no device fingerprint provided, skip this check
      if (!req.body.deviceFingerprint) {
        return next();
      }
      
      const fingerprint = req.body.deviceFingerprint;
      
      // Store the fingerprint in the request for later use during user creation
      req.deviceFingerprint = fingerprint;
      
      // Count existing accounts with this device fingerprint
      const accountCount = await User.countDocuments({ deviceFingerprint: fingerprint });
      
      // If the device has reached the maximum allowed accounts
      if (accountCount >= maxAccountsPerDevice) {
        console.log(`Device with fingerprint ${fingerprint.substring(0, 8)}... has reached the maximum account limit (${maxAccountsPerDevice})`);
        return res.status(403).json({ 
          error: `Maximum number of accounts (${maxAccountsPerDevice}) reached for this device`
        });
      }
      
      next();
    } catch (error) {
      console.error('Device limiting middleware error:', error);
      // Let the request proceed if there's an error with the device check
      next();
    }
  };
};

module.exports = deviceLimiter; 