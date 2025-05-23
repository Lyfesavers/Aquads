// Simple in-memory rate limiter
const userAttempts = new Map();
const ipAttempts = new Map();

// Clean up old entries every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const hourAgo = now - 3600000;
  
  for (const [key, attempts] of userAttempts.entries()) {
    const filtered = attempts.filter(time => time > hourAgo);
    if (filtered.length === 0) {
      userAttempts.delete(key);
    } else {
      userAttempts.set(key, filtered);
    }
  }
  
  for (const [key, attempts] of ipAttempts.entries()) {
    const filtered = attempts.filter(time => time > hourAgo);
    if (filtered.length === 0) {
      ipAttempts.delete(key);
    } else {
      ipAttempts.set(key, filtered);
    }
  }
}, 3600000);

// Rate limit middleware for Twitter raid completions
const twitterRaidRateLimit = (req, res, next) => {
  // Safely get the user ID - check all possible properties
  const userId = req.user.id || req.user.userId || req.user._id;
  
  if (!userId) {
    console.error('Could not determine user ID in rate limiter:', req.user);
    return res.status(400).json({ 
      error: 'User identification not found. Please try again or contact support.'
    });
  }
  
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Get user attempts within the last hour
  const userRaidAttempts = userAttempts.get(userId.toString()) || [];
  const recentUserAttempts = userRaidAttempts.filter(time => time > now - 3600000);
  
  // Get IP attempts within the last 10 minutes
  const ipRaidAttempts = ipAttempts.get(ip) || [];
  const recentIpAttempts = ipRaidAttempts.filter(time => time > now - 600000);
  
  // For debugging
  console.log(`Rate limit check - User ${userId}: ${recentUserAttempts.length}/5 attempts, IP ${ip}: ${recentIpAttempts.length}/3 attempts`);
  
  // Max 5 completions per user per hour
  if (recentUserAttempts.length >= 5) {
    console.log(`Rate limit exceeded for user ${userId}`);
    return res.status(429).json({
      error: 'Rate limit exceeded. You can only complete 5 Twitter raids per hour.'
    });
  }
  
  // Max 3 completions per IP per 10 minutes
  if (recentIpAttempts.length >= 3) {
    console.log(`Rate limit exceeded for IP ${ip}`);
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait before completing more Twitter raids.'
    });
  }
  
  // Add current attempt
  userRaidAttempts.push(now);
  ipRaidAttempts.push(now);
  
  // Update maps - ensure we're using strings for user IDs
  userAttempts.set(userId.toString(), userRaidAttempts);
  ipAttempts.set(ip, ipRaidAttempts);
  
  next();
};

module.exports = { twitterRaidRateLimit }; 