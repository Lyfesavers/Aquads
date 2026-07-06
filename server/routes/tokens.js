const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const GlobalMarketSnapshot = require('../models/GlobalMarketSnapshot');
const axios = require('axios');
const { emitTokenUpdate } = require('../socket');

let lastUpdateTime = 0;
/** Min time between successful CoinGecko syncs (~96 calls/day per instance on free tier). */
const UPDATE_INTERVAL = 15 * 60 * 1000;
/** After 429, wait at least this long before calling CoinGecko again (unless Retry-After says longer). */
const DEFAULT_429_BACKOFF_MS = 15 * 60 * 1000;
/** Defer first fetch after boot so deploys / multiple instances do not spike CoinGecko at t=0. */
const STARTUP_FETCH_DELAY_MIN_MS = 45 * 1000;
const STARTUP_FETCH_DELAY_JITTER_MS = 45 * 1000;

let nextCoinGeckoAttemptAt = 0;

let globalStatsCache = null;
let globalStatsCacheTime = 0;
/**
 * Kept short so the "Global Market Cap" and "24h Trading Volume" numbers stay close to
 * CoinGecko's live figures — /global is a single cheap CG call, comfortably within free
 * tier rate limits at this TTL.
 */
const GLOBAL_STATS_CACHE_TTL = 5 * 60 * 1000;
const GLOBAL_CHART_CACHE_TTL = 60 * 60 * 1000;
let globalChartCache = null;
let globalChartCacheTime = 0;
const GLOBAL_SNAPSHOT_MIN_INTERVAL_MS = 10 * 60 * 1000;
const GLOBAL_SNAPSHOT_RETENTION_MS = 8 * 24 * 60 * 60 * 1000;
/** Top coins whose market_chart volume history is summed when the global chart endpoint is unavailable. */
const GLOBAL_CHART_TOP_COINS = 15;
const GLOBAL_CHART_COIN_DELAY_MS = 1200;

const getCoinGeckoRequestConfig = () => {
  const apiKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_PRO_API_KEY;
  if (apiKey) {
    return {
      baseURL: 'https://pro-api.coingecko.com/api/v3',
      headers: { Accept: 'application/json', 'x-cg-pro-api-key': apiKey }
    };
  }
  return {
    baseURL: 'https://api.coingecko.com/api/v3',
    headers: { Accept: 'application/json' }
  };
};

const extractChartValues = (pairs) => {
  if (!Array.isArray(pairs)) return [];
  return pairs
    .map((pair) => (Array.isArray(pair) ? parseFloat(pair[1]) : 0))
    .filter((value) => Number.isFinite(value) && value > 0);
};

const fetchGlobalMarketCapChart = async () => {
  const { baseURL, headers } = getCoinGeckoRequestConfig();
  try {
    const response = await axios.get(`${baseURL}/global/market_cap_chart`, {
      params: { days: '7', vs_currency: 'usd' },
      timeout: 15000,
      headers
    });

    const chart = response.data?.market_cap_chart;
    const marketCapSparkline = extractChartValues(chart?.market_cap);
    const volumeSparkline = extractChartValues(chart?.volume);

    if (marketCapSparkline.length < 2 || volumeSparkline.length < 2) {
      return null;
    }

    return {
      marketCapSparkline,
      volumeSparkline,
      chartSource: 'coingecko_global_chart'
    };
  } catch (error) {
    const errorCode = error.response?.data?.status?.error_code;
    if (errorCode !== 10005) {
      console.warn('[Tokens] Global market cap chart fetch failed:', error.message);
    }
    return null;
  }
};

const recordGlobalSnapshot = async (stats) => {
  try {
    const latest = await GlobalMarketSnapshot.findOne().sort({ recordedAt: -1 }).lean();
    if (latest && Date.now() - new Date(latest.recordedAt).getTime() < GLOBAL_SNAPSHOT_MIN_INTERVAL_MS) {
      return;
    }

    await GlobalMarketSnapshot.create({
      totalMarketCap: stats.totalMarketCap,
      totalVolume24h: stats.totalVolume24h,
      marketCapChangePercentage24h: stats.marketCapChangePercentage24h,
      // stats.volumeChangePercentage24h may be null when we lack ~24h of history;
      // the snapshot schema wants a Number, so persist 0 in that case.
      volumeChangePercentage24h: Number.isFinite(stats.volumeChangePercentage24h)
        ? stats.volumeChangePercentage24h
        : 0
    });

    const cutoff = new Date(Date.now() - GLOBAL_SNAPSHOT_RETENTION_MS);
    await GlobalMarketSnapshot.deleteMany({ recordedAt: { $lt: cutoff } });
  } catch (error) {
    console.warn('[Tokens] Failed to record global market snapshot:', error.message);
  }
};

