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
      // Fetch top 50 trending pools from GeckoTerminal (3 pages of 20 each)
      const allTrendingPools = [];
      
      for (let page = 1; page <= 3; page++) {
        try {
          const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/trending_pools?page=${page}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              allTrendingPools.push(...data.data);
            }
          }
          
          // Small delay to respect rate limits
          if (page < 3) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          logger.error(`Error fetching page ${page}:`, error);
        }
      }

      logger.info('GeckoTerminal Trending Pools:', allTrendingPools);

      // Take top 50 and format for display
      const topTrending = allTrendingPools.slice(0, 50);

      const formattedTokens = topTrending.map((pool, index) => {
        const attrs = pool.attributes;
        const baseToken = attrs.base_token || {};
        
        // Extract chain from pool ID (format: chain_address)
        const chainId = pool.id.split('_')[0];
        
        return {
          id: baseToken.address || pool.id,
          symbol: baseToken.symbol || 'UNKNOWN',
          name: baseToken.name || attrs.name || 'Unknown Token',
          price: parseFloat(attrs.base_token_price_usd) || 0,
          priceChange24h: parseFloat(attrs.price_change_percentage?.h24) || 0,
          marketCap: parseFloat(attrs.market_cap_usd) || parseFloat(attrs.fdv_usd) || 0,
          logo: baseToken.image_url || `https://ui-avatars.com/api/?name=${baseToken.symbol}&background=0891b2&color=ffffff&size=32`,
          url: `https://www.geckoterminal.com/pools/${pool.id}`,
          rank: index + 1,
          chainId: chainId,
          volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
          poolAddress: attrs.address
        };
      });

      logger.info('Formatted GeckoTerminal Trending Tokens:', formattedTokens);
      setTokens(formattedTokens);
    } catch (error) {
      logger.error('Error fetching GeckoTerminal trending tokens:', error);
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
          <span className="text-blue-400">Loading trending DEX tokens...</span>
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
                  e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=0891b2&color=ffffff&size=32`;
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
              <span className="text-gray-400 text-sm">
                MCap: {formatVolume(token.marketCap)}
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