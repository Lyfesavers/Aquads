/**
 * Central RPC configuration for server-side blockchain reads (AquaPay, verification, escrow).
 * Prefer Alchemy Solana URL from Railway; keep public fallbacks.
 */

const SOLANA_RPC_PRIMARY = (
  process.env.ALCHEMY_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  process.env.REACT_APP_SOLANA_RPC_URL ||
  ''
).trim();

const SOLANA_RPCS_MAINNET = [
  ...(SOLANA_RPC_PRIMARY ? [SOLANA_RPC_PRIMARY] : []),
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana'
];

const SOLANA_RPCS_DEVNET = [
  ...(SOLANA_RPC_PRIMARY && SOLANA_RPC_PRIMARY.includes('devnet') ? [SOLANA_RPC_PRIMARY] : []),
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet'
];

const EVM_RPC_URLS = {
  ethereum: process.env.ALCHEMY_ETH_RPC_URL || 'https://ethereum.publicnode.com',
  base: process.env.ALCHEMY_BASE_RPC_URL || 'https://mainnet.base.org',
  polygon: process.env.ALCHEMY_POLYGON_RPC_URL || 'https://polygon-rpc.com',
  arbitrum: process.env.ALCHEMY_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  bnb: process.env.ALCHEMY_BNB_RPC_URL || 'https://bsc-dataseed.binance.org'
};

const USDC_CONTRACTS = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  bnb: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
};

const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const PLATFORM_WALLETS = {
  solana: (process.env.SOLANA_FEE_WALLET || process.env.REACT_APP_SOLANA_FEE_WALLET || '').trim(),
  ethereum: (process.env.FEE_WALLET || process.env.REACT_APP_FEE_WALLET || '').trim()
};

const AQUAPAY_FEE_PERCENTAGE = 0.005;

/** @param {boolean} useDevnet */
function getSolanaRpcList(useDevnet = false) {
  return useDevnet ? SOLANA_RPCS_DEVNET : SOLANA_RPCS_MAINNET;
}

/**
 * POST JSON-RPC to Solana with fallback endpoints.
 * @param {string} method
 * @param {unknown[]} params
 * @param {{ useDevnet?: boolean, timeoutMs?: number }} [opts]
 */
async function solanaRpc(method, params = [], opts = {}) {
  const axios = require('axios');
  const rpcList = getSolanaRpcList(Boolean(opts.useDevnet));
  const timeout = opts.timeoutMs ?? 15000;
  let lastError = null;

  for (const rpcUrl of rpcList) {
    try {
      const response = await axios.post(
        rpcUrl,
        { jsonrpc: '2.0', id: Date.now(), method, params },
        {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout
        }
      );
      if (response.data?.error) {
        lastError = response.data.error.message || JSON.stringify(response.data.error);
        continue;
      }
      return response.data.result;
    } catch (err) {
      lastError = err.response?.data?.error?.message || err.message;
    }
  }

  throw new Error(lastError || 'All Solana RPCs failed');
}

module.exports = {
  SOLANA_RPC_PRIMARY,
  SOLANA_RPCS_MAINNET,
  SOLANA_RPCS_DEVNET,
  EVM_RPC_URLS,
  USDC_CONTRACTS,
  SOLANA_USDC_MINT,
  PLATFORM_WALLETS,
  AQUAPAY_FEE_PERCENTAGE,
  getSolanaRpcList,
  solanaRpc
};
