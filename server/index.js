require('dotenv').config();
require('./fontconfig/bootstrap');

// Validate critical environment variables on startup
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is not set!');
  console.error('   Authentication will not work without this variable.');
  console.error('   Please set JWT_SECRET in your environment variables.');
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const compression = require('compression');
const Ad = require('./models/Ad');
const User = require('./models/User');
const VoteBoost = require('./models/VoteBoost');
const voteBoostRoutes = require('./routes/vote-boosts');
const bannerAdsRoutes = require('./routes/bannerAds');
const linkBioAdsRoutes = require('./routes/linkBioAds');
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
const discordService = require('./utils/discordService');
const { cascadeUsernameRename } = require('./utils/usernameRenameCascade');
const cron = require('node-cron');
const { syncRemotiveJobs } = require('./services/remotiveSync');
const { syncHimalayasJobs } = require('./services/himalayasJobsSync');
const { syncWeb3CareerJobs } = require('./services/web3CareerJobsSync');
const { syncMarketNews } = require('./services/marketNewsSync');
const { syncFreeCourses } = require('./services/freeCoursesSync');
const { runSuspiciousAffiliatesScan } = require('./services/suspiciousAffiliatesScan');
const { syncDexFeedListings } = require('./services/dexFeedSync');
const { ensureDexFeedUser } = require('./utils/ensureDexFeedUser');
const { DEX_FEED_ENABLED } = require('./constants/dexFeed');
const { sanitizeForRegex } = require('./utils/security');
const aquapayRoutes = require('./routes/aquapay');
const walletAnalyzerRoutes = require('./routes/walletAnalyzer');

// OG image routes - wrapped in try-catch to debug loading issues
let ogRoutes;
try {
  ogRoutes = require('./routes/og');
  console.log('✅ OG routes loaded successfully');
} catch (err) {
  console.error('❌ Failed to load OG routes:', err.message);
  ogRoutes = null;
}

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

// Vote Boost Background Service - Add votes every 30 seconds for active boosts
setInterval(async () => {
  try {
    const { getBumpSyncUpdate } = require('./utils/bumpFromVotes');
    const adsRoutesForCache = require('./routes/ads');

    // Find all active boosts that haven't completed yet
    const activeBoosts = await VoteBoost.find({
      status: 'active',
      $expr: { $lt: ['$votesAdded', '$votesToAdd'] }
    });

    if (activeBoosts.length === 0) return;

    const now = new Date();

    for (const boost of activeBoosts) {
      try {
        // Check if enough time has passed since last vote (intervalSeconds, default 30)
        const intervalMs = (boost.intervalSeconds || 30) * 1000;
        const timeSinceLastVote = boost.lastVoteAt ? (now - new Date(boost.lastVoteAt)) : intervalMs;

        if (timeSinceLastVote >= intervalMs) {
          // Add 1 bullish vote to the ad
          const ad = await Ad.findOneAndUpdate(
            { id: boost.adId },
            { $inc: { bullishVotes: 1 } },
            { new: true }
          );

          if (ad) {
            // Update boost record
            boost.votesAdded += 1;
            boost.lastVoteAt = now;

            // Check if boost is completed
            if (boost.votesAdded >= boost.votesToAdd) {
              boost.status = 'completed';
              boost.completedAt = now;
              console.log(`[Vote Boost] Completed boost for ${ad.title} - ${boost.votesToAdd} votes added`);
            }

            await boost.save();

            let finalAd = ad;
            const bumpSync = getBumpSyncUpdate(ad, ad.bullishVotes);
            if (bumpSync.changed) {
              finalAd = await Ad.findByIdAndUpdate(ad._id, { $set: bumpSync.$set }, { new: true });
              if (typeof adsRoutesForCache.invalidatePublicAdsCache === 'function') {
                adsRoutesForCache.invalidatePublicAdsCache();
              }
              socketModule.emitAdUpdate('update', finalAd);
            }

            socketModule.getIO().emit('adVoteUpdated', {
              adId: finalAd.id,
              bullishVotes: finalAd.bullishVotes,
              bearishVotes: finalAd.bearishVotes,
              isBumped: finalAd.isBumped,
              size: finalAd.size
            });

            telegramService.sendVoteNotificationToGroup(finalAd).catch(err => {
              console.error('[Vote Boost] Error sending telegram notification:', err.message);
            });
          }
        }
      } catch (boostError) {
        console.error(`[Vote Boost] Error processing boost ${boost._id}:`, boostError.message);
      }
    }
  } catch (error) {
    console.error('[Vote Boost] Error in vote boost service:', error.message);
  }
}, 30000); // Run every 30 seconds

