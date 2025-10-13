/**
 * Gas Price Service
 * Fetches live gas prices for different blockchain networks
 */

// Chain configurations for gas price fetching
// All using FREE public APIs and RPCs - no authentication required!
const CHAIN_CONFIGS = {
  // EVM Chains - using public RPCs (100% free)
  ether: {
    name: 'Ethereum',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://ethereum.publicnode.com'
  },
  polygon: {
    name: 'Polygon',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://polygon-rpc.com'
  },
  bnb: {
    name: 'BNB Chain',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://bsc-dataseed.binance.org'
  },
  arbitrum: {
    name: 'Arbitrum',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://arb1.arbitrum.io/rpc'
  },
  optimism: {
    name: 'Optimism',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://mainnet.optimism.io'
  },
  base: {
    name: 'Base',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://mainnet.base.org'
  },
  avalanche: {
    name: 'Avalanche',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc'
  },
  fantom: {
    name: 'Fantom',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://rpc.ftm.tools'
  },
  cronos: {
    name: 'Cronos',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://evm.cronos.org'
  },
  celo: {
    name: 'Celo',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://forno.celo.org'
  },
  moonbeam: {
    name: 'Moonbeam',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://rpc.api.moonbeam.network'
  },
  moonriver: {
    name: 'Moonriver',
    type: 'rpc',
    unit: 'Gwei',
    rpcUrl: 'https://rpc.api.moonriver.moonbeam.network'
  },
  // Non-EVM Chains - all using FREE public endpoints
  solana: {
    name: 'Solana',
    type: 'solana',
    unit: 'Lamports',
    rpcUrl: 'https://api.mainnet-beta.solana.com'
  },
  bitcoin: {
    name: 'Bitcoin',
    type: 'bitcoin',
    unit: 'sat/vB',
    apiUrl: 'https://mempool.space/api/v1/fees/recommended'
  },
  near: {
    name: 'NEAR',
    type: 'near',
    unit: 'TGas',
    rpcUrl: 'https://rpc.mainnet.near.org'
  },
  aptos: {
    name: 'Aptos',
    type: 'aptos',
    unit: 'Gas Units',
    rpcUrl: 'https://fullnode.mainnet.aptoslabs.com/v1'
  },
  sui: {
    name: 'Sui',
    type: 'sui',
    unit: 'MIST',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443'
  }
};

/**
 * Fetch gas price directly from public RPC (FREE - no API key needed!)
 */
async function fetchRpcGasPrice(config) {
  try {
    const response = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      })
    });
    
    const data = await response.json();
    if (data.result) {
      // Convert from Wei to Gwei
      const gasPriceWei = parseInt(data.result, 16);
      const gasPriceGwei = gasPriceWei / 1e9;
      
      return {
        price: parseFloat(gasPriceGwei.toFixed(2)),
        unit: config.unit || 'Gwei',
        fast: parseFloat((gasPriceGwei * 1.2).toFixed(2)),
        standard: parseFloat(gasPriceGwei.toFixed(2)),
        slow: parseFloat((gasPriceGwei * 0.8).toFixed(2))
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching RPC gas price for ${config.name}:`, error);
    return null;
  }
}

/**
 * Fetch Solana gas price (FREE public RPC)
 */
async function fetchSolanaGasPrice(config) {
  try {
    const response = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPrioritizationFees',
        params: [["11111111111111111111111111111111"]]
      })
    });
    
    const data = await response.json();
    if (data.result && data.result.length > 0) {
      // Get median prioritization fee
      const fees = data.result.map(f => f.prioritizationFee).sort((a, b) => a - b);
      const median = fees[Math.floor(fees.length / 2)] || 5000;
      
      return {
        price: median,
        unit: 'Lamports',
        fast: fees[Math.floor(fees.length * 0.75)] || median * 2,
        standard: median,
        slow: fees[Math.floor(fees.length * 0.25)] || median * 0.5
      };
    }
    
    // Default Solana base fee
    return {
      price: 5000,
      unit: 'Lamports',
      fast: 10000,
      standard: 5000,
      slow: 1000
    };
  } catch (error) {
    console.error('Error fetching Solana gas price:', error);
    return {
      price: 5000,
      unit: 'Lamports',
      fast: 10000,
      standard: 5000,
      slow: 1000
    };
  }
}

/**
 * Fetch Bitcoin fee estimation (FREE mempool.space API)
 */
async function fetchBitcoinGasPrice(config) {
  try {
    const response = await fetch(config.apiUrl);
    const data = await response.json();
    
    return {
      price: data.halfHourFee || 10,
      unit: config.unit,
      fast: data.fastestFee || 20,
      standard: data.halfHourFee || 10,
      slow: data.hourFee || 5
    };
  } catch (error) {
    console.error('Error fetching Bitcoin fees:', error);
    return {
      price: 10,
      unit: 'sat/vB',
      fast: 20,
      standard: 10,
      slow: 5
    };
  }
}

/**
 * Fetch NEAR gas price (FREE public RPC)
 */
async function fetchNearGasPrice(config) {
  try {
    const response = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'gas_price',
        params: [null]
      })
    });
    
    const data = await response.json();
    if (data.result && data.result.gas_price) {
      // Convert from yoctoNEAR to TGas price
      const gasPrice = parseInt(data.result.gas_price) / 1e12; // Convert to TGas
      
      return {
        price: parseFloat(gasPrice.toFixed(4)),
        unit: config.unit,
        fast: parseFloat((gasPrice * 1.1).toFixed(4)),
        standard: parseFloat(gasPrice.toFixed(4)),
        slow: parseFloat((gasPrice * 0.9).toFixed(4))
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching NEAR gas price:', error);
    return null;
  }
}

/**
 * Main function to fetch gas price for any chain
 * All using FREE public APIs - no authentication required!
 */
export async function getGasPrice(chainId) {
  const config = CHAIN_CONFIGS[chainId];
  
  if (!config) {
    console.warn(`No gas price configuration for chain: ${chainId}`);
    return null;
  }
  
  try {
    switch (config.type) {
      case 'rpc':
        return await fetchRpcGasPrice(config);
      
      case 'solana':
        return await fetchSolanaGasPrice(config);
      
      case 'bitcoin':
        return await fetchBitcoinGasPrice(config);
      
      case 'near':
        return await fetchNearGasPrice(config);
      
      default:
        return null;
    }
  } catch (error) {
    console.error(`Failed to fetch gas price for ${config.name}:`, error);
    return null;
  }
}

/**
 * Format gas price for display
 */
export function formatGasPrice(gasData) {
  if (!gasData) return 'N/A';
  
  const { price, unit } = gasData;
  
  // Format based on unit
  switch (unit) {
    case 'Gwei':
    case 'nAVAX':
      return `${price.toFixed(2)} ${unit}`;
    
    case 'Lamports':
      return `${Math.round(price)} ${unit}`;
    
    case 'sat/vB':
      return `${Math.round(price)} ${unit}`;
    
    case 'TGas':
      return `${price.toFixed(4)} ${unit}`;
    
    default:
      return `${price} ${unit}`;
  }
}

/**
 * Get gas price level indicator (low, medium, high)
 */
export function getGasPriceLevel(gasData) {
  if (!gasData || !gasData.fast || !gasData.slow) return 'medium';
  
  const { price, fast, slow } = gasData;
  const range = fast - slow;
  const threshold = range / 3;
  
  if (price <= slow + threshold) return 'low';
  if (price >= fast - threshold) return 'high';
  return 'medium';
}

export default {
  getGasPrice,
  formatGasPrice,
  getGasPriceLevel
};

