const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 4.5 * 60 * 1000; // 4.5 minutes - pushing to 9,999 calls/month limit (320 calls/day)

const updateTokenCache = async (force = false) => {
  const now = Date.now();
  if (!force && now - lastUpdateTime < UPDATE_INTERVAL) {

    return null;
  }

  try {

    console.log('=== TOKEN CACHE UPDATE STARTING ===');
    console.log('Using CoinGecko API - free tier with 10,000 calls/month (updating every 4.5 minutes - 9,600 calls/month)');
    
    // Using CoinGecko API - much more generous free tier
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: false,
          locale: 'en'
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    // CoinGecko API returns data as an array directly
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Invalid response format from CoinGecko API');
      console.error('Response structure:', JSON.stringify(response.data).substring(0, 200));
      return null;
    }

    console.log(`Successfully fetched ${response.data.length} tokens from CoinGecko`);

    const tokens = response.data.map((item, index) => {
      if (!item || !item.id || !item.symbol) {
        console.log(`Skipping token - missing data:`, {
          hasId: !!item?.id,
          hasSymbol: !!item?.symbol,
          name: item?.name
        });
        return null;
      }

      // Clean data extraction from CoinGecko format
      const token = {
        id: item.id,
        symbol: item.symbol.toUpperCase(),
        name: item.name,
        image: item.image,
        currentPrice: parseFloat(item.current_price) || 0,
        marketCap: parseFloat(item.market_cap) || 0,
        marketCapRank: item.market_cap_rank || index + 1,
        totalVolume: parseFloat(item.total_volume) || 0,
        high24h: parseFloat(item.high_24h) || 0,
        low24h: parseFloat(item.low_24h) || 0,
        priceChange24h: parseFloat(item.price_change_24h) || 0,
        priceChangePercentage24h: parseFloat(item.price_change_percentage_24h) || 0,
        circulatingSupply: parseFloat(item.circulating_supply) || 0,
        totalSupply: parseFloat(item.total_supply) || null,
        maxSupply: parseFloat(item.max_supply) || null,
        ath: parseFloat(item.ath) || null,
        athChangePercentage: parseFloat(item.ath_change_percentage) || null,
        athDate: item.ath_date ? new Date(item.ath_date) : null,
        fullyDilutedValuation: parseFloat(item.fully_diluted_valuation) || 0,
        lastUpdated: new Date()
      };

      // Log token data for debugging
      if (index < 3) { // Log first 3 tokens for debugging
        console.log(`Token ${index + 1} data:`, {
          id: token.id,
          name: token.name,
          price: token.currentPrice,
          marketCap: token.marketCap,
          volume: token.totalVolume,
          high24h: token.high24h,
          low24h: token.low24h,
          circulatingSupply: token.circulatingSupply,
          priceChange24h: token.priceChange24h,
          priceChangePercentage24h: token.priceChangePercentage24h
        });
      }

      return token;
    }).filter(token => token && token.id && token.symbol && token.name);

    console.log(`Processed ${tokens.length} valid tokens`);

    if (tokens.length === 0) {
      console.error('No valid tokens in response');
      return null;
    }

    // Use bulkWrite for better performance - upsert will update existing tokens and add new ones
    // This is safer than deleting all tokens first
    const bulkOps = tokens.map(token => ({
      updateOne: {
        filter: { id: token.id },
        update: { $set: token },
        upsert: true
      }
    }));

    await Token.bulkWrite(bulkOps, { ordered: false });
    lastUpdateTime = now;

    console.log(`Successfully updated/inserted ${tokens.length} tokens in database`);

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

// Manual refresh endpoint for debugging
router.post('/refresh', async (req, res) => {
  try {
    console.log('Manual token refresh requested');
    const tokens = await updateTokenCache(true);
    if (tokens) {
      res.json({ 
        success: true, 
        message: `Successfully refreshed ${tokens.length} tokens`,
        count: tokens.length 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to refresh tokens' 
      });
    }
  } catch (error) {
    console.error('Manual refresh error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to refresh tokens',
      error: error.message 
    });
  }
});

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

// Chart data endpoint using CryptoCompare API (separate from token API to avoid rate limits)
router.get('/:id/chart/:days', async (req, res) => {
  try {
    const { id, days } = req.params;
    console.log(`=== CHART REQUEST: ${id} for ${days} days ===`);
    
    // Validate days parameter
    const validDays = ['1', '7', '30', '90', '365', 'max'];
    if (!validDays.includes(days)) {
      return res.status(400).json({ error: 'Invalid days parameter. Use: 1, 7, 30, 90, 365, or max' });
    }

    // First, check if the token exists in our database to get the symbol
    const token = await Token.findOne({ id: id }).lean();
    if (!token) {
      console.error(`Token not found in database: ${id}`);
      return res.status(404).json({ error: 'Token not found' });
    }

    console.log(`Found token in database: ${token.name} (${token.symbol})`);

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

    // Convert token ID to symbol for CryptoCompare (use symbol from database)
    const symbol = token.symbol;
    console.log(`Fetching chart data for symbol: ${symbol}, endpoint: ${apiEndpoint}, limit: ${limit}`);

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

    console.log(`Chart API response status: ${response.status}`);
    console.log(`Chart response structure:`, {
      hasData: !!response.data,
      hasDataData: !!response.data?.Data,
      hasDataDataData: !!response.data?.Data?.Data,
      dataLength: response.data?.Data?.Data?.length || 0,
      responseType: response.data?.Response || 'Success'
    });

    if (!response.data || !response.data.Data || !response.data.Data.Data || !Array.isArray(response.data.Data.Data)) {
      console.error('Invalid chart response format from CryptoCompare API');
      return res.status(404).json({ error: 'Chart data not found' });
    }

    // Convert CryptoCompare format to match the expected format
    const chartDataArray = response.data.Data.Data;
    console.log(`Processing ${chartDataArray.length} raw chart data points`);
    
    const prices = chartDataArray.map((item, index) => {
      const timestamp = item.time * 1000; // Convert seconds to milliseconds
      const price = parseFloat(item.close || item.price || 0);
      
      if (index < 3) { // Log first 3 points for debugging
        console.log(`Chart point ${index + 1}:`, {
          time: item.time,
          timestamp: timestamp,
          close: item.close,
          price: price,
          date: new Date(timestamp).toISOString()
        });
      }
      
      return [timestamp, price];
    });

    // Filter out any invalid data points
    const validPrices = prices.filter(([timestamp, price]) => 
      !isNaN(timestamp) && !isNaN(price) && price > 0 && timestamp > 0
    );

    console.log(`Filtered to ${validPrices.length} valid chart data points`);

    if (validPrices.length === 0) {
      console.error('No valid chart data points found');
      return res.status(404).json({ error: 'No valid chart data available' });
    }

    const chartData = {
      prices: validPrices,
      market_caps: [], // Not available in CryptoCompare historical data
      total_volumes: [] // Not available in CryptoCompare historical data
    };

    console.log(`Generated ${validPrices.length} chart data points for ${symbol}`);
    console.log(`Price range: $${Math.min(...validPrices.map(p => p[1])).toFixed(2)} - $${Math.max(...validPrices.map(p => p[1])).toFixed(2)}`);
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