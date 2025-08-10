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
    console.log('Using CryptoCompare API - reliable free tier');

    // Using CryptoCompare API - very reliable with excellent free tier
    const response = await axios.get(
      'https://min-api.cryptocompare.com/data/top/mktcapfull',
      {
        params: {
          limit: 250,
          tsym: 'USD'
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    // CryptoCompare API returns data in { Data: [...] } format
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      console.error('Invalid response format from CryptoCompare API');
      console.error('Response structure:', JSON.stringify(response.data).substring(0, 200));
      return null;
    }

    console.log(`Successfully fetched ${response.data.Data.length} tokens from CryptoCompare`);

    const tokens = response.data.Data.map((item, index) => {
      const coinInfo = item.CoinInfo;
      const rawData = item.RAW?.USD;
      const displayData = item.DISPLAY?.USD;
      
      if (!coinInfo || !rawData) return null;

      return {
        id: coinInfo.Name?.toLowerCase(), // Use symbol as ID since CryptoCompare doesn't have direct ID
        symbol: coinInfo.Name?.toUpperCase() || '',
        name: coinInfo.FullName || '',
        image: `https://www.cryptocompare.com${coinInfo.ImageUrl}`,
        currentPrice: parseFloat(rawData.PRICE) || 0,
        marketCap: parseFloat(rawData.MKTCAP) || 0,
        marketCapRank: index + 1, // Use position as rank
        totalVolume: parseFloat(rawData.TOTALVOLUME24HTO) || 0,
        high24h: parseFloat(rawData.HIGH24HOUR) || 0,
        low24h: parseFloat(rawData.LOW24HOUR) || 0,
        priceChange24h: parseFloat(rawData.CHANGE24HOUR) || 0,
        priceChangePercentage24h: parseFloat(rawData.CHANGEPCT24HOUR) || 0,
        circulatingSupply: parseFloat(rawData.SUPPLY) || 0,
        totalSupply: parseFloat(rawData.SUPPLY) || 0,
        maxSupply: null, // Not available in CryptoCompare
        ath: 0, // Not available in basic endpoint
        athChangePercentage: 0, // Not available in basic endpoint
        athDate: new Date(),
        fullyDilutedValuation: parseFloat(rawData.MKTCAP) || 0,
        lastUpdated: new Date()
      };
    }).filter(token => token && token.id && token.symbol && token.name);

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

// Chart data endpoint using CryptoCompare API
router.get('/:id/chart/:days', async (req, res) => {
  try {
    const { id, days } = req.params;
    console.log(`=== CHART REQUEST: ${id} for ${days} days ===`);
    
    // Validate days parameter
    const validDays = ['1', '7', '30', '90', '365', 'max'];
    if (!validDays.includes(days)) {
      return res.status(400).json({ error: 'Invalid days parameter. Use: 1, 7, 30, 90, 365, or max' });
    }

    // Map days to CryptoCompare API endpoints and parameters
    let apiEndpoint;
    let limit;
    
    switch (days) {
      case '1':
        apiEndpoint = 'histohour';
        limit = 24;
        break;
      case '7':
        apiEndpoint = 'histohour';
        limit = 168; // 7 * 24 hours
        break;
      case '30':
        apiEndpoint = 'histoday';
        limit = 30;
        break;
      case '90':
        apiEndpoint = 'histoday';
        limit = 90;
        break;
      case '365':
        apiEndpoint = 'histoday';
        limit = 365;
        break;
      case 'max':
        apiEndpoint = 'histoday';
        limit = 2000; // CryptoCompare max
        break;
    }

    // Convert token ID (lowercase) to symbol (uppercase) for CryptoCompare
    const symbol = id.toUpperCase();

    // Fetch chart data from CryptoCompare API
    const response = await axios.get(
      `https://min-api.cryptocompare.com/data/v2/${apiEndpoint}`,
      {
        params: {
          fsym: symbol,
          tsym: 'USD',
          limit: limit
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.data || !response.data.Data || !response.data.Data.Data || !Array.isArray(response.data.Data.Data)) {
      console.error('Invalid chart response format from CryptoCompare API');
      return res.status(404).json({ error: 'Chart data not found' });
    }

    // Convert CryptoCompare format to match the expected format
    const prices = response.data.Data.Data.map(item => [
      item.time * 1000, // Convert seconds to milliseconds
      parseFloat(item.close)
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
      market_caps: [], // Not available in this endpoint
      total_volumes: [] // Not available in this endpoint
    };

    console.log(`Generated ${validPrices.length} chart data points for ${symbol}`);
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