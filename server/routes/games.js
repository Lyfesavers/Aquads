const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const GameVote = require('../models/GameVote');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const User = require('../models/User');
const { awardGameVotePoints, revokeGameVotePoints } = require('./points');

// Cache for games list and categories — these are heavy aggregation/populate queries
const gamesCache = new Map(); // cacheKey -> { data, timestamp }
const gamesRefreshing = new Set(); // cache keys currently being refreshed in background
const GAMES_LIST_TTL = 60 * 1000;        // 1 minute for the full games list
const GAMES_CATS_TTL = 2 * 60 * 1000;   // 2 minutes for categories

const invalidateGamesCache = () => {
  gamesCache.clear();
};

// Shared helper — runs the categories aggregation and populates the cache.
const fetchAndCacheCategories = async () => {
  const now = Date.now();
  const all = await Game.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const data = all.map(cat => ({ name: cat._id, count: cat.count }));
  gamesCache.set('categories', { data, timestamp: now });
  gamesCache.set('categories_popular', { data: data.slice(0, 10), timestamp: now });
  return data;
};

// Get all game categories (define BEFORE dynamic routes)
router.get('/categories', async (req, res) => {
  try {
    const cacheKey = 'categories';
    const now = Date.now();
    const cached = gamesCache.get(cacheKey);

    if (cached) {
      res.set('X-Cache', now - cached.timestamp < GAMES_CATS_TTL ? 'HIT' : 'STALE');
      res.json(cached.data);
      if (!gamesRefreshing.has(cacheKey) && now - cached.timestamp >= GAMES_CATS_TTL) {
        gamesRefreshing.add(cacheKey);
        fetchAndCacheCategories().catch(err =>
          console.error('[Games Cache] Background refresh (categories) failed:', err.message)
        ).finally(() => { gamesRefreshing.delete(cacheKey); gamesRefreshing.delete('categories_popular'); });
      }
      return;
    }

    const data = await fetchAndCacheCategories();
    res.set('X-Cache', 'MISS');
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get popular game categories (define BEFORE dynamic routes)
router.get('/categories/popular', async (req, res) => {
  try {
    const cacheKey = 'categories_popular';
    const now = Date.now();
    const cached = gamesCache.get(cacheKey);

    if (cached) {
      res.set('X-Cache', now - cached.timestamp < GAMES_CATS_TTL ? 'HIT' : 'STALE');
      res.json(cached.data);
      if (!gamesRefreshing.has(cacheKey) && now - cached.timestamp >= GAMES_CATS_TTL) {
        gamesRefreshing.add(cacheKey);
        fetchAndCacheCategories().catch(err =>
          console.error('[Games Cache] Background refresh (popular cats) failed:', err.message)
        ).finally(() => { gamesRefreshing.delete(cacheKey); gamesRefreshing.delete('categories'); });
      }
      return;
    }

    const data = await fetchAndCacheCategories();
    res.set('X-Cache', 'MISS');
    res.json(data.slice(0, 10));
  } catch (error) {
    console.error('Error fetching popular categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Fetch games from DB for a given query key and update the cache.
const fetchAndCacheGamesList = async (cacheKey, query, sort) => {
  const games = await Game.find(query).populate('owner', 'username image').sort(sort).lean();
  gamesCache.set(cacheKey, { data: games, timestamp: Date.now() });
  return games;
};

// Get all games
router.get('/', async (req, res) => {
  try {
    const { category, blockchain, search, status, sort: sortParam } = req.query;
    const isSimpleRequest = !search;
    const cacheKey = `games_${category || ''}_${blockchain || ''}_${status || 'active'}_${sortParam || 'votes'}`;
    const now = Date.now();

    const query = {};
    if (category) query.category = category;
    if (blockchain) query.blockchain = blockchain;
    if (search) query.$text = { $search: search };
    query.status = status || 'active';

    let sort = { votes: -1 };
    if (sortParam === 'newest') sort = { createdAt: -1 };
    else if (sortParam === 'oldest') sort = { createdAt: 1 };
    else if (sortParam === 'alphabetical') sort = { title: 1 };

    if (isSimpleRequest) {
      const cached = gamesCache.get(cacheKey);
      if (cached) {
        res.set('X-Cache', now - cached.timestamp < GAMES_LIST_TTL ? 'HIT' : 'STALE');
        res.json(cached.data);
        if (!gamesRefreshing.has(cacheKey) && now - cached.timestamp >= GAMES_LIST_TTL) {
          gamesRefreshing.add(cacheKey);
          fetchAndCacheGamesList(cacheKey, query, sort).catch(err =>
            console.error('[Games Cache] Background refresh failed:', err.message)
          ).finally(() => { gamesRefreshing.delete(cacheKey); });
        }
        return;
      }

      // No cache — must wait
      const games = await fetchAndCacheGamesList(cacheKey, query, sort);
      res.set('X-Cache', 'MISS');
      return res.json(games);
    }

    // Search queries bypass cache entirely
    const games = await Game.find(query).populate('owner', 'username image').sort(sort).lean();
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get game by ID (place AFTER specific routes)
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('owner', 'username image')
      .lean();
      
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Create a new game listing
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    
    const game = new Game({
      ...req.body,
      owner: req.user.userId
    });
    
    await game.save();
    invalidateGamesCache();
    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game listing:', error);
    res.status(500).json({ error: 'Failed to create game listing' });
  }
});

// Update a game listing
router.patch('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    // First find the game by ID
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Check if user is the owner or an admin
    if (game.owner.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to edit this game' });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      game[key] = req.body[key];
    });
    
    await game.save();
    invalidateGamesCache();
    res.json(game);
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Delete a game listing
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    // First find the game by ID
    const game = await Game.findById(req.params.id).lean();
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Check if user is the owner or an admin
    if (game.owner.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this game' });
    }
    
    await Game.findByIdAndDelete(req.params.id);
    
    // Also remove all votes for this game
    await GameVote.deleteMany({ gameId: req.params.id });
    invalidateGamesCache();
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// Vote for a game
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user.userId;
    
    // Check if game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Check if user already voted
    const existingVote = await GameVote.findOne({ gameId, userId });
    
    if (existingVote) {
      // Remove vote if already voted
      await GameVote.findByIdAndDelete(existingVote._id);
      
      // Update game vote count
      game.votes = Math.max(0, game.votes - 1);
      await game.save();
      
      // Revoke the 20 points since vote was removed
      try {
        await revokeGameVotePoints(userId, gameId);
      } catch (pointsError) {
        console.error('Error revoking points for game vote:', pointsError);
        // Continue with the vote removal even if points revocation fails
      }
      
      invalidateGamesCache();
      return res.json({ message: 'Vote removed successfully', voted: false, votes: game.votes });
    } else {
      // Add new vote
      const vote = new GameVote({
        gameId,
        userId,
        vote: 1
      });
      
      await vote.save();
      
      // Update game vote count
      game.votes += 1;
      await game.save();
      
      // Award 20 points to the user for voting (only once per game)
      try {
        await awardGameVotePoints(userId, gameId);
      } catch (pointsError) {
        console.error('Error awarding points for game vote:', pointsError);
        // Continue with the vote even if points award fails
      }
      
      invalidateGamesCache();
      return res.json({ message: 'Vote added successfully', voted: true, votes: game.votes });
    }
  } catch (error) {
    console.error('Error voting for game:', error);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// Check if user has voted for a game
router.get('/:id/voted', auth, async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user.userId;
    
    const vote = await GameVote.findOne({ gameId, userId }).lean();
    
    res.json({ voted: !!vote });
  } catch (error) {
    console.error('Error checking vote status:', error);
    res.status(500).json({ error: 'Failed to check vote status' });
  }
});

// Pre-warm the games cache on startup — runs the two most expensive queries (list + categories)
// so the first user after a restart never waits 12-20 seconds.
const warmupGamesCache = async () => {
  try {
    const [games, cats] = await Promise.all([
      fetchAndCacheGamesList('games___active_votes', { status: 'active' }, { votes: -1 }),
      fetchAndCacheCategories()
    ]);
    console.log(`[Games Cache] Warmed up ${games.length} games, ${cats.length} categories`);
  } catch (err) {
    console.error('[Games Cache] Warmup failed (non-critical):', err.message);
  }
};

module.exports = router;
module.exports.warmupGamesCache = warmupGamesCache;