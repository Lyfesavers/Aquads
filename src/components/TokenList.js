import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';
import { Chart } from 'chart.js/auto';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TokenList = ({ currentUser, showNotification }) => {
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch tokens from CoinGecko
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
        );
        const data = await response.json();
        setTokens(data);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        showNotification('Error fetching tokens', 'error');
      }
    };

    fetchTokens();
  }, [showNotification]);

  const handleTokenClick = (token) => {
    setSelectedToken(token);
    setShowReviews(true);
    fetchChartData(token.id, selectedTimeRange);
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
    <div className="container mx-auto p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 bg-gray-800">
          <h2 className="text-xl font-bold text-white">Market Overview</h2>
          <div className="flex space-x-2">
            <button 
              className={`px-3 py-1 rounded ${selectedTimeRange === '24h' ? 'bg-blue-500' : 'bg-gray-700'}`}
              onClick={() => handleTimeRangeChange('24h')}
            >
              24h
            </button>
            <button 
              className={`px-3 py-1 rounded ${selectedTimeRange === '7d' ? 'bg-blue-500' : 'bg-gray-700'}`}
              onClick={() => handleTimeRangeChange('7d')}
            >
              7d
            </button>
            <button 
              className={`px-3 py-1 rounded ${selectedTimeRange === '30d' ? 'bg-blue-500' : 'bg-gray-700'}`}
              onClick={() => handleTimeRangeChange('30d')}
            >
              30d
            </button>
          </div>
        </div>
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Token</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">24h %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Market Cap</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volume(24h)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {tokens.map((token, index) => (
              <tr 
                key={token.id}
                className="hover:bg-gray-800 cursor-pointer transition-colors"
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