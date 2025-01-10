import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';
import { Chart } from 'chart.js/auto';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
console.log('Using API URL:', API_URL);

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
  // Original state variables
  const [selectedToken, setSelectedToken] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);

  // Add new state for ads
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState(null);

  // Load ads
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

  // Keep all your original useEffect hooks and functions
  // ... (keep all existing code)

  // Add renderAds function
  const renderAds = () => {
    if (adsLoading) return <div className="text-gray-400">Loading ads...</div>;
    if (adsError) return null;
    if (!ads || ads.length === 0) return null;

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

  // Keep your original return statement and just add the ads section where appropriate
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Keep all your original UI code */}
      
      {/* Add the ads section where you want it to appear */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Featured Ads</h2>
        {renderAds()}
      </div>
      
      {/* Keep the rest of your original UI code */}
    </div>
  );
};

export default TokenList; 