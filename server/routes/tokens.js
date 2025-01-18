const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const updateTokenCache = async (force = false) => {
  const now = Date.now();
  if (!force && now - lastUpdateTime < UPDATE_INTERVAL) {
    return;
  }

  try {
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
    console.log(`Token cache updated with ${tokens.length} tokens`);
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

    const tokens = await Token.find(query)
      .sort({ marketCapRank: 1 })
      .limit(250);

    if (tokens.length > 0) {
      res.json(tokens);
      
      // Update cache in background if needed
      if (Date.now() - lastUpdateTime >= UPDATE_INTERVAL) {
        updateTokenCache().catch(console.error);
      }
      return;
    }

    const freshTokens = await updateTokenCache(true);
    if (freshTokens) {
      let result = freshTokens;
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        result = freshTokens.filter(token => 
          token.symbol.match(searchRegex) ||
          token.name.match(searchRegex) ||
          token.id.match(searchRegex)
        );
      }
      res.json(result);
      return;
    }

    res.status(404).json({ error: 'No tokens found' });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
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