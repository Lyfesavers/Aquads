const express = require('express');
const router = express.Router();
const ServiceReview = require('../models/ServiceReview');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const { awardAffiliateReviewPoints } = require('./points');

// Get reviews for a service
router.get('/:serviceId', async (req, res) => {
  try {

    const reviews = await ServiceReview.find({ 
      serviceId: req.params.serviceId 
    }).sort({ createdAt: -1 });
    

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching service reviews:', error);
    res.status(500).json({ error: 'Failed to fetch service reviews' });
  }
});

// Check if user can review a service (has completed bookings)
router.get('/:serviceId/eligibility', auth, async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    const userId = req.user.userId;

    // Find completed bookings for this service by this user
    const completedBookings = await Booking.find({
      serviceId: serviceId,
      buyerId: userId,
      status: 'completed',
      isReviewed: false // Only show bookings that haven't been reviewed yet
    }).sort({ completedAt: -1 });

    res.json({
      canReview: completedBookings.length > 0,
      availableBookings: completedBookings.map(booking => ({
        bookingId: booking._id,
        completedAt: booking.completedAt,
        price: booking.price,
        currency: booking.currency
      }))
    });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ error: 'Failed to check review eligibility' });
  }
});

// Add a new review
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const { serviceId, bookingId, rating, comment } = req.body;
    
    if (!serviceId || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If bookingId is provided, validate the new booking-based review system
    if (bookingId) {
      // Validate that the booking exists, is completed, and belongs to the user
      const booking = await Booking.findOne({
        _id: bookingId,
        serviceId: serviceId,
        buyerId: req.user.userId,
        status: 'completed'
      });

      if (!booking) {
        return res.status(400).json({ 
          error: 'No completed booking found for this service. You can only review services you have completed.' 
        });
      }

      // Check if this booking has already been reviewed
      const existingReview = await ServiceReview.findOne({
        bookingId: bookingId
      });

      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this booking' });
      }

      const review = new ServiceReview({
        serviceId,
        bookingId,
        userId: req.user.userId,
        username: req.user.username,
        rating: Number(rating),
        comment: comment.trim()
      });

      const savedReview = await review.save();

      // Mark the booking as reviewed
      booking.isReviewed = true;
      await booking.save();
    } else {
      // Legacy review system - check if user already reviewed this service
      const existingReview = await ServiceReview.findOne({
        serviceId,
        userId: req.user.userId,
        bookingId: { $exists: false } // Only check legacy reviews
      });

      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this service' });
      }

      const review = new ServiceReview({
        serviceId,
        userId: req.user.userId,
        username: req.user.username,
        rating: Number(rating),
        comment: comment.trim()
      });

      const savedReview = await review.save();
    }

    // Update service rating, review count, and badge
    const allReviews = await ServiceReview.find({ serviceId });
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / allReviews.length;

    const service = await Service.findById(serviceId);
    service.rating = averageRating;
    service.reviews = allReviews.length;
    // Badge will be automatically calculated in the pre-save middleware
    await service.save();

    // NEW CODE: Check if the user is an affiliate and award points
    const user = await User.findById(req.user.userId);
    if (user && user.referralCode) {

      await awardAffiliateReviewPoints(req.user.userId);
    }


    res.status(201).json(savedReview);
  } catch (error) {
    console.error('Error creating service review:', error);
    res.status(500).json({ error: 'Failed to create service review' });
  }
});

module.exports = router; 