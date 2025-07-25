import React, { useState, useEffect, useCallback, memo } from 'react';
import logger from '../utils/logger';

// Move formatting functions outside component to prevent recreation on each render
const formatVolume = (volume) => {
  if (volume >= 1000000000) {
    return `$${(volume / 1000000000).toFixed(2)}B`;
  } else if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(2)}K`;
  }
  return `$${volume.toFixed(2)}`;
};

const formatPrice = (price) => {
  const numPrice = Number(price);
  if (isNaN(numPrice)) return '$0.00';

  try {
    if (numPrice < 0.0001) {
      return `$${numPrice.toExponential(2)}`;
    } else if (numPrice < 1) {
      return `$${numPrice.toFixed(4)}`;
    } else if (numPrice > 1000) {
      return `$${numPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
    return `$${numPrice.toFixed(2)}`;
  } catch (error) {
    return '$0.00';
  }
};

const formatPercentage = (percentage) => {
  const value = parseFloat(percentage);
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const getTokenImageId = (id) => {
  // Map token IDs to their CoinGecko image IDs
  const imageIds = {
    'bitcoin': '1',
    'ethereum': '279',
    'binancecoin': '825',
    'solana': '4128',
    'ripple': '44',
    'cardano': '975',
    'polkadot': '6636',
    'dogecoin': '5',
    'avalanche-2': '12559',
    'matic-network': '4713',
    'chainlink': '877',
    'uniswap': '12504',
    'internet-computer': '14495',
    'near': '10365',
    'cosmos': '1481'
  };
  return imageIds[id] || '1';
};

const TokenBanner = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Memoize fetchTokens to prevent recreation
  const fetchTokens = useCallback(async () => {
    try {
      // Define popular trading pairs across multiple chains to get volume data
      const popularPairs = [
        // Ethereum
        'ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', // USDC/WETH
        'ethereum/0xcbcdf9626bc03e24f779434178a73a0b4bad62ed', // WBTC/WETH
        'ethereum/0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8', // USDC/WETH
        // Solana  
        'solana/8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj', // SOL/USDC
        'solana/CXLBjMMcwkc17GfJtBos6rQCo1ypeH6eDbB82Kby4MRm', // wSOL/USDC
        // BSC
        'bsc/0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae', // WBNB/BUSD
        'bsc/0x58f876857a02d6762e0101bb5c46a8c1ed44dc16', // WBNB/USDT
        // Base
        'base/0x4c36d2919e407f0cc2ee3c993ccf8ac26d9ce64e', // WETH/USDC
        // Polygon
        'polygon/0x45dda9cb7c25131df268515131f647d726f50608', // WETH/USDC
        // Arbitrum
        'arbitrum/0xc31e54c7a869b9fcbecc14363cf510d1c41fa443', // WETH/USDC
      ];

      // Fetch data for multiple pairs
      const pairPromises = popularPairs.map(async (pair) => {
        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${pair}`);
          if (response.ok) {
            const data = await response.json();
            return data.pairs?.[0] || null;
          }
        } catch (error) {
          logger.error(`Error fetching pair ${pair}:`, error);
        }
        return null;
      });

      const pairResults = await Promise.all(pairPromises);
      const validPairs = pairResults.filter(pair => pair !== null);

      logger.info('DexScreener Pairs Response:', validPairs);

      // Sort by 24h volume and take top 10
      const sortedByVolume = validPairs
        .filter(pair => pair.volume?.h24 > 0)
        .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
        .slice(0, 10);

      // Format the data for display
      const formattedTokens = sortedByVolume.map((pair, index) => {
        const baseToken = pair.baseToken;
        const volume24h = pair.volume?.h24 || 0;
        const priceChange = pair.priceChange?.h24 || 0;
        
        return {
          id: baseToken.address,
          symbol: baseToken.symbol,
          name: baseToken.name,
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: priceChange,
          marketCap: pair.fdv || 0,
          logo: pair.info?.imageUrl || '', 
          url: pair.url || `https://dexscreener.com/${pair.chainId}/${pair.pairAddress}`,
          rank: index + 1,
          chainId: pair.chainId,
          tokenAddress: baseToken.address,
          volume24h: volume24h,
          pairAddress: pair.pairAddress
        };
      });

      logger.info('Formatted Volume Trending Tokens:', formattedTokens);
      setTokens(formattedTokens);
    } catch (error) {
      logger.error('Error fetching volume trending tokens:', error);
      // Fallback to empty array if DexScreener fails
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
    // Reduce polling frequency to reduce JS execution
    const interval = setInterval(fetchTokens, 120000); // Fetch every 2 minutes instead of every minute
    return () => clearInterval(interval);
  }, [fetchTokens]);

  if (loading) {
    return (
      <div className="h-12 bg-gray-800 border-y border-blue-500/20">
        <div className="flex items-center justify-center h-full">
          <span className="text-blue-400">Loading trending tokens...</span>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="h-12 bg-gray-800 border-y border-blue-500/20">
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-400">No trending tokens available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-12 bg-gray-800 border-y border-blue-500/20">
      <div className="banner-flames">
        <div className="banner-flame">🔥</div>
        <div className="banner-flame">🔥</div>
        <div className="banner-flame">🔥</div>
        <div className="banner-flame">🔥</div>
        <div className="banner-flame">🔥</div>
      </div>

      <div className="flex items-center h-full overflow-hidden relative z-0">
        <div className="flex animate-scroll whitespace-nowrap">
          {tokens.concat(tokens).map((token, index) => (
            <a
              key={`${token.symbol}-${index}`}
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-6 h-full hover:bg-blue-500/10 transition-colors"
            >
              <img
                src={token.logo}
                alt={token.symbol}
                className="w-[27px] h-[27px] rounded-full"
                loading="lazy" // Add lazy loading for images
                width="27" // Specify dimensions to avoid layout shifts
                height="27"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=random&size=32`;
                }}
              />
              <span className="font-medium text-white">{token.symbol}</span>
              <span className="text-gray-300">{formatPrice(token.price)}</span>
              <span className={`${
                token.priceChange24h >= 0 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {formatPercentage(token.priceChange24h)}
              </span>
              <span className="text-blue-400 text-sm">
                {token.chainId && token.chainId.charAt(0).toUpperCase() + token.chainId.slice(1)}
              </span>
              <span className="text-gray-400 text-sm">
                Vol: {formatVolume(token.volume24h)}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// Export as memoized component
export default memo(TokenBanner); 