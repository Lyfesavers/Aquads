/**
 * DexScreener-aligned blockchain slugs for ad listings (normalize on save).
 */

const BLOCKCHAIN_ALIASES = {
  elrond: 'multiversx',
  sei: 'seiv2',
  xrp: 'xrpl',
  eth: 'ethereum',
  bnb: 'bsc',
  matic: 'polygon',
  avax: 'avalanche',
  arb: 'arbitrum',
  op: 'optimism',
  ftm: 'fantom',
  pulse: 'pulsechain',
  sol: 'solana',
  ethw: 'ethereumpow',
};

const VALID_SLUGS = new Set([
  'abstract', 'algorand', 'apechain', 'aptos', 'arbitrum', 'avalanche', 'base',
  'beam', 'berachain', 'blast', 'bsc', 'cardano', 'celo', 'conflux', 'cosmos',
  'cronos', 'dogechain', 'elastos', 'ethereum', 'ethereumpow', 'fantom', 'flare',
  'flow', 'flowevm', 'fogo', 'fuse', 'harmony', 'hedera', 'hyperliquid', 'hyperevm',
  'icp', 'ink', 'injective', 'katana', 'kadena', 'kaspa', 'kava', 'linea', 'mantle',
  'manta', 'megaeth', 'merlinchain', 'metis', 'mode', 'monad', 'moonbeam', 'moonriver',
  'movement', 'multiversx', 'near', 'neonevm', 'optimism', 'opbnb', 'osmosis', 'oasis',
  'plasma', 'polkadot', 'polygon', 'pulsechain', 'robinhood', 'scroll', 'seiv2', 'solana', 'soneium',
  'sonic', 'stacks', 'starknet', 'stellar', 'step', 'story', 'sui', 'taiko', 'telos',
  'tezos', 'ton', 'tron', 'unichain', 'vana', 'venom', 'worldchain', 'xrpl', 'zilliqa',
  'zircuit', 'zkfair', 'zksync', 'zora',
]);

function normalizeBlockchainSlug(value) {
  const raw = String(value || 'ethereum').trim().toLowerCase();
  if (!raw) return 'ethereum';
  const slug = BLOCKCHAIN_ALIASES[raw] || raw;
  return VALID_SLUGS.has(slug) ? slug : slug;
}

module.exports = {
  normalizeBlockchainSlug,
  VALID_SLUGS,
};
