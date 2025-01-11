const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');

// Get reviews for a token
router.get('/:symbol', async (req, res) => {
  try {
    console.log('Fetching reviews for:', req.params.symbol);
    const reviews = await Review.find({ 
      tokenSymbol: req.params.symbol.toLowerCase() 
    }).sort({ createdAt: -1 });
    
    console.log('Found reviews:', reviews);
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add a new review
router.post('/', auth, async (req, res) => {
  try {
    const { tokenSymbol, rating, comment } = req.body;
    
    // Check if user already reviewed this token
    const existingReview = await Review.findOne({
      tokenSymbol: tokenSymbol.toLowerCase(),
      username: req.user.username
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this token' });
    }

    const review = new Review({
      tokenSymbol: tokenSymbol.toLowerCase(),
      userId: req.user.userId,
      username: req.user.username,
      rating,
      comment
    });

    const savedReview = await review.save();
    res.status(201).json(savedReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router; 