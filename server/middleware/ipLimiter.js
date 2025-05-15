const User = require('../models/User');

/**
 * Middleware to limit the number of accounts that can be created from a single IP address
 * @param {number} maxAccountsPerIp - Maximum number of accounts allowed per IP address
 * @returns {Function} Express middleware function
 */
const ipLimiter = (maxAccountsPerIp = 3) => {
  return async (req, res, next) => {
    try {
      // Get the client's IP address
      const ip = req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress || 
                 req.ip || 
                 '0.0.0.0';
      
      // Clean the IP in case it comes with IPv6 prefix (::ffff:127.0.0.1)
      const cleanIp = ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip;
      
      // Store the IP in the request for later use during user creation
      req.clientIp = cleanIp;
      
      // Count existing accounts with this IP
      const accountCount = await User.countDocuments({ ipAddress: cleanIp });
      
      // If the IP has reached the maximum allowed accounts
      if (accountCount >= maxAccountsPerIp) {
        console.log(`IP ${cleanIp} has reached the maximum account limit (${maxAccountsPerIp})`);
        return res.status(403).json({ 
          error: `Maximum number of accounts (${maxAccountsPerIp}) reached for this IP address`
        });
      }
      
      next();
    } catch (error) {
      console.error('IP limiting middleware error:', error);
      // Let the request proceed if there's an error with the IP check
      next();
    }
  };
};

module.exports = ipLimiter; 