// HyperSpace Auto-Complete Service - Complete orders when delivery timer expires
setInterval(async () => {
  try {
    const HyperSpaceOrder = require('./models/HyperSpaceOrder');
    const HyperSpaceAffiliateEarning = require('./models/HyperSpaceAffiliateEarning');
    const AffiliateEarning = require('./models/AffiliateEarning');
    
    const now = new Date();
    
    // Find all delivering orders where delivery time has expired
    const expiredOrders = await HyperSpaceOrder.find({
      status: 'delivering',
      deliveryEndsAt: { $lte: now }
    });
    
    if (expiredOrders.length === 0) return;
    
    console.log(`[HyperSpace Auto-Complete] Found ${expiredOrders.length} orders to auto-complete`);
    
    for (const order of expiredOrders) {
      try {
        // Mark as completed
        order.status = 'completed';
        order.completedAt = now;
        order.socialplugStatus = 'completed';
        order.autoCompleted = true;
        
        await order.save();
        
        console.log(`[HyperSpace Auto-Complete] ✓ Order ${order.orderId} auto-completed (${order.listenerCount} listeners, ${order.duration}min)`);
        
        // Record affiliate commission if the ordering user was referred
        try {
          const orderingUser = await User.findById(order.userId);
          if (orderingUser && orderingUser.referredBy) {
            // Check if commission already recorded for this order
            const existingCommission = await HyperSpaceAffiliateEarning.findOne({ 
              hyperspaceOrderId: order._id 
            });
            
            if (!existingCommission) {
              // Calculate commission based on PROFIT, not gross amount
              const profitAmount = order.profit || (order.customerPrice - order.socialplugCost - (order.discountAmount || 0));
              
              if (profitAmount > 0) {
                const commissionRate = await AffiliateEarning.calculateCommissionRate(orderingUser.referredBy);
                const commissionEarned = HyperSpaceAffiliateEarning.calculateCommission(profitAmount, commissionRate);
                
                const affiliateEarning = new HyperSpaceAffiliateEarning({
                  affiliateId: orderingUser.referredBy,
                  referredUserId: orderingUser._id,
                  hyperspaceOrderId: order._id,
                  orderId: order.orderId,
                  orderAmount: order.customerPrice,
                  profitAmount: profitAmount,
                  commissionRate,
                  commissionEarned
                });
                
                await affiliateEarning.save();
                console.log(`[HyperSpace Auto-Complete] Affiliate commission recorded: $${commissionEarned} for order ${order.orderId}`);
              }
            }
          }
        } catch (commissionError) {
          console.error(`[HyperSpace Auto-Complete] Error recording affiliate commission for ${order.orderId}:`, commissionError.message);
        }
        
        // Emit socket notification to user
        try {
          socketModule.emitHyperSpaceOrderStatusChange(order.orderId, 'completed', {
            message: 'Your HyperSpace package has been delivered! Timer complete.',
            autoCompleted: true
          });
          socketModule.emitHyperSpaceOrderUpdate({ orderId: order.orderId, status: 'completed', autoCompleted: true });
        } catch (socketError) {
          console.error(`[HyperSpace Auto-Complete] Socket emit error for ${order.orderId}:`, socketError.message);
        }
        
      } catch (orderError) {
        console.error(`[HyperSpace Auto-Complete] Error completing order ${order.orderId}:`, orderError.message);
      }
    }
  } catch (error) {
    console.error('[HyperSpace Auto-Complete] Error in auto-complete service:', error.message);
  }
}, 30000); // Run every 30 seconds to check for expired orders

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