/**
 * CoinGecko's public /global endpoint does NOT expose `volume_change_percentage_24h_usd`
 * (that number on coingecko.com is derived from their own historical data). We derive it
 * ourselves from the GlobalMarketSnapshot collection we already record every 10 min.
 * Returns null when we don't yet have a snapshot in the ~22–26h window.
 */
const computeVolumeChangePercentage24h = async (currentVolume) => {
  if (!Number.isFinite(currentVolume) || currentVolume <= 0) return null;
  try {
    const now = Date.now();
    const windowStart = new Date(now - 26 * 60 * 60 * 1000);
    const windowEnd = new Date(now - 22 * 60 * 60 * 1000);
    const target = new Date(now - 24 * 60 * 60 * 1000);

    const candidates = await GlobalMarketSnapshot.find({
      recordedAt: { $gte: windowStart, $lte: windowEnd },
      totalVolume24h: { $gt: 0 }
    })
      .select('totalVolume24h recordedAt')
      .lean();

    if (!candidates.length) return null;

    let best = candidates[0];
    let bestDelta = Math.abs(new Date(best.recordedAt).getTime() - target.getTime());
    for (const snap of candidates) {
      const delta = Math.abs(new Date(snap.recordedAt).getTime() - target.getTime());
      if (delta < bestDelta) {
        best = snap;
        bestDelta = delta;
      }
    }

    const previous = Number(best.totalVolume24h);
    if (!Number.isFinite(previous) || previous <= 0) return null;
    return ((currentVolume - previous) / previous) * 100;
  } catch (error) {
    console.warn('[Tokens] Failed to compute 24h volume change from snapshots:', error.message);
    return null;
  }
};

/**
 * Derive a Buy / Sell / Hold sentiment signal from CoinGecko's live 24h market-cap change
 * and our derived 24h volume change. Weighted score in [-100, 100]:
 *   market cap change  → 65% (broadest gauge of market direction)
 *   volume change      → 35% (momentum: rising volume amplifies whatever mcap is doing)
 * Bands are intentionally symmetric so the badge flips cleanly around 0.
 */
const buildMarketSignal = ({ marketCapChange24h, volumeChange24h }) => {
  const mcap = Number.isFinite(marketCapChange24h) ? marketCapChange24h : 0;
  const vol = Number.isFinite(volumeChange24h) ? volumeChange24h : null;

  // Clamp each contributor so a wild outlier (e.g. volume spike +300%) can't dominate.
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mcapPart = clamp(mcap, -10, 10) * 10; // ±10% mcap swing → ±100
  const volPart = vol == null ? 0 : clamp(vol, -30, 30) * (100 / 30); // ±30% vol swing → ±100

  const score = vol == null
    ? mcapPart
    : mcapPart * 0.65 + volPart * 0.35;

  let label;
  let strength;
  if (score >= 25) { label = 'Buy'; strength = 'strong'; }
  else if (score >= 8) { label = 'Buy'; strength = 'moderate'; }
  else if (score > -8) { label = 'Hold'; strength = 'neutral'; }
  else if (score > -25) { label = 'Sell'; strength = 'moderate'; }
  else { label = 'Sell'; strength = 'strong'; }

  const parts = [
    `Market cap 24h: ${mcap >= 0 ? '+' : ''}${mcap.toFixed(2)}%`
  ];
  if (vol != null) parts.push(`Volume 24h: ${vol >= 0 ? '+' : ''}${vol.toFixed(2)}%`);

  return {
    label,
    strength,
    score: Math.round(score * 10) / 10,
    reason: parts.join(' · '),
    hasVolumeSignal: vol != null
  };
};

