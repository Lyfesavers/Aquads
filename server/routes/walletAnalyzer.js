const express = require('express');
const router = express.Router();
const axios = require('axios');

// Free public RPC endpoints (no API keys needed)
const PUBLIC_RPCS = {
  ethereum: 'https://eth.llamarpc.com',
  bsc: 'https://bsc-dataseed1.binance.org',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  base: 'https://mainnet.base.org',
  optimism: 'https://mainnet.optimism.io',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  fantom: 'https://rpc.ftm.tools',
};

// Free public Solana RPCs (rotating to avoid rate limits)
const SOLANA_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana'
];

let currentSolanaRpcIndex = 0;
const getSolanaRpc = () => {
  const rpc = SOLANA_RPCS[currentSolanaRpcIndex];
  currentSolanaRpcIndex = (currentSolanaRpcIndex + 1) % SOLANA_RPCS.length;
  return rpc;
};

// Chain configurations
const CHAIN_CONFIG = {
  ethereum: { nativeSymbol: 'ETH', nativeDecimals: 18, coingeckoId: 'ethereum', explorerApi: 'https://api.etherscan.io/api' },
  bsc: { nativeSymbol: 'BNB', nativeDecimals: 18, coingeckoId: 'binancecoin', explorerApi: 'https://api.bscscan.com/api' },
  polygon: { nativeSymbol: 'MATIC', nativeDecimals: 18, coingeckoId: 'matic-network', explorerApi: 'https://api.polygonscan.com/api' },
  arbitrum: { nativeSymbol: 'ETH', nativeDecimals: 18, coingeckoId: 'ethereum', explorerApi: 'https://api.arbiscan.io/api' },
  base: { nativeSymbol: 'ETH', nativeDecimals: 18, coingeckoId: 'ethereum', explorerApi: 'https://api.basescan.org/api' },
  optimism: { nativeSymbol: 'ETH', nativeDecimals: 18, coingeckoId: 'ethereum', explorerApi: 'https://api-optimistic.etherscan.io/api' },
  avalanche: { nativeSymbol: 'AVAX', nativeDecimals: 18, coingeckoId: 'avalanche-2', explorerApi: 'https://api.snowtrace.io/api' },
  fantom: { nativeSymbol: 'FTM', nativeDecimals: 18, coingeckoId: 'fantom', explorerApi: 'https://api.ftmscan.com/api' },
  solana: { nativeSymbol: 'SOL', nativeDecimals: 9, coingeckoId: 'solana' }
};

// Simple rate limiting
const requestTimestamps = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;

const checkRateLimit = (ip) => {
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentTimestamps.push(now);
  requestTimestamps.set(ip, recentTimestamps);
  return true;
};

// Cache for token prices to avoid hitting rate limits
const priceCache = new Map();
const PRICE_CACHE_TTL = 300000; // 5 minutes

// Get native balance via RPC
const getNativeBalance = async (address, chain) => {
  if (chain === 'solana') {
    const response = await axios.post(getSolanaRpc(), {
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address, { commitment: 'confirmed' }]
    }, { timeout: 15000 });
    
    return (response.data.result?.value || 0) / 1e9;
  }
  
  const rpc = PUBLIC_RPCS[chain];
  if (!rpc) throw new Error(`Unsupported chain: ${chain}`);
  
  const response = await axios.post(rpc, {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getBalance',
    params: [address, 'latest']
  }, { timeout: 15000 });
  
  const balanceHex = response.data.result;
  return parseInt(balanceHex, 16) / 1e18;
};