// Cron job for sending daily GM message at 8 AM EST every morning (Telegram + Discord)
cron.schedule('0 8 * * *', async () => {
  try {
    console.log('[Daily GM Message] Sending scheduled GM message at 8 AM EST...');
    await telegramService.sendDailyGMMessage();
    try {
      const discordService = require('./utils/discordService');
      await discordService.sendDailyGMMessage();
    } catch (discordErr) {
      console.error('[Daily GM Message] Discord:', discordErr.message);
    }
  } catch (error) {
    console.error('[Daily GM Message] Error in daily GM task:', error);
  }
}, {
  timezone: "America/New_York" // EST/EDT timezone
});

// Cron job for sending daily admin reminder to non-admin groups at 8:30 AM EST
cron.schedule('30 8 * * *', async () => {
  try {
    console.log('[Admin Reminder] Checking groups and sending admin reminders...');
    await telegramService.sendDailyAdminReminder();
  } catch (error) {
    console.error('[Admin Reminder] Error in daily admin reminder task:', error);
  }
}, {
  timezone: "America/New_York" // EST/EDT timezone
});

// Cron jobs for sending scheduled mybubble to registered groups — 9 AM and 9 PM EST (Telegram + Discord)
cron.schedule('0 9,21 * * *', async () => {
  try {
    console.log('[Scheduled MyBubble] Running twice-daily mybubble send...');
    await telegramService.sendScheduledMyBubbleToRegisteredGroups();
    try {
      const discordService = require('./utils/discordService');
      await discordService.sendScheduledMyBubbleToLinkedDiscordChannels();
    } catch (discordErr) {
      console.error('[Scheduled MyBubble] Discord:', discordErr.message);
    }
  } catch (error) {
    console.error('[Scheduled MyBubble] Error:', error);
  }
}, {
  timezone: "America/New_York"
});

// Mark Twitter raids past 48h as expired in the database and auto-reject stale pending completions
cron.schedule('0 * * * *', async () => {
  try {
    const { expireStaleRaids } = require('./utils/twitterRaidExpiration');
    await expireStaleRaids();
  } catch (error) {
    console.error('[Twitter Raid Expiration] Error:', error);
  }
});

