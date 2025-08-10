const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const updateTokenCache = async (force = false) => {
  const now = Date.now();
  if (!force && now - lastUpdateTime < UPDATE_INTERVAL) {

    return null;
  }

  try {
    console.log('=== TOKEN CACHE UPDATE STARTING ===');
    console.log('Using CoinCap API v2 for token data');

    // Using CoinCap API v2 - free tier with reliable data
    const response = await axios.get(
      'https://api.coincap.io/v2/assets',
      {
        params: {
          limit: 250
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        }
      }
    );

    // CoinCap API returns data in { data: [...] } format
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error('Invalid response format from CoinCap API');
      console.error('Response structure:', JSON.stringify(response.data).substring(0, 200));
      return null;
    }

    console.log(`Successfully fetched ${response.data.data.length} tokens from CoinCap`);
    
    const tokens = response.data.data.map(token => ({
      id: token.id,
      symbol: token.symbol?.toUpperCase() || '',
      name: token.name || '',
      image: `https://assets.coincap.io/assets/icons/${token.symbol?.toLowerCase()}@2x.png`,
      currentPrice: parseFloat(token.priceUsd) || 0,
      marketCap: parseFloat(token.marketCapUsd) || 0,
      marketCapRank: parseInt(token.rank) || 0,
      totalVolume: parseFloat(token.volumeUsd24Hr) || 0,
      high24h: 0, // Not available in CoinCap basic endpoint
      low24h: 0, // Not available in CoinCap basic endpoint
      priceChange24h: parseFloat(token.changePercent24Hr) || 0,
      priceChangePercentage24h: parseFloat(token.changePercent24Hr) || 0,
      circulatingSupply: parseFloat(token.supply) || 0,
      totalSupply: parseFloat(token.supply) || 0,
      maxSupply: parseFloat(token.maxSupply) || null,
      ath: 0, // Not available in CoinCap basic endpoint
      athChangePercentage: 0, // Not available in CoinCap basic endpoint
      athDate: new Date(),
      fullyDilutedValuation: parseFloat(token.marketCapUsd) || 0,
      lastUpdated: new Date()
    })).filter(token => token.id && token.symbol && token.name);

    console.log(`Processed ${tokens.length} valid tokens`);

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

    return tokens;
  } catch (error) {
    console.error('=== TOKEN CACHE UPDATE FAILED ===');
    console.error('Error:', error.message);
    console.error('URL:', error.config?.url);
    console.error('Status:', error.response?.status);
    console.error('Response data:', error.response?.data);
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

// Chart data endpoint using CoinCap API v2
router.get('/:id/chart/:days', async (req, res) => {
  try {
    const { id, days } = req.params;
    console.log(`=== CHART REQUEST: ${id} for ${days} days ===`);
    
    // Validate days parameter
    const validDays = ['1', '7', '30', '90', '365', 'max'];
    if (!validDays.includes(days)) {
      return res.status(400).json({ error: 'Invalid days parameter. Use: 1, 7, 30, 90, 365, or max' });
    }

    // Map days to CoinCap interval format
    let interval = 'd1'; // default daily
    let startTime, endTime;
    const now = Date.now();
    
    switch (days) {
      case '1':
        interval = 'h1'; // hourly for 1 day
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7':
        interval = 'h6'; // 6-hourly for 7 days
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30':
        interval = 'd1'; // daily for 30 days
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case '90':
        interval = 'd1'; // daily for 90 days
        startTime = now - (90 * 24 * 60 * 60 * 1000);
        break;
      case '365':
        interval = 'd1'; // daily for 1 year
        startTime = now - (365 * 24 * 60 * 60 * 1000);
        break;
      case 'max':
        interval = 'd1'; // daily for max (5 years)
        startTime = now - (5 * 365 * 24 * 60 * 60 * 1000);
        break;
    }
    
    endTime = now;

    // Fetch chart data from CoinCap API
    const response = await axios.get(
      `https://api.coincap.io/v2/assets/${id}/history`,
      {
        params: {
          interval: interval,
          start: startTime,
          end: endTime
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        }
      }
    );

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error('Invalid chart response format from CoinCap API');
      return res.status(404).json({ error: 'Chart data not found' });
    }

    // Convert CoinCap format to match the expected format
    const prices = response.data.data.map(item => [
      parseInt(item.time),
      parseFloat(item.priceUsd)
    ]);

    // Filter out any invalid data points
    const validPrices = prices.filter(([timestamp, price]) => 
      !isNaN(timestamp) && !isNaN(price) && price > 0
    );

    if (validPrices.length === 0) {
      return res.status(404).json({ error: 'No valid chart data available' });
    }

    const chartData = {
      prices: validPrices,
      market_caps: [], // CoinCap doesn't provide historical market cap in this endpoint
      total_volumes: [] // CoinCap doesn't provide historical volume in this endpoint
    };

    res.json(chartData);

  } catch (error) {
    console.error('Error fetching chart data:', error);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      params: error.config?.params
    });
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Token not found for chart data' });
    }
    
    if (error.response && error.response.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

module.exports = router; 