// Get EVM transaction list from explorer (includes both incoming and outgoing)
const getEVMTransactionHistory = async (address, chain) => {
  const config = CHAIN_CONFIG[chain];
  if (!config?.explorerApi) return { transactions: [], firstTxTime: null, totalTxCount: 0 };
  
  try {
    // Get normal transactions
    const [normalTx, internalTx, tokenTx] = await Promise.all([
      axios.get(config.explorerApi, {
        params: {
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 100,
          sort: 'asc' // oldest first to get first tx time
        },
        timeout: 15000
      }).catch(() => ({ data: { result: [] } })),
      
      axios.get(config.explorerApi, {
        params: {
          module: 'account',
          action: 'txlistinternal',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 50,
          sort: 'asc'
        },
        timeout: 15000
      }).catch(() => ({ data: { result: [] } })),
      
      axios.get(config.explorerApi, {
        params: {
          module: 'account',
          action: 'tokentx',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 100,
          sort: 'asc'
        },
        timeout: 15000
      }).catch(() => ({ data: { result: [] } }))
    ]);

    const normalTxs = Array.isArray(normalTx.data.result) ? normalTx.data.result : [];
    const internalTxs = Array.isArray(internalTx.data.result) ? internalTx.data.result : [];
    const tokenTxs = Array.isArray(tokenTx.data.result) ? tokenTx.data.result : [];
    
    // Find earliest transaction timestamp
    let firstTxTime = null;
    const allTimestamps = [
      ...normalTxs.map(tx => parseInt(tx.timeStamp)),
      ...internalTxs.map(tx => parseInt(tx.timeStamp)),
      ...tokenTxs.map(tx => parseInt(tx.timeStamp))
    ].filter(t => t > 0);
    
    if (allTimestamps.length > 0) {
      firstTxTime = Math.min(...allTimestamps) * 1000; // Convert to ms
    }
    
    // Total transaction count (unique hashes)
    const uniqueHashes = new Set([
      ...normalTxs.map(tx => tx.hash),
      ...internalTxs.map(tx => tx.hash),
      ...tokenTxs.map(tx => tx.hash)
    ]);
    
    // Analyze transactions for trading behavior
    const transactions = [];
    const addressLower = address.toLowerCase();
    
    // Process normal transactions
    for (const tx of normalTxs.slice(-50)) { // Most recent 50
      const isOutgoing = tx.from?.toLowerCase() === addressLower;
      const value = parseInt(tx.value) / 1e18;
      transactions.push({
        hash: tx.hash,
        timestamp: parseInt(tx.timeStamp) * 1000,
        type: isOutgoing ? 'send' : 'receive',
        value: value,
        gasUsed: parseInt(tx.gasUsed || 0),
        gasPrice: parseInt(tx.gasPrice || 0),
        isError: tx.isError === '1',
        to: tx.to,
        from: tx.from
      });
    }
    
    // Process token transactions
    const tokenTransactions = [];
    for (const tx of tokenTxs.slice(-100)) {
      const isOutgoing = tx.from?.toLowerCase() === addressLower;
      const decimals = parseInt(tx.tokenDecimal) || 18;
      const value = parseFloat(tx.value) / Math.pow(10, decimals);
      tokenTransactions.push({
        hash: tx.hash,
        timestamp: parseInt(tx.timeStamp) * 1000,
        type: isOutgoing ? 'sell' : 'buy',
        tokenSymbol: tx.tokenSymbol,
        tokenName: tx.tokenName,
        value: value,
        contractAddress: tx.contractAddress
      });
    }
    
    return {
      transactions,
      tokenTransactions,
      firstTxTime,
      totalTxCount: uniqueHashes.size,
      normalTxCount: normalTxs.length,
      tokenTxCount: tokenTxs.length
    };
  } catch (error) {
    console.log('EVM tx history error:', error.message);
    return { transactions: [], tokenTransactions: [], firstTxTime: null, totalTxCount: 0 };
  }
};

// Get Solana transaction history with timestamps
const getSolanaTransactionHistory = async (address) => {
  try {
    // Get signatures to find first tx time and count
    const signaturesResponse = await axios.post(getSolanaRpc(), {
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [address, { limit: 1000 }] // Get up to 1000 signatures
    }, { timeout: 20000 });
    
    const signatures = signaturesResponse.data.result || [];
    
    if (signatures.length === 0) {
      return { transactions: [], firstTxTime: null, totalTxCount: 0 };
    }
    
    // Find oldest and newest timestamps
    const timestamps = signatures
      .filter(sig => sig.blockTime)
      .map(sig => sig.blockTime * 1000);
    
    const firstTxTime = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const lastTxTime = timestamps.length > 0 ? Math.max(...timestamps) : null;
    
    // Analyze signatures for errors and patterns
    const errorCount = signatures.filter(sig => sig.err !== null).length;
    const successRate = signatures.length > 0 ? ((signatures.length - errorCount) / signatures.length) * 100 : 0;
    
    // Calculate transaction frequency
    let txFrequency = 0;
    if (firstTxTime && lastTxTime && firstTxTime !== lastTxTime) {
      const daysDiff = (lastTxTime - firstTxTime) / (1000 * 60 * 60 * 24);
      txFrequency = daysDiff > 0 ? signatures.length / daysDiff : 0;
    }
    
    // Get recent transaction details
    const recentSigs = signatures.slice(0, 20);
    const transactions = recentSigs.map(sig => ({
      hash: sig.signature,
      timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
      isError: sig.err !== null,
      slot: sig.slot
    }));
    
    return {
      transactions,
      firstTxTime,
      lastTxTime,
      totalTxCount: signatures.length,
      errorCount,
      successRate,
      txFrequency
    };
  } catch (error) {
    console.log('Solana tx history error:', error.message);
    return { transactions: [], firstTxTime: null, totalTxCount: 0 };
  }
};

