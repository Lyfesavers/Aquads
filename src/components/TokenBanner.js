import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
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

// Cache to prevent unnecessary API calls
const API_CACHE = {
  data: null,
  timestamp: 0,
  isValid: function() {
    return this.data && Date.now() - this.timestamp < 60000; // Valid for 1 minute
  },
  set: function(data) {
    this.data = data;
    this.timestamp = Date.now();
  }
};

// Component for individual token to optimize rendering
const TokenItem = memo(({ token, index }) => {
  // Pre-calculate formatted values to avoid recalculating on each render
  const formattedPrice = useMemo(() => formatPrice(token.price), [token.price]);
  const formattedPercentage = useMemo(() => formatPercentage(token.priceChange24h), [token.priceChange24h]);
  const formattedMarketCap = useMemo(() => formatVolume(token.marketCap), [token.marketCap]);

  return (
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
        loading="lazy"
        width="27"
        height="27"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=random&size=32`;
        }}
      />
      <span className="font-medium text-white">{token.symbol}</span>
      <span className="text-gray-300">{formattedPrice}</span>
      <span className={`${
        token.priceChange24h >= 0 
          ? 'text-green-400' 
          : 'text-red-400'
      }`}>
        {formattedPercentage}
      </span>
      <span className="text-gray-400 text-sm">
        MCap: {formattedMarketCap}
      </span>
    </a>
  );
});

const TokenBanner = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Memoize fetchTokens to prevent recreation
  const fetchTokens = useCallback(async () => {
    try {
      // Use cached data if available
      if (API_CACHE.isValid()) {
        setTokens(API_CACHE.data);
        setLoading(false);
        return;
      }
      
      // Fetch trending tokens from CoinGecko
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const trendingData = await response.json();
      
      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Trending Response:', trendingData);
      }

      // Get the IDs of trending coins
      const trendingIds = trendingData.coins.map(coin => coin.item.id).join(',');

      // Fetch detailed price data for trending coins
      const priceController = new AbortController();
      const priceTimeoutId = setTimeout(() => priceController.abort(), 5000);
      
      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${trendingIds}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
        { signal: priceController.signal }
      );
      
      clearTimeout(priceTimeoutId);

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
          logo: coin.item.small,
          url: `https://www.coingecko.com/en/coins/${coin.item.id}`,
          rank: coin.item.market_cap_rank
        };
      });

      // Save to cache
      API_CACHE.set(formattedTokens);
      
      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Formatted Trending Tokens:', formattedTokens);
      }
      
      setTokens(formattedTokens);
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        logger.error('Error fetching trending tokens:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
    // Reduce polling frequency to reduce JS execution
    const interval = setInterval(fetchTokens, 120000); // Fetch every 2 minutes
    return () => clearInterval(interval);
  }, [fetchTokens]);

  // Memoize the duplicated token list to prevent recreation on each render
  const duplicatedTokens = useMemo(() => tokens.concat(tokens), [tokens]);

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

      <div className="flex items-center h-full overflow-hidden relative z-10">
        <div className="flex animate-scroll whitespace-nowrap">
          {duplicatedTokens.map((token, index) => (
            <TokenItem key={`${token.symbol}-${index}`} token={token} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Export as memoized component
export default memo(TokenBanner); 