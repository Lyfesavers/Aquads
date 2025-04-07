/**
 * Rate limiter middleware for Twitter raid completions
 * Limits users to a maximum number of completions within a given time window
 */

// Store attempts by user ID and IP address with timestamps
const userAttempts = new Map();
const ipAttempts = new Map();

// Cleanup function to remove old entries (run every hour)
const cleanupOldEntries = () => {
  const now = Date.now();
  
  // Clean user attempts older than 1 hour
  for (const [userId, attempts] of userAttempts.entries()) {
    const filteredAttempts = attempts.filter(timestamp => 
      now - timestamp < 60 * 60 * 1000
    );
    
    if (filteredAttempts.length === 0) {
      userAttempts.delete(userId);
    } else {
      userAttempts.set(userId, filteredAttempts);
    }
  }
  
  // Clean IP attempts older than 10 minutes
  for (const [ip, attempts] of ipAttempts.entries()) {
    const filteredAttempts = attempts.filter(timestamp => 
      now - timestamp < 10 * 60 * 1000
    );
    
    if (filteredAttempts.length === 0) {
      ipAttempts.delete(ip);
    } else {
      ipAttempts.set(ip, filteredAttempts);
    }
  }
};

// Schedule cleanup to run every hour
setInterval(cleanupOldEntries, 60 * 60 * 1000);

// Rate limiter middleware for Twitter raid completions
const twitterRaidRateLimit = (req, res, next) => {
  const now = Date.now();
  const userId = req.user.id;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  // Track user attempts (max 5 completions per hour)
  if (!userAttempts.has(userId)) {
    userAttempts.set(userId, []);
  }
  
  const userAttemptsArr = userAttempts.get(userId);
  const userRecentAttempts = userAttemptsArr.filter(timestamp => 
    now - timestamp < 60 * 60 * 1000
  );
  
  // Track IP attempts (max 3 completions per 10 minutes)
  if (!ipAttempts.has(ip)) {
    ipAttempts.set(ip, []);
  }
  
  const ipAttemptsArr = ipAttempts.get(ip);
  const ipRecentAttempts = ipAttemptsArr.filter(timestamp => 
    now - timestamp < 10 * 60 * 1000
  );
  
  // Apply rate limiting
  if (userRecentAttempts.length >= 5) {
    return res.status(429).json({
      error: 'Rate limit exceeded. You can complete a maximum of 5 Twitter raids per hour.',
      retryAfter: Math.ceil((userAttemptsArr[0] + 60 * 60 * 1000 - now) / 1000 / 60) + ' minutes'
    });
  }
  
  if (ipRecentAttempts.length >= 3) {
    return res.status(429).json({
      error: 'Rate limit exceeded for your network. Please try again later.',
      retryAfter: Math.ceil((ipAttemptsArr[0] + 10 * 60 * 1000 - now) / 1000 / 60) + ' minutes'
    });
  }
  
  // If we get here, add the current timestamp to both arrays
  userAttemptsArr.push(now);
  ipAttemptsArr.push(now);
  
  // Update the maps
  userAttempts.set(userId, userAttemptsArr);
  ipAttempts.set(ip, ipAttemptsArr);
  
  // Continue to the next middleware/route handler
  next();
};

module.exports = {
  twitterRaidRateLimit
}; 