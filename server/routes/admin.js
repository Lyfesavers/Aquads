const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

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

// Get detailed affiliate information for a specific user
router.get('/user/:userId/affiliates', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user and populate their affiliates with detailed info
    const user = await User.findById(userId)
      .populate({
        path: 'affiliates',
        select: 'username email createdAt points tokens ipAddress country deviceFingerprint emailVerified affiliateCount',
        options: { sort: { createdAt: -1 } }
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get additional stats for each affiliate
    const affiliateDetails = await Promise.all(
      user.affiliates.map(async (affiliate) => {
        // Get affiliate's own affiliates count
        const affiliateInfo = await User.findById(affiliate._id)
          .populate({
            path: 'affiliates',
            select: 'username createdAt',
            options: { sort: { createdAt: -1 } }
          });

        return {
          id: affiliate._id,
          username: affiliate.username,
          email: affiliate.email,
          createdAt: affiliate.createdAt,
          points: affiliate.points,
          tokens: affiliate.tokens,
          ipAddress: affiliate.ipAddress,
          country: affiliate.country,
          deviceFingerprint: affiliate.deviceFingerprint,
          emailVerified: affiliate.emailVerified,
          affiliateCount: affiliate.affiliateCount,
          // Include their own affiliates for pattern detection
          subAffiliates: affiliateInfo?.affiliates || []
        };
      })
    );

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        totalAffiliates: user.affiliateCount
      },
      affiliates: affiliateDetails,
      summary: {
        totalAffiliates: affiliateDetails.length,
        emailVerified: affiliateDetails.filter(a => a.emailVerified).length,
        sameIP: affiliateDetails.filter(a => a.ipAddress === user.ipAddress).length,
        sameCountry: affiliateDetails.filter(a => a.country === user.country).length,
        sameDevice: affiliateDetails.filter(a => a.deviceFingerprint === user.deviceFingerprint).length,
        totalPoints: affiliateDetails.reduce((sum, a) => sum + (a.points || 0), 0),
        recentSignups: affiliateDetails.filter(a => {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return new Date(a.createdAt) > dayAgo;
        }).length
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate details:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate details' });
  }
});

// Get bulk affiliate information for multiple users
router.post('/bulk-affiliate-lookup', auth, isAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    // Limit to 20 users at a time to prevent overload
    const limitedUserIds = userIds.slice(0, 20);
    
    const results = await Promise.all(
      limitedUserIds.map(async (userId) => {
        try {
          const user = await User.findById(userId)
            .populate({
              path: 'affiliates',
              select: 'username email createdAt points ipAddress country deviceFingerprint emailVerified',
              options: { sort: { createdAt: -1 } }
            });

          if (!user) {
            return { userId, error: 'User not found' };
          }

          // Basic fraud detection flags
          const flags = [];
          const uniqueIPs = new Set();
          const uniqueCountries = new Set();
          const uniqueDevices = new Set();
          let rapidSignups = 0;

          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          user.affiliates.forEach(affiliate => {
            if (affiliate.ipAddress) uniqueIPs.add(affiliate.ipAddress);
            if (affiliate.country) uniqueCountries.add(affiliate.country);
            if (affiliate.deviceFingerprint) uniqueDevices.add(affiliate.deviceFingerprint);
            if (new Date(affiliate.createdAt) > dayAgo) rapidSignups++;
          });

          // Flag suspicious patterns
          if (rapidSignups > 5) flags.push('rapid_growth');
          if (uniqueIPs.size < user.affiliates.length * 0.5) flags.push('same_ip_cluster');
          if (uniqueDevices.size < user.affiliates.length * 0.3) flags.push('same_device_cluster');
          if (uniqueCountries.size === 1 && user.affiliates.length > 10) flags.push('single_country');

          return {
            userId: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            totalAffiliates: user.affiliates.length,
            flags,
            riskScore: flags.length * 25, // Simple risk scoring
            affiliates: user.affiliates.map(a => ({
              id: a._id,
              username: a.username,
              email: a.email,
              createdAt: a.createdAt,
              points: a.points,
              emailVerified: a.emailVerified,
              ipAddress: a.ipAddress,
              country: a.country
            }))
          };
        } catch (error) {
          return { userId, error: error.message };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Error in bulk affiliate lookup:', error);
    res.status(500).json({ error: 'Failed to perform bulk lookup' });
  }
});

// Get top affiliates (users with most affiliates)
router.get('/top-affiliates', auth, isAdmin, async (req, res) => {
  try {
    const { limit = 50, minAffiliates = 5 } = req.query;
    
    const topAffiliates = await User.find({
      affiliateCount: { $gte: parseInt(minAffiliates) }
    })
    .select('username email createdAt affiliateCount points ipAddress country deviceFingerprint')
    .sort({ affiliateCount: -1 })
    .limit(parseInt(limit));

    res.json({
      topAffiliates: topAffiliates.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        affiliateCount: user.affiliateCount,
        points: user.points,
        ipAddress: user.ipAddress,
        country: user.country,
        deviceFingerprint: user.deviceFingerprint
      }))
    });
  } catch (error) {
    console.error('Error fetching top affiliates:', error);
    res.status(500).json({ error: 'Failed to fetch top affiliates' });
  }
});