const fetchSparklinesFromSnapshots = async () => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snapshots = await GlobalMarketSnapshot.find({ recordedAt: { $gte: cutoff } })
      .sort({ recordedAt: 1 })
      .lean();

    if (snapshots.length < 2) return null;

    return {
      marketCapSparkline: snapshots.map((s) => s.totalMarketCap),
      volumeSparkline: snapshots.map((s) => s.totalVolume24h),
      chartSource: 'coingecko_global_snapshots'
    };
  } catch (error) {
    console.warn('[Tokens] Failed to load global market snapshots:', error.message);
    return null;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sumSeriesByTimestamp = (seriesList) => {
  const totals = new Map();

  for (const series of seriesList) {
    if (!Array.isArray(series)) continue;
    for (const point of series) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const timestamp = Number(point[0]);
      const value = parseFloat(point[1]);
      if (!Number.isFinite(timestamp) || !Number.isFinite(value)) continue;
      totals.set(timestamp, (totals.get(timestamp) || 0) + value);
    }
  }

  return [...totals.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value)
    .filter((value) => value > 0);
};

const buildMarketCapSparklineFromTokens = (tokens) => {
  const withSpark = tokens.filter(
    (token) =>
      Array.isArray(token.sparklineIn7d) &&
      token.sparklineIn7d.length >= 2 &&
      Number(token.circulatingSupply) > 0
  );

  if (!withSpark.length) return [];

  const length = Math.min(...withSpark.map((token) => token.sparklineIn7d.length));
  const points = [];

  for (let i = 0; i < length; i++) {
    points.push(
      withSpark.reduce(
        (sum, token) => sum + token.sparklineIn7d[i] * Number(token.circulatingSupply),
        0
      )
    );
  }

  return points.filter((value) => value > 0);
};

const fetchMarketCapSparklineFromTokenCache = async () => {
  try {
    const tokens = tokensReadCache || (await fetchAndCacheTokens());
    const marketCapSparkline = buildMarketCapSparklineFromTokens(tokens);
    return marketCapSparkline.length >= 2 ? marketCapSparkline : [];
  } catch (error) {
    console.warn('[Tokens] Failed to build market cap sparkline from token cache:', error.message);
    return [];
  }
};

const fetchVolumeSparklineFromTopCoins = async () => {
  if (Date.now() < nextCoinGeckoAttemptAt) {
    return [];
  }

  try {
    const topTokens = await Token.find({})
      .sort({ marketCapRank: 1 })
      .limit(GLOBAL_CHART_TOP_COINS)
      .select('id')
      .lean();

    const coinIds = topTokens.map((token) => token.id).filter(Boolean);
    if (!coinIds.length) return [];

    const { baseURL, headers } = getCoinGeckoRequestConfig();
    const volumeSeries = [];

    for (const coinId of coinIds) {
      if (Date.now() < nextCoinGeckoAttemptAt) break;

      try {
        const response = await axios.get(`${baseURL}/coins/${coinId}/market_chart`, {
          params: { vs_currency: 'usd', days: '7' },
          timeout: 15000,
          headers
        });

        if (Array.isArray(response.data?.total_volumes)) {
          volumeSeries.push(response.data.total_volumes);
        }
      } catch (error) {
        if (error.response?.status === 429) {
          const waitMs = getRetryAfterMsFromError(error);
          nextCoinGeckoAttemptAt = Date.now() + waitMs;
          console.warn('[Tokens] CoinGecko rate limited while building global volume sparkline');
          break;
        }
        console.warn(`[Tokens] market_chart failed for ${coinId}:`, error.message);
      }

      await sleep(GLOBAL_CHART_COIN_DELAY_MS);
    }

    const volumeSparkline = sumSeriesByTimestamp(volumeSeries);
    return volumeSparkline.length >= 2 ? volumeSparkline : [];
  } catch (error) {
    console.warn('[Tokens] Failed to build global volume sparkline from top coins:', error.message);
    return [];
  }
};

const resolveGlobalChartSparklines = async () => {
  const now = Date.now();
  if (globalChartCache && now - globalChartCacheTime < GLOBAL_CHART_CACHE_TTL) {
    return globalChartCache;
  }

  const proChart = await fetchGlobalMarketCapChart();
  if (proChart) {
    globalChartCache = proChart;
    globalChartCacheTime = now;
    return proChart;
  }

  const [marketCapSparkline, volumeSparkline] = await Promise.all([
    fetchMarketCapSparklineFromTokenCache(),
    fetchVolumeSparklineFromTopCoins()
  ]);

  if (marketCapSparkline.length >= 2 || volumeSparkline.length >= 2) {
    const chartData = {
      marketCapSparkline,
      volumeSparkline,
      chartSource: 'coingecko_markets_and_market_chart'
    };
    globalChartCache = chartData;
    globalChartCacheTime = now;
    return chartData;
  }

  const snapshotChart = await fetchSparklinesFromSnapshots();
  if (snapshotChart) {
    globalChartCache = snapshotChart;
    globalChartCacheTime = now;
  }

  return snapshotChart;
};

