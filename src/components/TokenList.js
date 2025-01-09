import React, { useState, useEffect } from 'react';
import TokenReviews from './TokenReviews';

const TokenList = ({ currentUser, showNotification }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('market_cap');
  const [order, setOrder] = useState('desc');
  const [expandedToken, setExpandedToken] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTokens, setTotalTokens] = useState(0);
  const tokensPerPage = 100;

  // Add loading state specifically for page changes
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Separate the fetch function
  const fetchTokens = async (pageNumber) => {
    setIsPageLoading(true);
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?' +
        'vs_currency=usd&' +
        'order=market_cap_desc&' +
        `per_page=${tokensPerPage}&` +
        `page=${pageNumber}&` +
        'sparkline=false&' +
        'price_change_percentage=1h,24h,7d,14d,30d,1y&' +
        'include_market_cap=true&' +
        'include_24hr_vol=true&' +
        'include_24hr_change=true&' +
        'include_last_updated_at=true'
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setTokens(data);

      // Fetch total count only on initial load
      if (!totalTokens) {
        const globalResponse = await fetch('https://api.coingecko.com/api/v3/global');
        const globalData = await globalResponse.json();
        setTotalTokens(globalData.data.active_cryptocurrencies);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      showNotification('Failed to load tokens', 'error');
    } finally {
      setIsPageLoading(false);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTokens(currentPage);
    // Set up interval for updates
    const interval = setInterval(() => fetchTokens(currentPage), 120000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array for initial load only

  // Handle page changes
  const handlePageChange = async (newPage) => {
    if (newPage === currentPage || isPageLoading) return;
    
    setCurrentPage(newPage);
    window.scrollTo(0, 0); // Scroll to top
    await fetchTokens(newPage);
  };

  // Reuse the formatting functions from TokenBanner
  const formatVolume = (volume) => {
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(2)}B`;
    } else if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    }
    return `$${(volume / 1000).toFixed(2)}K`;
  };

  const formatPrice = (price) => {
    const numPrice = Number(price);
    if (isNaN(numPrice)) return '$0.00';
    return numPrice.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: numPrice < 1 ? 4 : 2,
      maximumFractionDigits: numPrice < 1 ? 6 : 2
    });
  };

  const formatPercentage = (percentage) => {
    const value = parseFloat(percentage);
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalTokens / tokensPerPage);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(currentPage + 2, totalPages - 1); i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  // Filter tokens based on category and sort criteria
  const filteredAndSortedTokens = React.useMemo(() => {
    let filtered = [...tokens];
    
    // Apply category filter
    if (category !== 'all') {
      filtered = filtered.filter(token => {
        switch(category) {
          case 'defi':
            return token.categories?.includes('defi');
          case 'nft':
            return token.categories?.includes('nft');
          case 'gaming':
            return token.categories?.includes('gaming');
          case 'exchange':
            return token.categories?.includes('exchange');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'price':
          return order === 'desc' ? b.current_price - a.current_price : a.current_price - b.current_price;
        case 'market_cap':
          return order === 'desc' ? b.market_cap - a.market_cap : a.market_cap - b.market_cap;
        case 'volume':
          return order === 'desc' ? b.total_volume - a.total_volume : a.total_volume - b.total_volume;
        case '24h':
          return order === 'desc' 
            ? b.price_change_percentage_24h - a.price_change_percentage_24h 
            : a.price_change_percentage_24h - b.price_change_percentage_24h;
        default:
          return 0;
      }
    });

    return filtered;
  }, [tokens, category, sortBy, order]);

  const [isSwapOpen, setIsSwapOpen] = useState(false);

  return (
    <div id="token-list" className="relative bg-gray-900/95 backdrop-blur-sm border-t border-blue-500/20 overflow-auto">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Matrix-like digital rain */}
        <div className="absolute inset-0 opacity-10">
          <div className="digital-rain"></div>
        </div>
        
        {/* Cyber grid */}
        <div className="absolute inset-0 cyber-grid"></div>
        
        {/* Floating particles */}
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle particle-${i}`} />
          ))}
        </div>

        {/* Glowing accent lines */}
        <div className="accent-lines">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`accent-line accent-line-${i}`} />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Add Swap Section */}
        <div className="mb-6">
          <button
            onClick={() => setIsSwapOpen(!isSwapOpen)}
            className="w-full flex items-center justify-between bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-xl font-bold text-white">PawChain Swap</span>
            <span className={`transform transition-transform ${isSwapOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {isSwapOpen && (
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <iframe
                src="https://swap.pawchain.net"
                title="PawChain Swap"
                className="w-full h-[600px] rounded-lg border border-gray-700"
                frameBorder="0"
                allowTransparency="true"
                sandbox="allow-forms allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <select 
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="defi">DeFi</option>
            <option value="nft">NFT</option>
            <option value="gaming">Gaming</option>
            <option value="layer1">Layer 1</option>
            <option value="layer2">Layer 2</option>
          </select>

          <select 
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="market_cap">Market Cap</option>
            <option value="volume">Volume</option>
            <option value="price_change">Price Change</option>
          </select>

          <button 
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          >
            {order === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Add results count */}
        <div className="text-gray-400 mb-4">
          Showing {((currentPage - 1) * tokensPerPage) + 1} to {Math.min(currentPage * tokensPerPage, totalTokens)} of {totalTokens} results
        </div>

        {/* Token List */}
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg overflow-hidden">
          <div className="grid grid-cols-8 gap-4 p-4 border-b border-gray-700 text-gray-400 text-sm font-medium">
            <div className="col-span-2">#  Token</div>
            <div>Price</div>
            <div>1h %</div>
            <div>24h %</div>
            <div>7d %</div>
            <div>Market Cap</div>
            <div>Reviews</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading tokens...</div>
          ) : (
            filteredAndSortedTokens.map((token, index) => (
              <React.Fragment key={token.id}>
                <div 
                  className="grid grid-cols-8 gap-4 p-4 border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedToken(expandedToken === token.id ? null : token.id)}
                >
                  <div className="col-span-2 flex items-center space-x-3">
                    <span className="text-gray-500">{index + 1}</span>
                    <img src={token.image} alt={token.name} className="w-6 h-6 rounded-full" />
                    <div>
                      <div className="text-white">{token.name}</div>
                      <div className="text-gray-400 text-sm">{token.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="text-white">{formatPrice(token.current_price)}</div>
                  <div className={`${token.price_change_percentage_1h_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(token.price_change_percentage_1h_in_currency)}
                  </div>
                  <div className={`${token.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(token.price_change_percentage_24h)}
                  </div>
                  <div className={`${token.price_change_percentage_7d_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(token.price_change_percentage_7d_in_currency)}
                  </div>
                  <div className="text-white">{formatVolume(token.market_cap)}</div>
                  <div className="flex items-center">
                    <TokenReviews 
                      tokenSymbol={token.symbol.toLowerCase()}
                      currentUser={currentUser}
                      showNotification={showNotification}
                    />
                  </div>
                </div>
                
                {/* Expanded content */}
                {expandedToken === token.id && (
                  <div className="border-b border-gray-700 bg-gray-800/50 p-6 animate-expandDown">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <h3 className="text-gray-400 mb-2">Price Information</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm">Current Price</p>
                            <p className="text-white font-bold">{formatPrice(token.current_price)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Market Cap</p>
                            <p className="text-white font-bold">{formatVolume(token.market_cap)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">24h Volume</p>
                            <p className="text-white font-bold">{formatVolume(token.total_volume)}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-gray-400 mb-2">Price Changes</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm">1h Change</p>
                            <p className={`font-bold ${token.price_change_percentage_1h_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(token.price_change_percentage_1h_in_currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">24h Change</p>
                            <p className={`font-bold ${token.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(token.price_change_percentage_24h)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">7d Change</p>
                            <p className={`font-bold ${token.price_change_percentage_7d_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(token.price_change_percentage_7d_in_currency)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-gray-400 mb-2">Supply Information</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm">Circulating Supply</p>
                            <p className="text-white font-bold">
                              {token.circulating_supply?.toLocaleString()} {token.symbol.toUpperCase()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Total Supply</p>
                            <p className="text-white font-bold">
                              {token.total_supply?.toLocaleString() || 'N/A'} {token.symbol.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-gray-400 mb-2">All Time Stats</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm">All-Time High</p>
                            <p className="text-white font-bold">{formatPrice(token.ath)}</p>
                            <p className="text-xs text-gray-400">{new Date(token.ath_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">All-Time Low</p>
                            <p className="text-white font-bold">{formatPrice(token.atl)}</p>
                            <p className="text-xs text-gray-400">{new Date(token.atl_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-gray-400 mb-2">Extended Price Changes</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm">14d Change</p>
                            <p className={`font-bold ${token.price_change_percentage_14d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(token.price_change_percentage_14d)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">30d Change</p>
                            <p className={`font-bold ${token.price_change_percentage_30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(token.price_change_percentage_30d)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">1y Change</p>
                            <p className={`font-bold ${token.price_change_percentage_1y >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(token.price_change_percentage_1y)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-gray-400 mb-2">Market Stats</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm">Market Cap Rank</p>
                            <p className="text-white font-bold">#{token.market_cap_rank}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Market Cap Dominance</p>
                            <p className="text-white font-bold">
                              {((token.market_cap / token.total_market_cap) * 100).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Fully Diluted Valuation</p>
                            <p className="text-white font-bold">{formatVolume(token.fully_diluted_valuation)}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-gray-400 mb-2">Price Statistics</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm">Price Change 24h</p>
                            <p className="text-white font-bold">{formatPrice(token.price_change_24h)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">High 24h</p>
                            <p className="text-white font-bold">{formatPrice(token.high_24h)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Low 24h</p>
                            <p className="text-white font-bold">{formatPrice(token.low_24h)}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-gray-400 mb-2">Additional Info</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm">Max Supply</p>
                            <p className="text-white font-bold">
                              {token.max_supply ? token.max_supply.toLocaleString() : 'Unlimited'} {token.symbol.toUpperCase()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Last Updated</p>
                            <p className="text-xs text-gray-400">
                              {new Date(token.last_updated).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isPageLoading}
            className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-50"
          >
            Previous
          </button>
          
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && handlePageChange(page)}
              className={`px-4 py-2 rounded-lg ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : typeof page === 'number'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-transparent text-gray-400'
              }`}
              disabled={typeof page !== 'number' || isPageLoading}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || isPageLoading}
            className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>

        {/* Loading indicator */}
        {isPageLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4">
              Loading page {currentPage}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenList; 