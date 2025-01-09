import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';

// Define DEX options with their details
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
  }
];

const TokenList = ({ currentUser, showNotification }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('market_cap');
  const [order, setOrder] = useState('desc');
  const [expandedToken, setExpandedToken] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTokens, setTotalTokens] = useState(0);
  const tokensPerPage = 100;

  // Add loading state specifically for page changes
  const [isPageLoading, setIsPageLoading] = useState(false);

  const [chartData, setChartData] = useState({});
  const [chartPeriod, setChartPeriod] = useState('7d'); // Default to 7 days

  // Add state for chart instances
  const [chartInstances, setChartInstances] = useState({});

  // Create a ref to store canvas elements
  const chartRefs = useRef({});

  const [apiLimited, setApiLimited] = useState(false);
  const apiRequestQueue = useRef([]);
  const apiTimeout = useRef(null);

  // Add rate limiting handler
  const handleRateLimit = () => {
    setApiLimited(true);
    // Reset after 1 minute
    setTimeout(() => setApiLimited(false), 60000);
  };

  // Modified fetch chart data with rate limiting
  const fetchChartData = async (tokenId, days = 7) => {
    if (apiLimited) {
      showNotification('API rate limit reached. Please wait a moment...', 'warning');
      return;
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`
      );
      
      if (response.status === 429) {
        handleRateLimit();
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch chart data');
      
      const data = await response.json();
      setChartData(prev => ({
        ...prev,
        [tokenId]: data.prices
      }));
    } catch (error) {
      console.error('Error fetching chart data:', error);
      if (error.message.includes('rate limit')) {
        handleRateLimit();
      }
      showNotification('Failed to load chart data', 'error');
    }
  };

  // Modified handleTokenClick with queue
  const handleTokenClick = async (token) => {
    if (expandedToken === token.id) {
      setExpandedToken(null);
      if (chartInstances[token.id]) {
        chartInstances[token.id].destroy();
        setChartInstances(prev => {
          const newInstances = { ...prev };
          delete newInstances[token.id];
          return newInstances;
        });
      }
    } else {
      setExpandedToken(token.id);
      if (!chartData[token.id]) {
        // Add to queue if rate limited
        if (apiLimited) {
          apiRequestQueue.current.push({
            tokenId: token.id,
            days: chartPeriod === '7d' ? 7 : chartPeriod === '30d' ? 30 : 365
          });
          showNotification('Request queued. Will load when API limit resets...', 'info');
          return;
        }
        await fetchChartData(token.id, chartPeriod === '7d' ? 7 : chartPeriod === '30d' ? 30 : 365);
      }
    }
  };

  // Add queue processor
  useEffect(() => {
    const processQueue = async () => {
      if (apiRequestQueue.current.length > 0 && !apiLimited) {
        const request = apiRequestQueue.current.shift();
        await fetchChartData(request.tokenId, request.days);
        
        // Process next item in queue after a delay
        if (apiRequestQueue.current.length > 0) {
          apiTimeout.current = setTimeout(processQueue, 6100); // Wait ~6 seconds between requests
        }
      }
    };

    if (!apiLimited) {
      processQueue();
    }

    return () => {
      if (apiTimeout.current) {
        clearTimeout(apiTimeout.current);
      }
    };
  }, [apiLimited]);

  // Modify renderTokenChart to show rate limit message
  const renderTokenChart = (token) => {
    const data = chartData[token.id];
    
    if (apiLimited) {
      return (
        <div className="p-4 bg-gray-700/30 rounded-lg mt-4">
          <div className="text-center py-4">
            <p className="text-yellow-400 mb-2">API rate limit reached</p>
            <p className="text-gray-400 text-sm">Please wait a moment before requesting more charts</p>
          </div>
        </div>
      );
    }
    
    if (!data) {
      return (
        <div className="text-center py-4">
          <div className="animate-pulse">Loading chart...</div>
        </div>
      );
    }

    // Format data for chart
    const chartPoints = data.map(([timestamp, price]) => ({
      x: new Date(timestamp).toLocaleDateString(),
      y: price
    }));

    return (
      <div className="p-4 bg-gray-700/30 rounded-lg mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Price Chart</h3>
          <div className="flex gap-2">
            {['7d', '30d', '1y'].map((period) => (
              <button
                key={period}
                onClick={() => handleChartPeriodChange(period, token.id)}
                className={`px-3 py-1 rounded ${
                  chartPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <canvas
            id={`chart-${token.id}`}
            ref={el => chartRefs.current[token.id] = el}
          />
        </div>
      </div>
    );
  };

  // Add effect to handle chart creation and updates
  useEffect(() => {
    Object.entries(chartData).forEach(([tokenId, data]) => {
      const canvas = chartRefs.current[tokenId];
      if (!canvas || !data) return;

      // Destroy existing chart
      if (chartInstances[tokenId]) {
        chartInstances[tokenId].destroy();
      }

      const ctx = canvas.getContext('2d');
      const chartPoints = data.map(([timestamp, price]) => ({
        x: new Date(timestamp).toLocaleDateString(),
        y: price
      }));

      const newChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartPoints.map(point => point.x),
          datasets: [{
            label: 'Price USD',
            data: chartPoints.map(point => point.y),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: '#9ca3af'
              }
            },
            y: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: '#9ca3af'
              }
            }
          }
        }
      });

      setChartInstances(prev => ({
        ...prev,
        [tokenId]: newChart
      }));
    });
  }, [chartData, expandedToken]);

  // Clean up chart instances when component unmounts
  useEffect(() => {
    return () => {
      Object.values(chartInstances).forEach(chart => {
        if (chart) {
          chart.destroy();
        }
      });
    };
  }, []);

  // Separate the fetch function
  const fetchTokens = async (pageNumber) => {
    setIsPageLoading(true);
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?' +
        'vs_currency=usd&' +
        'order=market_cap_desc&' +
        `per_page=${tokensPerPage}&` +
        `page=${pageNumber}&` +
        'sparkline=false&' +
        'price_change_percentage=1h,24h,7d,14d,30d,1y&' +
        'include_market_cap=true&' +
        'include_24hr_vol=true&' +
        'include_24hr_change=true&' +
        'include_last_updated_at=true'
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setTokens(data);

      // Fetch total count only on initial load
      if (!totalTokens) {
        const globalResponse = await fetch('https://api.coingecko.com/api/v3/global');
        const globalData = await globalResponse.json();
        setTotalTokens(globalData.data.active_cryptocurrencies);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      showNotification('Failed to load tokens', 'error');
    } finally {
      setIsPageLoading(false);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTokens(currentPage);
    // Set up interval for updates
    const interval = setInterval(() => fetchTokens(currentPage), 120000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array for initial load only

  // Handle page changes
  const handlePageChange = async (newPage) => {
    if (newPage === currentPage || isPageLoading) return;
    
    setCurrentPage(newPage);
    window.scrollTo(0, 0); // Scroll to top
    await fetchTokens(newPage);
  };

  // Reuse the formatting functions from TokenBanner
  const formatVolume = (volume) => {
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(2)}B`;
    } else if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    }
    return `$${(volume / 1000).toFixed(2)}K`;
  };

  const formatPrice = (price) => {
    const numPrice = Number(price);
    if (isNaN(numPrice)) return '$0.00';
    return numPrice.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: numPrice < 1 ? 4 : 2,
      maximumFractionDigits: numPrice < 1 ? 6 : 2
    });
  };

  const formatPercentage = (percentage) => {
    const value = parseFloat(percentage);
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalTokens / tokensPerPage);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(currentPage + 2, totalPages - 1); i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  // Filter tokens based on category and sort criteria
  const filteredAndSortedTokens = React.useMemo(() => {
    let filtered = [...tokens];
    
    // Apply category filter
    if (category !== 'all') {
      filtered = filtered.filter(token => {
        switch(category) {
          case 'defi':
            return token.categories?.includes('defi');
          case 'nft':
            return token.categories?.includes('nft');
          case 'gaming':
            return token.categories?.includes('gaming');
          case 'exchange':
            return token.categories?.includes('exchange');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'price':
          return order === 'desc' ? b.current_price - a.current_price : a.current_price - b.current_price;
        case 'market_cap':
          return order === 'desc' ? b.market_cap - a.market_cap : a.market_cap - b.market_cap;
        case 'volume':
          return order === 'desc' ? b.total_volume - a.total_volume : a.total_volume - b.total_volume;
        case '24h':
          return order === 'desc' 
            ? b.price_change_percentage_24h - a.price_change_percentage_24h 
            : a.price_change_percentage_24h - b.price_change_percentage_24h;
        default:
          return 0;
      }
    });

    return filtered;
  }, [tokens, category, sortBy, order]);

  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [selectedDex, setSelectedDex] = useState(DEX_OPTIONS[0]);

  // Add these helper functions if not already present
  const formatATH = (ath, athChange, athDate) => {
    const date = new Date(athDate).toLocaleDateString();
    return {
      value: formatPrice(ath),
      change: formatPercentage(athChange),
      date: date
    };
  };

  const formatSupply = (circulating, total, max) => {
    const format = (num) => {
      if (!num) return 'N/A';
      if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
      return num.toFixed(2);
    };
    
    return {
      circulating: format(circulating),
      total: format(total),
      max: format(max)
    };
  };

  // Add chart period selector
  const handleChartPeriodChange = async (period, tokenId) => {
    setChartPeriod(period);
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 365;
    await fetchChartData(tokenId, days);
  };

  return (
    <div id="token-list" className="relative bg-gray-900/95 backdrop-blur-sm border-t border-blue-500/20 overflow-x-auto">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Matrix-like digital rain */}
        <div className="absolute inset-0 opacity-10">
          <div className="digital-rain"></div>
        </div>
        
        {/* Cyber grid */}
        <div className="absolute inset-0 cyber-grid"></div>
        
        {/* Floating particles */}
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle particle-${i}`} />
          ))}
        </div>

        {/* Glowing accent lines */}
        <div className="accent-lines">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`accent-line accent-line-${i}`} />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 min-w-[1280px]">
        {/* Enhanced Swap Section */}
        <div className="mb-6">
          <button
            onClick={() => setIsSwapOpen(!isSwapOpen)}
            className="w-full flex items-center justify-between bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-xl font-bold text-white">DEX Swap</span>
            <span className={`transform transition-transform ${isSwapOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {isSwapOpen && (
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              {/* DEX Selection Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {DEX_OPTIONS.map((dex) => (
                  <button
                    key={dex.name}
                    onClick={() => setSelectedDex(dex)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      selectedDex.name === dex.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span className="mr-2">{dex.icon}</span>
                    <span>{dex.name}</span>
                  </button>
                ))}
              </div>

              {/* DEX Description */}
              <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-300">
                  {selectedDex.icon} {selectedDex.description}
                </p>
              </div>

              {/* DEX Interface */}
              <iframe
                src={selectedDex.url}
                title={`${selectedDex.name} Swap Interface`}
                className="w-full h-[600px] rounded-lg border border-gray-700 transition-all duration-300"
                frameBorder="0"
                allowTransparency="true"
                sandbox="allow-forms allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <select 
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="defi">DeFi</option>
            <option value="nft">NFT</option>
            <option value="gaming">Gaming</option>
            <option value="layer1">Layer 1</option>
            <option value="layer2">Layer 2</option>
          </select>

          <select 
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="market_cap">Market Cap</option>
            <option value="volume">Volume</option>
            <option value="price_change">Price Change</option>
          </select>

          <button 
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          >
            {order === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Add results count */}
        <div className="text-gray-400 mb-4">
          Showing {((currentPage - 1) * tokensPerPage) + 1} to {Math.min(currentPage * tokensPerPage, totalTokens)} of {totalTokens} results
        </div>

        {/* Token List with adjusted column widths */}
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg">
          <div className="grid grid-cols-12 gap-2 p-4 border-b border-gray-700 text-gray-400 text-sm font-medium">
            <div className="col-span-2">#  Token</div>
            <div className="col-span-1">Price</div>
            <div className="col-span-1">1h %</div>
            <div className="col-span-1">24h %</div>
            <div className="col-span-1">7d %</div>
            <div className="col-span-1">24h Volume</div>
            <div className="col-span-1">Market Cap</div>
            <div className="col-span-1">Circulating Supply</div>
            <div className="col-span-1">Total Supply</div>
            <div className="col-span-1">ATH</div>
            <div className="col-span-1">Reviews</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading tokens...</div>
          ) : (
            filteredAndSortedTokens.map((token, index) => (
              <React.Fragment key={token.id}>
                <div 
                  onClick={() => handleTokenClick(token)}
                  className="grid grid-cols-12 gap-2 p-4 border-b border-gray-700 hover:bg-gray-700/30 cursor-pointer text-sm"
                >
                  <div className="col-span-2 flex items-center space-x-3">
                    <span className="text-gray-500">{index + 1}</span>
                    <img src={token.image} alt={token.name} className="w-6 h-6 rounded-full" />
                    <div>
                      <div className="text-white">{token.name}</div>
                      <div className="text-gray-400 text-xs">
                        {token.symbol.toUpperCase()}
                        {token.market_cap_rank && 
                          <span className="ml-2 text-xs text-gray-500">Rank #{token.market_cap_rank}</span>
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-1 flex flex-col justify-center">
                    <div className="text-white">{formatPrice(token.current_price)}</div>
                    <div className="text-xs text-gray-400">{token.price_change_24h > 0 ? '+' : ''}{formatPrice(token.price_change_24h)}</div>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <div className={`flex items-center ${token.price_change_percentage_1h_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(token.price_change_percentage_1h_in_currency)}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <div className={`flex items-center ${token.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(token.price_change_percentage_24h)}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <div className={`flex items-center ${token.price_change_percentage_7d_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(token.price_change_percentage_7d_in_currency)}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <div className="flex items-center text-white">
                      {formatVolume(token.total_volume)}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <div className="flex items-center text-white">
                      {formatVolume(token.market_cap)}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <div className="flex items-center text-white">
                      {formatSupply(token.circulating_supply).circulating}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <div className="flex items-center text-white">
                      {formatSupply(null, token.total_supply).total}
                    </div>
                  </div>

                  <div className="col-span-1 flex flex-col justify-center">
                    <div className="text-white">{formatPrice(token.ath)}</div>
                    <div className={`text-xs ${token.ath_change_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(token.ath_change_percentage)}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <TokenReviews 
                      tokenSymbol={token.symbol.toLowerCase()}
                      currentUser={currentUser}
                      showNotification={showNotification}
                    />
                  </div>
                </div>

                {/* Expanded content with additional details and chart */}
                {expandedToken === token.id && (
                  <div className="col-span-12 p-4 bg-gray-800/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Enhanced Token Details */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-gray-400 mb-2">Price Statistics</h3>
                            <div className="space-y-2">
                              <div>
                                <p className="text-gray-400 text-sm">Current Price</p>
                                <p className="text-white font-bold">{formatPrice(token.current_price)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">24h Low / High</p>
                                <p className="text-white">
                                  {formatPrice(token.low_24h)} / {formatPrice(token.high_24h)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">All Time High</p>
                                <p className="text-white">{formatPrice(token.ath)}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(token.ath_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-gray-400 mb-2">Market Stats</h3>
                            <div className="space-y-2">
                              <div>
                                <p className="text-gray-400 text-sm">Market Cap Rank</p>
                                <p className="text-white">#{token.market_cap_rank}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">Market Cap</p>
                                <p className="text-white">{formatVolume(token.market_cap)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">Volume / Market Cap</p>
                                <p className="text-white">
                                  {(token.total_volume / token.market_cap).toFixed(4)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional token information */}
                        <div>
                          <h3 className="text-gray-400 mb-2">Supply Information</h3>
                          <div className="space-y-2">
                            <div>
                              <p className="text-gray-400 text-sm">Circulating Supply</p>
                              <p className="text-white">{formatSupply(token.circulating_supply).circulating}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Total Supply</p>
                              <p className="text-white">{formatSupply(null, token.total_supply).total}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Max Supply</p>
                              <p className="text-white">{formatSupply(null, null, token.max_supply).max}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chart */}
                      {renderTokenChart(token)}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isPageLoading}
            className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-50"
          >
            Previous
          </button>
          
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && handlePageChange(page)}
              className={`px-4 py-2 rounded-lg ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : typeof page === 'number'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-transparent text-gray-400'
              }`}
              disabled={typeof page !== 'number' || isPageLoading}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || isPageLoading}
            className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>

        {/* Loading indicator */}
        {isPageLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4">
              Loading page {currentPage}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenList; 