const fetchGlobalStats = async () => {
  const now = Date.now();
  if (globalStatsCache && now - globalStatsCacheTime < GLOBAL_STATS_CACHE_TTL) {
    return globalStatsCache;
  }

  try {
    const { baseURL, headers } = getCoinGeckoRequestConfig();
    const response = await axios.get(`${baseURL}/global`, {
      timeout: 15000,
      headers
    });

    const data = response.data?.data;
    if (!data) return globalStatsCache;

    const totalVolume24h = parseFloat(data.total_volume?.usd) || 0;
    // /global does not include a real volume change %, so derive it from our own snapshots.
    // Falls back to null (not 0) so the UI can hide the badge until we have >=24h of data.
    const derivedVolumeChange = await computeVolumeChangePercentage24h(totalVolume24h);

    const marketCapChangePercentage24h = parseFloat(data.market_cap_change_percentage_24h_usd) || 0;

    const stats = {
      totalMarketCap: parseFloat(data.total_market_cap?.usd) || 0,
      totalVolume24h,
      marketCapChangePercentage24h,
      volumeChangePercentage24h: derivedVolumeChange, // may be null when we lack history
      marketSignal: buildMarketSignal({
        marketCapChange24h: marketCapChangePercentage24h,
        volumeChange24h: derivedVolumeChange
      }),
      marketCapSparkline: [],
      volumeSparkline: [],
      chartSource: null,
      lastUpdated: new Date().toISOString()
    };

    await recordGlobalSnapshot(stats);

    const chartData = await resolveGlobalChartSparklines();
    if (chartData) {
      stats.marketCapSparkline = chartData.marketCapSparkline;
      stats.volumeSparkline = chartData.volumeSparkline;
      stats.chartSource = chartData.chartSource;
    }

    globalStatsCache = stats;
    globalStatsCacheTime = now;
    return stats;
  } catch (error) {
    console.error('[Tokens] Global stats fetch failed:', error.message);
    return globalStatsCache;
  }
};

const formatTokenForResponse = (token) => ({
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
  sparklineIn7d: Array.isArray(token.sparklineIn7d) ? token.sparklineIn7d : [],
  lastUpdated: token.lastUpdated
});

function getRetryAfterMsFromError(error) {
  const headers = error.response?.headers;
  if (!headers) return DEFAULT_429_BACKOFF_MS;
  const raw = headers['retry-after'] ?? headers['Retry-After'];
  if (raw == null) return DEFAULT_429_BACKOFF_MS;
  const sec = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(sec) || sec <= 0) return DEFAULT_429_BACKOFF_MS;
  return Math.min(sec * 1000, 60 * 60 * 1000);
}

// In-memory cache for the GET /api/tokens response to prevent MongoDB connection pool exhaustion
let tokensReadCache = null;
let tokensReadCacheTime = 0;
let tokensReadRefreshing = false;
const TOKENS_READ_CACHE_TTL = 60 * 1000; // 60 seconds
/** CoinGecko free-tier max per request; DB holds only this many (current top by market cap). */
const COINGECKO_TOP_LIMIT = 250;

