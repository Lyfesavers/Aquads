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
      // Fetch trending tokens from CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/search/trending');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const trendingData = await response.json();
      logger.info('Trending Response:', trendingData);

      // Get the IDs of trending coins
      const trendingIds = trendingData.coins.map(coin => coin.item.id).join(',');

      // Fetch detailed price data for trending coins
      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${trendingIds}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
      );

      const priceData = await priceResponse.json();

      // Format the data combining trending info with price data
      const formattedTokens = trendingData.coins.map(coin => {
        const priceInfo = priceData[coin.item.id] || {};
        return {
          id: coin.item.id,
          symbol: coin.item.symbol.toUpperCase(),
          name: coin.item.name,
          price: priceInfo.usd || 0,
          priceChange24h: priceInfo.usd_24h_change || 0,
          marketCap: priceInfo.usd_market_cap || 0,
          logo: coin.item.small, // Use the logo URL directly from trending data
          url: `https://www.coingecko.com/en/coins/${coin.item.id}`,
          rank: coin.item.market_cap_rank
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
          <span className="text-blue-400">Loading tokens...</span>
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

      <div className="flex items-center h-full overflow-hidden relative z-1">
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