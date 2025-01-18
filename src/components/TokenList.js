import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';
import { Chart } from 'chart.js/auto';
import TokenRating from './TokenRating';
import { FaGlobe, FaTwitter, FaTelegram, FaDiscord, FaGithub, FaReddit } from 'react-icons/fa';
import { Helmet } from 'react-helmet';
import TokenDetails from './TokenDetails';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DEX_OPTIONS = [
  {
    name: 'PawChain',
    icon: '🐾',
    url: 'https://swap.pawchain.net',
    description: 'Native PawChain DEX'
  },
  {
    name: 'PancakeSwap',
    icon: '🥞',
    url: 'https://pancakeswap.finance/swap'
  },
  {
    name: 'Uniswap',
    icon: '🦄',
    url: 'https://app.uniswap.org/#/swap'
  },
  {
    name: 'SushiSwap',
    icon: '🍣',
    url: 'https://app.sushi.com/swap'
  },
  {
    name: 'Raydium',
    icon: '☀️',
    url: 'https://raydium.io/swap/'
  },
  {
    name: 'Jupiter',
    icon: '🪐',
    url: 'https://jup.ag/',
    description: 'Popular DEX'
  }
];

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
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'marketCap', direction: 'desc' });
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [chartInstance, setChartInstance] = useState(null);
  const chartRef = useRef(null);
  const [showDexFrame, setShowDexFrame] = useState(false);
  const [selectedDex, setSelectedDex] = useState(null);
  const [error, setError] = useState(null);

  // Sorting functionality
  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    setSortConfig({ key, direction });
    
    const sorted = [...filteredTokens].sort((a, b) => {
      if (direction === 'asc') {
        return a[key] > b[key] ? 1 : -1;
      }
      return a[key] < b[key] ? 1 : -1;
    });
    
    setFilteredTokens(sorted);
  };

  const fetchInitialTokens = async (isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {
        setIsLoading(true);
      }

      const response = await fetch(`${API_URL}/api/tokens`);
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('Invalid data format received:', data);
        throw new Error('Invalid data format received from server');
      }

      // Ensure all numeric values are properly formatted
      const processedData = data.map(token => ({
        ...token,
        currentPrice: Number(token.currentPrice) || 0,
        marketCap: Number(token.marketCap) || 0,
        marketCapRank: Number(token.marketCapRank) || 0,
        totalVolume: Number(token.totalVolume) || 0,
        priceChange24h: Number(token.priceChange24h) || 0,
        priceChangePercentage24h: Number(token.priceChangePercentage24h) || 0,
        high24h: Number(token.high24h) || 0,
        low24h: Number(token.low24h) || 0,
        circulatingSupply: Number(token.circulatingSupply) || 0,
        totalSupply: Number(token.totalSupply) || 0,
        maxSupply: token.maxSupply ? Number(token.maxSupply) : null,
        ath: Number(token.ath) || 0,
        athChangePercentage: Number(token.athChangePercentage) || 0,
        fullyDilutedValuation: Number(token.fullyDilutedValuation) || 0
      }));

      setTokens(processedData);
      setFilteredTokens(processedData);
      setError(null);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      setError(error.message);
      if (!isBackgroundUpdate) {
        showNotification('Failed to load token data', 'error');
      }
    } finally {
      if (!isBackgroundUpdate) {
        setIsLoading(false);
      }
    }
  };

  const handleSearch = async (searchTerm) => {
    try {
      setIsLoading(true);
      setSearchTerm(searchTerm);

      if (!searchTerm.trim()) {
        setFilteredTokens(tokens);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/tokens?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid search response format');
      }

      setFilteredTokens(data);
      setError(null);
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to client-side filtering
      const filtered = tokens.filter(token => 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTokens(filtered);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialTokens();
    const refreshInterval = setInterval(() => {
      if (!document.hidden) {
        fetchInitialTokens(true);
      }
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []);

  // DEX integration
  const handleDexClick = (dex) => {
    setSelectedDex(dex);
    setShowDexFrame(true);
  };

  const handleCloseReviews = () => {
    setShowReviews(false);
    setSelectedToken(null);
  };

  const handleTimeRangeChange = async (range) => {
    setSelectedTimeRange(range);
    if (selectedToken) {
      await fetchChartData(selectedToken.id, range);
    }
  };

  const handleTokenClick = async (token) => {
    try {
      if (chartInstance) {
        chartInstance.destroy();
        setChartInstance(null);
      }

      setSelectedToken(token);
      setShowDetails(true);

      await fetchChartData(token.id, selectedTimeRange);
    } catch (error) {
      console.error('Error handling token click:', error);
      showNotification('Failed to load token details', 'error');
    }
  };

  const handleReviewClick = (e, token) => {
    e.stopPropagation();
    setSelectedToken(token);
    setShowReviews(true);
  };

  const fetchChartData = async (tokenId, days) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`,
        {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      setChartData(data);
      
      if (chartRef.current) {
        const ctx = chartRef.current.getContext('2d');
        const newChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.prices.map(price => new Date(price[0]).toLocaleDateString()),
            datasets: [{
              label: 'Price (USD)',
              data: data.prices.map(price => price[1]),
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top' },
              title: { display: true, text: 'Price History' }
            },
            scales: {
              y: { beginAtZero: false }
            }
          }
        });
        setChartInstance(newChart);
      }
    } catch (error) {
      console.error('Chart data error:', error);
      showNotification('Chart data temporarily unavailable', 'warning');
    }
  };

  // Render loading state
  if (isLoading && tokens.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-white">Loading tokens...</div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && tokens.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  // Rest of your component code...
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
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={sortConfig.key}
              onChange={(e) => {
                setSortConfig({ key: e.target.value, direction: sortConfig.direction });
                handleSort(e.target.value);
              }}
              className="bg-gray-700 text-white rounded px-3 py-2"
            >
              <option value="marketCap">Market Cap</option>
              <option value="currentPrice">Price</option>
              <option value="priceChangePercentage24h">24h Change</option>
              <option value="totalVolume">Volume</option>
            </select>

            <button
              onClick={() => {
                const newOrder = sortConfig.direction === 'asc' ? 'desc' : 'asc';
                setSortConfig({ key: sortConfig.key, direction: newOrder });
                handleSort(sortConfig.key, newOrder);
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded"
            >
              {sortConfig.direction === 'asc' ? '↑' : '↓'}
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

        {/* Token list table */}
        {filteredTokens.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700/30">
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                    onClick={() => handleSort('marketCapRank')}
                  >
                    # {sortConfig.key === 'marketCapRank' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                    onClick={() => handleSort('name')}
                  >
                    Token {sortConfig.key === 'name' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('currentPrice')}>
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('priceChangePercentage24h')}>
                    24h %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('marketCap')}>
                    Market Cap
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('totalVolume')}>
                    Volume(24h)
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredTokens.map((token, index) => (
                  <tr
                    key={token.id}
                    className="hover:bg-gray-800/40 cursor-pointer"
                    onClick={() => handleTokenClick(token)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{token.marketCapRank || index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={token.image}
                          alt={token.name}
                          className="h-8 w-8 rounded-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder.png';
                          }}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{token.name}</div>
                          <div className="text-sm text-gray-400">{token.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ${token.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      token.priceChangePercentage24h > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {token.priceChangePercentage24h.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ${token.marketCap.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ${token.totalVolume.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-yellow-400">★</span>
                        <TokenRating symbol={token.symbol} />
                        <button
                          onClick={(e) => handleReviewClick(e, token)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Reviews
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            {isLoading ? 'Loading tokens...' : 'No tokens found'}
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

        {selectedToken && showDetails && (
          <TokenDetails
            token={selectedToken}
            showReviews={showReviews}
            onClose={() => setShowDetails(false)}
            currentUser={currentUser}
            showNotification={showNotification}
            chartRef={chartRef}
            chartData={chartData}
            selectedTimeRange={selectedTimeRange}
            onTimeRangeChange={handleTimeRangeChange}
            showDexFrame={showDexFrame}
            selectedDex={selectedDex}
            onDexClick={handleDexClick}
            setShowDexFrame={setShowDexFrame}
          />
        )}

        {isLoading ? (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
            Loading tokens...
          </div>
        ) : tokens.length > 0 ? (
          <div className="fixed bottom-4 right-4 bg-blue-500/80 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
            {tokens.length} tokens cached
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TokenList; 