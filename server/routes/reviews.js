const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');

// Get reviews for a token
router.get('/:tokenId', async (req, res) => {
  try {
    const reviews = await Review.find({ tokenId: req.params.tokenId })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add a new review
router.post('/', auth, async (req, res) => {
  try {
    const { tokenId, rating, comment } = req.body;
    const username = req.user.username;

    // Check if user already reviewed this token
    const existingReview = await Review.findOne({
      tokenId,
      username
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this token' });
    }

    const review = new Review({
      tokenId,
      username,
      rating,
      comment
    });

    await review.save();
    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router; 