// Centralized wallet configuration for Aquads platform
// Used by both AquaSwap and BexFi for fee collection

export const AQUADS_WALLETS = {
  // Main fee collection wallets (from environment variables only)
  ETHEREUM: process.env.REACT_APP_FEE_WALLET,
  SOLANA: process.env.REACT_APP_SOLANA_FEE_WALLET,
  SUI: process.env.REACT_APP_SUI_FEE_WALLET,
  
  // Additional chain wallets (using ETH wallet for EVM chains)
  POLYGON: process.env.REACT_APP_FEE_WALLET,
  ARBITRUM: process.env.REACT_APP_FEE_WALLET,
  OPTIMISM: process.env.REACT_APP_FEE_WALLET,
  BASE: process.env.REACT_APP_FEE_WALLET,
  AVALANCHE: process.env.REACT_APP_FEE_WALLET,
  BSC: process.env.REACT_APP_FEE_WALLET
};

// Fee structure configuration
export const FEE_CONFIG = {
  // AquaSwap fees (existing)
  SWAP_FEE_PERCENTAGE: 0.02, // 2%
  
  // AquaFi fees (strategic structure - 0% deposit, 2.5% withdrawal)
  SAVINGS_MANAGEMENT_FEE: 0.0, // 0% fee on deposit (no barrier to entry)
  SAVINGS_WITHDRAWAL_FEE: 0.025, // 2.5% fee on withdrawal (revenue optimization)
  
  // Fee thresholds
  MIN_FEE_AMOUNT: 0.0001, // Minimum fee to collect (in native token)
  FEE_COLLECTION_THRESHOLD: 0.01 // Collect fees when >= this amount
};

// Supported chains for BexFi savings pools
export const SUPPORTED_CHAINS = {
  ETHEREUM: {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    rpcUrl: "https://ethereum.publicnode.com",
    explorerUrl: "https://etherscan.io",
    feeWallet: AQUADS_WALLETS.ETHEREUM
  },
  POLYGON: {
    id: 137,
    name: "Polygon",
    symbol: "MATIC",
    rpcUrl: "https://polygon.llamarpc.com",
    explorerUrl: "https://polygonscan.com",
    feeWallet: AQUADS_WALLETS.POLYGON
  },
  ARBITRUM: {
    id: 42161,
    name: "Arbitrum",
    symbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    feeWallet: AQUADS_WALLETS.ARBITRUM
  },
  OPTIMISM: {
    id: 10,
    name: "Optimism",
    symbol: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    feeWallet: AQUADS_WALLETS.OPTIMISM
  },
  BASE: {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    feeWallet: AQUADS_WALLETS.BASE
  },
  AVALANCHE: {
    id: 43114,
    name: "Avalanche",
    symbol: "AVAX",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    feeWallet: AQUADS_WALLETS.AVALANCHE
  },
  BNB_CHAIN: {
    id: 56,
    name: "BNB Chain",
    symbol: "BNB",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    feeWallet: AQUADS_WALLETS.BSC
  }
};

// Production-ready contract addresses for DeFi protocols
export const PROTOCOL_CONTRACTS = {
  AAVE_V3: {
    ETHEREUM: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    POLYGON: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    ARBITRUM: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    OPTIMISM: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    AVALANCHE: "0x794a61358D6845594F94dc1DB02A252b5b4814aD"
  },
  COMPOUND_V2: {
    ETHEREUM: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B"
  },
  COMPOUND_V3: {
    ETHEREUM: "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
    POLYGON: "0xF25212E676D1F7F89Cd72fFEe66158f541246445",
    ARBITRUM: "0xA17581A9E3356d9A858b789D68B4d866e593aE94",
    BASE: "0x46e6b214b524310239732D51387075E0e70970bf"
  },
  YEARN_V2: {
    ETHEREUM: "0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804"
  }
};

// Token addresses for supported assets (verified Ethereum mainnet addresses)
export const TOKEN_ADDRESSES = {
  ETHEREUM: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  },
  POLYGON: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
  }
};

// Helper functions
export const getWalletForChain = (chainId) => {
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  return chain?.feeWallet || AQUADS_WALLETS.ETHEREUM;
};

export const getChainConfig = (chainId) => {
  return Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
};

export const isChainSupported = (chainId) => {
  return Object.values(SUPPORTED_CHAINS).some(c => c.id === chainId);
};

export default {
  AQUADS_WALLETS,
  FEE_CONFIG,
  SUPPORTED_CHAINS,
  PROTOCOL_CONTRACTS,
  TOKEN_ADDRESSES,
  getWalletForChain,
  getChainConfig,
  isChainSupported
}; 