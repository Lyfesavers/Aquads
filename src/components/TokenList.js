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

      setTokens(data);
      setFilteredTokens(data);
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
      setShowReviews(true);

      await fetchChartData(token.id, selectedTimeRange);
    } catch (error) {
      console.error('Error handling token click:', error);
      showNotification('Failed to load token details', 'error');
    }
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
        </div>
      </div>

      {filteredTokens.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800/50 backdrop-blur-sm">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-right cursor-pointer" onClick={() => handleSort('currentPrice')}>
                  Price
                  {sortConfig.key === 'currentPrice' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-4 py-2 text-right cursor-pointer" onClick={() => handleSort('priceChangePercentage24h')}>
                  24h %
                  {sortConfig.key === 'priceChangePercentage24h' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-4 py-2 text-right cursor-pointer" onClick={() => handleSort('marketCap')}>
                  Market Cap
                  {sortConfig.key === 'marketCap' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-4 py-2 text-right">Volume (24h)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTokens.map((token, index) => (
                <tr
                  key={token.id}
                  className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => handleTokenClick(token)}
                >
                  <td className="px-4 py-2 text-gray-400">{token.marketCapRank || index + 1}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <img
                        src={token.image}
                        alt={token.name}
                        className="w-6 h-6 mr-2 rounded-full"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder.png';
                        }}
                      />
                      <div>
                        <div className="font-medium text-white">{token.name}</div>
                        <div className="text-sm text-gray-400">{token.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-white">
                    ${token.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </td>
                  <td className={`px-4 py-2 text-right ${token.priceChangePercentage24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {token.priceChangePercentage24h.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2 text-right text-white">
                    ${token.marketCap.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-white">
                    ${token.totalVolume.toLocaleString()}
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

      {selectedToken && (
        <TokenDetails
          token={selectedToken}
          showReviews={showReviews}
          onClose={handleCloseReviews}
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
    </div>
  );
};

export default TokenList; 