const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const updateTokenCache = async (force = false) => {
  const now = Date.now();
  if (!force && now - lastUpdateTime < UPDATE_INTERVAL) {
    console.log('Skipping update - within interval');
    return null;
  }

  try {
    console.log('Updating token cache...');
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    if (!response.data || !Array.isArray(response.data)) {
      console.error('Invalid response format from CoinGecko');
      return null;
    }

    const tokens = response.data.map(token => ({
      id: token.id || '',
      symbol: (token.symbol || '').toUpperCase(),
      name: token.name || '',
      image: token.image || '',
      currentPrice: parseFloat(token.current_price) || 0,
      marketCap: parseFloat(token.market_cap) || 0,
      marketCapRank: parseInt(token.market_cap_rank) || 0,
      totalVolume: parseFloat(token.total_volume) || 0,
      high24h: parseFloat(token.high_24h) || 0,
      low24h: parseFloat(token.low_24h) || 0,
      priceChange24h: parseFloat(token.price_change_24h) || 0,
      priceChangePercentage24h: parseFloat(token.price_change_percentage_24h) || 0,
      circulatingSupply: parseFloat(token.circulating_supply) || 0,
      totalSupply: parseFloat(token.total_supply) || 0,
      maxSupply: parseFloat(token.max_supply) || null,
      ath: parseFloat(token.ath) || 0,
      athChangePercentage: parseFloat(token.ath_change_percentage) || 0,
      athDate: token.ath_date ? new Date(token.ath_date) : new Date(),
      fullyDilutedValuation: parseFloat(token.fully_diluted_valuation) || 0,
      lastUpdated: new Date()
    })).filter(token => token.id && token.symbol && token.name);

    if (tokens.length === 0) {
      console.error('No valid tokens in response');
      return null;
    }

    // Use bulkWrite for better performance
    const bulkOps = tokens.map(token => ({
      updateOne: {
        filter: { id: token.id },
        update: { $set: token },
        upsert: true
      }
    }));

    await Token.bulkWrite(bulkOps, { ordered: false });
    lastUpdateTime = now;
    console.log(`Updated ${tokens.length} tokens in cache`);
    return tokens;
  } catch (error) {
    console.error('Token cache update failed:', error.message);
    return null;
  }
};

// Initialize cache without blocking
updateTokenCache(true).catch(console.error);

// Set up periodic updates
setInterval(() => {
  updateTokenCache().catch(console.error);
}, UPDATE_INTERVAL);

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { symbol: searchRegex },
          { name: searchRegex },
          { id: searchRegex }
        ]
      };
    }

    // Always try to get tokens from database first
    let tokens = await Token.find(query)
      .sort({ marketCapRank: 1 })
      .limit(250)
      .lean();

    // If we have tokens, return them immediately
    if (tokens && tokens.length > 0) {
      // Clean numeric values
      tokens = tokens.map(token => ({
        ...token,
        currentPrice: parseFloat(token.currentPrice) || 0,
        marketCap: parseFloat(token.marketCap) || 0,
        marketCapRank: parseInt(token.marketCapRank) || 0,
        totalVolume: parseFloat(token.totalVolume) || 0,
        priceChange24h: parseFloat(token.priceChange24h) || 0,
        priceChangePercentage24h: parseFloat(token.priceChangePercentage24h) || 0
      }));

      res.json(tokens);
      
      // Update cache in background if needed
      if (Date.now() - lastUpdateTime >= UPDATE_INTERVAL) {
        updateTokenCache().catch(error => {
          console.error('Background cache update failed:', error.message);
        });
      }
      return;
    }

    // If no tokens in DB, force an update
    console.log('No tokens in database, forcing update...');
    const freshTokens = await updateTokenCache(true);
    
    if (!freshTokens || freshTokens.length === 0) {
      return res.status(404).json({ 
        error: 'No tokens available',
        message: 'Please try again in a few minutes'
      });
    }

    // Filter if search query exists
    let result = freshTokens;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      result = freshTokens.filter(token => 
        searchRegex.test(token.symbol) ||
        searchRegex.test(token.name) ||
        searchRegex.test(token.id)
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Error in /api/tokens:', error.message);
    // Try to return any cached data we have
    try {
      const cachedTokens = await Token.find({})
        .sort({ marketCapRank: 1 })
        .limit(250)
        .lean();
      
      if (cachedTokens && cachedTokens.length > 0) {
        return res.json(cachedTokens);
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError.message);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch tokens',
      message: error.message 
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const token = await Token.findOne({ id: req.params.id });
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json(token);
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

module.exports = router; 