// Sweep Telegram raid announcement messages before Telegram's ~48h bot delete window ends (stored IDs + stale pins)
cron.schedule('0 */2 * * *', async () => {
  try {
    console.log('[Raid TG cleanup] Running scheduled raid message sweep...');
    await telegramService.scheduledRaidTelegramRaidMessageCleanup();
    await telegramService.scheduledSpacesTelegramMessageCleanup();
    await telegramService.scheduledVcOpenTelegramMessageCleanup();
    const discordService = require('./utils/discordService');
    await discordService.scheduledSpacesDiscordMessageCleanup();
  } catch (error) {
    console.error('[Raid TG cleanup] Error:', error);
  }
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

// Suspicious affiliate referrers scan — persisted snapshot for admin Affiliates tab (medium+ risk only). Twice daily UTC.
cron.schedule('17 */12 * * *', async () => {
  try {
    console.log('[SuspiciousAffiliatesScan] Scheduled run...');
    await runSuspiciousAffiliatesScan({ minAffiliates: 10 });
  } catch (e) {
    console.error('[SuspiciousAffiliatesScan] Cron error:', e);
  }
});

setTimeout(async () => {
  try {
    console.log('[SuspiciousAffiliatesScan] Initial run after server start...');
    await runSuspiciousAffiliatesScan({ minAffiliates: 10 });
  } catch (e) {
    console.error('[SuspiciousAffiliatesScan] Initial run error:', e);
  }
}, 60000); // 1 minute — after DB is ready and other boot work has started

// One-time cleanup: retired RSS sources — purge any stale rows from prior syncs.
setTimeout(async () => {
  try {
    const Job = require('./models/Job');
    const result = await Job.deleteMany({ source: { $in: ['cryptojobslist', 'weworkremotely'] } });
    if (result.deletedCount > 0) {
      console.log(`[Retired Sources Cleanup] Removed ${result.deletedCount} stale jobs (cryptojobslist + weworkremotely retired)`);
    }
  } catch (error) {
    console.error('[Retired Sources Cleanup] Error removing stale jobs:', error.message);
  }
}, 25000);

// Cron job for syncing Himalayas RSS (offset from Remotive)
cron.schedule('0 5,13,21 * * *', async () => {
  try {
    console.log('[Himalayas Sync] Starting scheduled sync...');
    await syncHimalayasJobs();
  } catch (error) {
    console.error('[Himalayas Sync] Error in scheduled sync:', error);
  }
});

setTimeout(async () => {
  try {
    console.log('[Himalayas Sync] Running initial sync on server start...');
    await syncHimalayasJobs();
  } catch (error) {
    console.error('[Himalayas Sync] Error in initial sync:', error);
  }
}, 45000); // After Remotive initial sync

// Cron: Web3.career/Bondex API — offset minute to spread load vs Remotive/Himalayas
cron.schedule('45 */8 * * *', async () => {
  try {
    console.log('[Web3.career Sync] Starting scheduled sync...');
    await syncWeb3CareerJobs();
  } catch (error) {
    console.error('[Web3.career Sync] Error in scheduled sync:', error);
  }
});

setTimeout(async () => {
  try {
    console.log('[Web3.career Sync] Running initial sync on server start...');
    await syncWeb3CareerJobs();
  } catch (error) {
    console.error('[Web3.career Sync] Error in initial sync:', error);
  }
}, 62000); // After Himalayas initial sync hook

// Market news (CoinDesk + Sky News world RSS): 3× daily UTC; keep last 72h in DB
cron.schedule('0 0,8,16 * * *', async () => {
  try {
    console.log('[MarketNews Sync] Starting scheduled sync...');
    await syncMarketNews();
  } catch (error) {
    console.error('[MarketNews Sync] Error in scheduled sync:', error);
  }
});

setTimeout(async () => {
  try {
    console.log('[MarketNews Sync] Running initial sync on server start...');
    await syncMarketNews();
  } catch (error) {
    console.error('[MarketNews Sync] Error in initial sync:', error);
  }
}, 50000);

// Free online courses (Cursa.app via rss.app): upsert into MongoDB on each run.
// Third-party feeds typically expose only the latest N items; sync often enough
// that new entries are captured before they roll off the feed.
setTimeout(async () => {
  try {
    console.log('[FreeCourses Sync] Running initial sync on server start...');
    await syncFreeCourses();
  } catch (error) {
    console.error('[FreeCourses Sync] Error in initial sync:', error);
  }
}, 55000);

// Once daily UTC — rss feeds usually only include recent items; pick up new entries periodically.
cron.schedule('30 6 * * *', async () => {
  try {
    console.log('[FreeCourses Sync] Starting scheduled sync...');
    await syncFreeCourses();
  } catch (error) {
    console.error('[FreeCourses Sync] Error in scheduled sync:', error);
  }
}, {
  timezone: 'UTC',
});

// Dex feed — auto-list qualifying DEX projects (twice daily when enabled)
if (DEX_FEED_ENABLED) {
  setTimeout(async () => {
    try {
      await ensureDexFeedUser();
      console.log('[DexFeed] Running initial sync on server start...');
      await syncDexFeedListings();
    } catch (error) {
      console.error('[DexFeed] Error in initial sync:', error);
    }
  }, 60000);

  cron.schedule('0 6,18 * * *', async () => {
    try {
      await syncDexFeedListings();
    } catch (error) {
      console.error('[DexFeed] Error in scheduled sync:', error);
    }
  }, { timezone: 'UTC' });
} else {
  console.log('[DexFeed] Disabled (set DEX_FEED_ENABLED=true to enable)');
}

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://www.aquads.xyz',
      'https://aquads.xyz',
      'http://localhost:3000',
      'https://aquads-production.up.railway.app'
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
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With', 'Cache-Control', 'X-Aquads-Points-Source']
};

app.use(cors(corsOptions));

// Add request ID middleware (early in chain for better traceability)
const requestIdMiddleware = require('./middleware/requestId');
app.use(requestIdMiddleware);

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
    'http://localhost:3000',
    'https://aquads-production.up.railway.app'
  ];
  
  // Allow Netlify or other frontend origins via env to support Google sign-in callbacks
  if (process.env.NETLIFY_ORIGIN) {
    allowedOrigins.push(process.env.NETLIFY_ORIGIN);
  }
  if (process.env.FRONTEND_ORIGIN) {
    allowedOrigins.push(process.env.FRONTEND_ORIGIN);
  }
  
  // Allow chrome extension origins
  if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Aquads-Points-Source');
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
  if (req.method === 'GET') {
    // Order status during payment must be fresh; no cache for hyperspace order/:id
    const isOrderStatus = /^\/hyperspace\/order\/[^/]+$/.test(req.path) && !req.path.includes('/admin');
    // Per-user link-in-bio JSON and ads change when owners save settings — must not be cached as
    // shared "public" for 5 minutes (browsers/CDNs would serve stale colors, links, and ads).
    const isLinkInBioPublicData =
      /^\/users\/links\/[^/]+$/.test(req.path) ||
      /^\/link-bio-ads\/active\/[^/]+$/.test(req.path);
    // Per-user (Authorization); must not be shared CDN cache
    const isPfpGeneratorStatus = /^\/pfp-generator\/status$/.test(req.path);
    // Per-user PFP collection list (Authorization); must not be shared CDN cache
    const isPfpGeneratorList = /^\/pfp-generator\/list$/.test(req.path);
    if (isOrderStatus || isLinkInBioPublicData || isPfpGeneratorStatus || isPfpGeneratorList) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.set('Cache-Control', 'public, max-age=300');
    }
  } else {
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
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.moonpay.com", "https://buy.moonpay.com", "https://*.ramp.network", "https://buy.ramp.network", "https://*.mercuryo.io", "https://exchange.mercuryo.io", "https://*.google.com", "https://*.googleapis.com", "https://*.gstatic.com", "https://static.ads-twitter.com", "https://cdn.jsdelivr.net", "https://*.tradingview.com", "https://s3.tradingview.com", "https://charting-library.tradingview.com", "https://symbol-search.tradingview.com", "https://cdn.coinscribble.sapient.tools", "https://platform.twitter.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.moonpay.com", "https://buy.moonpay.com", "https://*.ramp.network", "https://buy.ramp.network", "https://*.mercuryo.io", "https://exchange.mercuryo.io", "https://*.google.com", "https://*.googleapis.com", "https://*.gstatic.com", "https://static.ads-twitter.com", "https://cdn.jsdelivr.net", "https://*.tradingview.com", "https://s3.tradingview.com", "https://charting-library.tradingview.com", "https://symbol-search.tradingview.com", "https://cdn.coinscribble.sapient.tools", "https://platform.twitter.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "*"],
      connectSrc: ["'self'", "wss:", "https:", "*"],
      frameSrc: ["'self'", "*"],
      upgradeInsecureRequests: []
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
  serverSelectionTimeoutMS: 5000, // 5s is enough for a healthy Atlas cluster
  socketTimeoutMS: 45000, // Close sockets after 45s
  maxPoolSize: 25, // Limit connection pool to avoid exhausting MongoDB Atlas free-tier connections
  minPoolSize: 2,  // Keep a few warm connections ready
  maxIdleTimeMS: 30000 // Release idle connections after 30s to free up the pool
}).then(() => {
  // Initialize skill tests if they don't exist
  initializeSkillTests();
  // Pre-warm caches so the first page load after restart is fast
  const { warmupReviewsCache } = require('./routes/reviews');
  const { warmupTokensCache } = require('./routes/tokens');
  const { warmupGamesCache } = require('./routes/games');
  const { warmupJobsCache } = require('./routes/jobs');
  const { warmupAdsCache } = require('./routes/ads');
  const { warmupBlogsCache } = require('./routes/blogs');
  const { warmupServicesCache } = require('./routes/services');
  const { warmupRaidsCache } = require('./routes/twitter-raids');
  warmupReviewsCache();
  warmupTokensCache();
  warmupGamesCache();
  warmupJobsCache();
  warmupAdsCache();
  warmupBlogsCache();
  warmupServicesCache();
  warmupRaidsCache();
  ensureDexFeedUser().catch((err) => {
    console.error('[DexFeed] ensureDexFeedUser on connect:', err.message);
  });
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
app.use('/api/vote-boosts', voteBoostRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/listing-claims', require('./routes/listingClaims'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/addon-orders', require('./routes/addonOrders'));
app.use('/api/service-reviews', require('./routes/serviceReviews'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/user-tokens', require('./routes/user-tokens'));
app.use('/api/services', require('./routes/services'));
app.use('/api/users', usersRouter);
app.use('/api/bannerAds', bannerAdsRoutes);
app.use('/api/link-bio-ads', linkBioAdsRoutes);
app.use('/api/points', require('./routes/points'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/blogs', blogsRoutes);
app.use('/api/market-news', require('./routes/marketNews'));
app.use('/api/free-courses', require('./routes/freeCourses'));
// app.use('/api/sitemap', sitemapRoutes); // Disabled - using static sitemap
app.use('/api/games', require('./routes/games'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/aquataire', require('./routes/solitaire'));
app.use('/api/horse-racing', require('./routes/horse-racing'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/twitter-raids', require('./routes/twitter-raids'));
app.use('/api/facebook-raids', require('./routes/facebook-raids'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/discount-codes', require('./routes/discountCodes'));
app.use('/api/skill-tests', require('./routes/skillTests'));
app.use('/api/workshop', require('./routes/workshop'));
app.use('/api/click-tracking', require('./routes/clickTracking'));
app.use('/api/on-chain-resume', require('./routes/onChainResume'));
app.use('/api/aquapay', aquapayRoutes);
app.use('/api/freelancer-escrow', require('./routes/freelancerEscrow'));
app.use('/api/wallet-analyzer', walletAnalyzerRoutes);
app.use('/api/pfp-generator', require('./routes/pfpGenerator'));
app.use('/api/hyperspace', require('./routes/hyperspace'));
app.use('/api/project-agent', require('./routes/projectAgent'));

// OG image generation routes (for social media previews)
if (ogRoutes) {
  app.use('/og', ogRoutes);
  console.log('✅ OG routes mounted at /og');
} else {
  console.log('⚠️ OG routes not mounted - loading failed');
}

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
  <meta name="twitter:image" content="${blog.bannerImage || 'https://www.aquads.xyz/metalogo.png'}">
  
  <!-- Open Graph meta tags -->
  <meta property="og:title" content="${blog.title} - Aquads Blog">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${blog.bannerImage || 'https://www.aquads.xyz/metalogo.png'}">
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

// PUT /api/ads/:id — handled by routes/ads.js (field allowlist, projectProfile.introVideoUrl, cache invalidation).
// Duplicate handler removed; it used raw req.body and could desync clients.

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
    const sanitizedUsername = sanitizeForRegex(username);
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
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
      process.env.JWT_SECRET,
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

    // If username is being changed, check if new username is available. We
    // track the previous value so we can cascade the rename to every
    // collection that stores ownership / identity as a username STRING (see
    // utils/usernameRenameCascade.js for the full target list).
    let renamedFromUsername = null;
    if (username && username !== user.username) {
      const sanitizedUsername = sanitizeForRegex(username);
      const existingUser = await User.findOne({
        _id: { $ne: user._id },
        username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      renamedFromUsername = user.username;
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
      
      // Check if password is hashed
      if (user.password.startsWith('$2b$')) {
        // Password is hashed - use bcrypt comparison
        isMatch = await bcrypt.compare(currentPassword, user.password);
      } else {
        // Password is plain text (legacy) - compare directly
        isMatch = currentPassword === user.password;
      }

      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Set new password - pre-save hook will hash it automatically
      user.password = newPassword;
    }

    await user.save();

    // Username changed? Propagate to every collection that stores ownership /
    // identity as a username string. Done AFTER save so the User row is
    // durably renamed first; cascade failures are logged but don't abort the
    // request — the helper is idempotent and safely re-runnable. The fresh
    // JWT issued just below already carries the new username, so the client
    // session is consistent end-to-end after this response.
    if (renamedFromUsername) {
      try {
        await cascadeUsernameRename(renamedFromUsername, user.username);
      } catch (cascadeErr) {
        console.error('[users.profile/index] Username rename cascade failed:', cascadeErr);
      }
    }

    // Generate new token with updated username if changed
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin, userType: user.userType, referredBy: user.referredBy },
      process.env.JWT_SECRET,
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
  // Start Discord bot (separate, fire-and-forget; only if token set)
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_DISABLED !== 'true') {
    discordService.startBot().catch(err => console.error('Discord bot startup error:', err.message));
  }
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