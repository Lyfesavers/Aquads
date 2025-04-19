const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
let chartDataCache = {}; // Cache for chart data
const CHART_CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache for chart data

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
        timeout: 10000
      }
    );

    if (!response.data || !Array.isArray(response.data)) {
      console.error('Invalid response format from CoinGecko');
      return null;
    }

    const tokens = response.data.map(token => ({
      id: token.id,
      symbol: token.symbol?.toUpperCase() || '',
      name: token.name || '',
      image: token.image || '',
      currentPrice: token.current_price || 0,
      marketCap: token.market_cap || 0,
      marketCapRank: token.market_cap_rank || 0,
      totalVolume: token.total_volume || 0,
      high24h: token.high_24h || 0,
      low24h: token.low_24h || 0,
      priceChange24h: token.price_change_24h || 0,
      priceChangePercentage24h: token.price_change_percentage_24h || 0,
      circulatingSupply: token.circulating_supply || 0,
      totalSupply: token.total_supply || 0,
      maxSupply: token.max_supply || null,
      ath: token.ath || 0,
      athChangePercentage: token.ath_change_percentage || 0,
      athDate: token.ath_date ? new Date(token.ath_date) : new Date(),
      fullyDilutedValuation: token.fully_diluted_valuation || 0,
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

    // Get tokens from database
    let tokens = await Token.find(query)
      .sort({ marketCapRank: 1 })
      .limit(250)
      .lean();

    // Clean numeric values to ensure they're numbers
    tokens = tokens.map(token => ({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      image: token.image,
      currentPrice: Number(token.currentPrice) || 0,
      marketCap: Number(token.marketCap) || 0,
      marketCapRank: Number(token.marketCapRank) || 0,
      totalVolume: Number(token.totalVolume) || 0,
      priceChange24h: Number(token.priceChange24h) || 0,
      priceChangePercentage24h: Number(token.priceChangePercentage24h) || 0,
      high24h: Number(token.high24h) || 0,
      low24h: Number(token.low24h) || 0,
      circulatingSupply: Number(token.circulatingSupply) || 0,
      totalSupply: Number(token.totalSupply) || 0,
      maxSupply: token.maxSupply ? Number(token.maxSupply) : null,
      ath: Number(token.ath) || 0,
      athChangePercentage: Number(token.athChangePercentage) || 0,
      fullyDilutedValuation: Number(token.fullyDilutedValuation) || 0,
      lastUpdated: token.lastUpdated
    }));

    // Always return an array, even if empty
    res.json(tokens);

  } catch (error) {
    console.error('Error in /api/tokens:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tokens',
      message: 'An unexpected error occurred'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const token = await Token.findOne({ id: req.params.id }).lean();
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    // Clean numeric values
    const cleanedToken = {
      ...token,
      _id: token._id.toString(),
      currentPrice: Number(token.currentPrice) || 0,
      marketCap: Number(token.marketCap) || 0,
      marketCapRank: Number(token.marketCapRank) || 0,
      totalVolume: Number(token.totalVolume) || 0,
      priceChange24h: Number(token.priceChange24h) || 0,
      priceChangePercentage24h: Number(token.priceChangePercentage24h) || 0
    };
    
    res.json(cleanedToken);
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

// Get chart data for a token
router.get('/:id/chart', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = '1' } = req.query;
    
    const cacheKey = `${id}-${days}`;
    const now = Date.now();
    
    // Check if we have cached data
    if (chartDataCache[cacheKey] && now - chartDataCache[cacheKey].timestamp < CHART_CACHE_DURATION) {
      console.log(`Serving cached chart data for ${id} (${days} days)`);
      return res.json(chartDataCache[cacheKey].data);
    }
    
    // Fetch from CoinGecko if not in cache or expired
    console.log(`Fetching chart data for ${id} (${days} days)`);
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart`,
      {
        params: {
          vs_currency: 'usd',
          days: days
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.data) {
      throw new Error('Invalid response from CoinGecko');
    }
    
    // Cache the results
    chartDataCache[cacheKey] = {
      data: response.data,
      timestamp: now
    };
    
    // Return the chart data
    res.json(response.data);
    
  } catch (error) {
    console.error(`Error fetching chart data for ${req.params.id}:`, error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch chart data',
      message: error.message 
    });
  }
});

module.exports = router; 