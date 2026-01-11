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

// Solana public RPC
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

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
const MAX_REQUESTS_PER_WINDOW = 10;

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

// Get native balance via RPC
const getNativeBalance = async (address, chain) => {
  if (chain === 'solana') {
    const response = await axios.post(SOLANA_RPC, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address, { commitment: 'confirmed' }]
    }, { timeout: 10000 });
    
    return (response.data.result?.value || 0) / 1e9;
  }
  
  const rpc = PUBLIC_RPCS[chain];
  if (!rpc) throw new Error(`Unsupported chain: ${chain}`);
  
  const response = await axios.post(rpc, {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getBalance',
    params: [address, 'latest']
  }, { timeout: 10000 });
  
  const balanceHex = response.data.result;
  return parseInt(balanceHex, 16) / 1e18;
};

// Get transaction count via RPC
const getTransactionCount = async (address, chain) => {
  if (chain === 'solana') {
    const response = await axios.post(SOLANA_RPC, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [address, { limit: 100 }]
    }, { timeout: 10000 });
    
    return response.data.result?.length || 0;
  }
  
  const rpc = PUBLIC_RPCS[chain];
  if (!rpc) return 0;
  
  const response = await axios.post(rpc, {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getTransactionCount',
    params: [address, 'latest']
  }, { timeout: 10000 });
  
  return parseInt(response.data.result, 16);
};

// Get token balances from free explorer APIs (without API key - limited)
const getTokenBalances = async (address, chain) => {
  const config = CHAIN_CONFIG[chain];
  if (!config?.explorerApi) return [];
  
  try {
    // Use the free tier (very limited without API key)
    const response = await axios.get(`${config.explorerApi}`, {
      params: {
        module: 'account',
        action: 'tokentx',
        address: address,
        startblock: 0,
        endblock: 99999999,
        sort: 'desc',
        page: 1,
        offset: 50
      },
      timeout: 10000
    });
    
    if (response.data.status === '1' && response.data.result) {
      // Aggregate unique tokens
      const tokenMap = new Map();
      
      for (const tx of response.data.result) {
        const symbol = tx.tokenSymbol;
        if (!tokenMap.has(symbol)) {
          tokenMap.set(symbol, {
            symbol: tx.tokenSymbol,
            name: tx.tokenName,
            contractAddress: tx.contractAddress,
            lastActivity: parseInt(tx.timeStamp) * 1000
          });
        }
      }
      
      return Array.from(tokenMap.values()).slice(0, 10);
    }
  } catch (error) {
    // Rate limited or error - return empty
    console.log('Token fetch limited:', error.message);
  }
  
  return [];
};

// Get Solana token accounts
const getSolanaTokens = async (address) => {
  try {
    const response = await axios.post(SOLANA_RPC, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        address,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' }
      ]
    }, { timeout: 10000 });
    
    const accounts = response.data.result?.value || [];
    return accounts
      .filter(acc => acc.account.data.parsed.info.tokenAmount.uiAmount > 0)
      .map(acc => ({
        symbol: acc.account.data.parsed.info.mint.slice(0, 6) + '...',
        mint: acc.account.data.parsed.info.mint,
        balance: acc.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: acc.account.data.parsed.info.tokenAmount.decimals
      }))
      .slice(0, 10);
  } catch (error) {
    console.log('Solana tokens error:', error.message);
    return [];
  }
};

// Get recent transactions from Solana
const getSolanaTransactions = async (address) => {
  try {
    const response = await axios.post(SOLANA_RPC, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [address, { limit: 20 }]
    }, { timeout: 10000 });
    
    return (response.data.result || []).map(sig => ({
      hash: sig.signature,
      timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
      type: 'transaction',
      error: sig.err
    }));
  } catch (error) {
    return [];
  }
};

// Get token price from CoinGecko (free, rate limited)
const getTokenPrice = async (coingeckoId) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
      { timeout: 5000 }
    );
    return response.data[coingeckoId]?.usd || 0;
  } catch (error) {
    return 0;
  }
};

// Analyze wallet behavior based on transaction count and balance
const analyzeWalletBehavior = (txCount, balance, walletAge) => {
  let jeetScore = 50; // Default neutral
  let botProbability = 5;
  let winRate = 50;
  
  // High transaction count relative to age suggests active trading
  const txPerDay = walletAge > 0 ? txCount / walletAge : 0;
  
  if (txPerDay > 10) {
    botProbability = Math.min(90, 30 + txPerDay * 2);
    jeetScore = Math.min(80, 40 + txPerDay);
  } else if (txPerDay > 5) {
    botProbability = 20;
    jeetScore = 60;
  } else if (txPerDay < 0.5 && walletAge > 30) {
    jeetScore = 20; // Diamond hands - low activity
    winRate = 55;
  }
  
  // Large balance holders tend to be more patient
  if (balance > 10) {
    jeetScore = Math.max(10, jeetScore - 20);
    winRate = Math.min(75, winRate + 10);
  }
  
  return { jeetScore, botProbability, winRate };
};