// Known Solana token metadata (popular tokens)
const KNOWN_SOLANA_TOKENS = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Wrapped SOL' },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade SOL' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk' },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'ETH', name: 'Wrapped Ethereum' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter' },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', name: 'Pyth Network' },
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': { symbol: 'RNDR', name: 'Render Token' },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'stSOL', name: 'Lido Staked SOL' },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': { symbol: 'ORCA', name: 'Orca' },
  'RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a': { symbol: 'RLB', name: 'Rollbit Coin' },
  'AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB': { symbol: 'GST', name: 'Green Satoshi Token' },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium' },
  'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': { symbol: 'SRM', name: 'Serum' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF', name: 'dogwifhat' },
  'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6': { symbol: 'KIN', name: 'Kin' },
  'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': { symbol: 'MEW', name: 'cat in a dogs world' },
  'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6': { symbol: 'TNSR', name: 'Tensor' },
  'A3eME5CetyZPBoWbRUwY3tSe25S6tb18ba9ZPbWk9eFJ': { symbol: 'PRCL', name: 'Parcl' },
};

// Fetch Solana token metadata from Jupiter API
const getSolanaTokenMetadata = async (mints) => {
  try {
    // Use Jupiter's token list API (free)
    const response = await axios.get('https://token.jup.ag/strict', { timeout: 10000 });
    const tokenList = response.data || [];
    
    const tokenMap = new Map();
    for (const token of tokenList) {
      tokenMap.set(token.address, { symbol: token.symbol, name: token.name });
    }
    
    return tokenMap;
  } catch (error) {
    console.log('Jupiter token list error:', error.message);
    return new Map();
  }
};

// Get Solana token accounts with balances
const getSolanaTokens = async (address) => {
  try {
    const response = await axios.post(getSolanaRpc(), {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        address,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' }
      ]
    }, { timeout: 15000 });
    
    const accounts = response.data.result?.value || [];
    const tokensWithBalance = accounts
      .filter(acc => {
        const amount = acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
        return amount && amount > 0;
      })
      .map(acc => {
        const info = acc.account.data.parsed.info;
        return {
          mint: info.mint,
          balance: info.tokenAmount.uiAmount,
          decimals: info.tokenAmount.decimals
        };
      })
      .slice(0, 20);
    
    // Get token metadata for the mints
    const mints = tokensWithBalance.map(t => t.mint);
    let jupiterTokens = new Map();
    
    // Try to get metadata from Jupiter (rate limited, so we cache)
    try {
      jupiterTokens = await getSolanaTokenMetadata(mints);
    } catch (e) {
      console.log('Could not fetch Jupiter tokens');
    }
    
    // Map tokens with metadata
    return tokensWithBalance.map(token => {
      const known = KNOWN_SOLANA_TOKENS[token.mint];
      const jupiter = jupiterTokens.get(token.mint);
      
      return {
        mint: token.mint,
        balance: token.balance,
        decimals: token.decimals,
        symbol: known?.symbol || jupiter?.symbol || token.mint.slice(0, 4) + '...' + token.mint.slice(-4),
        name: known?.name || jupiter?.name || 'Unknown Token'
      };
    });
  } catch (error) {
    console.log('Solana tokens error:', error.message);
    return [];
  }
};

