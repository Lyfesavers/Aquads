import logger from './logger';

const TOKENS_CACHE_KEY = 'aquads_tokens_list_v1';
const TOKENS_CACHE_TS_KEY = 'aquads_tokens_list_v1_ts';
const GLOBAL_STATS_CACHE_KEY = 'aquads_tokens_global_stats_v1';

/** Match CoinGecko server sync cadence — cache is a navigation helper, not a freshness source. */
export const TOKENS_CACHE_STALE_MS = 15 * 60 * 1000;

export function readTokensCache() {
  try {
    const raw = sessionStorage.getItem(TOKENS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.warn('Failed to read tokens cache:', error);
    return [];
  }
}

export function getTokensCacheAgeMs() {
  try {
    const ts = sessionStorage.getItem(TOKENS_CACHE_TS_KEY);
    if (!ts) return Infinity;
    const age = Date.now() - parseInt(ts, 10);
    return Number.isFinite(age) ? age : Infinity;
  } catch {
    return Infinity;
  }
}

export function persistTokensCache(tokens) {
  if (!Array.isArray(tokens)) return;
  try {
    sessionStorage.setItem(TOKENS_CACHE_KEY, JSON.stringify(tokens));
    sessionStorage.setItem(TOKENS_CACHE_TS_KEY, String(Date.now()));
  } catch (error) {
    logger.warn('Failed to persist tokens cache:', error);
  }
}

export function readGlobalStatsCache() {
  try {
    const raw = sessionStorage.getItem(GLOBAL_STATS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    logger.warn('Failed to read global stats cache:', error);
    return null;
  }
}

export function persistGlobalStatsCache(stats) {
  if (!stats || typeof stats !== 'object') return;
  try {
    sessionStorage.setItem(GLOBAL_STATS_CACHE_KEY, JSON.stringify(stats));
  } catch (error) {
    logger.warn('Failed to persist global stats cache:', error);
  }
}