// Determine wallet type
const determineWalletType = (metrics, balance, txCount) => {
  const { jeetScore, botProbability, winRate, walletAge } = metrics;
  
  if (walletAge < 7) return 'NEW_WALLET';
  if (botProbability > 70) return 'BOT';
  if (jeetScore > 75) return 'JEET';
  if (jeetScore > 50 && txCount > 50) return 'PAPER_HANDS';
  if (balance > 100) return 'WHALE'; // 100+ native tokens
  if (jeetScore < 25 && winRate > 55) return 'SMART_MONEY';
  if (jeetScore < 30) return 'DIAMOND_HANDS';
  if (txCount > 100) return 'ACCUMULATOR';
  
  return 'ACCUMULATOR';
};

// ==================== API ROUTES ====================

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

    // Fetch data in parallel
    let nativeBalance, txCount, tokens, transactions, nativePrice;
    
    try {
      if (chain === 'solana') {
        [nativeBalance, tokens, transactions, nativePrice] = await Promise.all([
          getNativeBalance(address, chain),
          getSolanaTokens(address),
          getSolanaTransactions(address),
          getTokenPrice(config.coingeckoId)
        ]);
        txCount = transactions.length;
      } else {
        [nativeBalance, txCount, tokens, nativePrice] = await Promise.all([
          getNativeBalance(address, chain),
          getTransactionCount(address, chain),
          getTokenBalances(address, chain),
          getTokenPrice(config.coingeckoId)
        ]);
        transactions = [];
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
    
    // Estimate wallet age based on transaction count (rough estimate without full history)
    const estimatedWalletAge = Math.max(7, Math.floor(txCount / 2)); // Rough estimate
    
    // Analyze behavior
    const behavior = analyzeWalletBehavior(txCount, nativeBalance, estimatedWalletAge);
    
    const metrics = {
      jeetScore: behavior.jeetScore,
      botProbability: behavior.botProbability,
      winRate: behavior.winRate,
      totalPnL: 0, // Cannot calculate without full tx history
      totalTrades: txCount,
      avgHoldTime: Math.max(1, Math.floor(estimatedWalletAge * (100 - behavior.jeetScore) / 100)),
      uniqueTokensTraded: tokens.length,
      activeDays: Math.floor(estimatedWalletAge * 0.4),
      walletAge: estimatedWalletAge
    };

    const primaryType = determineWalletType(metrics, nativeBalance, txCount);
    const isWhale = nativeValue > 100000 || nativeBalance > 100;

    // Build factors
    const riskFactors = [];
    const positiveFactors = [];

    if (behavior.botProbability > 50) riskFactors.push('High transaction frequency detected');
    if (behavior.jeetScore > 70) riskFactors.push('Pattern suggests frequent trading');
    if (txCount < 5) riskFactors.push('Very limited transaction history');
    if (estimatedWalletAge < 14) riskFactors.push('Relatively new wallet');

    if (behavior.winRate > 55) positiveFactors.push('Activity suggests experienced trader');
    if (behavior.jeetScore < 30) positiveFactors.push('Low trading frequency - patient holder');
    if (nativeBalance > 10) positiveFactors.push('Significant native token holdings');
    if (tokens.length > 3) positiveFactors.push('Diversified token portfolio');
    if (txCount > 50) positiveFactors.push('Established transaction history');

    // Build holdings array
    const holdings = [
      {
        symbol: config.nativeSymbol,
        name: config.nativeSymbol,
        balance: nativeBalance,
        value: nativeValue,
        change24h: 0
      },
      ...tokens.map(t => ({
        symbol: t.symbol,
        name: t.name || t.symbol,
        balance: t.balance || 0,
        value: 0, // Would need individual token price lookups
        change24h: 0
      }))
    ].filter(h => h.balance > 0);

    // Format transactions for response
    const recentTransactions = (transactions || []).slice(0, 10).map(tx => ({
      type: 'transaction',
      token: config.nativeSymbol,
      amount: '0',
      value: 0,
      timestamp: tx.timestamp || Date.now(),
      hash: tx.hash,
      profitable: !tx.error
    }));

    res.json({
      address,
      chain,
      firstSeen: new Date(Date.now() - estimatedWalletAge * 24 * 60 * 60 * 1000).toISOString(),
      walletAge: estimatedWalletAge,
      primaryType,
      isWhale,
      totalValue: nativeValue,
      holdings,
      metrics,
      recentTransactions,
      riskFactors,
      positiveFactors,
      dataSource: 'blockchain',
      disclaimer: 'Analysis based on on-chain data. Some metrics are estimates due to API limitations.',
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

// GET /api/wallet-analyzer/supported/chains - Get supported chains
router.get('/supported/chains', async (req, res) => {
  const chains = Object.entries(CHAIN_CONFIG).map(([key, config]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    symbol: config.nativeSymbol
  }));

  res.json({ chains });
});

module.exports = router;
