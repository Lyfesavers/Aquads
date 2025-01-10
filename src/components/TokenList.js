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
  const [ads, setAds] = useState([]);

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

  // Fetch ads from backend
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch(`${API_URL}/api/ads`);
        const data = await response.json();
        setAds(data);
      } catch (error) {
        console.error('Error fetching ads:', error);
      }
    };

    fetchAds();
  }, []);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-lg shadow-lg cursor-pointer transform hover:scale-105 transition-transform"
            onClick={() => handleTokenClick(token)}
          >
            <div className="flex items-center mb-4">
              <img src={token.image} alt={token.name} className="w-8 h-8 mr-2" />
              <h3 className="text-xl font-bold text-white">{token.name}</h3>
            </div>
            <p className="text-white">Price: ${token.current_price.toFixed(2)}</p>
            <p className="text-white">24h Change: {token.price_change_percentage_24h.toFixed(2)}%</p>
            
            {/* Display ads as bubbles */}
            {ads.map((ad, index) => (
              <div
                key={ad._id}
                className="absolute w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs p-2 animate-float"
                style={{
                  top: `${Math.random() * 70}%`,
                  left: `${Math.random() * 70}%`,
                  animationDelay: `${index * 0.5}s`
                }}
                title={ad.title}
              >
                {ad.title.substring(0, 3)}
              </div>
            ))}
          </div>
        ))}
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