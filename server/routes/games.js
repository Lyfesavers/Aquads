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
const GAMES_LIST_TTL = 2 * 60 * 1000;   // 2 minutes for the full games list
const GAMES_CATS_TTL = 5 * 60 * 1000;   // 5 minutes for categories (changes rarely)

const invalidateGamesCache = () => {
  gamesCache.clear();
};

// Get all game categories (define BEFORE dynamic routes)
router.get('/categories', async (req, res) => {
  try {
    const cacheKey = 'categories';
    const now = Date.now();
    const cached = gamesCache.get(cacheKey);
    if (cached && now - cached.timestamp < GAMES_CATS_TTL) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const categories = await Game.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const data = categories.map(cat => ({ name: cat._id, count: cat.count }));
    gamesCache.set(cacheKey, { data, timestamp: now });
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
    if (cached && now - cached.timestamp < GAMES_CATS_TTL) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const categories = await Game.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const data = categories.map(cat => ({ name: cat._id, count: cat.count }));
    gamesCache.set(cacheKey, { data, timestamp: now });
    res.set('X-Cache', 'MISS');
    res.json(data);
  } catch (error) {
    console.error('Error fetching popular categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all games
router.get('/', async (req, res) => {
  try {
    // Only cache simple, filter-free requests (the most common page loads)
    const { category, blockchain, search, status, sort: sortParam } = req.query;
    const isSimpleRequest = !search; // don't cache text search results
    const cacheKey = `games_${category || ''}_${blockchain || ''}_${status || 'active'}_${sortParam || 'votes'}`;
    const now = Date.now();

    if (isSimpleRequest) {
      const cached = gamesCache.get(cacheKey);
      if (cached && now - cached.timestamp < GAMES_LIST_TTL) {
        res.set('X-Cache', 'HIT');
        return res.json(cached.data);
      }
    }

    const query = {};
    if (category) query.category = category;
    if (blockchain) query.blockchain = blockchain;
    if (search) query.$text = { $search: search };
    query.status = status || 'active';

    let sort = { votes: -1 };
    if (sortParam === 'newest') sort = { createdAt: -1 };
    else if (sortParam === 'oldest') sort = { createdAt: 1 };
    else if (sortParam === 'alphabetical') sort = { title: 1 };

    const games = await Game.find(query)
      .populate('owner', 'username image')
      .sort(sort)
      .lean();

    if (isSimpleRequest) {
      gamesCache.set(cacheKey, { data: games, timestamp: now });
    }
    res.set('X-Cache', 'MISS');
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

// (moved categories route above)

module.exports = router; 