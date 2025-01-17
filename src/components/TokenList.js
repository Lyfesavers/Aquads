import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';
import { Chart } from 'chart.js/auto';
import TokenRating from './TokenRating';
import { FaGlobe, FaTwitter, FaTelegram, FaDiscord, FaGithub, FaReddit } from 'react-icons/fa';
import { Helmet } from 'react-helmet';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DEX_OPTIONS = [
  {
    name: 'PawChain',
    url: 'https://swap.pawchain.net',
    icon: '🐾',
    description: 'Native PawChain DEX'
  },
  {
    name: 'Uniswap',
    url: 'https://app.uniswap.org/#/swap',
    icon: '🦄',
    description: 'Leading Ethereum DEX'
  },
  {
    name: 'PancakeSwap',
    url: 'https://pancakeswap.finance/swap',
    icon: '🥞',
    description: 'Popular BSC DEX'
  },
  {
    name: 'SushiSwap',
    url: 'https://app.sushi.com/swap',
    icon: '🍣',
    description: 'Multi-chain DEX'
  },
  {
    name: 'Jupiter',
    url: 'https://jup.ag/',
    icon: '🪐',
    description: 'Popular DEX'
  },
  {
    name: 'Raydium',
    url: 'https://raydium.io/',
    icon: '🌌',
    description: 'Popular Solana DEX'
  }

];


const INITIAL_TOKEN_COUNT = 16694; // Pre-load more tokens initially

const CACHE_KEY = 'tokenListCache';
const CACHE_TIMESTAMP_KEY = 'tokenListCacheTimestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const LINKS_CACHE_KEY = 'tokenLinksCache';
const LINKS_TIMESTAMP_KEY = 'tokenLinksCacheTimestamp';
const LINKS_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

const CHART_CACHE_KEY = 'tokenChartCache';

const DETAILED_CACHE_KEY = 'tokenDetailsCache';
const DETAILED_TIMESTAMP_KEY = 'tokenDetailsCacheTimestamp';
const DETAILED_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const BATCH_SIZE = 5; // Number of tokens to fetch details for at once

const LINKS_STORAGE_KEY = 'tokenLinksStorage';

const formatCurrency = (value) => {
  if (!value) return 'N/A';
  
  const trillion = 1e12;
  const billion = 1e9;
  const million = 1e6;
  
  if (value >= trillion) {
    return `$${(value / trillion).toFixed(2)}T`;
  } else if (value >= billion) {
    return `$${(value / billion).toFixed(2)}B`;
  } else if (value >= million) {
    return `$${(value / million).toFixed(2)}M`;
  } else {
    return `$${value.toLocaleString()}`;
  }
};

