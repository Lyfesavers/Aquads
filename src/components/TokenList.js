import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';
import { Chart } from 'chart.js/auto';

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
  }
];

const TokenList = ({ currentUser, showNotification }) => {
  const [tokens, setTokens] = useState([]);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [tokensPerPage] = useState(100);
  const [showDexFrame, setShowDexFrame] = useState(false);
  const [selectedDex, setSelectedDex] = useState(null);
  const [error, setError] = useState(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [expandedTokenId, setExpandedTokenId] = useState(null);
  const [timeFilter, setTimeFilter] = useState('24h');
  const [sortFilter, setSortFilter] = useState('market_cap');
  const [orderFilter, setOrderFilter] = useState('desc');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoadingTokens(true);
        setError(null);
        
        // Fetch multiple pages of tokens
        const fetchPage = async (page) => {
          // Add delay between requests to avoid rate limits
          if (page > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?' +
            'vs_currency=usd&' +
            'order=market_cap_desc&' +
            'per_page=250&' + // Maximum per page
            `page=${page}&` +
            'sparkline=false&' +
            'price_change_percentage=24h'
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return await response.json();
        };

        // Fetch first 12 pages (3000 tokens)
        const pages = await Promise.all([
          fetchPage(1),
          fetchPage(2),
          fetchPage(3),
          fetchPage(4),
          fetchPage(5),
          fetchPage(6),
          fetchPage(7),
          fetchPage(8),
          fetchPage(9),
          fetchPage(10),
          fetchPage(11),
          fetchPage(12)
        ]);

        // Combine all pages
        const allTokens = pages.flat();
        setTokens(allTokens);
        setFilteredTokens(allTokens);
        
      } catch (error) {
        console.error('Error fetching tokens:', error);
        if (error.message.includes('429')) {
          setError('Rate limit reached. Please wait a moment and try again.');
        } else {
          setError('Unable to load tokens. Please try again in a few minutes.');
        }
      } finally {
        setIsLoadingTokens(false);
      }
    };

    fetchTokens();
    // Fetch every 15 minutes to avoid rate limits with larger dataset
    const interval = setInterval(fetchTokens, 900000);
    return () => clearInterval(interval);
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

  useEffect(() => {
    const filtered = tokens.filter(token => 
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTokens(filtered);
  }, [searchTerm, tokens]);

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

  const handleTokenClick = (token) => {
    if (expandedTokenId === token.id) {
      setExpandedTokenId(null);
    } else {
      setExpandedTokenId(token.id);
      setSelectedToken(token);
      fetchChartData(token.id, selectedTimeRange);
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
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      showNotification('Error fetching chart data: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const paginate = async (pageNumber) => {
    setCurrentPage(pageNumber);
    
    // If we're on the last page and there might be more tokens
    if (pageNumber === totalPages && filteredTokens.length < 1000) {
      try {
        setIsLoadingMore(true);
        const nextPage = Math.floor(filteredTokens.length / 250) + 1;
        const moreTokens = await fetchPage(nextPage);
        
        setTokens(prev => [...prev, ...moreTokens]);
        setFilteredTokens(prev => [...prev, ...moreTokens]);
      } catch (error) {
        console.error('Error loading more tokens:', error);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const indexOfLastToken = currentPage * tokensPerPage;
  const indexOfFirstToken = indexOfLastToken - tokensPerPage;
  const currentTokens = filteredTokens.slice(indexOfFirstToken, indexOfLastToken);
  const totalPages = Math.ceil(filteredTokens.length / tokensPerPage);

  const handleDexClick = (dex) => {
    setSelectedDex(dex);
    setShowDexFrame(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            className="w-full px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-white flex items-center justify-between border-b border-gray-700/30"
            onClick={() => setShowDexFrame(!showDexFrame)}
          >
            <div className="flex items-center">
              <span className="mr-2">🔄</span>
              <span>Quick DEX Access</span>
            </div>
            <span>{showDexFrame ? '▼' : '▶'}</span>
          </button>

          {showDexFrame && (
            <div className="border-b border-gray-700/30">
              <div className="grid grid-cols-4 gap-0">
                <div className="col-span-1 bg-gray-800/50 border-r border-gray-700/30">
                  {DEX_OPTIONS.map((dex) => (
                    <div
                      key={dex.name}
                      onClick={() => handleDexClick(dex)}
                      className={`flex items-center p-3 cursor-pointer transition-colors ${
                        selectedDex?.name === dex.name 
                          ? 'bg-blue-500/20 border-l-4 border-blue-500' 
                          : 'hover:bg-gray-700/50'
                      }`}
                    >
                      <span className="text-2xl mr-2">{dex.icon}</span>
                      <div>
                        <div className="text-white font-medium">{dex.name}</div>
                        <div className="text-gray-400 text-xs">{dex.description}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="col-span-3 bg-white h-[600px]">
                  {selectedDex ? (
                    <iframe
                      src={selectedDex.url}
                      className="w-full h-full"
                      title={`${selectedDex.name} DEX`}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Select a DEX to start trading
                    </div>
                  )}
                </div>
              </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('rating')}>
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {currentTokens.map((token, index) => (
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
                        ${(token.market_cap / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ${(token.total_volume / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-400">★</span>
                          <span className="text-white">{token.rating || '0.0'}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedToken(token);
                              setShowReviews(true);
                            }}
                            className="ml-2 text-blue-400 hover:text-blue-300 text-sm"
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
                              <div className="bg-gray-800 rounded-lg p-4 h-[300px]">
                                <canvas ref={chartRef} />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-white">Token Information</h3>
                              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400 text-sm">Market Cap Rank</p>
                                    <p className="text-white font-medium">#{token.market_cap_rank}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Market Cap</p>
                                    <p className="text-white font-medium">${(token.market_cap / 1000000).toFixed(2)}M</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h Volume</p>
                                    <p className="text-white font-medium">${(token.total_volume / 1000000).toFixed(2)}M</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Circulating Supply</p>
                                    <p className="text-white font-medium">{token.circulating_supply?.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h High</p>
                                    <p className="text-white font-medium">${token.high_24h}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h Low</p>
                                    <p className="text-white font-medium">${token.low_24h}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex space-x-4">
                                <button
                                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                  onClick={() => {
                                    setSelectedToken(token);
                                    setShowReviews(true);
                                  }}
                                >
                                  View Reviews
                                </button>
                                <button
                                  className="flex-1 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                                  onClick={() => handleDexClick(DEX_OPTIONS[0])}
                                >
                                  Trade Token
                                </button>
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

        <div className="mt-4 flex justify-center items-center space-x-2">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => paginate(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-l"
            >
              First
            </button>
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-l"
            >
              Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => paginate(i + 1)}
                className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-l"
              >
                {i + 1}
              </button>
            )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-l"
            >
              Next
            </button>
            <button
              onClick={() => paginate(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-l"
            >
              Last
            </button>
          </div>
          {isLoadingMore && (
            <span className="text-gray-400 ml-2">Loading more tokens...</span>
          )}
        </div>
      </div>

      {showReviews && selectedToken && (
        <TokenReviews
          token={selectedToken}
          onClose={handleCloseReviews}
          currentUser={currentUser}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};

export default TokenList; 