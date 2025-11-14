const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');
const { emitTokenUpdate } = require('../socket');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 4.5 * 60 * 1000; // 4.5 minutes - pushing to 9,999 calls/month limit (320 calls/day)

const updateTokenCache = async (force = false) => {
  const now = Date.now();
  if (!force && now - lastUpdateTime < UPDATE_INTERVAL) {

    return null;
  }

  try {

    // Token cache update starting (using CoinGecko API)
    
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

    // Successfully fetched tokens from CoinGecko

    const tokens = response.data.map((item, index) => {
      if (!item || !item.id || !item.symbol) {
        // Skipping token - missing required data
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

      // Token data processed

      return token;
    }).filter(token => token && token.id && token.symbol && token.name);

    // Processed valid tokens

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

    // Successfully updated/inserted tokens in database

    // Emit WebSocket event for real-time token updates
    try {
      emitTokenUpdate('update', tokens);
    } catch (socketError) {
      console.error('Failed to emit token update via WebSocket:', socketError);
      // Don't fail the token update if WebSocket fails
    }

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
    // Manual token refresh requested
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



module.exports = router; 