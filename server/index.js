require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const compression = require('compression');
const Ad = require('./models/Ad');
const User = require('./models/User');
const BumpRequest = require('./models/BumpRequest');
const bumpRoutes = require('./routes/bumps');
const bannerAdsRoutes = require('./routes/bannerAds');
const affiliateRoutes = require('./routes/affiliates');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/error');
const path = require('path');
const fs = require('fs');
const upload = require('./middleware/upload');
const usersRouter = require('./routes/users');
const jobsRoutes = require('./routes/jobs');
const blogsRoutes = require('./routes/blogs');
// const sitemapRoutes = require('./routes/sitemap'); // Disabled - using static sitemap
const socketModule = require('./socket');
const ipLimiter = require('./middleware/ipLimiter');
const deviceLimiter = require('./middleware/deviceLimiter');
const telegramService = require('./utils/telegramService');
const cron = require('node-cron');
const { syncRemotiveJobs } = require('./services/remotiveSync');

const app = express();
const server = http.createServer(app);
const io = socketModule.init(server);

// Trust proxy when running behind Render/NGINX so rate limit and IP work correctly
app.set('trust proxy', 1);

// Periodic cleanup task for offline users
setInterval(async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Set users as offline if they haven't been active in the last 5 minutes
    const result = await User.updateMany(
      {
        isOnline: true,
        lastActivity: { $lt: fiveMinutesAgo }
      },
      {
        isOnline: false,
        lastSeen: new Date()
      }
    );
    
    if (result.modifiedCount > 0) {
      // Set inactive users as offline
    }
  } catch (error) {
    console.error('Error in user cleanup task:', error);
  }
}, 2 * 60 * 1000); // Run every 2 minutes

