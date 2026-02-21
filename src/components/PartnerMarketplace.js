import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaFilter, FaGift, FaExternalLinkAlt, FaCopy, FaCheck, FaCoins, FaGamepad, FaCode, FaHardHat, FaUtensils, FaTshirt, FaBook, FaLaptop, FaHeartbeat, FaPlane, FaFilm, FaHome, FaBriefcase, FaDollarSign, FaPalette, FaMicrochip, FaMobile, FaDumbbell, FaSprayCan, FaCar, FaCloud, FaCreditCard, FaEllipsisH, FaChevronDown, FaChevronUp, FaQuestionCircle } from 'react-icons/fa';
import BannerDisplay from './BannerDisplay';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import ProfileModal from './ProfileModal';
import CreateBannerModal from './CreateBannerModal';
import NotificationBell from './NotificationBell';
import { socket } from '../services/api';
import { getDisplayName } from '../utils/nameUtils';

const PartnerMarketplace = ({ currentUser, onLogin, onLogout, onCreateAccount, onBannerSubmit, openMintFunnelPlatform }) => {
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  
  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // Removed old redemption states - now using membership system
  // const [selectedOffer, setSelectedOffer] = useState(null);
  // const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  // const [redeeming, setRedeeming] = useState(false);
  // const [redemptionResult, setRedemptionResult] = useState(null);
  // const [copiedCode, setCopiedCode] = useState(false);
  
  // User points (fetch from socket like Dashboard does)
  const [userPoints, setUserPoints] = useState(0);
  const [pointsInfo, setPointsInfo] = useState(null);
  
  // Membership status
  const [membership, setMembership] = useState(null);

  // Category icons mapping
  const getCategoryIcon = (category) => {
    const iconMap = {
      // Crypto & Web3
      'DeFi & Crypto': FaCoins,
      'NFT & Gaming': FaGamepad,
      'Web3 Services': FaCode,
      'Crypto Hardware': FaHardHat,
      
      // Essential Categories
      'Food & Beverage': FaUtensils,
      'Clothing & Fashion': FaTshirt,
      'Books & Education': FaBook,
      'Technology & Software': FaLaptop,
      
      // Lifestyle & Services
      'Health & Fitness': FaHeartbeat,
      'Travel & Tourism': FaPlane,
      'Entertainment & Media': FaFilm,
      'Home & Garden': FaHome,
      
      // Professional Services
      'Business Services': FaBriefcase,
      'Financial Services': FaDollarSign,
      'Marketing & Design': FaPalette,
      'Development & IT': FaCode,
      
      // Retail
      'Electronics & Gadgets': FaMicrochip,
      'Sports & Outdoors': FaDumbbell,
      'Beauty & Personal Care': FaSprayCan,
      'Automotive': FaCar,
      
      // Other
      'Subscriptions & SaaS': FaCloud,
      'Gift Cards & Vouchers': FaCreditCard,
      'Other': FaEllipsisH
    };
    return iconMap[category] || FaEllipsisH;
  };

  useEffect(() => {
    fetchPartners();
    fetchCategories();
    if (currentUser) {
      fetchMembershipStatus();
    }
  }, [currentUser]);

  useEffect(() => {
    filterPartners();
  }, [partners, selectedCategory, searchTerm, sortBy]);

  // Fetch points via socket like Dashboard does
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleAffiliateInfoLoaded = (data) => {
      if (data.pointsInfo) {
        setPointsInfo(data.pointsInfo);
        setUserPoints(data.pointsInfo.points || 0);
      }
    };

    const handleAffiliateEarningUpdate = (data) => {
      if (currentUser?.userId === data.affiliateId || currentUser?.id === data.affiliateId) {
        if (data.newTotalPoints !== undefined) {
          setUserPoints(data.newTotalPoints);
          setPointsInfo(prev => prev ? { ...prev, points: data.newTotalPoints } : { points: data.newTotalPoints });
        }
      }
    };

    socket.on('affiliateInfoLoaded', handleAffiliateInfoLoaded);
    socket.on('affiliateEarningUpdate', handleAffiliateEarningUpdate);

    // Request affiliate info on mount
    if (currentUser.userId || currentUser.id) {
      socket.emit('requestAffiliateInfo', {
        userId: currentUser.userId || currentUser.id
      });
    }

    return () => {
      socket.off('affiliateInfoLoaded', handleAffiliateInfoLoaded);
      socket.off('affiliateEarningUpdate', handleAffiliateEarningUpdate);
    };
  }, [currentUser, socket]);

  const fetchPartners = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/partner-stores`);
      if (!response.ok) throw new Error('Failed to fetch partners');
      const data = await response.json();
      setPartners(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching partners:', error);
      setError('Failed to load partner stores');
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Return the predefined categories since we have a fixed enum
      const categories = [
        'DeFi & Crypto',
        'NFT & Gaming', 
        'Web3 Services',
        'Crypto Hardware',
        'Food & Beverage',
        'Clothing & Fashion',
        'Books & Education',
        'Technology & Software',
        'Health & Fitness',
        'Travel & Tourism',
        'Entertainment & Media',
        'Home & Garden',
        'Business Services',
        'Financial Services',
        'Marketing & Design',
        'Development & IT',
        'Electronics & Gadgets',
        'Sports & Outdoors',
        'Beauty & Personal Care',
        'Automotive',
        'Subscriptions & SaaS',
        'Gift Cards & Vouchers',
        'Other'
      ];
      setCategories(['all', ...categories]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMembershipStatus = async () => {
    try {
      const token = currentUser?.token;
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/membership/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMembership(data.membership);
      }
    } catch (error) {
      console.error('Error fetching membership status:', error);
    }
  };

  const filterPartners = () => {
    let filtered = [...partners];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(partner => partner.partnerStore.storeCategory === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(partner =>
        partner.partnerStore.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.partnerStore.storeDescription.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.partnerStore.storeName.localeCompare(b.partnerStore.storeName);
        case 'newest':
          return new Date(b.partnerStore.partnerSince || b.createdAt) - new Date(a.partnerStore.partnerSince || a.createdAt);
        case 'popular':
          return (b.partnerStore.totalRedemptions || 0) - (a.partnerStore.totalRedemptions || 0);
        default:
          return a.partnerStore.storeName.localeCompare(b.partnerStore.storeName);
      }
    });

    setFilteredPartners(filtered);
  };

  // Removed old redemption functions - now using membership system

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading partner stores...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header Navigation - Same style as Marketplace */}
      <nav className="relative z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/home" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.png" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                />
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-300 hover:text-white p-3 rounded-md"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
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
                to="/home"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Home
              </Link>
              <Link
                to="/marketplace"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Marketplace
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Games
              </Link>
              <Link
                to="/partner-rewards"
                className="bg-blue-600/90 hover:bg-blue-500/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-blue-500/30 transition-all duration-300 backdrop-blur-sm text-white"
              >
                🎯 Rewards
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

              {currentUser ? (
                <>
                  <div className="text-blue-400 font-medium text-sm">{userPoints} pts</div>
                  <NotificationBell currentUser={currentUser} />
                  
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
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                          >
                            📊 Dashboard
                          </Link>
                          {currentUser.userType === 'project' && (
                            <Link
                              to="/dashboard/partnerStore"
                              onClick={() => setShowUserDropdown(false)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-green-600/50 transition-colors"
                            >
                              🎁 List Reward
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              setShowProfileModal(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                          >
                            👤 Profile
                          </button>
                          <button
                            onClick={onLogout}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-600/50 transition-colors"
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
                    onClick={() => setShowLoginModal(true)}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowCreateAccountModal(true)}
                    className="bg-blue-600/90 hover:bg-blue-500/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-blue-500/30 transition-all duration-300 backdrop-blur-sm text-white"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-black/90 backdrop-blur-md border-t border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                to="/home" 
                className="block px-3 py-2 text-gray-300 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/marketplace" 
                className="block px-3 py-2 text-gray-300 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Marketplace
              </Link>
              <Link 
                to="/games" 
                className="block px-3 py-2 text-gray-300 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Games
              </Link>
              <Link 
                to="/partner-rewards" 
                className="block px-3 py-2 text-blue-400 font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🎯 Rewards
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
              >
                Paid Ads
              </button>
              <Link 
                to="/learn" 
                className="block px-3 py-2 text-gray-300 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Learn
              </Link>

              {currentUser ? (
                <>
                  <div className="px-3 py-2 text-blue-400 font-medium">{userPoints} points</div>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
                  >
                    📊 Dashboard
                  </Link>
                  {currentUser.userType === 'project' && (
                    <Link
                      to="/dashboard/partnerStore"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-left px-3 py-2 text-green-400 hover:text-green-300"
                    >
                      🎁 List Reward
                    </Link>
                  )}
                  <button
                    onClick={() => { setShowProfileModal(true); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
                  >
                    👤 Profile
                  </button>
                  <button
                    onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setShowLoginModal(true); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setShowCreateAccountModal(true); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-blue-400"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Banner Display */}
      <div className="relative z-10">
        <BannerDisplay />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-blue-400 to-purple-400 mb-4">
              👑 Partner Rewards
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Access exclusive discounts at partner stores with your membership
            </p>
            {currentUser && (
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="inline-flex items-center space-x-2 bg-blue-600/20 border border-blue-400/30 rounded-full px-6 py-3">
                  <FaGift className="text-blue-400" />
                  <span className="text-white font-medium">
                    Your Points: <span className="text-blue-400 font-bold">{userPoints.toLocaleString()}</span>
                  </span>
                </div>
                {membership?.isActive ? (
                  <div className="inline-flex items-center space-x-2 bg-green-600/20 border border-green-400/30 rounded-full px-6 py-3">
                    <span className="text-green-400">👑</span>
                    <span className="text-white font-medium">
                      Active Member: <span className="text-green-400 font-bold">{membership.memberId}</span>
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-2 bg-gray-600/20 border border-gray-400/30 rounded-full px-6 py-3">
                    <span className="text-gray-400">🔒</span>
                    <span className="text-white font-medium">
                      Membership Required
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl border border-gray-600/30 overflow-hidden">
            {/* Header with Toggle Button */}
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full p-6 sm:p-8 text-left hover:bg-gray-700/30 transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FaQuestionCircle className="text-blue-400 text-xl" />
                  <h2 className="text-2xl font-bold text-white">How It Works</h2>
                </div>
                <motion.div
                  animate={{ rotate: showHowItWorks ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FaChevronDown className="text-gray-400 text-lg" />
                </motion.div>
              </div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
              {showHowItWorks && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">1</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Subscribe to Membership</h3>
                <p className="text-gray-300 text-sm">
                  Pay 1,000 points monthly for unlimited access to all partner discounts
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">2</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Access Member Rewards</h3>
                <p className="text-gray-300 text-sm">
                  Browse exclusive discounts from verified partner stores across all categories
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">3</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Show Your Member Card</h3>
                <p className="text-gray-300 text-sm">
                  Display your QR code at merchant stores for instant verification and discounts
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-8 pt-6 border-t border-gray-600/30">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">Membership Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2 text-gray-300">
                  <span className="text-green-400">✓</span>
                  <span className="text-sm">Unlimited Partner Access</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <span className="text-green-400">✓</span>
                  <span className="text-sm">Priority Customer Support</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <span className="text-green-400">✓</span>
                  <span className="text-sm">Exclusive Partner Offers</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <span className="text-green-400">✓</span>
                  <span className="text-sm">Monthly Auto-Renewal</span>
                </div>
              </div>
            </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Search and Sort */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search partner stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-400/50"
              >
                <option value="name">Name A-Z</option>
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collapsible Category Filter */}
        <div className="mb-8">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center">
              <FaFilter className="mr-2 text-blue-400" />
              <span className="font-medium">Filter by Category</span>
              {selectedCategory !== 'all' && (
                <span className="ml-2 px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">
                  {selectedCategory}
                </span>
              )}
            </div>
            {showFilters ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600/20 border-blue-400/50 text-blue-400'
                      : 'bg-gray-800/50 border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500/50'
                  }`}
                >
                  <FaGift className="text-xl mb-1" />
                  <span className="text-xs font-medium">All</span>
                </button>
                {categories.filter(cat => cat !== 'all').map(category => {
                  const IconComponent = getCategoryIcon(category);
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${
                        selectedCategory === category
                          ? 'bg-blue-600/20 border-blue-400/50 text-blue-400'
                          : 'bg-gray-800/50 border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500/50'
                      }`}
                    >
                      <IconComponent className="text-xl mb-1" />
                      <span className="text-xs font-medium text-center leading-tight">{category}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Partners Grid */}
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-400 text-xl mb-4">{error}</div>
            <button
              onClick={fetchPartners}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-4">
              {partners.length === 0 ? 'No partner stores available yet' : 'No partners match your filters'}
            </div>
            {searchTerm || selectedCategory !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredPartners.map((partner, index) => (
              <motion.div
                key={partner._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105"
              >
                {/* Partner Logo/Banner */}
                <div className="relative h-32 bg-gradient-to-br from-gray-700 to-gray-800">
                  <img
                    src={partner.partnerStore.storeLogo}
                    alt={partner.partnerStore.storeName}
                    className="w-full h-full object-contain bg-gray-700/30"
                    onError={(e) => {
                      e.target.src = '/api/placeholder/200/128';
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-blue-600/80 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                    {React.createElement(getCategoryIcon(partner.partnerStore.storeCategory), { size: 12 })}
                    <span>{partner.partnerStore.storeCategory}</span>
                  </div>
                  <a
                    href={partner.partnerStore.storeWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded hover:bg-black/70 transition-colors"
                    title="Visit Website"
                  >
                    <FaExternalLinkAlt size={12} />
                  </a>
                </div>

                {/* Partner Info */}
                <div className="p-4">
                  <h3 className="text-white font-semibold text-lg mb-2 truncate">
                    {partner.partnerStore.storeName}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {partner.partnerStore.storeDescription}
                  </p>

                  {/* Available Offers */}
                  <div className="space-y-2">
                    {(partner.partnerStore.discountOffers || []).filter(offer => 
                      offer.isActive
                    ).map((offer, offerIndex) => (
                      <div key={offerIndex} className="bg-gray-700/50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="text-sm text-white font-medium">{offer.title}</div>
                            <div className="text-xs text-gray-400">{offer.description}</div>
                            {offer.terms && (
                              <div className="text-xs text-gray-500 mt-1">{offer.terms}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-green-400 font-bold text-sm">
                            {offer.discountAmount}
                          </span>
                          <div className={`px-3 py-1 rounded text-xs font-medium ${
                            membership?.isActive
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-600 text-gray-400'
                          }`}>
                            {membership?.isActive ? 'Available' : 'Membership Required'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Removed old redemption modal - now using membership system */}

      {/* Modals */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={onLogin}
          onSwitchToSignup={() => {
            setShowLoginModal(false);
            setShowCreateAccountModal(true);
          }}
        />
      )}

      {showCreateAccountModal && (
        <CreateAccountModal
          onClose={() => setShowCreateAccountModal(false)}
          onCreateAccount={onCreateAccount}
          onSwitchToLogin={() => {
            setShowCreateAccountModal(false);
            setShowLoginModal(true);
          }}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onLogout={onLogout}
        />
      )}

      {showBannerModal && (
        <CreateBannerModal
          onClose={() => setShowBannerModal(false)}
          onSubmit={onBannerSubmit}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default PartnerMarketplace;
