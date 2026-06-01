const { normalizeBlockchainSlug } = require('../constants/blockchains');
const DEX_SEARCH = 'https://api.dexscreener.com/latest/dex/search';
const DEX_TOKENS = 'https://api.dexscreener.com/latest/dex/tokens';
const FETCH_MS = Number(process.env.TOKEN_LOOKUP_TIMEOUT_MS) || 12_000;

function liquidityUsd(pair) {
  return Number(pair?.liquidity?.usd) || 0;
}

function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || !pairs.length) return null;
  return [...pairs].sort((a, b) => liquidityUsd(b) - liquidityUsd(a))[0];
}

function extractWebsite(pair) {
  const websites = pair?.info?.websites;
  if (Array.isArray(websites) && websites.length) {
    const url = websites[0]?.url || websites[0];
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  return null;
}

function normalizeResolvedPair(pair) {
  if (!pair) return null;
  const base = pair.baseToken || {};
  const symbol = String(base.symbol || '').trim();
  const name = String(base.name || symbol || 'TOKEN').trim();
  const chainId = String(pair.chainId || 'ethereum').trim().toLowerCase();
  const pairAddress = String(pair.pairAddress || '').trim();
  const contractAddress = String(base.address || '').trim();

  if (!symbol || !pairAddress) return null;

  return {
    title: symbol.slice(0, 120),
    name: name.slice(0, 200),
    blockchain: normalizeBlockchainSlug(chainId),
    pairAddress,
    contractAddress: contractAddress || null,
    priceUsd: pair.priceUsd != null ? String(pair.priceUsd) : null,
    websiteUrl: extractWebsite(pair),
    dexUrl: chainId && pairAddress ? `https://dexscreener.com/${chainId}/${pairAddress}` : null,
    logoFromDex: pair?.info?.imageUrl || null
  };
}

async function fetchDexJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_MS) });
  if (!res.ok) {
    throw new Error(`DexScreener request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Resolve token metadata from a contract address or pair address via DexScreener.
 * @param {string} address
 * @returns {Promise<{ ok: true, token: object } | { ok: false, error: string }>}
 */
async function resolveTokenFromAddress(address) {
  const trimmed = String(address || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Token or pair address is required.' };
  }

  let pairs = [];

  try {
    const tokenData = await fetchDexJson(`${DEX_TOKENS}/${encodeURIComponent(trimmed)}`);
    if (Array.isArray(tokenData?.pairs)) {
      pairs = tokenData.pairs;
    }
  } catch {
    // fall through to search
  }

  if (!pairs.length) {
    try {
      const searchData = await fetchDexJson(`${DEX_SEARCH}?q=${encodeURIComponent(trimmed)}`);
      if (Array.isArray(searchData?.pairs)) {
        pairs = searchData.pairs.filter(
          (p) =>
            String(p?.pairAddress || '').toLowerCase() === trimmed.toLowerCase() ||
            String(p?.baseToken?.address || '').toLowerCase() === trimmed.toLowerCase() ||
            String(p?.quoteToken?.address || '').toLowerCase() === trimmed.toLowerCase()
        );
        if (!pairs.length) {
          pairs = searchData.pairs;
        }
      }
    } catch (err) {
      return { ok: false, error: err.message || 'Failed to fetch token data from DexScreener.' };
    }
  }

  const best = pickBestPair(pairs);
  const token = normalizeResolvedPair(best);
  if (!token) {
    return {
      ok: false,
      error: 'No token found for this address. Check the contract or pair address and try again.'
    };
  }

  return { ok: true, token };
}

module.exports = {
  resolveTokenFromAddress,
  pickBestPair,
  normalizeResolvedPair
};
