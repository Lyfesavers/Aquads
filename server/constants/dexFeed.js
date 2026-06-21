const LISTING_SOURCE_MANUAL = 'manual';
const LISTING_SOURCE_DEX_FEED = 'dex-feed';

const CLAIM_STATUS_NA = 'n/a';
const CLAIM_STATUS_UNCLAIMED = 'unclaimed';
const CLAIM_STATUS_CLAIMED = 'claimed';

const DEX_FEED_OWNER_USERNAME = (
  process.env.DEX_FEED_OWNER_USERNAME || 'aquads-feed'
).trim();

const DEX_FEED_ENABLED = String(process.env.DEX_FEED_ENABLED || '').toLowerCase() === 'true';

const DEX_FEED_MIN_MARKET_CAP_USD = Number(process.env.DEX_FEED_MIN_MARKET_CAP_USD) || 50_000;
const DEX_FEED_MIN_LIQUIDITY_USD = Number(process.env.DEX_FEED_MIN_LIQUIDITY_USD) || 15_000;

const DEX_TOKEN_PAIRS_URL = 'https://api.dexscreener.com/token-pairs/v1';

/** DexScreener feeds — shared MC/liq gates ($50k / $15k), per-source min pair age */
const DEX_FEED_SOURCES = [
  {
    id: 'profiles-latest',
    url: 'https://api.dexscreener.com/token-profiles/latest/v1',
    minPairAgeHours: Number(process.env.DEX_FEED_LATEST_MIN_AGE_HOURS) || 12
  },
  {
    id: 'boosts-top',
    url: 'https://api.dexscreener.com/token-boosts/top/v1',
    minPairAgeHours: Number(process.env.DEX_FEED_BOOSTS_MIN_AGE_HOURS) || 12
  },
  {
    id: 'recent-updates',
    url: 'https://api.dexscreener.com/token-profiles/recent-updates/v1',
    minPairAgeHours: Number(process.env.DEX_FEED_RECENT_MIN_AGE_HOURS) || 24
  }
];

module.exports = {
  LISTING_SOURCE_MANUAL,
  LISTING_SOURCE_DEX_FEED,
  CLAIM_STATUS_NA,
  CLAIM_STATUS_UNCLAIMED,
  CLAIM_STATUS_CLAIMED,
  DEX_FEED_OWNER_USERNAME,
  DEX_FEED_ENABLED,
  DEX_FEED_MIN_MARKET_CAP_USD,
  DEX_FEED_MIN_LIQUIDITY_USD,
  DEX_FEED_SOURCES,
  DEX_TOKEN_PAIRS_URL
};
