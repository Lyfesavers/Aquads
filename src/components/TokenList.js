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
  const [tokensPerPage] = useState(20);
  const [showDexFrame, setShowDexFrame] = useState(false);
  const [selectedDex, setSelectedDex] = useState(null);
  const [error, setError] = useState(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [expandedTokenId, setExpandedTokenId] = useState(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoadingTokens(true);
        setError(null);
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received');
        }
        
        setTokens(data);
        setFilteredTokens(data);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError('Failed to load tokens. Please try again later.');
        showNotification('Error fetching tokens: ' + error.message, 'error');
      } finally {
        setIsLoadingTokens(false);
      }
    };

    fetchTokens();
  }, [showNotification]);

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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    
    const sorted = [...filteredTokens].sort((a, b) => {
      if (direction === 'asc') {
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

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
      <div className="mb-6">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          onClick={() => setShowDexFrame(!showDexFrame)}
        >
          <span className="mr-2">DEX Options</span>
          <span>{showDexFrame ? '▼' : '▶'}</span>
        </button>
        
        {showDexFrame && (
          <div className="mt-2 bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {DEX_OPTIONS.map((dex) => (
                <div
                  key={dex.name}
                  className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer"
                  onClick={() => handleDexClick(dex)}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{dex.icon}</span>
                    <div>
                      <h3 className="text-white font-bold">{dex.name}</h3>
                      <p className="text-gray-400 text-sm">{dex.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedDex && (
              <div className="mt-4 h-96 bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                  <h3 className="text-xl font-bold text-white">{selectedDex.name}</h3>
                  <button onClick={() => setSelectedDex(null)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <iframe
                  src={selectedDex.url}
                  className="w-full h-[calc(100%-4rem)]"
                  title={selectedDex.name}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              className={`px-3 py-1 rounded ${selectedTimeRange === '24h' ? 'bg-blue-500' : 'bg-gray-700'} text-white`}
              onClick={() => handleTimeRangeChange('24h')}
            >
              24h
            </button>
            <button 
              className={`px-3 py-1 rounded ${selectedTimeRange === '7d' ? 'bg-blue-500' : 'bg-gray-700'} text-white`}
              onClick={() => handleTimeRangeChange('7d')}
            >
              7d
            </button>
            <button 
              className={`px-3 py-1 rounded ${selectedTimeRange === '30d' ? 'bg-blue-500' : 'bg-gray-700'} text-white`}
              onClick={() => handleTimeRangeChange('30d')}
            >
              30d
            </button>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('market_cap_rank')}>
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                      onClick={() => handleSort('name')}>
                    Token
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ⭐⭐⭐⭐⭐
                      </td>
                    </tr>
                    {expandedTokenId === token.id && (
                      <tr>
                        <td colSpan="7" className="bg-gray-800/40 p-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-white mb-4">Price Chart</h3>
                              <canvas ref={chartRef} className="w-full" />
                            </div>
                            <div>
                              <div className="bg-gray-800 p-4 rounded mb-4">
                                <h3 className="text-lg font-bold text-white mb-2">Price Statistics</h3>
                                <div className="space-y-2">
                                  <p className="text-gray-400">Current Price: <span className="text-white">${token.current_price}</span></p>
                                  <p className="text-gray-400">Market Cap: <span className="text-white">${(token.market_cap / 1000000).toFixed(2)}M</span></p>
                                  <p className="text-gray-400">24h Volume: <span className="text-white">${(token.total_volume / 1000000).toFixed(2)}M</span></p>
                                </div>
                              </div>
                              <div className="flex space-x-4">
                                <button
                                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowReviews(true);
                                  }}
                                >
                                  View Reviews
                                </button>
                                <button
                                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDexClick(DEX_OPTIONS[0]);
                                  }}
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

        <div className="mt-4 flex justify-center">
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