const express = require('express');
const router = express.Router();
const ServiceReview = require('../models/ServiceReview');
const Service = require('../models/Service');
const User = require('../models/User');
const auth = require('../middleware/auth');
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

// Add a new review
router.post('/', auth, async (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body;
    
    if (!serviceId || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already reviewed this service
    const existingReview = await ServiceReview.findOne({
      serviceId,
      userId: req.user.userId
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