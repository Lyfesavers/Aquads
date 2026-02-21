import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { fetchGames, fetchGameCategories, deleteGame } from '../services/api';
import GameListing from './GameListing';
import CreateGameModal from './CreateGameModal';
import EditGameModal from './EditGameModal';
import { FaGamepad, FaPlus, FaSearch, FaFilter, FaSortAmountDown, FaTimes, FaHome } from 'react-icons/fa';
import { addNotificationBell } from './NavUtils';
import Modal from './Modal';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import CreateAdModal from './CreateAdModal';
import CreateBannerModal from './CreateBannerModal';
import BannerDisplay from './BannerDisplay';
import { Link } from 'react-router-dom';
import { showToast } from './Toast';
import { getDisplayName } from '../utils/nameUtils';

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
  { label: 'Kaspa', value: 'kaspa' },
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

const GameHub = ({ currentUser, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform, ads = [] }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [gameToEdit, setGameToEdit] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
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
      
      try {
        const data = await fetchGames(searchFilter);
        if (Array.isArray(data)) {
          setGames(data);
        } else {
          // Silent error handling - no console logs
          setGames([]);
          setError('Game Hub is currently under development. Games will be available soon!');
        }
      } catch (error) {
        // Silent error handling - no console logs
        setGames([]);
        setError('Game Hub is coming soon! Our team is currently working on bringing exciting blockchain games to Aquads.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const loadCategories = async () => {
    try {
      try {
        const categories = await fetchGameCategories();
        if (Array.isArray(categories)) {
          setPopularCategories(categories);
        } else {
          // Silent error handling - no console logs
          setDefaultCategories();
        }
      } catch (error) {
        // Silent error handling - no console logs
        setDefaultCategories();
      }
    } catch (error) {
      // Catch any unexpected errors
      setDefaultCategories();
    }
  };
  
  // Helper function to set default categories
  const setDefaultCategories = () => {
    setPopularCategories([
      { name: 'Action', count: 0 },
      { name: 'Adventure', count: 0 },
      { name: 'RPG', count: 0 },
      { name: 'Strategy', count: 0 },
      { name: 'Puzzle', count: 0 }
    ]);
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
  
  const handleCreateGame = async (gameData) => {
    try {
      // Add the new game to the existing games array
      setGames(prevGames => [gameData, ...prevGames]);
      
      // Close the create modal - this is now handled in the CreateGameModal component
      setShowCreateModal(false);
      
      // Show a detailed success notification
      showToast(`Game "${gameData.title}" was successfully listed in GameHub!`, 'success', 5000);
      
      // Reload games to ensure we have the freshest data
      loadGames();
    } catch (error) {
      showToast('Failed to create game: ' + (error.message || 'Unknown error'), 'error', 5000);
    }
  };
  
  const handleEditGame = (game) => {
    setGameToEdit(game);
    setShowEditModal(true);
  };
  
  const handleUpdateGame = (updatedGame) => {
    setGames(prevGames => 
      prevGames.map(game => 
        game._id === updatedGame._id ? updatedGame : game
      )
    );
    showToast('Game updated successfully!', 'success');
  };
  
  const handleDeleteGame = async (gameId) => {
    try {
      await deleteGame(gameId);
      setGames(prevGames => prevGames.filter(game => game._id !== gameId));
      showToast('Game deleted successfully!', 'success');
    } catch (error) {
      // Silent error handling - no console logs
      showToast('Failed to delete game. Please try again.', 'error');
    }
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
  
  return (
    <div className="h-screen overflow-y-auto bg-gray-900 text-yellow-400">
      <Helmet>
        <title>Web3 Games Hub - Play Crypto Games & Earn | Aquads</title>
        <meta name="description" content="Play exciting Web3 games on Aquads - horse racing, dots and boxes, crossword puzzles and more. Discover community-built crypto games and earn while you play." />
        <link rel="canonical" href="https://www.aquads.xyz/games" />

        <meta property="og:title" content="Web3 Games Hub - Play Crypto Games & Earn | Aquads" />
        <meta property="og:description" content="Play exciting Web3 games on Aquads. Discover community-built crypto games and earn while you play." />
        <meta property="og:image" content="https://www.aquads.xyz/logo712.png" />
        <meta property="og:url" content="https://www.aquads.xyz/games" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Web3 Games Hub - Play Crypto Games & Earn | Aquads" />
        <meta name="twitter:description" content="Play exciting Web3 games on Aquads. Discover community-built crypto games and earn while you play." />
        <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png" />
      </Helmet>

      {/* Navigation - Same as main page */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm z-[200000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
                         <div className="flex items-center">
               <Link to="/home">
                 <img 
                   src="/Aquadsnewlogo.png" 
                   alt="AQUADS" 
                   className="w-auto filter drop-shadow-lg hover:opacity-80 transition-opacity"
                   style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                 />
               </Link>
             </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="text-gray-300 hover:text-yellow-400 p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {filterOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Main Navigation - Smaller buttons */}
              <Link
                to="/marketplace"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Freelancer
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Games
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Paid Ads
              </button>
              <Link
                to="/learn"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Learn
              </Link>
              <Link
                to="/why-list"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Why List?
              </Link>

              {currentUser ? (
                <>
                  {addNotificationBell(currentUser)}
                  
                  {/* User Dropdown */}
                  <div className="relative user-dropdown">
                    <button 
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                    >
                      <span className="mr-1">{getDisplayName(currentUser)}</span>
                      <svg className={`w-4 h-4 ml-1 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                                         {/* Dropdown Menu */}
                     {showUserDropdown && (
                       <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-50">
                         <div className="py-2">
                           <Link
                             to="/dashboard"
                             onClick={() => setShowUserDropdown(false)}
                             className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-blue-600/50 transition-colors"
                           >
                             📊 Dashboard
                           </Link>
                           <button
                             onClick={() => {
                               setShowProjectModal(true);
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-purple-600/50 transition-colors"
                           >
                             ➕ List Project
                           </button>
                           <button
                             onClick={() => {
                               setShowBannerModal(true);
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-blue-600/50 transition-colors"
                           >
                             🎨 Create Banner Ad
                           </button>
                           <button
                             onClick={() => {
                               setShowCreateModal(true);
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-purple-600/50 transition-colors"
                           >
                             🎮 Create Game
                           </button>
                           <hr className="my-2 border-gray-700" />
                           <button
                             onClick={() => {
                               onLogout();
                               setShowUserDropdown(false);
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 hover:bg-red-600/50 transition-colors"
                           >
                             🚪 Logout
                           </button>
                         </div>
                       </div>
                     )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLoginClick}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleCreateAccountClick}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`${filterOpen ? 'block' : 'hidden'} md:hidden py-2 z-[200000] relative bg-black`}>
            <div className="flex flex-col space-y-2">
              <Link
                to="/marketplace"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Freelancer Hub
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                GameHub
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Paid Ads
              </button>
              <Link
                to="/learn"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Learn
              </Link>
              <Link
                to="/why-list"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Why List?
              </Link>
              
                             {currentUser ? (
                 <div className="flex flex-col space-y-2">
                   <Link
                     to="/dashboard"
                     onClick={() => setFilterOpen(false)}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400 block"
                   >
                     Dashboard
                   </Link>
                   <button
                     onClick={() => {
                       setShowProjectModal(true);
                       setFilterOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                   >
                     List Project
                   </button>
                   <button
                     onClick={() => {
                       setShowBannerModal(true);
                       setFilterOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                   >
                     Create Banner Ad
                   </button>
                   <button
                     onClick={() => {
                       setShowCreateModal(true);
                       setFilterOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                   >
                     Create Game
                   </button>
                   <button
                     onClick={() => {
                       onLogout();
                       setFilterOpen(false);
                     }}
                     className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                   >
                     Logout
                   </button>
                 </div>
               ) : (
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      handleLoginClick();
                      setFilterOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      handleCreateAccountClick();
                      setFilterOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Add top margin for fixed navigation */}
      <div className="pt-16">
        {/* Banner display */}
        <BannerDisplay rounded={true} />
      
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
                className="w-full bg-gray-800 text-yellow-400 border border-gray-700 rounded-l-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-20 text-gray-400 hover:text-yellow-400"
                >
                  <FaTimes />
                </button>
              )}
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-yellow-400 px-6 py-3 rounded-r-lg flex items-center"
              >
                <FaSearch className="mr-2" />
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Main content with padding at the bottom */}
      <div className="container mx-auto px-4 py-8 pb-24">
        {/* Filter bar */}
        <div className="mb-8 bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center bg-gray-700 hover:bg-gray-600 text-yellow-400 px-4 py-2 rounded mr-4"
              >
                <FaFilter className="mr-2" />
                Filters
              </button>
              
              <div className="hidden md:flex items-center">
                <span className="text-gray-400 mr-2">Sort by:</span>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="bg-gray-700 text-yellow-400 border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full bg-gray-700 text-yellow-400 border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full bg-gray-700 text-yellow-400 border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full bg-gray-700 text-yellow-400 border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        
        {/* Error message - Updated to be more appealing */}
        {error && (
          <div className="bg-gradient-to-r from-blue-900/60 to-purple-900/60 text-yellow-400 p-8 rounded-lg mb-6 border border-blue-500/50 text-center">
            <FaGamepad className="text-6xl text-blue-400 mx-auto mb-6" />
            <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">Coming Soon!</h3>
            <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">{error}</p>
            <div className="w-16 h-1 bg-blue-500 mx-auto mb-6"></div>
            <p className="text-gray-400">
              We're working on creating an exciting GameHub for all blockchain games. 
              <br className="hidden md:block" />
              Check back soon for updates!
            </p>
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
                  className="bg-blue-600 hover:bg-blue-700 text-yellow-400 px-4 py-2 rounded"
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
                    showNotification={showToast}
                    onEdit={handleEditGame}
                    onDelete={handleDeleteGame}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </div> {/* Close the top margin wrapper */}
      
             {/* Modals */}
       {showCreateModal && (
         <CreateGameModal 
           onClose={() => setShowCreateModal(false)} 
           onCreateGame={handleCreateGame}
         />
       )}
       
       {showEditModal && gameToEdit && (
         <EditGameModal 
           game={gameToEdit}
           onClose={() => {
             setShowEditModal(false);
             setGameToEdit(null);
           }} 
           onUpdateGame={handleUpdateGame}
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

               {/* Create Banner Modal */}
        {showBannerModal && currentUser && (
          <CreateBannerModal
            onSubmit={() => {}}
            onClose={() => setShowBannerModal(false)}
          />
        )}

        {/* Create Project Modal */}
        {showProjectModal && currentUser && (
          <CreateAdModal
            onCreateAd={() => {}}
            onClose={() => setShowProjectModal(false)}
            currentUser={currentUser}
            userAds={ads}
          />
        )}
      
      {/* Add a spacer div at the bottom to ensure content can be scrolled fully */}
      <div className="h-16"></div>
    </div>
  );
};

export default GameHub; 