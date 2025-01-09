const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');

// Get reviews for a token
router.get('/token/:symbol', async (req, res) => {
  try {
    console.log('Fetching reviews for token:', req.params.symbol);
    const reviews = await Review.find({ tokenSymbol: req.params.symbol })
      .sort({ createdAt: -1 });
    
    console.log('Found reviews:', reviews);
    
    // Calculate average rating
    const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    
    const response = {
      reviews,
      averageRating: reviews.length > 0 ? avgRating : 0,
      totalReviews: reviews.length
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create a review
router.post('/', auth, async (req, res) => {
  try {
    console.log('Received review data:', req.body);
    console.log('User data:', req.user);
    
    const { tokenSymbol, rating, comment } = req.body;
    
    const review = new Review({
      tokenSymbol,
      userId: req.user.id,
      username: req.user.username,
      rating,
      comment
    });
    
    console.log('Created review object:', review);
    
    await review.save();
    console.log('Review saved successfully');
    
    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'You have already reviewed this token' });
    } else {
      res.status(500).json({ error: 'Failed to create review', details: error.message });
    }
  }
});

// Update a review
router.put('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { rating: req.body.rating, comment: req.body.comment },
      { new: true }
    );
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router; 