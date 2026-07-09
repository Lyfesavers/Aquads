/**
 * Listing / filter blockchains aligned with DexScreener chainId slugs.
 * @see https://dexscreener.com — chain picker in UI
 */

const BLOCKCHAIN_ALIASES = {
  elrond: 'multiversx',
  sei: 'seiv2',
  xrp: 'xrpl',
  eth: 'ethereum',
  ether: 'ethereum',
  bnb: 'bsc',
  'binance smart chain': 'bsc',
  matic: 'polygon',
  avax: 'avalanche',
  arb: 'arbitrum',
  op: 'optimism',
  ftm: 'fantom',
  pulse: 'pulsechain',
  sol: 'solana',
  ethw: 'ethereumpow',
  'flow evm': 'flowevm',
  'world chain': 'worldchain',
  'sei v2': 'seiv2',
  'merlin chain': 'merlinchain',
  'op bnb': 'opbnb',
  zksyncera: 'zksync',
  'robinhood chain': 'robinhood',
  hood: 'robinhood',
};

/** DexScreener “top of list” chains — shown first in dropdowns */
export const POPULAR_BLOCKCHAIN_VALUES = [
  'solana',
  'base',
  'ethereum',
  'bsc',
  'polygon',
  'ton',
  'pulsechain',
  'hyperevm',
  'hyperliquid',
  'monad',
  'sui',
  'avalanche',
  'xrpl',
  'arbitrum',
  'worldchain',
  'cronos',
  'abstract',
  'tron',
  'near',
  'hedera',
  'megaeth',
  'sonic',
  'optimism',
  'multiversx',
  'ink',
  'linea',
  'algorand',
  'berachain',
  'robinhood',
  'seiv2',
  'plasma',
  'polkadot',
  'aptos',
  'injective',
  'opbnb',
  'zksync',
  'flare',
  'fantom',
  'cardano',
  'mantle',
  'starknet',
  'celo',
  'soneium',
  'metis',
  'blast',
  'harmony',
  'story',
  'icp',
  'katana',
  'unichain',
];

const BLOCKCHAIN_LABELS = {
  abstract: 'Abstract',
  algorand: 'Algorand',
  apechain: 'ApeChain',
  aptos: 'Aptos',
  arbitrum: 'Arbitrum',
  avalanche: 'Avalanche',
  base: 'Base',
  beam: 'Beam',
  berachain: 'Berachain',
  blast: 'Blast',
  bsc: 'BSC',
  cardano: 'Cardano',
  celo: 'Celo',
  conflux: 'Conflux',
  cosmos: 'Cosmos',
  cronos: 'Cronos',
  dogechain: 'Dogechain',
  elastos: 'Elastos',
  ethereum: 'Ethereum',
  ethereumpow: 'EthereumPoW',
  fantom: 'Fantom',
  flare: 'Flare',
  flow: 'Flow',
  flowevm: 'Flow EVM',
  fogo: 'Fogo',
  fuse: 'Fuse',
  harmony: 'Harmony',
  hedera: 'Hedera',
  hyperliquid: 'Hyperliquid',
  hyperevm: 'HyperEVM',
  icp: 'ICP',
  ink: 'Ink',
  injective: 'Injective',
  katana: 'Katana',
  kadena: 'Kadena',
  kaspa: 'Kaspa',
  kava: 'Kava',
  linea: 'Linea',
  mantle: 'Mantle',
  manta: 'Manta',
  megaeth: 'MegaETH',
  merlinchain: 'Merlin Chain',
  metis: 'Metis',
  mode: 'Mode',
  monad: 'Monad',
  moonbeam: 'Moonbeam',
  moonriver: 'Moonriver',
  movement: 'Movement',
  multiversx: 'MultiversX',
  near: 'NEAR',
  neonevm: 'Neon EVM',
  optimism: 'Optimism',
  opbnb: 'opBNB',
  osmosis: 'Osmosis',
  oasis: 'Oasis',
  plasma: 'Plasma',
  polkadot: 'Polkadot',
  polygon: 'Polygon',
  pulsechain: 'PulseChain',
  robinhood: 'Robinhood Chain',
  scroll: 'Scroll',
  seiv2: 'Sei V2',
  solana: 'Solana',
  soneium: 'Soneium',
  sonic: 'Sonic',
  stacks: 'Stacks',
  starknet: 'Starknet',
  stellar: 'Stellar',
  step: 'Step Network',
  story: 'Story',
  sui: 'Sui',
  taiko: 'Taiko',
  telos: 'Telos',
  tezos: 'Tezos',
  ton: 'TON',
  tron: 'TRON',
  unichain: 'Unichain',
  vana: 'Vana',
  venom: 'Venom',
  worldchain: 'World Chain',
  xrpl: 'XRPL',
  zilliqa: 'Zilliqa',
  zircuit: 'Zircuit',
  zkfair: 'ZKFair',
  zksync: 'zkSync',
  zora: 'Zora',
};

const ALL_VALUES = Object.keys(BLOCKCHAIN_LABELS);

const popularSet = new Set(POPULAR_BLOCKCHAIN_VALUES);
const otherValues = ALL_VALUES.filter((v) => !popularSet.has(v)).sort((a, b) =>
  BLOCKCHAIN_LABELS[a].localeCompare(BLOCKCHAIN_LABELS[b])
);

const orderedValues = [
  ...POPULAR_BLOCKCHAIN_VALUES.filter((v) => BLOCKCHAIN_LABELS[v]),
  ...otherValues,
];

/** Options for create/edit listing selects (no “all”) */
export const LISTING_BLOCKCHAIN_OPTIONS = orderedValues.map((value) => ({
  value,
  label: BLOCKCHAIN_LABELS[value],
  popular: popularSet.has(value),
}));

/** Options for home filter (includes “all”) */
export const FILTER_BLOCKCHAIN_OPTIONS = [
  { value: 'all', label: 'All Blockchains' },
  ...LISTING_BLOCKCHAIN_OPTIONS,
];

export function normalizeBlockchainSlug(value) {
  const raw = String(value || 'ethereum').trim().toLowerCase();
  if (!raw) return 'ethereum';
  return BLOCKCHAIN_ALIASES[raw] || raw;
}

export function isKnownListingBlockchain(value) {
  const slug = normalizeBlockchainSlug(value);
  return Boolean(BLOCKCHAIN_LABELS[slug]);
}

export function getBlockchainLabel(value) {
  const slug = normalizeBlockchainSlug(value);
  return BLOCKCHAIN_LABELS[slug] || slug;
}

/** Filter / display: match ad chain to selected filter (handles elrond→multiversx, etc.) */
export function matchesBlockchainFilter(adBlockchain, filterValue) {
  if (!filterValue || filterValue === 'all') return true;
  return (
    normalizeBlockchainSlug(adBlockchain) === normalizeBlockchainSlug(filterValue)
  );
}
