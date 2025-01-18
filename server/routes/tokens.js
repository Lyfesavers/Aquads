const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Fetch and cache tokens from CoinGecko
const updateTokenCache = async (force = false) => {
  const now = Date.now();
  if (!force && now - lastUpdateTime < UPDATE_INTERVAL) {
    return; // Skip update if not forced and within interval
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
        }
      }
    );

    const tokens = response.data.map(token => ({
      id: token.id,
      symbol: token.symbol.toUpperCase(),
      name: token.name,
      image: token.image,
      currentPrice: token.current_price || 0,
      marketCap: token.market_cap || 0,
      marketCapRank: token.market_cap_rank,
      totalVolume: token.total_volume || 0,
      high24h: token.high_24h,
      low24h: token.low_24h,
      priceChange24h: token.price_change_24h || 0,
      priceChangePercentage24h: token.price_change_percentage_24h || 0,
      circulatingSupply: token.circulating_supply,
      totalSupply: token.total_supply,
      maxSupply: token.max_supply,
      ath: token.ath,
      athChangePercentage: token.ath_change_percentage,
      athDate: token.ath_date,
      fullyDilutedValuation: token.fully_diluted_valuation,
      lastUpdated: new Date()
    }));

    // Batch update tokens
    await Token.bulkWrite(
      tokens.map(token => ({
        updateOne: {
          filter: { id: token.id },
          update: { $set: token },
          upsert: true
        }
      }))
    );

    lastUpdateTime = now;
    console.log(`Token cache updated successfully with ${tokens.length} tokens`);
    return tokens;
  } catch (error) {
    console.error('Error updating token cache:', error);
    return null;
  }
};

// Initialize cache
updateTokenCache(true).catch(console.error);

// Set up periodic updates
setInterval(() => updateTokenCache(), UPDATE_INTERVAL);

// Get all tokens with better error handling
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
    
    // First try to get cached tokens
    let tokens = await Token.find(query)
      .sort({ marketCapRank: 1 })
      .limit(250);

    // If we have cached tokens, return them immediately
    if (tokens && tokens.length > 0) {
      res.json(tokens);
      
      // Update cache in background if it's time
      if (Date.now() - lastUpdateTime >= UPDATE_INTERVAL) {
        updateTokenCache().catch(console.error);
      }
      return;
    }

    // If no cached tokens, force update and return fresh data
    const freshTokens = await updateTokenCache(true);
    if (freshTokens) {
      if (search) {
        tokens = freshTokens.filter(token => 
          token.symbol.match(new RegExp(search, 'i')) ||
          token.name.match(new RegExp(search, 'i')) ||
          token.id.match(new RegExp(search, 'i'))
        );
      } else {
        tokens = freshTokens;
      }
      res.json(tokens);
      return;
    }

    // If still no tokens, return error
    res.status(404).json({ error: 'No tokens found' });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    
    // Try to get any cached tokens as fallback
    try {
      const cachedTokens = await Token.find({})
        .sort({ marketCapRank: 1 })
        .limit(250);
      
      if (cachedTokens && cachedTokens.length > 0) {
        res.json(cachedTokens);
        return;
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
    
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Get a specific token
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