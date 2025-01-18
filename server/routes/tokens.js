const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const updateTokenCache = async (force = false) => {
  try {
    const now = Date.now();
    if (!force && now - lastUpdateTime < UPDATE_INTERVAL) {
      return;
    }

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

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response from CoinGecko');
    }

    const tokens = response.data.map(token => {
      if (!token || typeof token !== 'object') return null;

      return {
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
      };
    }).filter(token => token !== null);

    if (tokens.length === 0) {
      throw new Error('No valid tokens in response');
    }

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

    let tokens = await Token.find(query)
      .sort({ marketCapRank: 1 })
      .limit(250)
      .lean();

    if (tokens && tokens.length > 0) {
      // Ensure all numeric fields are numbers
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
      
      if (Date.now() - lastUpdateTime >= UPDATE_INTERVAL) {
        updateTokenCache().catch(console.error);
      }
      return;
    }

    const freshTokens = await updateTokenCache(true);
    if (freshTokens && freshTokens.length > 0) {
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