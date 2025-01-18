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
      symbol: token.symbol?.toUpperCase() || '',
      name: token.name || '',
      image: token.image || '',
      currentPrice: Number(token.current_price) || 0,
      marketCap: Number(token.market_cap) || 0,
      marketCapRank: Number(token.market_cap_rank) || 0,
      totalVolume: Number(token.total_volume) || 0,
      high24h: Number(token.high_24h) || 0,
      low24h: Number(token.low_24h) || 0,
      priceChange24h: Number(token.price_change_24h) || 0,
      priceChangePercentage24h: Number(token.price_change_percentage_24h) || 0,
      circulatingSupply: Number(token.circulating_supply) || 0,
      totalSupply: Number(token.total_supply) || 0,
      maxSupply: Number(token.max_supply) || null,
      ath: Number(token.ath) || 0,
      athChangePercentage: Number(token.ath_change_percentage) || 0,
      athDate: token.ath_date ? new Date(token.ath_date) : new Date(),
      fullyDilutedValuation: Number(token.fully_diluted_valuation) || 0,
      lastUpdated: new Date()
    }));

    // Batch update tokens with sanitized data
    const operations = tokens.map(token => ({
      updateOne: {
        filter: { id: token.id },
        update: { $set: token },
        upsert: true
      }
    }));

    await Token.bulkWrite(operations);

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

// Get all tokens with sanitized response
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

    const cachedTokens = await Token.find(query)
      .sort({ marketCapRank: 1 })
      .limit(250)
      .lean();

    if (cachedTokens && cachedTokens.length > 0) {
      // Sanitize the response data
      const sanitizedTokens = cachedTokens.map(token => ({
        ...token,
        currentPrice: Number(token.currentPrice) || 0,
        marketCap: Number(token.marketCap) || 0,
        marketCapRank: Number(token.marketCapRank) || 0,
        totalVolume: Number(token.totalVolume) || 0,
        priceChange24h: Number(token.priceChange24h) || 0,
        priceChangePercentage24h: Number(token.priceChangePercentage24h) || 0
      }));

      res.json(sanitizedTokens);
      
      if (Date.now() - lastUpdateTime >= UPDATE_INTERVAL) {
        updateTokenCache().catch(console.error);
      }
      return;
    }

    const freshTokens = await updateTokenCache(true);
    if (freshTokens) {
      let tokens = freshTokens;
      if (search) {
        tokens = freshTokens.filter(token => 
          token.symbol.match(new RegExp(search, 'i')) ||
          token.name.match(new RegExp(search, 'i')) ||
          token.id.match(new RegExp(search, 'i'))
        );
      }
      res.json(tokens);
      return;
    }

    res.status(404).json({ error: 'No tokens found' });
  } catch (error) {
    console.error('Error fetching tokens:', error);
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