// Periodic task for processing membership renewals
setInterval(async () => {
  try {
    const now = new Date();
    
    // Find users with active memberships that need renewal
    const usersNeedingRenewal = await User.find({
      'membership.isActive': true,
      'membership.autoRenew': true,
      'membership.nextBillingDate': { $lte: now }
    });
    
    console.log(`[Membership Renewal] Checking ${usersNeedingRenewal.length} memberships for renewal...`);
    
    for (const user of usersNeedingRenewal) {
      try {
        const monthlyCost = user.membership.monthlyCost || 1000;
        
        // Check if user has enough points
        if (user.points >= monthlyCost) {
          // Process successful renewal
          user.points -= monthlyCost;
          
          // Set next billing date to one month from now
          const nextBillingDate = new Date(user.membership.nextBillingDate);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          user.membership.nextBillingDate = nextBillingDate;
          user.membership.gracePeriodEnds = null; // Clear any grace period
          
          // Add to points history
          user.pointsHistory.push({
            amount: -monthlyCost,
            reason: 'Monthly membership auto-renewal',
            createdAt: now
          });
          
          await user.save();
          
          console.log(`[Membership Renewal] ✓ Successfully renewed membership for user ${user.username} (${user._id}). Next billing: ${nextBillingDate.toISOString()}`);
          
          // Emit socket event if socket.io is available
          if (io) {
            io.emit('membershipRenewed', {
              userId: user._id,
              username: user.username,
              nextBillingDate: nextBillingDate,
              pointsRemaining: user.points
            });
          }
        } else {
          // Insufficient points - enter grace period
          if (!user.membership.gracePeriodEnds) {
            // Start 7-day grace period
            const gracePeriodEnds = new Date(now);
            gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7);
            user.membership.gracePeriodEnds = gracePeriodEnds;
            
            await user.save();
            
            console.log(`[Membership Renewal] ⚠ User ${user.username} (${user._id}) entered grace period. Insufficient points: ${user.points}/${monthlyCost}. Grace period ends: ${gracePeriodEnds.toISOString()}`);
            
            // Emit socket event
            if (io) {
              io.emit('membershipGracePeriod', {
                userId: user._id,
                username: user.username,
                gracePeriodEnds: gracePeriodEnds,
                pointsNeeded: monthlyCost,
                pointsCurrent: user.points
              });
            }
          }
        }
      } catch (error) {
        console.error(`[Membership Renewal] Error processing renewal for user ${user._id}:`, error);
      }
    }
    
    // Handle expired grace periods
    const usersWithExpiredGrace = await User.find({
      'membership.isActive': true,
      'membership.gracePeriodEnds': { $lte: now }
    });
    
    if (usersWithExpiredGrace.length > 0) {
      console.log(`[Membership Renewal] Processing ${usersWithExpiredGrace.length} expired grace periods...`);
    }
    
    for (const user of usersWithExpiredGrace) {
      try {
        const monthlyCost = user.membership.monthlyCost || 1000;
        
        // Check one more time if user has enough points
        if (user.points >= monthlyCost) {
          // Process late renewal
          user.points -= monthlyCost;
          
          const nextBillingDate = new Date(user.membership.nextBillingDate);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          user.membership.nextBillingDate = nextBillingDate;
          user.membership.gracePeriodEnds = null;
          
          user.pointsHistory.push({
            amount: -monthlyCost,
            reason: 'Monthly membership auto-renewal (grace period)',
            createdAt: now
          });
          
          await user.save();
          
          console.log(`[Membership Renewal] ✓ Late renewal successful for user ${user.username} (${user._id})`);
          
          if (io) {
            io.emit('membershipRenewed', {
              userId: user._id,
              username: user.username,
              nextBillingDate: nextBillingDate,
              pointsRemaining: user.points
            });
          }
        } else {
          // Deactivate membership
          user.membership.isActive = false;
          user.membership.autoRenew = false;
          user.membership.gracePeriodEnds = null;
          
          await user.save();
          
          console.log(`[Membership Renewal] ✗ Membership deactivated for user ${user.username} (${user._id}) - grace period expired with insufficient points`);
          
          if (io) {
            io.emit('membershipExpired', {
              userId: user._id,
              username: user.username,
              reason: 'Grace period expired - insufficient points'
            });
          }
        }
      } catch (error) {
        console.error(`[Membership Renewal] Error processing grace period expiry for user ${user._id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('[Membership Renewal] Error in renewal task:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// Periodic task for sending daily bubble summary to trending channel
setInterval(async () => {
  try {
    await telegramService.sendDailyBubbleSummary();
  } catch (error) {
    console.error('[Daily Bubble Summary] Error in daily summary task:', error);
  }
}, 24 * 60 * 60 * 1000); // Run every 24 hours

// Send initial bubble summary on server start (after a delay to ensure DB is ready)
setTimeout(async () => {
  try {
    await telegramService.sendDailyBubbleSummary();
  } catch (error) {
    console.error('[Daily Bubble Summary] Error sending initial summary:', error);
  }
}, 10000); // Wait 10 seconds after server start

// Cron job for sending daily GM message at 8 AM EST every morning
cron.schedule('0 8 * * *', async () => {
  try {
    console.log('[Daily GM Message] Sending scheduled GM message at 8 AM EST...');
    await telegramService.sendDailyGMMessage();
  } catch (error) {
    console.error('[Daily GM Message] Error in daily GM task:', error);
  }
}, {
  timezone: "America/New_York" // EST/EDT timezone
});

// Cron job for syncing Remotive jobs every 8 hours
// Runs at 12:00 AM, 8:00 AM, and 4:00 PM daily
cron.schedule('0 */8 * * *', async () => {
  try {
    console.log('[Remotive Sync] Starting scheduled sync...');
    await syncRemotiveJobs();
  } catch (error) {
    console.error('[Remotive Sync] Error in scheduled sync:', error);
  }
});

// Sync Remotive jobs on server start (after a delay to ensure DB is ready)
setTimeout(async () => {
  try {
    console.log('[Remotive Sync] Running initial sync on server start...');
    await syncRemotiveJobs();
  } catch (error) {
    console.error('[Remotive Sync] Error in initial sync:', error);
  }
}, 20000); // Wait 20 seconds after server start

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://www.aquads.xyz',
      'https://aquads.xyz',
      'http://localhost:3000'
    ];
    
    // Allow chrome extension origins
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With', 'Cache-Control']
};

app.use(cors(corsOptions));

// Add compression middleware for better performance
app.use(compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if the request includes a no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    // Use compression for all other responses
    return compression.filter(req, res);
  }
}));

// Add CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://www.aquads.xyz',
    'https://aquads.xyz',
    'http://localhost:3000'
  ];
  
  // Allow chrome extension origins
  if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add caching middleware for API responses
app.use('/api', (req, res, next) => {
  // Set cache headers for GET requests
  if (req.method === 'GET') {
    // Cache for 5 minutes for most API responses
    res.set('Cache-Control', 'public, max-age=300');
  } else {
    // No cache for POST, PUT, DELETE requests
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

// Create uploads directory if it doesn't exist
// Ensure both the uploads and uploads/bookings directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const bookingsDir = path.join(__dirname, 'uploads/bookings');

try {
  // Create parent uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Create bookings subdirectory if it doesn't exist
  if (!fs.existsSync(bookingsDir)) {
    fs.mkdirSync(bookingsDir, { recursive: true });
  }
  
  // Make sure permissions are set correctly (for Linux/Unix systems)
  try {
    fs.chmodSync(uploadsDir, 0o755);
    fs.chmodSync(bookingsDir, 0o755);
  } catch (permError) {
    // Note: Could not set directory permissions. This is normal on Windows.
  }
} catch (error) {
  console.error('Error creating upload directories:', error);
}

// Serve static files from uploads directory - move this before other middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve logo and other public files
app.use(express.static(path.join(__dirname, '../public')));

// Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.transak.com", "https://*.google.com", "https://*.verygoodvault.com", "https://*.checkout.com", "https://*.cdn-apple.com", "https://*.onfido.com", "https://*.sardine.ai", "https://*.ckotech.co", "https://*.newrelic.com", "https://*.plaid.com", "https://*.googleapis.com", "https://*.gstatic.com", "https://*.logr-ingest.com", "https://cdn.lrkt-in.com", "https://static.ads-twitter.com", "https://cdn.jsdelivr.net", "https://*.tradingview.com", "https://s3.tradingview.com", "https://charting-library.tradingview.com", "https://symbol-search.tradingview.com", "https://cdn.coinscribble.sapient.tools", "https://platform.twitter.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.transak.com", "https://*.google.com", "https://*.verygoodvault.com", "https://*.checkout.com", "https://*.cdn-apple.com", "https://*.onfido.com", "https://*.sardine.ai", "https://*.ckotech.co", "https://*.newrelic.com", "https://*.plaid.com", "https://*.googleapis.com", "https://*.gstatic.com", "https://*.logr-ingest.com", "https://cdn.lrkt-in.com", "https://static.ads-twitter.com", "https://cdn.jsdelivr.net", "https://*.tradingview.com", "https://s3.tradingview.com", "https://charting-library.tradingview.com", "https://symbol-search.tradingview.com", "https://cdn.coinscribble.sapient.tools", "https://platform.twitter.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "*"],
      connectSrc: ["'self'", "wss:", "https:", "*"],
      frameSrc: ["'self'", "*"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Add rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 5000, // Increased limit
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting only to specific routes
app.use('/api/login', limiter);
app.use('/api/register', limiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000, // Increased to 10s for better mobile connectivity
  socketTimeoutMS: 45000 // Close sockets after 45s
}).then(() => {
  // Initialize skill tests if they don't exist
  initializeSkillTests();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  // Don't exit the process, let it retry
});

// Add error handler
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

// Add reconnect handler
mongoose.connection.on('disconnected', () => {
  // MongoDB disconnected, attempting to reconnect...
});

// Add connection monitoring
mongoose.connection.on('connected', () => {
  // Mongoose connected to MongoDB
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// Routes
app.use('/api/bumps', bumpRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/service-reviews', require('./routes/serviceReviews'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/user-tokens', require('./routes/user-tokens'));
app.use('/api/services', require('./routes/services'));
app.use('/api/users', usersRouter);
app.use('/api/bannerAds', bannerAdsRoutes);
app.use('/api/points', require('./routes/points'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/blogs', blogsRoutes);
// app.use('/api/sitemap', sitemapRoutes); // Disabled - using static sitemap
app.use('/api/games', require('./routes/games'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/horse-racing', require('./routes/horse-racing'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/twitter-raids', require('./routes/twitter-raids'));
app.use('/api/facebook-raids', require('./routes/facebook-raids'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/discount-codes', require('./routes/discountCodes'));
app.use('/api/skill-tests', require('./routes/skillTests'));
app.use('/api/workshop', require('./routes/workshop'));


// Special route for blog sharing metadata (outside the API namespace)
app.get('/share-blog/:id', async (req, res) => {
  try {
    const Blog = require('./models/Blog');
    const blog = await Blog.findById(req.params.id);
      
    if (!blog) {
      return res.status(404).send('Blog not found');
    }
    
    // Create a clean description without HTML tags
    const description = blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
      : 'Read our latest blog post on Aquads!';
      
    // Get the URL with all query params
    let redirectUrl = `${process.env.NODE_ENV === 'production' ? 'https://www.aquads.xyz' : 'http://localhost:3000'}/learn?blogId=${blog._id}`;
    
    // Create clean URL for meta tags without referral parameters
    const cleanMetaUrl = `${process.env.NODE_ENV === 'production' ? 'https://www.aquads.xyz' : 'http://localhost:3000'}/learn?blogId=${blog._id}`;
    
    // Add any query parameters from the original request (excluding referral parameters)
    const originalParams = new URLSearchParams(req.originalUrl.split('?')[1] || '');
    // Remove referral parameter to prevent it from being baked into shared content
    originalParams.delete('ref');
    if (originalParams.toString()) {
      redirectUrl += `&${originalParams.toString()}`;
    }
      
    // Build HTML with proper metadata
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blog.title} - Aquads Blog</title>
  <meta name="description" content="${description}">
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${blog.title} - Aquads Blog">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${blog.bannerImage || 'https://www.aquads.xyz/logo712.png'}">
  
  <!-- Open Graph meta tags -->
  <meta property="og:title" content="${blog.title} - Aquads Blog">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${blog.bannerImage || 'https://www.aquads.xyz/logo712.png'}">
  <meta property="og:url" content="${cleanMetaUrl}">
  <meta property="og:type" content="article">
  
  <!-- Redirect to the actual blog page -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 20px;
      text-align: center;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    h1 {
      color: #1a73e8;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${blog.title}</h1>
    <p>${description}</p>
    <p>Redirecting to blog post... <a href="${redirectUrl}">Click here</a> if you're not redirected automatically.</p>
  </div>
</body>
</html>`;
    
    // Send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating blog share page:', error);
    res.status(500).send('Error generating share page');
  }
});

// Create new ad - REMOVED: Using /routes/ads.js instead for proper affiliate validation
// app.post('/api/ads', auth, async (req, res) => {
//   try {
//     const ad = new Ad(req.body);
//     const savedAd = await ad.save();
//     io.emit('adsUpdated', { type: 'create', ad: savedAd });
//     res.status(201).json(savedAd);
//   } catch (error) {
//     console.error('Error creating ad:', error);
//     res.status(500).json({ error: 'Failed to create ad' });
//   }
// });

// Update ad
app.put('/api/ads/:id', auth, async (req, res) => {
  try {
    const updatedAd = await Ad.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    io.emit('adsUpdated', { type: 'update', ad: updatedAd });
    res.json(updatedAd);
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

// Delete ad
app.delete('/api/ads/:id', auth, async (req, res) => {
  try {
    const deletedAd = await Ad.findOneAndDelete({ id: req.params.id });
    io.emit('adsUpdated', { type: 'delete', ad: deletedAd });
    res.json(deletedAd);
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

// Update ad position (no auth required)
app.put('/api/ads/:id/position', async (req, res) => {
  try {
    const { x, y } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Position update requires x and y coordinates' });
    }
    
    const updatedAd = await Ad.findOneAndUpdate(
      { id: req.params.id },
      { $set: { x, y } },
      { new: true }
    );
    
    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    io.emit('adsUpdated', { type: 'update', ad: updatedAd });
    res.json(updatedAd);
  } catch (error) {
    console.error('Error updating ad position:', error);
    res.status(500).json({ error: 'Failed to update ad position' });
  }
});

// Add verify token endpoint
app.get('/api/verify-token', auth, (req, res) => {
  try {
    res.json({ valid: true, user: req.user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Register
app.post('/api/users/register', ipLimiter(3), deviceLimiter(3), async (req, res) => {
  try {
    const { username, password, image, deviceFingerprint } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username exists (case-insensitive)
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      password,
      image: image || 'https://placehold.co/400x400?text=User',
      isAdmin: username === 'admin',
      userType: req.body.userType || 'freelancer',
      ipAddress: req.clientIp, // Store client IP address
      deviceFingerprint: req.deviceFingerprint || deviceFingerprint || null // Store device fingerprint 
    });

    await user.save();

    // Generate token for auto-login
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin, userType: user.userType, referredBy: user.referredBy },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      username: user.username,
      isAdmin: user.isAdmin,
      image: user.image,
      userType: user.userType,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', dbConnected: mongoose.connection.readyState === 1 });
});

// Add test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});


// Update user profile
app.put('/api/users/profile', auth, async (req, res) => {
  try {
    const { username, image, currentPassword, newPassword } = req.body;

    // Find the user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If username is being changed, check if new username is available
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        _id: { $ne: user._id },
        username: { $regex: new RegExp(`^${username}$`, 'i') }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    // Update image if provided
    if (image) {
      user.image = image;
    }

    // Handle password change if both current and new passwords are provided
    if (currentPassword && newPassword) {
      // Verify current password
      let isMatch = false;
      if (user.password.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(currentPassword, user.password);
      } else {
        isMatch = currentPassword === user.password;
      }

      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash and set new password
      user.password = newPassword;
    }

    await user.save();

    // Generate new token with updated username if changed
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin, userType: user.userType, referredBy: user.referredBy },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    res.json({
      username: user.username,
      image: user.image,
      isAdmin: user.isAdmin,
      userType: user.userType,
      token
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error.message 
    });
  }
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});


// Apply rate limiter BEFORE starting server
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 2000 : 10000,
  message: 'Too many API requests from this IP, please try again later'
});

app.use('/api', apiLimiter);

// THEN start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  // Start Telegram bot (fire-and-forget)
  telegramService.startBot();
});

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Skip HTTPS redirect for uploads directory
    if (req.path.startsWith('/uploads/')) {
      return next();
    }
    
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('Host')}${req.url}`);
    }
    next();
  });
}

// Sitemap.xml route disabled - using static sitemap file instead
// app.get('/sitemap.xml', async (req, res) => {
//   try {
//     // Forward the request to our sitemap route handler
//     res.redirect('/api/sitemap');
//   } catch (error) {
//     console.error('Error serving sitemap:', error);
//     res.status(500).send('Error generating sitemap');
//   }
// }); 

// Function to initialize skill tests
async function initializeSkillTests() {
  try {
    const SkillTest = require('./models/SkillTest');
    const skillTests = require('./data/skillTests');
    const existingTests = await SkillTest.countDocuments();
    
    if (existingTests === 0) {
      // If no tests exist, add all tests
      await SkillTest.insertMany(skillTests);
    } else {
      // Check for new tests and update existing ones
      for (const test of skillTests) {
        await SkillTest.findOneAndUpdate(
          { title: test.title },
          {
            $set: {
              description: test.description,
              category: test.category,
              difficulty: test.difficulty,
              timeLimit: test.timeLimit,
              passingScore: test.passingScore,
              questions: test.questions,
              badge: test.badge,
              isActive: test.isActive !== undefined ? test.isActive : true,
              updatedAt: new Date()
            }
          },
          { 
            new: true,
            upsert: true // Create if doesn't exist
          }
        );
      }
    }
  } catch (error) {
    // Silent error handling
  }
} 