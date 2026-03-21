const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');

// Per-symbol cache — prevents 19 simultaneous DB queries when the token list loads.
// Reviews change rarely, so 2-minute cache is safe and a big DB load reducer.
const reviewsCache = new Map(); // symbol -> { data, timestamp }
const REVIEWS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const invalidateReviewsCache = (symbol) => {
  if (symbol) {
    reviewsCache.delete(symbol.toLowerCase());
  }
};

// Get reviews for a token
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toLowerCase();
    const now = Date.now();
    const cached = reviewsCache.get(symbol);

    if (cached && now - cached.timestamp < REVIEWS_CACHE_TTL) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const reviews = await Review.find({ 
      tokenSymbol: symbol
    }).sort({ createdAt: -1 }).lean();

    reviewsCache.set(symbol, { data: reviews, timestamp: now });
    res.set('X-Cache', 'MISS');
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add a new review
router.post('/', auth, requireEmailVerification, async (req, res) => {
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
    invalidateReviewsCache(tokenSymbol);

    res.status(201).json(savedReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router; 