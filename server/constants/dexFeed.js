const LISTING_SOURCE_MANUAL = 'manual';
const LISTING_SOURCE_DEX_FEED = 'dex-feed';

const CLAIM_STATUS_NA = 'n/a';
const CLAIM_STATUS_UNCLAIMED = 'unclaimed';
const CLAIM_STATUS_CLAIMED = 'claimed';

const DEX_FEED_OWNER_USERNAME = (
  process.env.DEX_FEED_OWNER_USERNAME || 'aquads-feed'
).trim();

const DEX_FEED_ENABLED = String(process.env.DEX_FEED_ENABLED || '').toLowerCase() === 'true';

const DEX_FEED_MIN_MARKET_CAP_USD = Number(process.env.DEX_FEED_MIN_MARKET_CAP_USD) || 20_000;
const DEX_FEED_MIN_LIQUIDITY_USD = Number(process.env.DEX_FEED_MIN_LIQUIDITY_USD) || 10_000;
const DEX_FEED_MIN_PAIR_AGE_HOURS = Number(process.env.DEX_FEED_MIN_PAIR_AGE_HOURS) || 24;

const DEX_PROFILES_URL = 'https://api.dexscreener.com/token-profiles/latest/v1';
const DEX_TOKEN_PAIRS_URL = 'https://api.dexscreener.com/token-pairs/v1';

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
  DEX_FEED_MIN_PAIR_AGE_HOURS,
  DEX_PROFILES_URL,
  DEX_TOKEN_PAIRS_URL
};