const updateTokenCache = async (force = false) => {
  const now = Date.now();
  if (now < nextCoinGeckoAttemptAt) {
    return null;
  }
  if (!force && lastUpdateTime > 0 && now - lastUpdateTime < UPDATE_INTERVAL) {
    return null;
  }

  try {
    const { baseURL, headers } = getCoinGeckoRequestConfig();
    const response = await axios.get(
      `${baseURL}/coins/markets`,
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: COINGECKO_TOP_LIMIT,
          page: 1,
          sparkline: true,
          locale: 'en'
        },
        timeout: 15000,
        headers
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
        sparklineIn7d: Array.isArray(item.sparkline_in_7d?.price)
          ? item.sparkline_in_7d.price.map((p) => parseFloat(p) || 0).filter((p) => p > 0)
          : [],
        lastUpdated: new Date()
      };

      // Token data processed

      return token;
    }).filter(token => token && token.id && token.symbol && token.name)
      .slice(0, COINGECKO_TOP_LIMIT);

    // Processed valid tokens

    if (tokens.length === 0) {
      console.error('No valid tokens in response');
      return null;
    }

    const bulkOps = tokens.map(token => ({
      updateOne: {
        filter: { id: token.id },
        update: { $set: token },
        upsert: true
      }
    }));

    await Token.bulkWrite(bulkOps, { ordered: false });

    // Keep DB in lockstep with CoinGecko: only the current top-N survive each sync.
    const syncedIds = tokens.map((t) => t.id);
    const { deletedCount } = await Token.deleteMany({ id: { $nin: syncedIds } });
    if (deletedCount > 0) {
      console.log(`[Tokens] Pruned ${deletedCount} token(s) no longer in top ${COINGECKO_TOP_LIMIT}`);
    }
    console.log(`[Tokens] Synced ${tokens.length} tokens (DB capped at ${COINGECKO_TOP_LIMIT})`);

    lastUpdateTime = now;
    nextCoinGeckoAttemptAt = 0;

    // Invalidate the read cache so the next GET request fetches fresh data
    tokensReadCache = null;
    tokensReadCacheTime = 0;

    // Successfully updated/inserted tokens in database

    // Emit WebSocket event for real-time token updates
    try {
      const freshList = await fetchAndCacheTokens();
      emitTokenUpdate('update', freshList);
    } catch (socketError) {
      console.error('Failed to emit token update via WebSocket:', socketError);
      // Don't fail the token update if WebSocket fails
    }

    return tokens;
  } catch (error) {
    const status = error.response?.status;
    if (status === 429) {
      const waitMs = getRetryAfterMsFromError(error);
      nextCoinGeckoAttemptAt = Date.now() + waitMs;
      console.warn(
        `[Tokens] CoinGecko rate limited (429); serving cached DB data. Next sync after ${new Date(nextCoinGeckoAttemptAt).toISOString()}`
      );
      return null;
    }
    console.error('=== TOKEN CACHE UPDATE FAILED ===');
    console.error('Error:', error.message);
    console.error('URL:', error.config?.url);
    console.error('Status:', status);
    console.error('Response data:', error.response?.data);
    return null;
  }
};

const startupDelay =
  STARTUP_FETCH_DELAY_MIN_MS + Math.floor(Math.random() * STARTUP_FETCH_DELAY_JITTER_MS);
setTimeout(() => {
  updateTokenCache(false)
    .catch(() => {})
    .finally(() => {
      setInterval(() => updateTokenCache(false).catch(() => {}), UPDATE_INTERVAL);
    });
}, startupDelay);

// Manual refresh endpoint for debugging
router.post('/refresh', async (req, res) => {
  try {
    if (Date.now() < nextCoinGeckoAttemptAt) {
      return res.status(503).json({
        success: false,
        message: 'CoinGecko rate limit backoff active; try again later',
        retryAfterMs: Math.max(0, nextCoinGeckoAttemptAt - Date.now())
      });
    }
    const tokens = await updateTokenCache(true);
    if (tokens) {
      res.json({ 
        success: true, 
        message: `Successfully refreshed ${tokens.length} tokens`,
        count: tokens.length 
      });
    } else if (Date.now() < nextCoinGeckoAttemptAt) {
      res.status(503).json({
        success: false,
        message: 'CoinGecko rate limited; cached tokens unchanged',
        retryAfterMs: Math.max(0, nextCoinGeckoAttemptAt - Date.now())
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
  let tokens = await Token.find({}).sort({ marketCapRank: 1 }).limit(COINGECKO_TOP_LIMIT).lean();
  tokens = tokens.map(formatTokenForResponse);
  tokensReadCache = tokens;
  tokensReadCacheTime = Date.now();
  return tokens;
};

router.get('/global/stats', async (req, res) => {
  try {
    const stats = await fetchGlobalStats();
    if (!stats) {
      return res.status(503).json({ error: 'Global market stats unavailable' });
    }
    res.json(stats);
  } catch (error) {
    console.error('Error in /api/tokens/global/stats:', error);
    res.status(500).json({ error: 'Failed to fetch global market stats' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    // Search requests always bypass the cache
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      let tokens = await Token.find({
        $or: [{ symbol: searchRegex }, { name: searchRegex }, { id: searchRegex }]
      }).sort({ marketCapRank: 1 }).limit(COINGECKO_TOP_LIMIT).lean();
      tokens = tokens.map(formatTokenForResponse);
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