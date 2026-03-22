const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');

// Per-symbol cache — prevents 19 simultaneous DB queries when the token list loads.
const reviewsCache = new Map(); // symbol -> { data, timestamp }
const reviewsRefreshing = new Set(); // symbols currently being refreshed in background
const REVIEWS_CACHE_TTL = 60 * 1000; // 1 minute

const invalidateReviewsCache = (symbol) => {
  if (symbol) {
    reviewsCache.delete(symbol.toLowerCase());
  }
};

// Fetches fresh reviews for one symbol and updates the cache — used for background refreshes.
const refreshReviewsForSymbol = async (symbol) => {
  try {
    const reviews = await Review.find({ tokenSymbol: symbol }).sort({ createdAt: -1 }).lean();
    reviewsCache.set(symbol, { data: reviews, timestamp: Date.now() });
  } catch (err) {
    console.error(`[Reviews Cache] Background refresh failed for ${symbol}:`, err.message);
  } finally {
    reviewsRefreshing.delete(symbol);
  }
};

// Called once after MongoDB connects — loads all reviews in a single query so the
// first page load after a server restart doesn't fire 19 simultaneous cold DB hits.
const warmupReviewsCache = async () => {
  try {
    const allReviews = await Review.find({}).sort({ createdAt: -1 }).lean();
    const bySymbol = {};
    for (const review of allReviews) {
      const sym = (review.tokenSymbol || '').toLowerCase();
      if (!bySymbol[sym]) bySymbol[sym] = [];
      bySymbol[sym].push(review);
    }
    const now = Date.now();
    for (const [sym, reviews] of Object.entries(bySymbol)) {
      reviewsCache.set(sym, { data: reviews, timestamp: now });
    }
    console.log(`[Reviews Cache] Warmed up ${Object.keys(bySymbol).length} symbols`);
  } catch (err) {
    console.error('[Reviews Cache] Warmup failed (non-critical):', err.message);
  }
};

// Get reviews for a token
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toLowerCase();
    const now = Date.now();
    const cached = reviewsCache.get(symbol);

    if (cached) {
      // Serve immediately — even if stale, user never waits
      res.set('X-Cache', now - cached.timestamp < REVIEWS_CACHE_TTL ? 'HIT' : 'STALE');
      res.json(cached.data);
      // If expired and not already refreshing, kick off background refresh
      if (!reviewsRefreshing.has(symbol) && now - cached.timestamp >= REVIEWS_CACHE_TTL) {
        reviewsRefreshing.add(symbol);
        refreshReviewsForSymbol(symbol);
      }
      return;
    }

    // No cache at all — must wait for first fetch
    const reviews = await Review.find({ tokenSymbol: symbol }).sort({ createdAt: -1 }).lean();
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
module.exports.warmupReviewsCache = warmupReviewsCache;