// DeFi Service for fetching real-time APY data and managing protocol integrations

import logger from '../utils/logger';

const DEFILLAMA_API_BASE = 'https://yields.llama.fi';

// Cache for APY data to reduce API calls
let apyCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Protocol mapping to DeFiLlama pool IDs
const PROTOCOL_MAPPING = {
  'aave-usdc': {
    chain: 'Ethereum',
    project: 'aave-v3',
    symbol: 'USDC',
    poolId: null // Will be found dynamically
  },
  'compound-usdt': {
    chain: 'Ethereum', 
    project: 'compound-v2',
    symbol: 'USDT',
    poolId: null
  },
  'aave-eth': {
    chain: 'Ethereum',
    project: 'aave-v3', 
    symbol: 'ETH',
    poolId: null
  },
  'yearn-usdc': {
    chain: 'Ethereum',
    project: 'yearn-finance',
    symbol: 'USDC',
    poolId: null
  },
  'compound-dai': {
    chain: 'Ethereum',
    project: 'compound-v2',
    symbol: 'DAI', 
    poolId: null
  },
  'yearn-eth': {
    chain: 'Ethereum',
    project: 'yearn-finance',
    symbol: 'ETH',
    poolId: null
  }
};

/**
 * Fetch all available yield pools from DeFiLlama
 */
export const fetchAllPools = async () => {
  try {
    const response = await fetch(`${DEFILLAMA_API_BASE}/pools`);
    if (!response.ok) {
      throw new Error(`DeFiLlama API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    logger.error('Error fetching DeFiLlama pools:', error);
    return [];
  }
};

/**
 * Get real-time APY data for our supported pools
 */
export const getPoolAPYs = async () => {
  // Return cached data if still valid
  if (apyCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return apyCache;
  }

  try {
    const allPools = await fetchAllPools();
    const poolAPYs = {};

    // Find matching pools for each of our protocols
    Object.keys(PROTOCOL_MAPPING).forEach(poolId => {
      const mapping = PROTOCOL_MAPPING[poolId];
      
      // Find pools that match our criteria
      const matchingPools = allPools.filter(pool => 
        pool.chain === mapping.chain &&
        pool.project === mapping.project &&
        pool.symbol === mapping.symbol
      );

      if (matchingPools.length > 0) {
        // Take the pool with highest APY
        const bestPool = matchingPools.reduce((best, current) => 
          current.apy > best.apy ? current : best
        );
        
        poolAPYs[poolId] = {
          apy: bestPool.apy,
          tvlUsd: bestPool.tvlUsd,
          poolId: bestPool.pool
        };
      }
    });

    // Cache the results
    apyCache = poolAPYs;
    cacheTimestamp = Date.now();
    
    return poolAPYs;
  } catch (error) {
    logger.error('Error fetching pool APYs:', error);
    return {};
  }
};

/**
 * Get protocol-specific data and contract addresses
 */
export const getProtocolData = (protocol) => {
  const protocolInfo = {
    'Aave': {
      name: 'Aave Protocol',
      website: 'https://aave.com',
      logo: '🏦',
      description: 'Leading decentralized lending protocol',
      contracts: {
        ethereum: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9'
      }
    },
    'Compound': {
      name: 'Compound Finance',
      website: 'https://compound.finance',
      logo: '🔄', 
      description: 'Algorithmic money markets protocol',
      contracts: {
        ethereum: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B'
      }
    },
    'Yearn': {
      name: 'Yearn Finance',
      website: 'https://yearn.finance',
      logo: '🏛️',
      description: 'Automated yield farming strategies',
      contracts: {
        ethereum: '0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804'
      }
    }
  };

  return protocolInfo[protocol] || null;
};

/**
 * Calculate estimated earnings based on APY and time
 */
export const calculateEarnings = (principal, apy, days) => {
  const dailyRate = apy / 365 / 100;
  const compound = Math.pow(1 + dailyRate, days);
  return principal * compound - principal;
};

/**
 * Format APY for display
 */
export const formatAPY = (apy) => {
  if (apy === null || apy === undefined) return 'N/A';
  return `${apy.toFixed(2)}%`;
};

/**
 * Format TVL for display
 */
export const formatTVL = (tvl) => {
  if (!tvl) return 'N/A';
  
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(1)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(1)}K`;
  return `$${tvl.toFixed(2)}`;
};

/**
 * Get risk assessment for a protocol/token combination
 */
export const getRiskAssessment = (protocol, token) => {
  const riskMatrix = {
    'Aave': { 'USDC': 'Low', 'ETH': 'Low', 'DAI': 'Low' },
    'Compound': { 'USDT': 'Low', 'DAI': 'Low', 'USDC': 'Low' },
    'Yearn': { 'USDC': 'Medium', 'ETH': 'Medium', 'DAI': 'Medium' }
  };

  return riskMatrix[protocol]?.[token] || 'Unknown';
};

/**
 * Validate if a pool configuration is valid
 */
export const validatePoolConfig = (poolConfig) => {
  const required = ['protocol', 'token', 'contractAddress', 'chain'];
  return required.every(field => poolConfig[field]);
};

/**
 * Get supported chains for DeFi protocols
 */
export const getSupportedChains = () => {
  return [
    { id: 1, name: 'Ethereum', symbol: 'ETH' },
    { id: 137, name: 'Polygon', symbol: 'MATIC' },
    { id: 43114, name: 'Avalanche', symbol: 'AVAX' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH' }
  ];
};

export default {
  fetchAllPools,
  getPoolAPYs,
  getProtocolData,
  calculateEarnings,
  formatAPY,
  formatTVL,
  getRiskAssessment,
  validatePoolConfig,
  getSupportedChains
}; 