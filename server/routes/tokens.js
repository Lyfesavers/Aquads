const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');

// Fetch and cache tokens from CoinGecko
const updateTokenCache = async () => {
  try {
    // Fetch top 250 tokens by market cap
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
      currentPrice: token.current_price,
      marketCap: token.market_cap,
      marketCapRank: token.market_cap_rank,
      totalVolume: token.total_volume,
      high24h: token.high_24h,
      low24h: token.low_24h,
      priceChange24h: token.price_change_24h,
      priceChangePercentage24h: token.price_change_percentage_24h,
      circulatingSupply: token.circulating_supply,
      totalSupply: token.total_supply,
      maxSupply: token.max_supply,
      ath: token.ath,
      athChangePercentage: token.ath_change_percentage,
      athDate: token.ath_date,
      fullyDilutedValuation: token.fully_diluted_valuation,
      logo: token.image,
      lastUpdated: new Date()
    }));

    // Update or insert tokens
    for (const token of tokens) {
      await Token.findOneAndUpdate(
        { id: token.id },
        token,
        { upsert: true, new: true }
      );
    }

    console.log('Token cache updated successfully');
  } catch (error) {
    console.error('Error updating token cache:', error);
  }
};

// Initialize cache and set up periodic updates (every 5 minutes)
updateTokenCache();
setInterval(updateTokenCache, 5 * 60 * 1000);

// Get all tokens
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
      .limit(100);
      
    res.json(tokens);
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