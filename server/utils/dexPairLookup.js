const axios = require('axios');

function liquidityUsd(pair) {
  return Number(pair?.liquidity?.usd) || 0;
}

function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || !pairs.length) return null;
  return [...pairs].sort((a, b) => liquidityUsd(b) - liquidityUsd(a))[0];
}

/**
 * Resolve the best DexScreener pair for a pair address or token mint.
 * Tries pairs endpoint (mapped + raw chain) then tokens endpoint (best liq on chain).
 */
async function fetchBestDexPair(tokenAddress, blockchain, chainMapping = {}) {
  const addr = (tokenAddress || '').trim();
  if (!addr) return null;

  const rawChain = (blockchain || '').toLowerCase().trim();
  const mappedChain = chainMapping[rawChain] || rawChain;
  const chainsToTry = [...new Set([mappedChain, rawChain].filter(Boolean))];

  for (const chain of chainsToTry) {
    try {
      const res = await axios.get(
        `https://api.dexscreener.com/latest/dex/pairs/${chain}/${addr}`,
        {
          timeout: 8000,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Aquads-Dex-Lookup/1.0 (+https://aquads.xyz)',
          },
        }
      );
      const pair =
        res.data?.pair ||
        (Array.isArray(res.data?.pairs) && res.data.pairs.length
          ? pickBestPair(
              res.data.pairs.filter(
                (p) => !rawChain || (p.chainId || '').toLowerCase() === chain
              )
            ) || pickBestPair(res.data.pairs)
          : null);
      if (pair) return pair;
    } catch (_) {
      // try next chain / endpoint
    }
  }

  try {
    const res = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${addr}`,
      {
        timeout: 8000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Aquads-Dex-Lookup/1.0 (+https://aquads.xyz)',
        },
      }
    );
    const pairs = res.data?.pairs;
    if (!Array.isArray(pairs) || !pairs.length) return null;

    for (const chain of chainsToTry) {
      const onChain = pairs.filter((p) => (p.chainId || '').toLowerCase() === chain);
      if (onChain.length) return pickBestPair(onChain);
    }
    return pickBestPair(pairs);
  } catch (_) {
    return null;
  }
}

module.exports = { fetchBestDexPair, pickBestPair };
