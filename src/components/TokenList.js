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

  useEffect(() => {
    if (tokens.length > 0) {
      setError(null);
    }
  }, [tokens]);

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
      setTokens(data);
      setFilteredTokens(data);
    } catch (error) {
      console.error('Error fetching tokens:', error);
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
      setFilteredTokens(data);
    } catch (error) {
      console.error('Search error:', error);
      const filtered = tokens.filter(token => 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTokens(filtered);
    } finally {
      setIsLoading(false);
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

      fetchChartData(token.id, selectedTimeRange).catch(error => {
        console.error('Error fetching chart data:', error);
        showNotification('Chart data temporarily unavailable', 'warning');
      });
    } catch (error) {
      console.error('Error handling token click:', error);
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
      throw error;
    }
  };

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

        {isLoading && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="text-white">Loading tokens...</div>
          </div>
        )}

        {error ? (
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
                        ${token.currentPrice.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        token.priceChangePercentage24h > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {token.priceChangePercentage24h.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="text-gray-300">
                          {formatCurrency(token.marketCap)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="text-gray-300">
                          {formatCurrency(token.totalVolume)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-yellow-400">★</span>
                          <TokenRating symbol={token.symbol} />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedToken(token);
                              setShowReviews(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 text-sm"
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
                              <div className="w-full h-[400px] mb-6">
                                <canvas ref={chartRef} />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-white">Token Information</h3>
                              <div className="bg-gray-800 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400 text-sm">Market Cap Rank</p>
                                    <p className="text-white font-medium">#{token.marketCapRank}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Market Cap</p>
                                    <p className="text-white font-medium">{formatCurrency(token.marketCap)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h Volume</p>
                                    <p className="text-white font-medium">{formatCurrency(token.totalVolume)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Circulating Supply</p>
                                    <p className="text-white font-medium">{token.circulatingSupply?.toLocaleString()} {token.symbol.toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Max Supply</p>
                                    <p className="text-white font-medium">{token.maxSupply ? token.maxSupply.toLocaleString() : 'Unlimited'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Total Supply</p>
                                    <p className="text-white font-medium">{token.totalSupply?.toLocaleString() || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h High</p>
                                    <p className="text-white font-medium">${token.high24h?.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">24h Low</p>
                                    <p className="text-white font-medium">${token.low24h?.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Price Change 24h</p>
                                    <p className={`font-medium ${token.priceChange24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      ${Math.abs(token.priceChange24h).toFixed(6)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">ATH</p>
                                    <p className="text-white font-medium">${token.ath?.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">ATH Change %</p>
                                    <p className={`font-medium ${token.athChangePercentage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {token.athChangePercentage?.toFixed(2)}%
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">ATH Date</p>
                                    <p className="text-white font-medium">{new Date(token.athDate).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Market Cap Dominance</p>
                                    <p className="text-white font-medium">
                                      {((token.marketCap / token.totalVolume) * 100).toFixed(2)}%
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Fully Diluted Valuation</p>
                                    <p className="text-white font-medium">
                                      {token.fullyDilutedValuation ? formatCurrency(token.fullyDilutedValuation) : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedTokenId === token.id && (
                      <tr>
                        <td colSpan="7">
                          <div className="p-4 bg-gray-800">
                            <div className="border-t border-gray-700 pt-3">
                              <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-white whitespace-nowrap">Links:</h3>
                                <div className="flex flex-wrap gap-3">
                                  {selectedToken?.links?.homepage && (
                                    <a
                                      href={selectedToken.links.homepage}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaGlobe className="text-lg" />
                                      <span>Website</span>
                                    </a>
                                  )}
                                  
                                  {selectedToken?.links?.twitter_screen_name && (
                                    <a
                                      href={`https://twitter.com/${selectedToken.links.twitter_screen_name}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaTwitter className="text-lg" />
                                      <span>Twitter</span>
                                    </a>
                                  )}
                                  
                                  {selectedToken?.links?.telegram_channel_identifier && (
                                    <a
                                      href={`https://t.me/${selectedToken.links.telegram_channel_identifier}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaTelegram className="text-lg" />
                                      <span>Telegram</span>
                                    </a>
                                  )}
                                  
                                  {selectedToken?.links?.discord_url && (
                                    <a
                                      href={selectedToken.links.discord_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaDiscord className="text-lg" />
                                      <span>Discord</span>
                                    </a>
                                  )}

                                  {selectedToken?.links?.subreddit_url && (
                                    <a
                                      href={selectedToken.links.subreddit_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaReddit className="text-lg" />
                                      <span>Reddit</span>
                                    </a>
                                  )}

                                  {selectedToken?.links?.github && (
                                    <a
                                      href={selectedToken.links.github}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded text-gray-300 hover:bg-gray-600 hover:text-blue-400 transition-all duration-200"
                                    >
                                      <FaGithub className="text-lg" />
                                      <span>GitHub</span>
                                    </a>
                                  )}
                                </div>
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

        {showReviews && selectedToken && (
          <TokenReviews
            token={selectedToken}
            onClose={handleCloseReviews}
            currentUser={currentUser}
            showNotification={showNotification}
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