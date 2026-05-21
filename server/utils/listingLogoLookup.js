const Ad = require('../models/Ad');

const CHAIN_ALIASES = {
  ether: ['ethereum', 'ether', 'eth'],
  eth: ['ethereum', 'ether', 'eth'],
  ethereum: ['ethereum', 'ether', 'eth'],
  bnb: ['bsc', 'bnb'],
  bsc: ['bsc', 'bnb'],
  sol: ['solana', 'sol'],
  solana: ['solana', 'sol'],
  matic: ['polygon', 'matic'],
  polygon: ['polygon', 'matic'],
  avax: ['avalanche', 'avax'],
  avalanche: ['avalanche', 'avax'],
  arb: ['arbitrum', 'arb'],
  arbitrum: ['arbitrum', 'arb'],
  op: ['optimism', 'op'],
  optimism: ['optimism', 'op'],
  ftm: ['fantom', 'ftm'],
  fantom: ['fantom', 'ftm'],
  pulse: ['pulsechain', 'pulse'],
  pulsechain: ['pulsechain', 'pulse'],
  base: ['base'],
};

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function chainVariants(blockchain) {
  const raw = (blockchain || '').toLowerCase().trim();
  const variants = new Set();
  if (!raw) return [];
  variants.add(raw);
  (CHAIN_ALIASES[raw] || []).forEach((v) => variants.add(v));
  return [...variants];
}

/**
 * Find an Aquads bubble listing logo by pair/token address (+ optional chain).
 * Prefers active/approved listings; bumped listings sort first.
 */
async function findListingLogoForToken(tokenAddress, blockchain) {
  const addr = (tokenAddress || '').trim();
  if (!addr) return null;

  const addrRegex = new RegExp(`^${escapeRegex(addr)}$`, 'i');
  const baseQuery = {
    status: { $in: ['active', 'approved'] },
    logo: { $exists: true, $nin: [null, ''] },
    pairAddress: addrRegex,
  };
  const sort = { isBumped: -1, bullishVotes: -1 };

  const variants = chainVariants(blockchain);
  if (variants.length) {
    const chainRegexes = variants.map((v) => new RegExp(`^${escapeRegex(v)}$`, 'i'));
    const matched = await Ad.findOne({
      ...baseQuery,
      blockchain: { $in: chainRegexes },
    })
      .select('logo')
      .sort(sort)
      .lean();
    if (matched?.logo) return matched.logo;
  }

  const matched = await Ad.findOne(baseQuery).select('logo').sort(sort).lean();
  return matched?.logo || null;
}

module.exports = { findListingLogoForToken };
