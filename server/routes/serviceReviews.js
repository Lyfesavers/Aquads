const express = require('express');
const router = express.Router();
const ServiceReview = require('../models/ServiceReview');
const Service = require('../models/Service');
const User = require('../models/User');
const Booking = require('../models/Booking');
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

// Get user's completed bookings for a service (for review selection)
router.get('/:serviceId/bookings', auth, async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    const userId = req.user.userId;

    // Find completed bookings for this service by this user
    const completedBookings = await Booking.find({
      serviceId: serviceId,
      buyerId: userId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    // Check which bookings have already been reviewed
    const reviewedBookingIds = await ServiceReview.find({
      serviceId: serviceId,
      userId: userId,
      bookingId: { $exists: true } // Only get reviews with bookingId
    }).distinct('bookingId');

    // Add review status to each booking
    const bookingsWithReviewStatus = completedBookings.map(booking => ({
      ...booking.toObject(),
      isReviewed: reviewedBookingIds.includes(booking._id.toString())
    }));

    res.json(bookingsWithReviewStatus);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch user bookings' });
  }
});

// Add a new review
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const { serviceId, bookingId, rating, comment } = req.body;
    
    if (!serviceId || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // For new reviews, bookingId is required
    if (!bookingId) {
      return res.status(400).json({ 
        error: 'Booking ID is required. Please select a completed booking to review.' 
      });
    }

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
      userId: req.user.userId,
      username: req.user.username,
      bookingId: bookingId,
      rating: Number(rating),
      comment: comment.trim()
    });

    const savedReview = await review.save();

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