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
      // Search for trending tokens across multiple chains using popular search terms
      const searchTerms = ['ETH', 'BTC', 'SOL', 'USDC', 'BNB', 'MATIC', 'AVAX', 'DOT', 'UNI', 'LINK'];
      const chains = ['ethereum', 'solana', 'bsc', 'polygon', 'arbitrum', 'base', 'avalanche'];
      
      const allPairs = [];

      // Search for popular tokens across different chains
      for (const term of searchTerms) {
        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${term}`);
          if (response.ok) {
            const data = await response.json();
            if (data.pairs) {
              // Filter for pairs from supported chains with good volume
                             const validPairs = data.pairs
                 .filter(pair => 
                   chains.includes(pair.chainId) &&
                   pair.volume?.h24 > 5000 && // Minimum $5k 24h volume
                   pair.priceUsd && 
                   parseFloat(pair.priceUsd) > 0 &&
                   pair.baseToken?.symbol &&
                   pair.baseToken?.name
                 )
                .slice(0, 3); // Take top 3 from each search
              
              allPairs.push(...validPairs);
            }
          }
          
          // Small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.error(`Error searching for ${term}:`, error);
        }
      }

      logger.info('DexScreener Search Results:', allPairs);

      // Remove duplicates and sort by 24h volume
      const uniquePairs = allPairs.filter((pair, index, self) => 
        index === self.findIndex(p => p.baseToken.address === pair.baseToken.address && p.chainId === pair.chainId)
      );

      const sortedByTrending = uniquePairs
        .sort((a, b) => {
          // Sort by volume * price change for trending effect
          const trendingScoreA = (a.volume?.h24 || 0) * Math.abs(a.priceChange?.h24 || 0);
          const trendingScoreB = (b.volume?.h24 || 0) * Math.abs(b.priceChange?.h24 || 0);
          return trendingScoreB - trendingScoreA;
        })
        .slice(0, 15); // Take top 15 trending

      // Format the data for display
      const formattedTokens = sortedByTrending.map((pair, index) => {
        return {
          id: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: pair.priceChange?.h24 || 0,
          marketCap: pair.fdv || pair.marketCap || 0,
          logo: pair.info?.imageUrl || `https://ui-avatars.com/api/?name=${pair.baseToken.symbol}&background=random&size=32`,
          url: pair.url || `https://dexscreener.com/${pair.chainId}/${pair.pairAddress}`,
          rank: index + 1,
          chainId: pair.chainId,
          volume24h: pair.volume?.h24 || 0,
          dexId: pair.dexId
        };
      });

      logger.info('Formatted Trending Tokens:', formattedTokens);
      setTokens(formattedTokens);
    } catch (error) {
      logger.error('Error fetching trending tokens:', error);
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