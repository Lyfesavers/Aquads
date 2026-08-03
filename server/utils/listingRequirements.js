const { dexScreenerGetJson } = require('./dexScreenerLimiter');
const { pickBestPair } = require('./tokenLookup');
const { fetchBestDexPair } = require('./dexPairLookup');
const { normalizeBlockchainSlug } = require('../constants/blockchains');
const {
  DEX_TOKEN_PAIRS_URL
} = require('../constants/dexFeed');

/** Bump gate only — separate from DEX feed listing liquidity (default $10k; raise via env when stricter). */
const MIN_BUMP_LIQUIDITY_USD = Number(process.env.BUMP_MIN_LIQUIDITY_USD) || 10_000;

/** Re-check Dex liquidity at most this often during vote/boost events (cron can force sooner). */
const BUMP_LIQUIDITY_CHECK_TTL_MS =
  Number(process.env.BUMP_LIQUIDITY_CHECK_TTL_MS) || 2 * 24 * 60 * 60 * 1000;

const BUMP_VOTE_THRESHOLD = 100;

const DEX_PAIRS_URL = 'https://api.dexscreener.com/latest/dex/pairs';

const isVoteBumped = (bullishVotes) => (bullishVotes || 0) >= BUMP_VOTE_THRESHOLD;

function liquidityUsdFromPair(pair) {
  return Number(pair?.liquidity?.usd) || 0;
}

/** Legacy docs without the field are treated as eligible until a check runs. */
function meetsLiquidityRequirement(ad) {
  if (!ad || ad.meetsLiquidityRequirement === false) return false;
  return true;
}

function isBumpEligible(ad, bullishVotes) {
  return isVoteBumped(bullishVotes) && meetsLiquidityRequirement(ad);
}

/**
 * Liquidity for the **listed** trading pair (not another pool for the same token).
 */
async function fetchPairLiquidityUsd(ad) {
  const pairAddress = String(ad?.pairAddress || '').trim();
  const contractAddress = String(ad?.contractAddress || '').trim();
  const chainId = normalizeBlockchainSlug(ad?.blockchain || 'ethereum');

  // 1) Listed pair via DexScreener pairs endpoint (rate-limited)
  if (pairAddress) {
    try {
      const data = await dexScreenerGetJson(
        `${DEX_PAIRS_URL}/${encodeURIComponent(chainId)}/${encodeURIComponent(pairAddress)}`
      );
      const pair =
        data?.pair ||
        (Array.isArray(data?.pairs) && data.pairs.length
          ? data.pairs.find(
              (p) =>
                String(p?.pairAddress || '').toLowerCase() === pairAddress.toLowerCase()
            ) || data.pairs[0]
          : null);
      if (pair) return liquidityUsdFromPair(pair);
    } catch (_) {
      // fall through
    }

    // 2) Legacy helper (pairs → tokens) as backup for odd chain slugs
    try {
      const pair = await fetchBestDexPair(pairAddress, ad.blockchain);
      if (pair) {
        const returned = String(pair.pairAddress || '').toLowerCase();
        const wanted = pairAddress.toLowerCase();
        // Only accept if it matches the listed pair — avoid token best-pair inflation
        if (!returned || returned === wanted) {
          return liquidityUsdFromPair(pair);
        }
      }
    } catch (_) {
      // fall through
    }
  }

  // 3) Token pairs: match listed pairAddress when possible
  if (!contractAddress) return null;

  try {
    const pairs = await dexScreenerGetJson(
      `${DEX_TOKEN_PAIRS_URL}/${encodeURIComponent(chainId)}/${encodeURIComponent(contractAddress)}`
    );
    if (!Array.isArray(pairs) || !pairs.length) return null;

    if (pairAddress) {
      const wanted = pairAddress.toLowerCase();
      const exact = pairs.find(
        (p) => String(p?.pairAddress || '').toLowerCase() === wanted
      );
      if (exact) return liquidityUsdFromPair(exact);
      // Listed pair not in token results — do not use a different pool's liquidity
      return null;
    }

    return liquidityUsdFromPair(pickBestPair(pairs));
  } catch (_) {
    return null;
  }
}

/**
 * Live DexScreener check for bump liquidity gate.
 * On API failure returns null (caller should not change stored eligibility).
 */
async function refreshAdLiquidityRequirement(ad) {
  const liquidityUsd = await fetchPairLiquidityUsd(ad);
  if (liquidityUsd == null || !Number.isFinite(liquidityUsd)) {
    return null;
  }

  return {
    meetsLiquidityRequirement: liquidityUsd >= MIN_BUMP_LIQUIDITY_USD,
    liquidityCheckedAt: new Date(),
    liquidityUsdSnapshot: liquidityUsd
  };
}

/** Refresh liquidity from Dex when vote threshold is met, before bump sync. */
async function prepareAdForBumpSync(adDoc, { forceRefresh = false } = {}) {
  const plain = adDoc?.toObject ? adDoc.toObject() : adDoc;
  if (!isVoteBumped(plain.bullishVotes)) {
    return plain;
  }

  if (!forceRefresh && plain.liquidityCheckedAt) {
    const age = Date.now() - new Date(plain.liquidityCheckedAt).getTime();
    if (age >= 0 && age < BUMP_LIQUIDITY_CHECK_TTL_MS) {
      return plain;
    }
  }

  const refresh = await refreshAdLiquidityRequirement(plain);
  if (!refresh) {
    return plain;
  }

  return { ...plain, ...refresh };
}

module.exports = {
  BUMP_VOTE_THRESHOLD,
  BUMP_LIQUIDITY_CHECK_TTL_MS,
  MIN_BUMP_LIQUIDITY_USD,
  isVoteBumped,
  meetsLiquidityRequirement,
  isBumpEligible,
  fetchPairLiquidityUsd,
  refreshAdLiquidityRequirement,
  prepareAdForBumpSync
};