// Get token balances for EVM from explorer
const getEVMTokenBalances = async (address, chain) => {
  const config = CHAIN_CONFIG[chain];
  if (!config?.explorerApi) return [];
  
  try {
    const response = await axios.get(config.explorerApi, {
      params: {
        module: 'account',
        action: 'tokentx',
        address: address,
        startblock: 0,
        endblock: 99999999,
        sort: 'desc',
        page: 1,
        offset: 100
      },
      timeout: 15000
    });
    
    if (response.data.status === '1' && Array.isArray(response.data.result)) {
      // Track token balances from tx history
      const tokenMap = new Map();
      const addressLower = address.toLowerCase();
      
      for (const tx of response.data.result) {
        const contractAddr = tx.contractAddress?.toLowerCase();
        if (!contractAddr) continue;
        
        const decimals = parseInt(tx.tokenDecimal) || 18;
        const value = parseFloat(tx.value) / Math.pow(10, decimals);
        const isIncoming = tx.to?.toLowerCase() === addressLower;
        
        if (!tokenMap.has(contractAddr)) {
          tokenMap.set(contractAddr, {
            symbol: tx.tokenSymbol,
            name: tx.tokenName,
            contractAddress: contractAddr,
            balance: 0,
            lastActivity: parseInt(tx.timeStamp) * 1000
          });
        }
        
        const token = tokenMap.get(contractAddr);
        token.balance += isIncoming ? value : -value;
      }
      
      // Filter to tokens with positive balance
      return Array.from(tokenMap.values())
        .filter(t => t.balance > 0.0001)
        .slice(0, 15);
    }
  } catch (error) {
    console.log('EVM token balances error:', error.message);
  }
  
  return [];
};

