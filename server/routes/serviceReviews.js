const express = require('express');
const router = express.Router();
const ServiceReview = require('../models/ServiceReview');
const Service = require('../models/Service');
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
      status: 'completed'
    }).sort({ completedAt: -1 });

    res.json({
      canReview: completedBookings.length > 0,
      completedBookings: completedBookings.length
    });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ error: 'Failed to check review eligibility' });
  }
});

// Add a new review
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body;
    
    if (!serviceId || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Allow multiple reviews per service - no restriction

    const review = new ServiceReview({
      serviceId,
      userId: req.user.userId,
      username: req.user.username,
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