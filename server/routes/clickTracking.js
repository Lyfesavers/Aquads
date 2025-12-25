const express = require('express');
const router = express.Router();
const ClickTracking = require('../models/ClickTracking');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Helper to detect device type from user agent
const getDeviceType = (userAgent) => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking admin status' });
  }
};

// Track a click (public endpoint - no auth required)
router.post('/track', async (req, res) => {
  try {
    const { elementType, pagePath, referrer } = req.body;

    // Validate elementType
    if (!elementType || !['paid_ads_button', 'free_marketing_banner'].includes(elementType)) {
      return res.status(400).json({ error: 'Invalid element type' });
    }

    // Get user info if available
    let userId = null;
    let username = null;
    
    // Check for auth token in header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.userId) {
          const user = await User.findById(decoded.userId);
          if (user) {
            userId = user._id;
            username = user.username;
          }
        }
      } catch (e) {
        // Token invalid or expired - continue without user info
      }
    }

    // Get IP address
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 
                      req.connection?.remoteAddress || 
                      req.socket?.remoteAddress;

    // Get user agent
    const userAgent = req.headers['user-agent'];

    // Create click record
    const clickRecord = new ClickTracking({
      elementType,
      pagePath: pagePath || '/',
      userId,
      username,
      userAgent,
      ipAddress,
      referrer: referrer || req.headers.referer || null,
      deviceType: getDeviceType(userAgent)
    });

    await clickRecord.save();

    res.status(201).json({ success: true, message: 'Click tracked successfully' });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Get click statistics (admin only)
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await ClickTracking.getStats(startDate, endDate);

    // Get totals
    const totals = await ClickTracking.aggregate([
      {
        $group: {
          _id: null,
          totalClicks: { $sum: 1 },
          paidAdsClicks: {
            $sum: { $cond: [{ $eq: ['$elementType', 'paid_ads_button'] }, 1, 0] }
          },
          freeMarketingClicks: {
            $sum: { $cond: [{ $eq: ['$elementType', 'free_marketing_banner'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get today's clicks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStats = await ClickTracking.aggregate([
      { $match: { createdAt: { $gte: today } } },
      {
        $group: {
          _id: '$elementType',
          clicks: { $sum: 1 }
        }
      }
    ]);

    // Get this week's clicks
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weekStats = await ClickTracking.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      {
        $group: {
          _id: '$elementType',
          clicks: { $sum: 1 }
        }
      }
    ]);

    // Get this month's clicks
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const monthStats = await ClickTracking.aggregate([
      { $match: { createdAt: { $gte: monthAgo } } },
      {
        $group: {
          _id: '$elementType',
          clicks: { $sum: 1 }
        }
      }
    ]);

    res.json({
      stats,
      totals: totals[0] || { totalClicks: 0, paidAdsClicks: 0, freeMarketingClicks: 0 },
      today: {
        paidAds: todayStats.find(s => s._id === 'paid_ads_button')?.clicks || 0,
        freeMarketing: todayStats.find(s => s._id === 'free_marketing_banner')?.clicks || 0
      },
      thisWeek: {
        paidAds: weekStats.find(s => s._id === 'paid_ads_button')?.clicks || 0,
        freeMarketing: weekStats.find(s => s._id === 'free_marketing_banner')?.clicks || 0
      },
      thisMonth: {
        paidAds: monthStats.find(s => s._id === 'paid_ads_button')?.clicks || 0,
        freeMarketing: monthStats.find(s => s._id === 'free_marketing_banner')?.clicks || 0
      }
    });
  } catch (error) {
    console.error('Error getting click stats:', error);
    res.status(500).json({ error: 'Failed to get click statistics' });
  }
});

// Get daily trends (admin only)
router.get('/trends', auth, isAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const trends = await ClickTracking.getDailyTrends(null, parseInt(days));

    res.json({ trends });
  } catch (error) {
    console.error('Error getting click trends:', error);
    res.status(500).json({ error: 'Failed to get click trends' });
  }
});

// Get recent clicks (admin only)
router.get('/recent', auth, isAdmin, async (req, res) => {
  try {
    const { limit = 50, elementType } = req.query;

    const query = {};
    if (elementType && ['paid_ads_button', 'free_marketing_banner'].includes(elementType)) {
      query.elementType = elementType;
    }

    const recentClicks = await ClickTracking.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.json({ clicks: recentClicks });
  } catch (error) {
    console.error('Error getting recent clicks:', error);
    res.status(500).json({ error: 'Failed to get recent clicks' });
  }
});

module.exports = router;