// Get token prices from CoinGecko (with caching)
const getTokenPrices = async (coingeckoIds) => {
  const now = Date.now();
  const uncachedIds = [];
  const prices = {};
  
  // Check cache first
  for (const id of coingeckoIds) {
    const cached = priceCache.get(id);
    if (cached && now - cached.timestamp < PRICE_CACHE_TTL) {
      prices[id] = cached.price;
    } else {
      uncachedIds.push(id);
    }
  }
  
  // Fetch uncached prices
  if (uncachedIds.length > 0) {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${uncachedIds.join(',')}&vs_currencies=usd&include_24hr_change=true`,
        { timeout: 10000 }
      );
      
      for (const id of uncachedIds) {
        const data = response.data[id];
        if (data) {
          prices[id] = data.usd || 0;
          priceCache.set(id, { price: data.usd || 0, timestamp: now });
        }
      }
    } catch (error) {
      console.log('CoinGecko price fetch error:', error.message);
    }
  }
  
  return prices;
};

// Advanced wallet behavior analysis
const analyzeWalletBehavior = (data) => {
  const {
    txHistory,
    tokenTxHistory,
    nativeBalance,
    tokens,
    walletAgeDays,
    chain
  } = data;
  
  let jeetScore = 50;
  let botProbability = 5;
  let winRate = 50;
  let smartMoneyScore = 50;
  let diamondHandsScore = 50;
  
  const totalTxCount = txHistory?.totalTxCount || 0;
  const tokenTxCount = txHistory?.tokenTxCount || tokenTxHistory?.length || 0;
  
  // Calculate transactions per day
  const txPerDay = walletAgeDays > 0 ? totalTxCount / walletAgeDays : 0;
  
  // Bot detection signals
  if (txPerDay > 50) {
    botProbability = Math.min(95, 60 + txPerDay * 0.5);
  } else if (txPerDay > 20) {
    botProbability = Math.min(80, 40 + txPerDay);
  } else if (txPerDay > 10) {
    botProbability = Math.min(60, 20 + txPerDay * 2);
  } else if (txPerDay > 5) {
    botProbability = Math.min(40, 10 + txPerDay * 3);
  }
  
  // Check for consistent timing patterns (bot signal)
  if (txHistory?.transactions?.length > 5) {
    const intervals = [];
    const sortedTx = [...txHistory.transactions].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 1; i < Math.min(sortedTx.length, 20); i++) {
      intervals.push(sortedTx[i].timestamp - sortedTx[i-1].timestamp);
    }
    if (intervals.length > 3) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      // Very consistent intervals suggest bot
      if (stdDev < avgInterval * 0.1 && avgInterval < 60000) {
        botProbability = Math.min(95, botProbability + 30);
      }
    }
  }
  
  // Jeet score analysis
  if (tokenTxCount > 0 && walletAgeDays > 0) {
    const tokenTxPerDay = tokenTxCount / walletAgeDays;
    
    if (tokenTxPerDay > 10) {
      jeetScore = Math.min(95, 70 + tokenTxPerDay);
    } else if (tokenTxPerDay > 5) {
      jeetScore = Math.min(85, 50 + tokenTxPerDay * 3);
    } else if (tokenTxPerDay > 2) {
      jeetScore = Math.min(70, 40 + tokenTxPerDay * 5);
    } else if (tokenTxPerDay < 0.5) {
      jeetScore = Math.max(10, 30 - (0.5 - tokenTxPerDay) * 40);
    }
  }
  
  // Diamond hands score (inverse of jeet, with holding analysis)
  diamondHandsScore = Math.max(5, 100 - jeetScore);
  
  // Analyze token holding patterns for EVM
  if (txHistory?.tokenTransactions && txHistory.tokenTransactions.length > 0) {
    const tokenActivity = new Map();
    
    for (const tx of txHistory.tokenTransactions) {
      const key = tx.contractAddress?.toLowerCase();
      if (!key) continue;
      
      if (!tokenActivity.has(key)) {
        tokenActivity.set(key, { buys: 0, sells: 0, firstBuy: tx.timestamp, lastActivity: tx.timestamp });
      }
      
      const activity = tokenActivity.get(key);
      if (tx.type === 'buy') {
        activity.buys++;
      } else {
        activity.sells++;
      }
      activity.lastActivity = Math.max(activity.lastActivity, tx.timestamp);
    }
    
    // Calculate win rate based on holding patterns
    let quickSells = 0;
    let totalTokens = 0;
    
    for (const [, activity] of tokenActivity) {
      totalTokens++;
      const holdTime = activity.lastActivity - activity.firstBuy;
      // If sold within 24 hours of buying
      if (activity.sells > 0 && holdTime < 24 * 60 * 60 * 1000) {
        quickSells++;
      }
    }
    
    if (totalTokens > 0) {
      const quickSellRate = quickSells / totalTokens;
      jeetScore = Math.min(95, jeetScore * (1 + quickSellRate * 0.5));
      winRate = Math.max(20, 50 - quickSellRate * 30);
    }
  }
  
  // Balance-based adjustments
  if (nativeBalance > 100) {
    jeetScore = Math.max(10, jeetScore - 25);
    smartMoneyScore += 15;
    winRate = Math.min(80, winRate + 15);
  } else if (nativeBalance > 10) {
    jeetScore = Math.max(15, jeetScore - 15);
    smartMoneyScore += 10;
    winRate = Math.min(75, winRate + 10);
  } else if (nativeBalance > 1) {
    smartMoneyScore += 5;
  }
  
  // Token diversity affects smart money score
  const tokenCount = tokens?.length || 0;
  if (tokenCount > 10) {
    smartMoneyScore = Math.min(85, smartMoneyScore + 15);
  } else if (tokenCount > 5) {
    smartMoneyScore = Math.min(75, smartMoneyScore + 10);
  } else if (tokenCount < 2) {
    smartMoneyScore = Math.max(30, smartMoneyScore - 10);
  }
  
  // Wallet age factor
  if (walletAgeDays > 365 * 2) {
    smartMoneyScore = Math.min(90, smartMoneyScore + 15);
    diamondHandsScore = Math.min(90, diamondHandsScore + 20);
  } else if (walletAgeDays > 365) {
    smartMoneyScore = Math.min(85, smartMoneyScore + 10);
    diamondHandsScore = Math.min(85, diamondHandsScore + 15);
  } else if (walletAgeDays > 180) {
    smartMoneyScore = Math.min(75, smartMoneyScore + 5);
  } else if (walletAgeDays < 30) {
    smartMoneyScore = Math.max(20, smartMoneyScore - 15);
    winRate = Math.max(30, winRate - 10);
  }
  
  // Success rate from Solana
  if (txHistory?.successRate !== undefined) {
    winRate = Math.round((winRate + txHistory.successRate) / 2);
  }
  
  // Error transactions affect win rate
  if (txHistory?.errorCount > 0 && txHistory?.totalTxCount > 0) {
    const errorRate = txHistory.errorCount / txHistory.totalTxCount;
    winRate = Math.max(20, winRate - errorRate * 30);
  }
  
  return {
    jeetScore: Math.round(Math.min(100, Math.max(0, jeetScore))),
    botProbability: Math.round(Math.min(100, Math.max(0, botProbability))),
    winRate: Math.round(Math.min(100, Math.max(0, winRate))),
    smartMoneyScore: Math.round(Math.min(100, Math.max(0, smartMoneyScore))),
    diamondHandsScore: Math.round(Math.min(100, Math.max(0, diamondHandsScore)))
  };
};

// Determine wallet type based on comprehensive metrics
const determineWalletType = (behavior, nativeBalance, nativeValue, tokens, walletAgeDays, totalTxCount) => {
  const { jeetScore, botProbability, winRate, smartMoneyScore, diamondHandsScore } = behavior;
  const tokenCount = tokens?.length || 0;
  
  // New wallet takes precedence
  if (walletAgeDays < 7) return 'NEW_WALLET';
  
  // Bot detection (high confidence)
  if (botProbability > 80) return 'BOT';
  
  // Whale detection (by value or balance)
  if (nativeValue > 100000 || nativeBalance > 50) return 'WHALE';
  
  // Jeet detection (high trade frequency, quick sells)
  if (jeetScore > 80) return 'JEET';
  
  // Paper hands (moderate jeet, sells on dips)
  if (jeetScore > 65 && winRate < 45) return 'PAPER_HANDS';
  
  // Smart money (high win rate, good metrics)
  if (smartMoneyScore > 70 && winRate > 60 && walletAgeDays > 90) return 'SMART_MONEY';
  
  // Diamond hands (low jeet, holds long term)
  if (diamondHandsScore > 75 && walletAgeDays > 180) return 'DIAMOND_HANDS';
  
  // Bot with lower confidence
  if (botProbability > 60) return 'BOT';
  
  // Accumulator (consistently buying, many txs)
  if (totalTxCount > 100 && jeetScore < 50) return 'ACCUMULATOR';
  
  // Distributor (selling patterns)
  if (jeetScore > 55 && tokenCount < 3) return 'DISTRIBUTOR';
  
  // Default based on predominant characteristic
  if (diamondHandsScore > jeetScore) return 'DIAMOND_HANDS';
  if (jeetScore > 60) return 'PAPER_HANDS';
  
  return 'ACCUMULATOR';
};

// Estimate PnL from transaction patterns
const estimatePnL = (txHistory, nativeBalance, nativeValue, tokens) => {
  // Without historical price data, we can only make rough estimates
  // based on current holdings vs transaction patterns
  
  let estimatedPnL = 0;
  let pnlConfidence = 'low';
  
  if (txHistory?.transactions?.length > 0) {
    // Very rough estimate: if wallet has more value than average tx value, likely profitable
    const txValues = txHistory.transactions
      .filter(tx => tx.value > 0)
      .map(tx => tx.value);
    
    if (txValues.length > 0) {
      const avgTxValue = txValues.reduce((a, b) => a + b, 0) / txValues.length;
      const totalTxValue = txValues.reduce((a, b) => a + b, 0);
      
      // Compare current holdings to historical activity
      const tokenValue = tokens?.reduce((sum, t) => sum + (t.value || 0), 0) || 0;
      const currentValue = nativeValue + tokenValue;
      
      if (currentValue > totalTxValue * 0.8) {
        // Current value is close to or greater than total transacted - likely profitable
        estimatedPnL = currentValue * 0.1; // Conservative 10% estimate
        pnlConfidence = 'medium';
      } else if (currentValue > avgTxValue * 2) {
        estimatedPnL = currentValue * 0.05;
        pnlConfidence = 'low';
      } else {
        estimatedPnL = -currentValue * 0.1; // Likely some losses
        pnlConfidence = 'low';
      }
    }
  }
  
  return {
    estimatedPnL: Math.round(estimatedPnL * 100) / 100,
    pnlConfidence,
    note: 'PnL is estimated based on current holdings and activity patterns. Historical price data not available.'
  };
};

// ==================== API ROUTES ====================

// GET /api/wallet-analyzer/supported/chains - Get supported chains (MUST be before /:address)
router.get('/supported/chains', async (req, res) => {
  const chains = Object.entries(CHAIN_CONFIG).map(([key, config]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    symbol: config.nativeSymbol
  }));

  res.json({ chains });
});

// GET /api/wallet-analyzer/:address - Main analysis endpoint
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { chain = 'ethereum' } = req.query;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        rateLimited: true,
        message: 'Too many requests. Please try again in a few minutes.'
      });
    }

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate address format
    const isEVM = chain !== 'solana';
    if (isEVM && !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return res.status(400).json({ error: 'Invalid EVM wallet address format' });
    }
    if (!isEVM && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Solana wallet address format' });
    }

    const config = CHAIN_CONFIG[chain];
    if (!config) {
      return res.status(400).json({ error: `Unsupported chain: ${chain}` });
    }

    // Fetch all data in parallel
    let nativeBalance, txHistory, tokens, nativePrice;
    
    try {
      if (chain === 'solana') {
        [nativeBalance, txHistory, tokens, nativePrice] = await Promise.all([
          getNativeBalance(address, chain),
          getSolanaTransactionHistory(address),
          getSolanaTokens(address),
          getTokenPrices([config.coingeckoId]).then(p => p[config.coingeckoId] || 0)
        ]);
      } else {
        [nativeBalance, txHistory, tokens, nativePrice] = await Promise.all([
          getNativeBalance(address, chain),
          getEVMTransactionHistory(address, chain),
          getEVMTokenBalances(address, chain),
          getTokenPrices([config.coingeckoId]).then(p => p[config.coingeckoId] || 0)
        ]);
      }
    } catch (fetchError) {
      console.error('Blockchain fetch error:', fetchError.message);
      return res.status(503).json({
        error: 'Blockchain data temporarily unavailable',
        message: 'Unable to fetch data from blockchain. Please try again in a few minutes.',
        rateLimited: true
      });
    }

    const nativeValue = nativeBalance * nativePrice;
    
    // Calculate real wallet age from first transaction
    let walletAgeDays = 0;
    let firstSeen = null;
    
    if (txHistory?.firstTxTime) {
      firstSeen = new Date(txHistory.firstTxTime).toISOString();
      walletAgeDays = Math.floor((Date.now() - txHistory.firstTxTime) / (1000 * 60 * 60 * 24));
    } else {
      // If no tx history, treat as new wallet
      firstSeen = new Date().toISOString();
      walletAgeDays = 0;
    }
    
    // Analyze behavior
    const behavior = analyzeWalletBehavior({
      txHistory,
      nativeBalance,
      tokens,
      walletAgeDays,
      chain
    });
    
    // Get total transaction count
    const totalTxCount = txHistory?.totalTxCount || 0;
    
    // Determine wallet type
    const primaryType = determineWalletType(
      behavior, 
      nativeBalance, 
      nativeValue, 
      tokens, 
      walletAgeDays, 
      totalTxCount
    );
    
    const isWhale = nativeValue > 100000 || nativeBalance > 50;
    
    // Calculate total value including tokens (rough estimate)
    let tokenTotalValue = 0;
    // For tokens, we'd need individual price lookups which would hit rate limits
    // So we just count them for now
    
    const totalValue = nativeValue + tokenTotalValue;
    
    // Estimate PnL
    const pnlData = estimatePnL(txHistory, nativeBalance, nativeValue, tokens);
    
    // Build metrics
    const metrics = {
      jeetScore: behavior.jeetScore,
      botProbability: behavior.botProbability,
      winRate: behavior.winRate,
      smartMoneyScore: behavior.smartMoneyScore,
      diamondHandsScore: behavior.diamondHandsScore,
      totalPnL: pnlData.estimatedPnL,
      pnlConfidence: pnlData.pnlConfidence,
      totalTrades: totalTxCount,
      avgHoldTime: Math.max(1, Math.floor(walletAgeDays * (behavior.diamondHandsScore / 100))),
      uniqueTokensTraded: tokens?.length || 0,
      activeDays: Math.floor(walletAgeDays * 0.3), // Rough estimate
      walletAge: walletAgeDays,
      txFrequency: txHistory?.txFrequency || (walletAgeDays > 0 ? totalTxCount / walletAgeDays : 0)
    };

    // Build risk and positive factors
    const riskFactors = [];
    const positiveFactors = [];

    if (behavior.botProbability > 70) riskFactors.push('High bot probability detected');
    else if (behavior.botProbability > 50) riskFactors.push('Possible automated trading patterns');
    
    if (behavior.jeetScore > 80) riskFactors.push('Very high selling frequency - likely jeet');
    else if (behavior.jeetScore > 65) riskFactors.push('Frequent trader - may sell quickly');
    
    if (totalTxCount < 5) riskFactors.push('Very limited transaction history');
    else if (totalTxCount < 20) riskFactors.push('Limited transaction history');
    
    if (walletAgeDays < 7) riskFactors.push('Very new wallet (< 1 week)');
    else if (walletAgeDays < 30) riskFactors.push('New wallet (< 1 month)');
    
    if (txHistory?.errorCount > 5) riskFactors.push('Multiple failed transactions detected');
    
    if (behavior.winRate > 65) positiveFactors.push('High success rate on transactions');
    else if (behavior.winRate > 55) positiveFactors.push('Above average transaction success');
    
    if (behavior.smartMoneyScore > 70) positiveFactors.push('Smart money characteristics detected');
    
    if (behavior.diamondHandsScore > 75) positiveFactors.push('Strong holder - diamond hands pattern');
    else if (behavior.jeetScore < 30) positiveFactors.push('Patient holder - low selling frequency');
    
    if (nativeBalance > 10) positiveFactors.push(`Significant ${config.nativeSymbol} holdings`);
    
    if (tokens?.length > 5) positiveFactors.push('Well-diversified token portfolio');
    else if (tokens?.length > 2) positiveFactors.push('Diversified holdings');
    
    if (walletAgeDays > 365) positiveFactors.push(`Established wallet (${Math.floor(walletAgeDays/365)}+ years)`);
    else if (walletAgeDays > 180) positiveFactors.push('Mature wallet (6+ months)');
    else if (walletAgeDays > 90) positiveFactors.push('Established wallet (3+ months)');
    
    if (totalTxCount > 500) positiveFactors.push(`Very active - ${totalTxCount}+ transactions`);
    else if (totalTxCount > 100) positiveFactors.push(`Active trader - ${totalTxCount}+ transactions`);

    // Build holdings array
    const holdings = [
      {
        symbol: config.nativeSymbol,
        name: config.nativeSymbol,
        balance: nativeBalance,
        value: nativeValue,
        change24h: 0,
        isNative: true
      },
      ...(tokens || []).map(t => ({
        symbol: t.symbol,
        name: t.name || t.symbol,
        balance: t.balance || 0,
        value: t.value || 0,
        change24h: 0,
        contractAddress: t.contractAddress || t.mint
      }))
    ].filter(h => h.balance > 0);

    // Format recent transactions
    const recentTransactions = (txHistory?.transactions || []).slice(0, 15).map(tx => ({
      type: tx.type || 'transaction',
      token: config.nativeSymbol,
      amount: tx.value?.toString() || '0',
      value: tx.value || 0,
      timestamp: tx.timestamp || Date.now(),
      hash: tx.hash,
      isError: tx.isError,
      profitable: !tx.isError
    }));

    res.json({
      address,
      chain,
      firstSeen,
      walletAge: walletAgeDays,
      primaryType,
      isWhale,
      totalValue,
      nativeBalance,
      nativeValue,
      nativeSymbol: config.nativeSymbol,
      nativePrice,
      holdings,
      metrics,
      recentTransactions,
      riskFactors,
      positiveFactors,
      dataSource: 'blockchain',
      disclaimer: pnlData.note,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Wallet analysis error:', error);
    
    // Check if it's a rate limit from external APIs
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'External API rate limit',
        rateLimited: true,
        message: 'Blockchain API rate limit reached. Please try again in a few minutes.'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to analyze wallet',
      message: error.message 
    });
  }
});

module.exports = router;
