const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Service = require('../models/Service');
const User = require('../models/User');
const Booking = require('../models/Booking');
const ServiceReview = require('../models/ServiceReview');
const TwitterRaid = require('../models/TwitterRaid');
const FacebookRaid = require('../models/FacebookRaid');
const BumpRequest = require('../models/BumpRequest');
const BannerAd = require('../models/BannerAd');
const Notification = require('../models/Notification');
const AffiliateEarning = require('../models/AffiliateEarning');

// NEW: Batched dashboard data route - eliminates multiple API calls
router.get('/batched-data', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare all data fetching promises
    const promises = [];

    // 1. User's services
    promises.push(
      Service.find({ seller: userId, status: 'active' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('seller', 'username image rating reviews')
    );

    // 2. User's bookings
    promises.push(
      Booking.find({ 
        $or: [{ buyer: userId }, { seller: userId }] 
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('service', 'title image')
        .populate('buyer', 'username image')
        .populate('seller', 'username image')
    );

    // 3. User's reviews
    promises.push(
      ServiceReview.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('serviceId', 'title image')
    );

    // 4. Recent notifications
    promises.push(
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
    );

    // 5. Affiliate info (if applicable)
    if (user.affiliates && user.affiliates.length > 0) {
      promises.push(
        AffiliateEarning.find({ userId })
          .sort({ createdAt: -1 })
          .limit(10)
      );
      promises.push(
        User.find({ referredBy: userId })
          .select('username image createdAt')
          .sort({ createdAt: -1 })
          .limit(10)
      );
    } else {
      promises.push(Promise.resolve([])); // Empty affiliate earnings
      promises.push(Promise.resolve([])); // Empty referred users
    }

    // 6. Admin-specific data (if admin)
    if (user.isAdmin) {
      promises.push(
        BumpRequest.find({ status: 'pending' })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('serviceId', 'title image')
          .populate('userId', 'username image')
      );
      promises.push(
        BannerAd.find({ status: 'pending' })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('userId', 'username image')
      );
      promises.push(
        Service.find({ status: 'pending' })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('seller', 'username image')
      );
    } else {
      promises.push(Promise.resolve([])); // Empty bump requests
      promises.push(Promise.resolve([])); // Empty banner ads
      promises.push(Promise.resolve([])); // Empty pending services
    }

    // 7. Twitter raids (if user has any)
    promises.push(
      TwitterRaid.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
    );

    // 8. Facebook raids (if user has any)
    promises.push(
      FacebookRaid.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
    );

    // Execute all promises in parallel
    const [
      userServices,
      userBookings,
      userReviews,
      notifications,
      affiliateEarnings,
      referredUsers,
      bumpRequests,
      bannerAds,
      pendingServices,
      twitterRaids,
      facebookRaids
    ] = await Promise.all(promises);

    // Calculate dashboard stats
    const totalServices = await Service.countDocuments({ seller: userId, status: 'active' });
    const totalBookings = await Booking.countDocuments({ 
      $or: [{ buyer: userId }, { seller: userId }] 
    });
    const totalReviews = await ServiceReview.countDocuments({ userId });
    const unreadNotifications = await Notification.countDocuments({ 
      userId, 
      read: false 
    });

    // Calculate earnings (if applicable)
    let totalEarnings = 0;
    if (affiliateEarnings.length > 0) {
      totalEarnings = affiliateEarnings.reduce((sum, earning) => sum + earning.amount, 0);
    }

    const dashboardData = {
      user: {
        id: user._id,
        username: user.username,
        image: user.image,
        userType: user.userType,
        isAdmin: user.isAdmin,
        points: user.points,
        tokens: user.tokens,
        isVipAffiliate: user.isVipAffiliate,
        affiliateCount: user.affiliateCount
      },
      stats: {
        totalServices,
        totalBookings,
        totalReviews,
        unreadNotifications,
        totalEarnings
      },
      data: {
        services: userServices,
        bookings: userBookings,
        reviews: userReviews,
        notifications,
        affiliateEarnings,
        referredUsers,
        bumpRequests,
        bannerAds,
        pendingServices,
        twitterRaids,
        facebookRaids
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching batched dashboard data:', error);
    res.status(500).json({ 
      message: 'Error fetching dashboard data', 
      error: error.message 
    });
  }
});

module.exports = router;