// Search users by username or email
router.get('/search-users', auth, isAdmin, async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username email createdAt affiliateCount points ipAddress country')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        affiliateCount: user.affiliateCount,
        points: user.points,
        ipAddress: user.ipAddress,
        country: user.country
      }))
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get users with suspicious patterns
router.get('/suspicious-users', auth, isAdmin, async (req, res) => {
  try {
    const { minAffiliates = 10, daysBack = 30 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysBack));

    // Find users with high affiliate counts
    const suspiciousUsers = await User.find({
      affiliateCount: { $gte: parseInt(minAffiliates) },
      createdAt: { $gte: cutoffDate }
    })
    .populate({
      path: 'affiliates',
      select: 'username email createdAt ipAddress country deviceFingerprint',
      options: { sort: { createdAt: -1 } }
    })
    .sort({ affiliateCount: -1 })
    .limit(100);

    const flaggedUsers = suspiciousUsers.map(user => {
      const flags = [];
      const ips = user.affiliates.map(a => a.ipAddress).filter(Boolean);
      const countries = user.affiliates.map(a => a.country).filter(Boolean);
      const devices = user.affiliates.map(a => a.deviceFingerprint).filter(Boolean);

      // Check for same IP
      const uniqueIPs = new Set(ips);
      if (uniqueIPs.size < user.affiliates.length * 0.5) flags.push('same_ip_cluster');

      // Check for same country
      const uniqueCountries = new Set(countries);
      if (uniqueCountries.size === 1 && user.affiliates.length > 10) flags.push('single_country');

      // Check for same device
      const uniqueDevices = new Set(devices);
      if (uniqueDevices.size < user.affiliates.length * 0.3) flags.push('same_device_cluster');

      // Check for rapid growth
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSignups = user.affiliates.filter(a => new Date(a.createdAt) > last24h).length;
      if (recentSignups > 5) flags.push('rapid_growth');

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        affiliateCount: user.affiliateCount,
        points: user.points,
        flags,
        riskScore: flags.length * 25,
        uniqueIPs: uniqueIPs.size,
        uniqueCountries: uniqueCountries.size,
        uniqueDevices: uniqueDevices.size,
        recentSignups
      };
    });

    // Sort by risk score
    flaggedUsers.sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      suspiciousUsers: flaggedUsers,
      summary: {
        totalUsers: flaggedUsers.length,
        highRisk: flaggedUsers.filter(u => u.riskScore >= 75).length,
        mediumRisk: flaggedUsers.filter(u => u.riskScore >= 50 && u.riskScore < 75).length,
        lowRisk: flaggedUsers.filter(u => u.riskScore < 50).length
      }
    });
  } catch (error) {
    console.error('Error fetching suspicious users:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious users' });
  }
});

module.exports = router; 