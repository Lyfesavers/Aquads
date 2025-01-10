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
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenDetails, setShowTokenDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'market_cap', direction: 'desc' });
  const [showDexMenu, setShowDexMenu] = useState(false);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
        );
        const data = await response.json();
        setTokens(data);
        setFilteredTokens(data);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        showNotification('Error fetching tokens', 'error');
      }
    };

    fetchTokens();
  }, [showNotification]);

  useEffect(() => {
    if (chartData && chartRef.current) {
      if (chartInstance) {
        chartInstance.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      const newChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.prices.map(price => new Date(price[0]).toLocaleDateString()),
          datasets: [{
            label: 'Price (USD)',
            data: chartData.prices.map(price => price[1]),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: `${selectedToken?.name} Price Chart`
            }
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

  const handleTokenClick = (token) => {
    setSelectedToken(token);
    setShowTokenDetails(true);
    fetchChartData(token.id, selectedTimeRange);
  };

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

  const handleCloseDetails = () => {
    setShowTokenDetails(false);
    setSelectedToken(null);
    if (chartInstance) {
      chartInstance.destroy();
    }
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
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`
      );
      const data = await response.json();
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      showNotification('Error fetching chart data', 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search and Filters */}
      <div className="mb-6 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search tokens..."
          className="px-4 py-2 rounded bg-gray-800 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="relative">
          <button
            className="px-4 py-2 bg-blue-500 rounded text-white"
            onClick={() => setShowDexMenu(!showDexMenu)}
          >
            DEX Options
          </button>
          {showDexMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl z-10">
              {DEX_OPTIONS.map((dex) => (
                <div
                  key={dex.name}
                  className="p-4 hover:bg-gray-700 cursor-pointer"
                  onClick={() => window.open(dex.url, '_blank')}
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
          )}
        </div>
      </div>

      {/* Token List */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Token</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">24h %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Market Cap</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volume(24h)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
            </tr>
          </thead>
          <tbody>
            {filteredTokens.map((token, index) => (
              <tr 
                key={token.id}
                className="hover:bg-gray-800 cursor-pointer"
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Token Details Modal */}
      {showTokenDetails && selectedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <img src={selectedToken.image} alt={selectedToken.name} className="w-12 h-12 mr-4" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedToken.name}</h2>
                  <p className="text-gray-400">{selectedToken.symbol.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-lg font-bold text-white mb-2">Price Statistics</h3>
                <div className="space-y-2">
                  <p className="text-gray-400">Current Price: <span className="text-white">${selectedToken.current_price}</span></p>
                  <p className="text-gray-400">Market Cap: <span className="text-white">${(selectedToken.market_cap / 1000000).toFixed(2)}M</span></p>
                  <p className="text-gray-400">24h Volume: <span className="text-white">${(selectedToken.total_volume / 1000000).toFixed(2)}M</span></p>
                </div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-lg font-bold text-white mb-2">Price Change</h3>
                <div className="space-y-2">
                  <p className="text-gray-400">24h Change: 
                    <span className={selectedToken.price_change_percentage_24h > 0 ? 'text-green-400' : 'text-red-400'}>
                      {selectedToken.price_change_percentage_24h.toFixed(2)}%
                    </span>
                  </p>
                  <p className="text-gray-400">24h High: <span className="text-white">${selectedToken.high_24h}</span></p>
                  <p className="text-gray-400">24h Low: <span className="text-white">${selectedToken.low_24h}</span></p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <canvas ref={chartRef} />
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold text-white mb-4">Reviews</h3>
              <TokenReviews
                token={selectedToken}
                onClose={() => setShowReviews(false)}
                currentUser={currentUser}
                showNotification={showNotification}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenList; 