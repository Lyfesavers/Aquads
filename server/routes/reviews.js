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
    
    if (!tokenSymbol || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already reviewed this token
    const existingReview = await Review.findOne({
      tokenSymbol: tokenSymbol.toLowerCase(),
      userId: req.user.userId
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this token' });
    }

    const review = new Review({
      tokenSymbol: tokenSymbol.toLowerCase(),
      userId: req.user.userId,
      username: req.user.username,
      rating: Number(rating),
      comment: comment.trim()
    });

    const savedReview = await review.save();
    console.log('Saved review:', savedReview);
    res.status(201).json(savedReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router; 