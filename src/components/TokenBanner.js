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
      // Fetch trending pools from GeckoTerminal API
      const response = await fetch('https://api.geckoterminal.com/api/v2/networks/trending_pools?page=1');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logger.info('GeckoTerminal API Response:', data);

      if (!data.data || data.data.length === 0) {
        logger.warn('No trending pools data received');
        setTokens([]);
        return;
      }

      // Format the trending pools data
      const formattedTokens = data.data.slice(0, 20).map((pool, index) => {
        const attrs = pool.attributes || {};
        
        // Extract base token information
        const baseToken = attrs.base_token || {};
        const quoteToken = attrs.quote_token || {};
        
        // Use base token info if available, otherwise parse from pool name
        const tokenSymbol = baseToken.symbol || attrs.name?.split(' / ')[0] || attrs.name?.split('/')[0] || 'TOKEN';
        const tokenName = baseToken.name || attrs.name || 'Unknown Token';
        
        // Extract network from pool relationships or ID
        const networkId = pool.relationships?.network?.data?.id || 'unknown';
        
        // Get token logo with multiple fallbacks
        let tokenLogo = null;
        
        // Try base token image first
        if (baseToken.image_url) {
          tokenLogo = baseToken.image_url;
        }
        // Try CoinGecko image pattern
        else if (tokenSymbol && tokenSymbol !== 'TOKEN') {
          tokenLogo = `https://assets.coingecko.com/coins/images/${tokenSymbol.toLowerCase()}.png`;
        }
        // Fallback to generated avatar
        if (!tokenLogo) {
          tokenLogo = `https://ui-avatars.com/api/?name=${tokenSymbol}&background=0891b2&color=ffffff&size=32`;
        }
        
        return {
          id: pool.id,
          symbol: tokenSymbol.trim(),
          name: tokenName,
          price: parseFloat(attrs.base_token_price_usd) || 0,
          priceChange24h: parseFloat(attrs.price_change_percentage?.h24) || 0,
          marketCap: parseFloat(attrs.fdv_usd) || 0,
          logo: tokenLogo,
          url: `https://www.geckoterminal.com/${networkId}/pools/${attrs.address}`,
          rank: index + 1,
          chainId: networkId,
          volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
          poolAddress: attrs.address
        };
      });

      logger.info('Formatted GeckoTerminal Trending Tokens:', formattedTokens);
      setTokens(formattedTokens);
    } catch (error) {
      logger.error('Error fetching GeckoTerminal trending tokens:', error);
      // Set empty array on error to prevent showing "unknown" data
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
                  // Try CoinMarketCap image first if not already tried
                  if (!e.target.src.includes('coinmarketcap.com')) {
                    e.target.src = `https://s2.coinmarketcap.com/static/img/coins/32x32/${token.symbol.toLowerCase()}.png`;
                  } 
                  // Try alternative CoinGecko pattern
                  else if (!e.target.src.includes('coin_image')) {
                    e.target.src = `https://coin-images.coingecko.com/coins/images/1/small/${token.symbol.toLowerCase()}.png`;
                  }
                  // Final fallback to placeholder
                  else {
                    e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=0891b2&color=ffffff&size=32`;
                  }
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