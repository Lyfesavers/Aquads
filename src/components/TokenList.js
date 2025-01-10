import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';
import { Chart } from 'chart.js/auto';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Keep the DEX options
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

  // Render floating ad bubbles
  const renderAdBubbles = () => {
    return ads.map((ad, index) => (
      <div
        key={ad._id}
        className="fixed w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs p-2 animate-float"
        style={{
          top: `${Math.random() * 20 + 10}%`,
          left: `${Math.random() * 80 + 10}%`,
          animationDelay: `${index * 0.5}s`
        }}
        title={ad.title}
      >
        {ad.title.substring(0, 3)}
      </div>
    ));
  };

  return (
    <div className="container mx-auto p-4">
      {/* Floating Ad Bubbles */}
      {renderAdBubbles()}

      {/* DEX Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Token List Table */}
      <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden">
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
          <tbody className="divide-y divide-gray-800">
            {tokens.map((token, index) => (
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

      {/* Reviews Modal */}
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