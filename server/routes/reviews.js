const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');

// Get reviews for a token
router.get('/:symbol', async (req, res) => {
  try {
    const reviews = await Review.find({ tokenSymbol: req.params.symbol })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Error fetching reviews' });
  }
});

// Add a new review
router.post('/', auth, async (req, res) => {
  try {
    const { tokenSymbol, rating, comment } = req.body;
    const review = new Review({
      tokenSymbol,
      userId: req.user.id,
      username: req.user.username,
      rating,
      comment
    });
    const savedReview = await review.save();
    
    // Emit the new review to all connected clients
    req.app.get('io').emit('reviewAdded', savedReview);
    
    res.status(201).json(savedReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Error creating review' });
  }
});

module.exports = router; 