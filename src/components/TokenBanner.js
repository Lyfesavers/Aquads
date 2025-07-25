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
      // Fetch boosted tokens from DexScreener
      const response = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const boostedData = await response.json();
      logger.info('DexScreener Boosted Response:', boostedData);

      // Format the data for display
      const formattedTokens = boostedData.slice(0, 10).map((token, index) => {
        // Extract token symbol from description or use address
        const symbol = token.description ? 
          token.description.split(' ')[0].toUpperCase() : 
          token.tokenAddress.slice(0, 6).toUpperCase();
        
        // Extract token name from description
        const name = token.description || `Token ${token.tokenAddress.slice(0, 8)}`;
        
        return {
          id: token.tokenAddress,
          symbol: symbol,
          name: name,
          price: 0, // DexScreener boost API doesn't include price data
          priceChange24h: 0,
          marketCap: token.totalAmount || 0, // Use total boost amount as indicator
          logo: token.icon || '', 
          url: token.url || `https://dexscreener.com/${token.chainId}/${token.tokenAddress}`,
          rank: index + 1,
          chainId: token.chainId,
          tokenAddress: token.tokenAddress,
          boostAmount: token.totalAmount || 0
        };
      });

      logger.info('Formatted Boosted Tokens:', formattedTokens);
      setTokens(formattedTokens);
    } catch (error) {
      logger.error('Error fetching boosted tokens:', error);
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
          <span className="text-blue-400">Loading boosted tokens...</span>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="h-12 bg-gray-800 border-y border-blue-500/20">
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-400">No boosted tokens available</span>
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
              <span className="text-blue-400 font-semibold">🚀 BOOSTED</span>
              <span className="text-gray-300 text-sm">
                {token.chainId && token.chainId.charAt(0).toUpperCase() + token.chainId.slice(1)}
              </span>
              <span className="text-green-400 text-sm">
                Boost: {formatVolume(token.boostAmount)}
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