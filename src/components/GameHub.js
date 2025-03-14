import React, { useState, useEffect } from 'react';
import { fetchGames, fetchGameCategories } from '../services/api';
import GameListing from './GameListing';
import CreateGameModal from './CreateGameModal';
import { FaGamepad, FaPlus, FaSearch, FaFilter, FaSortAmountDown, FaTimes } from 'react-icons/fa';
import { addNotificationBell } from './NavUtils';
import Modal from './Modal';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import BannerDisplay from './BannerDisplay';

const BLOCKCHAIN_OPTIONS = [
  { label: 'All Blockchains', value: '' },
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Solana', value: 'solana' },
  { label: 'Binance Smart Chain', value: 'bsc' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Avalanche', value: 'avalanche' },
  { label: 'WAX', value: 'wax' },
  { label: 'Sui', value: 'sui' },
  { label: 'Polkadot', value: 'polkadot' },
  { label: 'Aptos', value: 'aptos' },
  { label: 'Near', value: 'near' },
  { label: 'Immutable X', value: 'immutablex' },
  { label: 'Other', value: 'other' }
];

const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: '' },
  { label: 'Action', value: 'action' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'RPG', value: 'rpg' },
  { label: 'Strategy', value: 'strategy' },
  { label: 'Puzzle', value: 'puzzle' },
  { label: 'Simulation', value: 'simulation' },
  { label: 'Sports', value: 'sports' },
  { label: 'Card Game', value: 'card' },
  { label: 'Casual', value: 'casual' },
  { label: 'Racing', value: 'racing' },
  { label: 'Battle Royale', value: 'battle-royale' },
  { label: 'MMORPG', value: 'mmorpg' },
  { label: 'Platformer', value: 'platformer' },
  { label: 'Shooter', value: 'shooter' },
  { label: 'Fighting', value: 'fighting' },
  { label: 'Other', value: 'other' }
];

const SORT_OPTIONS = [
  { label: 'Most Votes', value: 'votes' },
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Alphabetical', value: 'alphabetical' }
];

const GameHub = ({ currentUser, onLogin, onLogout, onCreateAccount }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [popularCategories, setPopularCategories] = useState([]);
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    category: '',
    blockchain: '',
    sort: 'votes',
  });
  
  useEffect(() => {
    loadGames();
    loadCategories();
  }, [filters]);
  
  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add search term to filters if it exists
      const searchFilter = searchTerm ? { ...filters, search: searchTerm } : filters;
      
      const data = await fetchGames(searchFilter);
      setGames(data);
    } catch (error) {
      console.error('Error loading games:', error);
      setError('Failed to load games. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadCategories = async () => {
    try {
      const categories = await fetchGameCategories();
      setPopularCategories(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadGames();
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
    // If searchTerm was being used in filters, reload without it
    if (filters.search) {
      const { search, ...restFilters } = filters;
      setFilters(restFilters);
    } else {
      loadGames();
    }
  };
  
  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };
  
  const handleCreateGame = (newGame) => {
    setGames([newGame, ...games]);
    setShowCreateModal(false);
  };
  
  const handleLoginClick = () => {
    setShowLoginModal(true);
  };
  
  const handleCreateAccountClick = () => {
    setShowCreateAccountModal(true);
  };
  
  const handleLoginSubmit = async (credentials) => {
    await onLogin(credentials);
    setShowLoginModal(false);
  };
  
  const handleCreateAccountSubmit = async (formData) => {
    await onCreateAccount(formData);
    setShowCreateAccountModal(false);
  };
  
  const showNotification = (message, type = 'success') => {
    // You can implement a notification system here
    alert(message);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-800 shadow-md py-3">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-white flex items-center">
                <FaGamepad className="mr-2 text-blue-400" />
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                  GameHub
                </span>
              </div>
              
              <div className="hidden md:flex ml-10 space-x-4">
                <button 
                  onClick={() => handleFilterChange('category', '')}
                  className={`px-3 py-1 rounded-full text-sm ${!filters.category ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                >
                  All Games
                </button>
                
                {popularCategories.slice(0, 5).map(category => (
                  <button
                    key={category.name}
                    onClick={() => handleFilterChange('category', category.name)}
                    className={`px-3 py-1 rounded-full text-sm ${filters.category === category.name ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {addNotificationBell(currentUser)}
              
              {currentUser ? (
                <div className="flex items-center">
                  <img 
                    src={currentUser.image || '/default-avatar.png'} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full mr-2 border border-gray-500" 
                  />
                  <span className="mr-4">{currentUser.username}</span>
                  <button 
                    onClick={onLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleLoginClick}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                  >
                    Login
                  </button>
                  <button 
                    onClick={handleCreateAccountClick}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition"
                  >
                    Create Account
                  </button>
                </div>
              )}
              
              {currentUser && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full p-2"
                  title="Add New Game"
                >
                  <FaPlus className="text-xl" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Banner display */}
      <BannerDisplay />
      
      {/* Hero section */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Web3 Gaming Hub
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover, play and vote for the best blockchain games in the crypto space. Connect with innovative gaming projects building the future of gaming.
          </p>
          
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto relative">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Search for games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-l-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-20 text-gray-400 hover:text-white"
                >
                  <FaTimes />
                </button>
              )}
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-r-lg flex items-center"
              >
                <FaSearch className="mr-2" />
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filter bar */}
        <div className="mb-8 bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded mr-4"
              >
                <FaFilter className="mr-2" />
                Filters
              </button>
              
              <div className="hidden md:flex items-center">
                <span className="text-gray-400 mr-2">Sort by:</span>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center text-gray-400">
              <FaSortAmountDown className="mr-2" />
              <span>{games.length} games found</span>
            </div>
          </div>
          
          {/* Filter panel (collapsible) */}
          {filterOpen && (
            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Blockchain</label>
                <select
                  value={filters.blockchain}
                  onChange={(e) => handleFilterChange('blockchain', e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BLOCKCHAIN_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="md:hidden">
                <label className="block text-gray-400 mb-2">Sort by</label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl text-gray-400">Loading games...</p>
          </div>
        ) : (
          <>
            {/* No results */}
            {games.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <FaGamepad className="text-5xl text-gray-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">No games found</h3>
                <p className="text-gray-400 mb-4">
                  {searchTerm 
                    ? `No games match your search for "${searchTerm}".` 
                    : "No games match your current filters."}
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({
                      category: '',
                      blockchain: '',
                      sort: 'votes',
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map(game => (
                  <GameListing 
                    key={game._id} 
                    game={game} 
                    currentUser={currentUser}
                    showLoginModal={handleLoginClick}
                    showNotification={showNotification}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Modals */}
      {showCreateModal && (
        <CreateGameModal 
          onClose={() => setShowCreateModal(false)} 
          onCreateGame={handleCreateGame}
        />
      )}
      
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onLogin={handleLoginSubmit}
          onCreateAccount={() => {
            setShowLoginModal(false);
            setShowCreateAccountModal(true);
          }}
        />
      )}
      
      {showCreateAccountModal && (
        <CreateAccountModal 
          onClose={() => setShowCreateAccountModal(false)} 
          onCreateAccount={handleCreateAccountSubmit}
        />
      )}
    </div>
  );
};

export default GameHub; 