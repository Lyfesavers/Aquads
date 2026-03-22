const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const axios = require('axios');
const { emitTokenUpdate } = require('../socket');

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 4.5 * 60 * 1000; // 4.5 minutes - pushing to 9,999 calls/month limit (320 calls/day)

// In-memory cache for the GET /api/tokens response to prevent MongoDB connection pool exhaustion
let tokensReadCache = null;
let tokensReadCacheTime = 0;
let tokensReadRefreshing = false;
const TOKENS_READ_CACHE_TTL = 60 * 1000; // 60 seconds

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

    // Invalidate the read cache so the next GET request fetches fresh data
    tokensReadCache = null;
    tokensReadCacheTime = 0;

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

// Fetch all tokens from DB and populate the read cache — used by the GET handler
// and by background refreshes.
const fetchAndCacheTokens = async () => {
  let tokens = await Token.find({}).sort({ marketCapRank: 1 }).limit(250).lean();
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
  tokensReadCache = tokens;
  tokensReadCacheTime = Date.now();
  return tokens;
};

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    // Search requests always bypass the cache
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      let tokens = await Token.find({
        $or: [{ symbol: searchRegex }, { name: searchRegex }, { id: searchRegex }]
      }).sort({ marketCapRank: 1 }).limit(250).lean();
      tokens = tokens.map(token => ({
        id: token.id, symbol: token.symbol, name: token.name, image: token.image,
        currentPrice: Number(token.currentPrice) || 0,
        marketCap: Number(token.marketCap) || 0,
        marketCapRank: Number(token.marketCapRank) || 0,
        totalVolume: Number(token.totalVolume) || 0,
        priceChange24h: Number(token.priceChange24h) || 0,
        priceChangePercentage24h: Number(token.priceChangePercentage24h) || 0,
        high24h: Number(token.high24h) || 0, low24h: Number(token.low24h) || 0,
        circulatingSupply: Number(token.circulatingSupply) || 0,
        totalSupply: Number(token.totalSupply) || 0,
        maxSupply: token.maxSupply ? Number(token.maxSupply) : null,
        ath: Number(token.ath) || 0, athChangePercentage: Number(token.athChangePercentage) || 0,
        fullyDilutedValuation: Number(token.fullyDilutedValuation) || 0,
        lastUpdated: token.lastUpdated
      }));
      return res.json(tokens);
    }

    const now = Date.now();

    if (tokensReadCache) {
      // Serve immediately — even if stale
      res.set('X-Cache', now - tokensReadCacheTime < TOKENS_READ_CACHE_TTL ? 'HIT' : 'STALE');
      res.json(tokensReadCache);
      // Kick off background refresh if stale
      if (!tokensReadRefreshing && now - tokensReadCacheTime >= TOKENS_READ_CACHE_TTL) {
        tokensReadRefreshing = true;
        fetchAndCacheTokens().catch(err =>
          console.error('[Tokens Cache] Background refresh failed:', err.message)
        ).finally(() => { tokensReadRefreshing = false; });
      }
      return;
    }

    // No cache at all — must wait
    const tokens = await fetchAndCacheTokens();
    res.set('X-Cache', 'MISS');
    res.json(tokens);

  } catch (error) {
    console.error('Error in /api/tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens', message: 'An unexpected error occurred' });
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

// Price proxy endpoint for AquaPay (avoids CORS issues)
router.get('/price/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const allowedCoins = ['bitcoin', 'ethereum', 'solana', 'matic-network', 'binancecoin', 'tron'];
    
    if (!allowedCoins.includes(coinId)) {
      return res.status(400).json({ error: 'Invalid coin ID' });
    }

    // First try to get from our cached tokens
    const token = await Token.findOne({ id: coinId }).lean();
    if (token && token.currentPrice) {
      return res.json({ price: token.currentPrice, source: 'cache' });
    }

    // Fallback to direct CoinGecko call
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { timeout: 10000 }
    );
    
    if (response.data[coinId]?.usd) {
      res.json({ price: response.data[coinId].usd, source: 'coingecko' });
    } else {
      res.status(404).json({ error: 'Price not found' });
    }
  } catch (error) {
    console.error('Error fetching price:', error.message);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

// Pre-warm the read cache on startup so the first user never triggers a cold DB query.
// Runs once after MongoDB connects — a simple find with no external API calls.
const warmupTokensCache = async () => {
  try {
    const tokens = await fetchAndCacheTokens();
    console.log(`[Tokens Cache] Warmed up ${tokens.length} tokens`);
  } catch (err) {
    console.error('[Tokens Cache] Warmup failed (non-critical):', err.message);
  }
};

module.exports = router;
module.exports.warmupTokensCache = warmupTokensCache;