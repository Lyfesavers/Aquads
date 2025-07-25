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
      let allTokens = [];
      
      // Fetch multiple pages from GeckoTerminal to get 50+ trending tokens
      for (let page = 1; page <= 3; page++) {
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/trending_pools?page=${page}`);
        
        if (!response.ok) {
          logger.warn(`Failed to fetch page ${page}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        logger.info(`GeckoTerminal Page ${page} Response:`, data);

        if (!data.data || data.data.length === 0) {
          logger.warn(`No data on page ${page}`);
          break;
        }

        // Process tokens from this page
        const pageTokens = data.data.map((pool, index) => {
          const attrs = pool.attributes || {};
          const baseToken = attrs.base_token || {};
          
          // Extract token symbol and name
          const tokenSymbol = baseToken.symbol || attrs.name?.split(' / ')[0] || 'TOKEN';
          const tokenName = baseToken.name || attrs.name || 'Unknown Token';
          const networkId = pool.relationships?.network?.data?.id || 'unknown';
          
          // Use the image from base_token, with multiple fallbacks
          let tokenLogo = baseToken.image_url;
          if (!tokenLogo && attrs.image_url) {
            tokenLogo = attrs.image_url;
          }
          if (!tokenLogo) {
            // Fallback to constructing logo URL
            tokenLogo = `https://coin-images.coingecko.com/coins/images/1/small/${tokenSymbol.toLowerCase()}.png`;
          }

          return {
            id: pool.id,
            symbol: tokenSymbol.trim().toUpperCase(),
            name: tokenName,
            price: parseFloat(attrs.base_token_price_usd) || 0,
            priceChange24h: parseFloat(attrs.price_change_percentage?.h24) || 0,
            marketCap: parseFloat(attrs.fdv_usd) || parseFloat(attrs.market_cap_usd) || 0,
            logo: tokenLogo,
            url: `https://www.geckoterminal.com/${networkId}/pools/${attrs.address}`,
            rank: (page - 1) * 20 + index + 1,
            chainId: networkId,
            volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
            poolAddress: attrs.address
          };
        });

        // Filter valid tokens and add to our collection
        const validTokens = pageTokens.filter(token => 
          token.symbol && 
          token.symbol !== 'TOKEN' && 
          token.symbol.length > 0 && 
          token.symbol.length <= 15 && // Allow longer symbols for some tokens
          /^[A-Za-z0-9$_-]+$/.test(token.symbol) && // Allow common token symbol characters
          token.price > 0 // Must have a valid price
        );

        allTokens = allTokens.concat(validTokens);
        
        // Add delay between pages to respect rate limits
        if (page < 3) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Take top 50 tokens and ensure we have them
      const finalTokens = allTokens.slice(0, 50);
      logger.info(`Fetched ${finalTokens.length} trending tokens from GeckoTerminal`);
      setTokens(finalTokens);

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
          <span className="text-blue-400">Loading trending DEX tokens from all chains...</span>
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
                  const currentSrc = e.target.src;
                  e.target.onerror = null;
                  
                  // Try different image sources in sequence
                  if (currentSrc.includes('geckoterminal') || currentSrc.includes('coin-images.coingecko')) {
                    // Try CoinMarketCap
                    e.target.src = `https://s2.coinmarketcap.com/static/img/coins/64x64/${token.symbol.toLowerCase()}.png`;
                  } else if (currentSrc.includes('coinmarketcap')) {
                    // Try TrustWallet assets
                    e.target.src = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x${token.symbol}/logo.png`;
                  } else if (currentSrc.includes('trustwallet') || currentSrc.includes('github')) {
                    // Try alternative CoinGecko path
                    e.target.src = `https://assets.coingecko.com/coins/images/1/small/${token.symbol.toLowerCase()}.png`;
                  } else {
                    // Final fallback to placeholder
                    e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=1a202c&color=60a5fa&size=32&bold=true`;
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