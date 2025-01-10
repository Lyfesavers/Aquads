import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';
import { Chart } from 'chart.js/auto';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  const [selectedToken, setSelectedToken] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);
  
  // Just add these new states for ads
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState(null);

  const handleTokenClick = (token) => {
    setSelectedToken(token);
    setShowReviews(true);
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
      // Your existing chart data fetching logic
    } catch (error) {
      console.error('Error fetching chart data:', error);
      showNotification('Error fetching chart data', 'error');
    }
  };

  // Add ads loading
  useEffect(() => {
    const loadAds = async () => {
      try {
        setAdsLoading(true);
        const response = await fetch(`${API_URL}/api/ads`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setAds(data);
      } catch (error) {
        console.error('Error loading ads:', error);
        setAdsError(error.message);
      } finally {
        setAdsLoading(false);
      }
    };
    loadAds();
  }, []);

  const renderAds = () => {
    if (adsLoading) return <div className="text-gray-400">Loading ads...</div>;
    if (adsError || !ads || ads.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {ads.map(ad => (
          <div key={ad._id} className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-white">{ad.title}</h3>
            <p className="text-gray-300">{ad.description}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEX_OPTIONS.map((dex) => (
          <div
            key={dex.name}
            className="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={() => window.open(dex.url, '_blank')}
          >
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-2">{dex.icon}</span>
              <h3 className="text-xl font-bold text-white">{dex.name}</h3>
            </div>
            <p className="text-gray-300">{dex.description}</p>
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

      <div className="mt-8">
        {renderAds()}
      </div>
    </div>
  );
};

export default TokenList; 