const TokenList = ({ currentUser, showNotification }) => {
  const [tokens, setTokens] = useState(() => {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cachedData && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < CACHE_DURATION) {
        return JSON.parse(cachedData);
      }
    }
    return [];
  });
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'market_cap', direction: 'desc' });
  const [showDexFrame, setShowDexFrame] = useState(false);
  const [selectedDex, setSelectedDex] = useState(null);
  const [error, setError] = useState(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [expandedTokenId, setExpandedTokenId] = useState(null);
  const [timeFilter, setTimeFilter] = useState('24h');
  const [sortFilter, setSortFilter] = useState('market_cap');
  const [orderFilter, setOrderFilter] = useState('desc');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allTokensCache, setAllTokensCache] = useState([]); // Cache for all tokens
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  const updateTokenCache = (newTokens) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(newTokens));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache tokens:', error);
    }
  };

  const fetchInitialTokens = async () => {
    try {
      setIsLoadingTokens(true);
      
      // Use cached data first if available
      const cachedData = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          const parsedData = JSON.parse(cachedData);
          setTokens(parsedData);
          setFilteredTokens(parsedData.slice(0, 20));
          setIsLoadingTokens(false);
        }
      }

      // Fetch fresh data
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?' +
        'vs_currency=usd&' +
        'order=market_cap_desc&' +
        `per_page=${INITIAL_TOKEN_COUNT}&` +
        'page=1&' +
        'sparkline=false'
      );
      
      if (response.ok) {
        const data = await response.json();
        setTokens(data);
        setFilteredTokens(data.slice(0, 20));
        updateTokenCache(data);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      // Use cached data if available instead of showing error
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const tokens = JSON.parse(cachedData);
        setTokens(tokens);
        setFilteredTokens(tokens);
      }
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const loadAllTokensInBackground = async () => {
    if (isBackgroundLoading) return;
    
    setIsBackgroundLoading(true);
    const allTokens = [];

    try {
      // Start with cached data if available
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setAllTokensCache(parsedData);
      }

      // Fetch new data
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?' +
        'vs_currency=usd&' +
        'order=market_cap_desc&' +
        'per_page=250&' +
        'page=1&' +
        'sparkline=false'
      );

      if (response.ok) {
        const data = await response.json();
        setAllTokensCache(data);
        updateTokenCache(data);
      }
    } catch (error) {
      console.error('Background loading error:', error);
    } finally {
      setIsBackgroundLoading(false);
    }
  };

  const handleSearch = async (searchTerm) => {
    setSearchTerm(searchTerm);
    
    if (searchTerm.length < 2) {
      setFilteredTokens(tokens.slice(0, 20));
      return;
    }

    // Search in all tokens cache first
    const localResults = allTokensCache.filter(token => 
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (localResults.length > 0) {
      setFilteredTokens(localResults.slice(0, 50)); // Show top 50 matches
      setError(null);
      return;
    }

    // Fallback to API search if nothing found in cache
    try {
      setIsLoadingTokens(true);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${searchTerm}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const searchResults = await response.json();
      
      if (searchResults.coins.length === 0) {
        setFilteredTokens([]);
        setError('No tokens found matching your search.');
        return;
      }

      const detailedResults = await Promise.all(
        searchResults.coins.slice(0, 20).map(async (coin) => {
          try {
            const detailResponse = await fetch(
              `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`
            );
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              return {
                ...detailData,
                current_price: detailData.market_data?.current_price?.usd || 0,
                market_cap: detailData.market_data?.market_cap?.usd || 0,
                total_volume: detailData.market_data?.total_volume?.usd || 0,
                price_change_percentage_24h: detailData.market_data?.price_change_percentage_24h || 0,
                market_cap_rank: detailData.market_cap_rank || 999999,
                // Add fallback values for other required fields
                high_24h: detailData.market_data?.high_24h?.usd || 0,
                low_24h: detailData.market_data?.low_24h?.usd || 0,
                image: detailData.image?.small || '',
                symbol: detailData.symbol || '',
              };
            }
            return null;
          } catch (error) {
            console.warn(`Error fetching details for ${coin.id}:`, error);
            return null;
          }
        })
      );

      const validResults = detailedResults.filter(result => result !== null);
      if (validResults.length > 0) {
        setFilteredTokens(validResults);
        setError(null);
      } else {
        setError('No detailed token information available.');
      }
    } catch (error) {
      console.error('Error searching tokens:', error);
      // Show local results if API search fails
      const fallbackResults = tokens.filter(token => 
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTokens(fallbackResults);
      if (fallbackResults.length === 0) {
        setError('No tokens found matching your search.');
      }
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleSort = (key, order = orderFilter) => {
    setSortFilter(key);
    setOrderFilter(order);
    
    const sorted = [...filteredTokens].sort((a, b) => {
      if (order === 'asc') {
        return a[key] > b[key] ? 1 : -1;
      }
      return a[key] < b[key] ? 1 : -1;
    });
    setFilteredTokens(sorted);
  };

  const preloadAndStoreTokenLinks = async (tokens) => {
    try {
      const storedLinks = JSON.parse(localStorage.getItem(LINKS_STORAGE_KEY) || '{}');
      
      // Only store links for top 100 tokens
      const topTokens = tokens.slice(0, 100);
      
      // Clean up old links
      Object.keys(storedLinks).forEach(tokenId => {
        if (!topTokens.find(t => t.id === tokenId)) {
          delete storedLinks[tokenId];
        }
      });
      
      // Reduce batch size and increase delay
      const batchSize = 20; // Reduced from 10 to 5
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        
        // Process one token at a time instead of parallel requests
        for (const token of batch) {
          // Skip if we already have fresh links
          if (storedLinks[token.id]?.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000)) {
            continue;
          }

          try {
            const response = await fetch(
              `https://api.coingecko.com/api/v3/coins/${token.id}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true`
            );
            
            if (!response.ok) {
              // Add exponential backoff if we hit rate limits
              if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s on rate limit
                continue;
              }
              continue;
            }
            
            const data = await response.json();
            
            storedLinks[token.id] = {
              timestamp: Date.now(),
              links: {
                homepage: data.links?.homepage?.[0] || null,
                twitter_screen_name: data.links?.twitter_screen_name || null,
                telegram_channel_identifier: data.links?.telegram_channel_identifier || null,
                discord_url: data.links?.chat_url?.find(url => url?.toLowerCase().includes('discord')) || null,
                subreddit_url: data.links?.subreddit_url || null,
                github: data.links?.repos_url?.github?.[0] || null
              }
            };
            
            localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(storedLinks));
            
            // Wait 6 seconds between each request
            await new Promise(resolve => setTimeout(resolve, 6000));
            
          } catch (error) {
            console.error(`Error fetching links for ${token.id}:`, error);
          }
        }
        
        // Wait 10 seconds between batches
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error('Error in preloadAndStoreTokenLinks:', error);
    }
  };

  const handleTokenClick = async (token) => {
    if (expandedTokenId === token.id) {
      setExpandedTokenId(null);
      setChartData(null);
      if (chartInstance) {
        chartInstance.destroy();
        setChartInstance(null);
      }
    } else {
      setChartData(null);
      if (chartInstance) {
        chartInstance.destroy();
        setChartInstance(null);
      }
      
      setExpandedTokenId(token.id);
      
      try {
        // First check stored links
        const storedLinks = JSON.parse(localStorage.getItem(LINKS_STORAGE_KEY) || '{}');
        const cachedLinks = storedLinks[token.id]?.links;
        
        // Set initial state with cached links if available
        setSelectedToken({
          ...token,
          links: cachedLinks || {}
        });

        // Always fetch fresh data
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${token.id}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          const freshLinks = {
            homepage: data.links?.homepage?.[0] || null,
            twitter_screen_name: data.links?.twitter_screen_name || null,
            telegram_channel_identifier: data.links?.telegram_channel_identifier || null,
            discord_url: data.links?.chat_url?.find(url => url?.toLowerCase().includes('discord')) || null,
            subreddit_url: data.links?.subreddit_url || null,
            github: data.links?.repos_url?.github?.[0] || null
          };
          
          // Update stored links
          storedLinks[token.id] = {
            timestamp: Date.now(),
            links: freshLinks
          };
          localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(storedLinks));
          
          // Update UI
          setSelectedToken(prev => ({
            ...prev,
            links: freshLinks
          }));
        }
        
        fetchChartData(token.id, selectedTimeRange);
        
      } catch (error) {
        console.error('Error fetching token details:', error);
        fetchChartData(token.id, selectedTimeRange);
      }
    }
  };

  const handleCloseReviews = () => {
    setShowReviews(false);
    setSelectedToken(null);
  };

  const handleTimeRangeChange = async (range) => {
    setSelectedTimeRange(range);
    if (selectedToken) {
      setIsLoading(true);
      await fetchChartData(selectedToken.id, range);
      setIsLoading(false);
    }
  };

  const fetchChartData = async (tokenId, days) => {
    try {
      setIsLoading(true);
      
      // Only show cached data if it's for the current token
      const cachedChart = localStorage.getItem(`${CHART_CACHE_KEY}_${tokenId}_${days}`);
      if (cachedChart && expandedTokenId === tokenId) {
        setChartData(JSON.parse(cachedChart));
      }

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      // Cache the new data with token ID
      localStorage.setItem(`${CHART_CACHE_KEY}_${tokenId}_${days}`, JSON.stringify(data));
      
      // Only update if this is still the selected token
      if (expandedTokenId === tokenId) {
        setChartData(data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Use cached data if available and matches current token
      const cachedChart = localStorage.getItem(`${CHART_CACHE_KEY}_${tokenId}_${days}`);
      if (cachedChart && expandedTokenId === tokenId) {
        setChartData(JSON.parse(cachedChart));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDexClick = (dex) => {
    setSelectedDex(dex);
    setShowDexFrame(true);
  };

  const fetchTokenDetails = async (id) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=true`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching token details:', error);
      return null;
    }
  };

  const fetchAndCacheTokenLinks = async (tokenId) => {
    try {
      // Check cache first
      const cachedLinks = localStorage.getItem(`${LINKS_CACHE_KEY}_${tokenId}`);
      const timestamp = localStorage.getItem(`${LINKS_TIMESTAMP_KEY}_${tokenId}`);
      
      if (cachedLinks && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < LINKS_CACHE_DURATION) {
          return JSON.parse(cachedLinks);
        }
      }

      // Fetch fresh data if cache is missing or expired
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch token links');
      
      const data = await response.json();
      
      // Updated link structure to match CoinGecko's response
      const links = {
        homepage: data.links?.homepage,
        twitter_screen_name: data.twitter_screen_name,
        telegram_channel_identifier: data.telegram_channel_identifier,
        discord_url: data.chat_url?.find(url => url?.includes('discord')),
        subreddit_url: data.subreddit_url,
        github: data.repos_url?.github?.[0],
        links: {
          homepage: data.links?.homepage,
          twitter_screen_name: data.links?.twitter_screen_name,
          telegram_channel_identifier: data.links?.telegram_channel_identifier,
          chat_url: data.links?.chat_url,
          subreddit_url: data.links?.subreddit_url,
          repos_url: data.links?.repos_url
        }
      };

      // Cache the links
      localStorage.setItem(`${LINKS_CACHE_KEY}_${tokenId}`, JSON.stringify(links));
      localStorage.setItem(`${LINKS_TIMESTAMP_KEY}_${tokenId}`, Date.now().toString());

      return links;
    } catch (error) {
      console.error(`Background link fetch error for ${tokenId}:`, error);
      return null;
    }
  };

  const syncTokenLinksInBackground = async () => {
    try {
      const tokens = [...filteredTokens];
      
      // Process in chunks to avoid rate limits
      const chunkSize = 10;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(token => fetchAndCacheTokenLinks(token.id))
        );
        // Add delay between chunks to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Background link sync error:', error);
    }
  };

  const fetchAndCacheTokenDetails = async (tokenId) => {
    try {
      // Check cache first
      const cachedDetails = localStorage.getItem(`${DETAILED_CACHE_KEY}_${tokenId}`);
      const timestamp = localStorage.getItem(`${DETAILED_TIMESTAMP_KEY}_${tokenId}`);
      
      if (cachedDetails && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < DETAILED_CACHE_DURATION) {
          return JSON.parse(cachedDetails);
        }
      }

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true`
      );
      
      if (!response.ok) throw new Error('Failed to fetch token details');
      
      const data = await response.json();

      // Ensure links are properly structured
      const details = {
        links: {
          homepage: data.links?.homepage?.[0] || null,
          twitter_screen_name: data.links?.twitter_screen_name || null,
          telegram_channel_identifier: data.links?.telegram_channel_identifier || null,
          discord_url: data.links?.chat_url?.find(url => url?.includes('discord')) || null,
          subreddit_url: data.links?.subreddit_url || null,
          github: data.links?.repos_url?.github?.[0] || null
        }
      };

      // Keep existing cache logic
      localStorage.setItem(`${DETAILED_CACHE_KEY}_${tokenId}`, JSON.stringify(details));
      localStorage.setItem(`${DETAILED_TIMESTAMP_KEY}_${tokenId}`, Date.now().toString());

      return details;
    } catch (error) {
      console.error(`Background detail fetch error for ${tokenId}:`, error);
      return null;
    }
  };

  const backgroundFetchDetails = async (tokens) => {
    try {
      // Process tokens in batches
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (token) => {
            // Check if we need to update this token's cache
            const timestamp = localStorage.getItem(`${DETAILED_TIMESTAMP_KEY}_${token.id}`);
            if (!timestamp || (Date.now() - parseInt(timestamp)) > DETAILED_CACHE_DURATION) {
              await fetchAndCacheTokenDetails(token.id);
              // Add delay between requests to respect rate limits
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          })
        );
        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Background fetch error:', error);
    }
  };

  const cleanupStorage = () => {
    try {
      // Keep only essential data and remove old caches
      const essentialKeys = [
        'currentUser',
        CACHE_KEY,
        CACHE_TIMESTAMP_KEY
      ];
      
      // Remove all other items
      Object.keys(localStorage).forEach(key => {
        if (!essentialKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Clean up old token data
      const tokenData = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      const trimmedData = tokenData.slice(0, 100); // Keep only top 100 tokens
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmedData));
      
    } catch (error) {
      console.warn('Storage cleanup failed:', error);
    }
  };

  useEffect(() => {
    cleanupStorage(); // Clean up on component mount
    fetchInitialTokens();
  }, []);

  useEffect(() => {
    if (chartData && chartRef.current && selectedToken) {
      if (chartInstance) {
        chartInstance.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      const newChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.prices.map(price => new Date(price[0]).toLocaleDateString()),
          datasets: [{
            label: `${selectedToken.name} Price (USD)`,
            data: chartData.prices.map(price => price[1]),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Price History' }
          },
          scales: {
            y: { beginAtZero: false }
          }
        }
      });
      setChartInstance(newChartInstance);
    }
  }, [chartData, selectedToken]);

  return (
    <div className="container mx-auto p-4">
      <Helmet>
        <title>AQUADS - Decentralized Crypto Bubble Advertising - All in One Real-time Cryptocurrency Website</title>
        <meta name="description" content="Advertise your crypto project with our Bubble Ads for free. Track live cryptocurrency prices, market cap, volume, and detailed token information. Get real-time data for Bitcoin, Ethereum, and thousands of altcoins." />
        <meta name="keywords" content="cryptocurrency, crypto prices, bitcoin, ethereum, market cap, trading volume, token information" />
        <meta property="og:title" content="AQUADS - Dcentralized bubble advertising and Cryptocurrency Market Data" />
        <meta property="og:description" content="Bubble Ads and Live cryptocurrency prices, charts, and market data for thousands of tokens." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search any token..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={sortFilter}
              onChange={(e) => {
                setSortFilter(e.target.value);
                handleSort(e.target.value);
              }}
              className="bg-gray-700 text-white rounded px-3 py-2"
            >
              <option value="market_cap">Market Cap</option>
              <option value="current_price">Price</option>
              <option value="price_change_percentage_24h">24h Change</option>
              <option value="total_volume">Volume</option>
            </select>

            <button
              onClick={() => {
                const newOrder = orderFilter === 'asc' ? 'desc' : 'asc';
                setOrderFilter(newOrder);
                handleSort(sortFilter, newOrder);
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded"
            >
              {orderFilter === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
        <div className="relative">
          <button
            className="w-full px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-white flex items-center justify-between border-b border-gray-700/30 relative overflow-hidden group animate-pulse-subtle"
            onClick={() => setShowDexFrame(!showDexFrame)}
          >
            <div className="flex items-center relative z-10">
              <span className="mr-2 text-blue-400">🔄</span>
              <span className="font-semibold text-blue-300">Quick DEX Access</span>
              <span className="ml-2 text-xs text-blue-400/70 bg-blue-500/10 px-2 py-1 rounded-full">Click to toggle</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-400">{showDexFrame ? '▼' : '▶'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 animate-shine"></div>
            </div>
          </button>

          {showDexFrame && (
            <div className="bg-gray-900/80 backdrop-blur-lg border border-blue-500/30 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-800/90 p-4 border-b border-blue-500/30">
                <div className="flex flex-wrap gap-4">
                  {DEX_OPTIONS.map((dex) => (
                    <button
                      key={dex.name}
                      onClick={() => handleDexClick(dex)}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded
                        ${selectedDex?.name === dex.name 
                          ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400' 
                          : 'bg-gray-700/50 border border-gray-600 hover:border-blue-500/50 text-gray-300 hover:text-blue-400'
                        }
                        transition-all duration-300 transform hover:scale-105
                        shadow-[0_0_15px_rgba(59,130,246,0.2)]
                      `}
                    >
                      <span className="text-2xl">{dex.icon}</span>
                      <span className="font-cyberpunk">{dex.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedDex && (
                <div className="h-[600px] w-full bg-white">
                  <iframe
                    src={selectedDex.url}
                    className="w-full h-full"
                    title={`${selectedDex.name} DEX`}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {isLoadingTokens ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-white">Loading tokens...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700/30">
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                    onClick={() => handleSort('market_cap_rank')}
                  >
                    # {sortFilter === 'market_cap_rank' && (
                      <span className="ml-1">{orderFilter === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                    onClick={() => handleSort('name')}
                  >
                    Token {sortFilter === 'name' && (
                      <span className="ml-1">{orderFilter === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('current_price')}>
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('price_change_percentage_24h')}>
                    24h %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('market_cap')}>
                    Market Cap
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('total_volume')}>
                    Volume(24h)
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredTokens.map((token, index) => (
                  <>
                    <tr 
                      key={token.id}
                      className="hover:bg-gray-800/40 cursor-pointer"
                      onClick={() => handleTokenClick(token)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img className="h-8 w-8 rounded-full" src={token.image} alt={token.name} />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{token.name}</div>
                            <div className="text-sm text-gray-400">{token.symbol.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ${token.current_price.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        token.price_change_percentage_24h > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {token.price_change_percentage_24h.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="text-gray-300">
                          {formatCurrency(token.market_cap)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="text-gray-300">
                          {formatCurrency(token.total_volume)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-yellow-400">★</span>
                          <TokenRating symbol={token.symbol} />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedToken(token);
                              setShowReviews(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Reviews
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTokenId === token.id && (
                      <tr>
                        <td colSpan="7" className="bg-gray-800/40 p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Price Chart</h3>
                                <div className="flex space-x-2">
                                  {['24h', '7d', '30d', '90d'].map((period) => (
                                    <button
                                      key={period}
                                      onClick={() => handleTimeRangeChange(period)}
                                      className={`px-3 py-1 rounded ${
                                        selectedTimeRange === period 
                                          ? 'bg-blue-500 text-white' 
                                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                      }`}
                                    >
                                      {period}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="w-full h-[400px] mb-6">
                                <canvas ref={chartRef} />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-white">Token Information</h3>
                              <div className="bg-gray-800 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400 text-sm">Market Cap Rank</p>
                                    <p className="text-white font-medium">#{token.market_cap_rank}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Market Cap</p>
                                    <p className="text-white font-medium">{formatCurrency(token.market_cap)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h Volume</p>
                                    <p className="text-white font-medium">{formatCurrency(token.total_volume)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Circulating Supply</p>
                                    <p className="text-white font-medium">{token.circulating_supply?.toLocaleString()} {token.symbol.toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Max Supply</p>
                                    <p className="text-white font-medium">{token.max_supply ? token.max_supply.toLocaleString() : 'Unlimited'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Total Supply</p>
                                    <p className="text-white font-medium">{token.total_supply?.toLocaleString() || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h High</p>
                                    <p className="text-white font-medium">${token.high_24h?.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h Low</p>
                                    <p className="text-white font-medium">${token.low_24h?.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Price Change 24h</p>
                                    <p className={`font-medium ${token.price_change_24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      ${Math.abs(token.price_change_24h).toFixed(6)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">ATH</p>
                                    <p className="text-white font-medium">${token.ath?.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">ATH Change %</p>
                                    <p className={`font-medium ${token.ath_change_percentage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {token.ath_change_percentage?.toFixed(2)}%
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">ATH Date</p>
                                    <p className="text-white font-medium">{new Date(token.ath_date).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Market Cap Dominance</p>
                                    <p className="text-white font-medium">
                                      {((token.market_cap / token.total_volume) * 100).toFixed(2)}%
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Fully Diluted Valuation</p>
                                    <p className="text-white font-medium">
                                      {token.fully_diluted_valuation ? formatCurrency(token.fully_diluted_valuation) : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedTokenId === token.id && (
                      <tr>
                        <td colSpan="7">
                          <div className="p-4 bg-gray-800">
                            <div className="border-t border-gray-700 pt-3">
                              <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-white whitespace-nowrap">Links:</h3>
                                <div className="flex flex-wrap gap-3">
                                  {selectedToken?.links?.homepage && (
                                    <a
                                      href={selectedToken.links.homepage}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaGlobe className="text-lg" />
                                      <span>Website</span>
                                    </a>
                                  )}
                                  
                                  {selectedToken?.links?.twitter_screen_name && (
                                    <a
                                      href={`https://twitter.com/${selectedToken.links.twitter_screen_name}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaTwitter className="text-lg" />
                                      <span>Twitter</span>
                                    </a>
                                  )}
                                  
                                  {selectedToken?.links?.telegram_channel_identifier && (
                                    <a
                                      href={`https://t.me/${selectedToken.links.telegram_channel_identifier}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaTelegram className="text-lg" />
                                      <span>Telegram</span>
                                    </a>
                                  )}
                                  
                                  {selectedToken?.links?.discord_url && (
                                    <a
                                      href={selectedToken.links.discord_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaDiscord className="text-lg" />
                                      <span>Discord</span>
                                    </a>
                                  )}

                                  {selectedToken?.links?.subreddit_url && (
                                    <a
                                      href={selectedToken.links.subreddit_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaReddit className="text-lg" />
                                      <span>Reddit</span>
                                    </a>
                                  )}

                                  {selectedToken?.links?.github && (
                                    <a
                                      href={selectedToken.links.github}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaGithub className="text-lg" />
                                      <span>GitHub</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showReviews && selectedToken && (
          <TokenReviews
            token={selectedToken}
            onClose={handleCloseReviews}
            currentUser={currentUser}
            showNotification={showNotification}
          />
        )}

        {isLoadingTokens && (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
            Loading tokens: {tokens.length} loaded...
          </div>
        )}

        {/* Background loading indicator */}
        {isBackgroundLoading && (
          <div className="fixed bottom-4 right-4 bg-blue-500/80 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
            Updating token data... ({allTokensCache.length} tokens cached)
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenList; 