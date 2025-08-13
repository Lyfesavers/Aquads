import React, { useState, useEffect } from 'react';
import TokenReviews from './TokenReviews';
import TokenRating from './TokenRating';
import { FaGlobe, FaTwitter, FaTelegram, FaDiscord, FaGithub, FaReddit } from 'react-icons/fa';
import { Helmet } from 'react-helmet';
import TokenDetails from './TokenDetails';
import SocialMediaRaids from './SocialMediaRaids';
import ChartDock from './ChartDock';
import logger from '../utils/logger';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DEX_OPTIONS = [
  {
    name: 'AquaSwap',
    icon: '💧',
    url: '/aquaswap',
    description: 'the ultimate cross-chain DEX for all your crypto needs',
    custom: true,
    featured: true
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'marketCap', direction: 'desc' });
  const [showDexFrame, setShowDexFrame] = useState(true);
  const [selectedDex, setSelectedDex] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('tokens');
  const [isTableExpanded, setIsTableExpanded] = useState(false);



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
      // If we're doing a background refresh while details are open, skip to avoid UI flicker
      if (isBackgroundUpdate && showDetails) {
        return;
      }
      if (!isBackgroundUpdate) {
        setIsLoading(true);
      }

      const response = await fetch(`${API_URL}/api/tokens`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.status}`);
      }
      
        const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      setTokens(data);
      setFilteredTokens(data);
      setError(null);

    } catch (error) {
      logger.error('Error fetching tokens:', error);
      // Only show error if we have no tokens to display and this isn't a background update
      if (tokens.length === 0 && !isBackgroundUpdate) {
        setError('Failed to load tokens. Please try again in a few minutes.');
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
      if (Array.isArray(data)) {
        setFilteredTokens(data);
        setError(null);
      } else {
        // Fallback to client-side filtering
        const filtered = tokens.filter(token => 
          token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          token.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredTokens(filtered);
      }
    } catch (error) {
      logger.error('Search error:', error);
      // Fallback to client-side filtering
      const filtered = tokens.filter(token => 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTokens(filtered);
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
    }, 60000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // DEX integration
  const handleDexClick = (dex) => {
    setSelectedDex(dex);
    setShowDexFrame(true);
    
    // Special handling for AquaSwap
    if (dex.custom) {
      // For the new AquaSwap page, redirect directly
      if (dex.url === '/aquaswap') {
        window.location.href = dex.url;
        return;
      }
    }
  };

  const handleCloseReviews = () => {
    setShowReviews(false);
    setSelectedToken(null);
  };



  const handleTokenClick = async (token) => {
    try {
      setSelectedToken(token);
      setShowDetails(true);
    } catch (error) {
      logger.error('Error handling token click:', error);
      showNotification('Failed to load token details', 'error');
    }
  };

  const handleReviewClick = (e, token) => {
    e.stopPropagation();
    setSelectedToken(token);
    setShowReviews(true);
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
        <title>Aquads - World's First BEX - Bicentralized Exchange Hub</title>
        <meta name="description" content="Advertise your crypto project with our Bubble Ads for free. Track live cryptocurrency prices, market cap, volume, and detailed token information. Get real-time data for Bitcoin, Ethereum, and thousands of altcoins, Find a freelancer for your web3 project." />
        <meta name="keywords" content="cryptocurrency, crypto prices, bitcoin, ethereum, market cap, trading volume, token information" />
        <meta property="og:title" content="AQUADS - Dcentralized bubble advertising, Cryptocurrency Market Data, Freelancer marketplace plus more" />
        <meta property="og:description" content="Bubble Ads and Live cryptocurrency prices, charts, and market data for thousands of tokens with a freelancer marketplace for all web3 professionals." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            {viewMode === 'tokens' ? (
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h2 className="text-xl font-semibold text-white">Social Media Raids</h2>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-700 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('tokens')}
                className={`px-3 py-2 text-xs sm:text-sm font-medium ${
                  viewMode === 'tokens' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-transparent text-gray-300 hover:bg-gray-600'
                }`}
              >
                Tokens
              </button>
              <button
                onClick={() => setViewMode('raids')}
                className={`px-3 py-2 text-xs sm:text-sm font-medium ${
                  viewMode === 'raids' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-transparent text-gray-300 hover:bg-gray-600'
                }`}
              >
                Twitter Raids
              </button>
            </div>

            {viewMode === 'tokens' && (
              <>
                <select
                  value={sortConfig.key}
                  onChange={(e) => {
                    setSortConfig({ key: e.target.value, direction: sortConfig.direction });
                    handleSort(e.target.value);
                  }}
                  className="bg-gray-700 text-white rounded px-2 py-2 text-xs sm:text-sm"
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
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
        {viewMode === 'tokens' ? (
          <>
            {/* Token list dropdown toggle */}
            <div className="p-6 border-b border-gray-700/30">
              <button
                onClick={() => setIsTableExpanded(!isTableExpanded)}
                className="flex items-center justify-between w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
              >
                <span className="font-medium">Token List ({filteredTokens.length} tokens)</span>
                <span className={`transform transition-transform ${isTableExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
            </div>

            {/* Collapsible Token list table */}
            {isTableExpanded && filteredTokens.length > 0 ? (
              <>
                {/* Desktop/Tablet Table View (hidden on mobile) */}
                <div className="w-full hidden md:block">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-gray-700/30">
                        <th 
                          className="w-12 px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                          onClick={() => handleSort('marketCapRank')}
                        >
                          # {sortConfig.key === 'marketCapRank' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="w-1/4 px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                          onClick={() => handleSort('name')}
                        >
                          Token {sortConfig.key === 'name' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th className="w-1/6 px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                            onClick={() => handleSort('currentPrice')}>
                          Price
                        </th>
                        <th className="w-1/6 px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                            onClick={() => handleSort('priceChangePercentage24h')}>
                          24h %
                        </th>
                        <th className="w-1/6 px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                            onClick={() => handleSort('marketCap')}>
                          Market Cap
                        </th>
                        <th className="w-1/6 px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800/30 cursor-pointer hover:text-white"
                            onClick={() => handleSort('totalVolume')}>
                          Volume
                        </th>
                        <th scope="col" className="w-1/6 px-2 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Rating
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                      {filteredTokens.map((token, index) => (
                        <React.Fragment key={token.id}>
                          <tr 
                            className="hover:bg-gray-800/40 cursor-pointer"
                            onClick={() => handleTokenClick(token)}
                          >
                            <td className="px-2 py-4 text-sm text-gray-300">{token.marketCapRank || index + 1}</td>
                            <td className="px-2 py-4">
                              <div className="flex items-center min-w-0">
                                <img
                                  src={token.image}
                                  alt={token.name}
                                  className="h-6 w-6 rounded-full flex-shrink-0"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/placeholder.png';
                                  }}
                                />
                                <div className="ml-2 min-w-0 flex-1">
                                  <div className="text-sm font-medium text-white truncate">{token.name}</div>
                                  <div className="text-xs text-gray-400 truncate">{token.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-300">
                              ${token.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </td>
                            <td className={`px-2 py-4 text-sm ${
                              token.priceChangePercentage24h > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {token.priceChangePercentage24h.toFixed(2)}%
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-300">
                              {formatCurrency(token.marketCap)}
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-300">
                              {formatCurrency(token.totalVolume)}
                            </td>
                            <td className="px-2 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-yellow-400 text-xs">★</span>
                                <TokenRating symbol={token.symbol} />
                                <button
                                  onClick={(e) => handleReviewClick(e, token)}
                                  className="text-blue-400 hover:text-blue-300 text-xs"
                                >
                                  Reviews
                                </button>
                              </div>
                            </td>
                          </tr>
                          {selectedToken && showDetails && selectedToken.id === token.id && (
                            <TokenDetails
                              token={selectedToken}
                              showReviews={showReviews}
                              onClose={() => setShowDetails(false)}
                              currentUser={currentUser}
                              showNotification={showNotification}
                              showDexFrame={showDexFrame}
                              selectedDex={selectedDex}
                              onDexClick={handleDexClick}
                              setShowDexFrame={setShowDexFrame}
                              isMobile={false}
                              hideChart={true}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (visible only on mobile) */}
                <div className="w-full md:hidden space-y-3 p-4">
                  {filteredTokens.map((token, index) => (
                    <React.Fragment key={token.id}>
                      <div 
                        className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30 hover:bg-gray-800/60 cursor-pointer transition-colors"
                        onClick={() => handleTokenClick(token)}
                      >
                        {/* Token Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-700 rounded text-xs font-bold text-gray-300">
                              #{token.marketCapRank || index + 1}
                            </span>
                            <img
                              src={token.image}
                              alt={token.name}
                              className="h-8 w-8 rounded-full flex-shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder.png';
                              }}
                            />
                            <div>
                              <div className="text-sm font-medium text-white">{token.name}</div>
                              <div className="text-xs text-gray-400">{token.symbol}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400 text-xs">★</span>
                            <TokenRating symbol={token.symbol} />
                          </div>
                        </div>

                        {/* Token Data Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Price</div>
                            <div className="text-sm text-white font-medium">
                              ${token.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">24h %</div>
                            <div className={`text-sm font-medium ${
                              token.priceChangePercentage24h > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {token.priceChangePercentage24h.toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Market Cap</div>
                            <div className="text-sm text-white">
                              {formatCurrency(token.marketCap)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Volume</div>
                            <div className="text-sm text-white">
                              {formatCurrency(token.totalVolume)}
                            </div>
                          </div>
                        </div>

                        {/* Reviews Button */}
                        <div className="mt-3 pt-3 border-t border-gray-700/30">
                          <button
                            onClick={(e) => handleReviewClick(e, token)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                          >
                            View Reviews
                          </button>
                        </div>
                      </div>
                      {selectedToken && showDetails && selectedToken.id === token.id && (
                        <TokenDetails
                          token={selectedToken}
                          showReviews={showReviews}
                          onClose={() => setShowDetails(false)}
                          currentUser={currentUser}
                          showNotification={showNotification}
                          showDexFrame={showDexFrame}
                          selectedDex={selectedDex}
                          onDexClick={handleDexClick}
                          setShowDexFrame={setShowDexFrame}
                          isMobile={true}
                          hideChart={true}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </>
            ) : isTableExpanded && filteredTokens.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                {isLoading ? 'Loading tokens...' : 'No tokens found'}
              </div>
            ) : null}
          </>
        ) : (
          <SocialMediaRaids 
            currentUser={currentUser}
            showNotification={showNotification}
          />
        )}

        {showReviews && selectedToken && (
          <TokenReviews
            token={selectedToken}
            onClose={handleCloseReviews}
            currentUser={currentUser}
            showNotification={showNotification}
          />
        )}

        {isLoading && viewMode === 'tokens' ? (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
            Loading tokens...
          </div>
        ) : null}
        {showDetails && selectedToken && (
          <ChartDock symbol={selectedToken.symbol} />
        )}
      </div>
    </div>
  );
};

export default TokenList; 