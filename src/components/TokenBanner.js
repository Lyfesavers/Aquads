import React, { useState, useEffect, useCallback, memo } from 'react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import logger from '../utils/logger';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
      // Use a simple fallback instead of directly calling CoinGecko
      // This prevents CORS issues in production
      const response = await fetch(`${API_URL}/api/tokens?limit=7`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tokensData = await response.json();
      
      // Get the top tokens by market cap
      const topTokens = tokensData
        .slice(0, 7)
        .map(token => ({
          id: token.id,
          symbol: token.symbol.toUpperCase(),
          name: token.name,
          price: token.currentPrice || 0,
          priceChange24h: token.priceChangePercentage24h || 0,
          marketCap: token.marketCap || 0,
          logo: token.image,
          url: `https://www.coingecko.com/en/coins/${token.id}`,
          rank: token.marketCapRank
        }));

      setTokens(topTokens);
    } catch (error) {
      logger.error('Error fetching tokens:', error);
      // Try to load some default tokens if the API fails
      setTokens([
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 0, priceChange24h: 0 },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 0, priceChange24h: 0 },
        { id: 'solana', symbol: 'SOL', name: 'Solana', price: 0, priceChange24h: 0 }
      ]);
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