import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSearch, FaFilter, FaGift, FaExternalLinkAlt, FaCopy, FaCheck, FaCoins, FaGamepad, FaCode, FaHardHat, FaUtensils, FaTshirt, FaBook, FaLaptop, FaHeartbeat, FaPlane, FaFilm, FaHome, FaBriefcase, FaDollarSign, FaPalette, FaMicrochip, FaMobile, FaDumbbell, FaSprayCan, FaCar, FaCloud, FaCreditCard, FaEllipsisH } from 'react-icons/fa';
import BannerDisplay from './BannerDisplay';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import ProfileModal from './ProfileModal';
import Dashboard from './Dashboard';
import CreateBannerModal from './CreateBannerModal';
import NotificationBell from './NotificationBell';
import { socket } from '../services/api';

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
  
  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // Redemption states
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // User points (fetch from socket like Dashboard does)
  const [userPoints, setUserPoints] = useState(0);
  const [pointsInfo, setPointsInfo] = useState(null);

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
  }, []);

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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/partners`);
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/partners/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(['all', ...data]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filterPartners = () => {
    let filtered = [...partners];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(partner => partner.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(partner =>
        partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'popular':
          return (b.totalRedemptions || 0) - (a.totalRedemptions || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredPartners(filtered);
  };

  const handleRedemption = async (partner, offer) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    if (userPoints < offer.pointTier) {
      alert(`You need ${offer.pointTier} points to redeem this offer. You currently have ${userPoints} points.`);
      return;
    }

    setSelectedOffer({ partner, offer });
    setShowRedemptionModal(true);
  };

  const confirmRedemption = async () => {
    if (!selectedOffer) return;

    setRedeeming(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/partners/${selectedOffer.partner._id}/redeem`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({
            offerId: selectedOffer.offer._id
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem offer');
      }

      setRedemptionResult(data.redemption);
      setUserPoints(data.newPointsBalance);
      
      // Update currentUser points if possible
      if (currentUser.points !== undefined) {
        currentUser.points = data.newPointsBalance;
      }

    } catch (error) {
      console.error('Error redeeming offer:', error);
      alert(error.message);
    } finally {
      setRedeeming(false);
    }
  };

  const copyDiscountCode = () => {
    if (redemptionResult?.discountCode) {
      navigator.clipboard.writeText(redemptionResult.discountCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const closeRedemptionModal = () => {
    setShowRedemptionModal(false);
    setSelectedOffer(null);
    setRedemptionResult(null);
    setCopiedCode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading partner stores...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header Navigation - Same as other pages */}
      <nav className="relative z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img src="/Aquadsnewlogo.png" alt="Aquads" className="w-10 h-10" />
              <span className="text-white font-bold text-xl">Aquads</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link to="/marketplace" className="text-gray-300 hover:text-white transition-colors">Marketplace</Link>
              <Link to="/partner-rewards" className="text-blue-400 font-medium">🎯 Rewards</Link>
              
              {currentUser ? (
                <div className="flex items-center space-x-4">
                  <span className="text-blue-400 font-medium">{userPoints} pts</span>
                  {currentUser.userType === 'project' && (
                    <button
                      onClick={() => setShowDashboard(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <FaGift />
                      <span>List Reward</span>
                    </button>
                  )}
                  <NotificationBell currentUser={currentUser} />
                  <div className="relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
                    >
                      <img src={currentUser.image} alt="Profile" className="w-8 h-8 rounded-full" />
                      <span>{currentUser.username}</span>
                    </button>
                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                        <button
                          onClick={() => { setShowProfileModal(true); setShowUserDropdown(false); }}
                          className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => { setShowDashboard(true); setShowUserDropdown(false); }}
                          className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700"
                        >
                          Dashboard
                        </button>
                        <button
                          onClick={onLogout}
                          className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowCreateAccountModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:text-blue-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-black/90 backdrop-blur-md border-t border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link to="/" className="block px-3 py-2 text-gray-300 hover:text-white">Home</Link>
              <Link to="/marketplace" className="block px-3 py-2 text-gray-300 hover:text-white">Marketplace</Link>
              <Link to="/partner-rewards" className="block px-3 py-2 text-blue-400 font-medium">🎯 Rewards</Link>
              {currentUser ? (
                <>
                  <div className="px-3 py-2 text-blue-400 font-medium">{userPoints} points</div>
                  {currentUser.userType === 'project' && (
                    <button
                      onClick={() => { setShowDashboard(true); setIsMobileMenuOpen(false); }}
                      className="block w-full text-left px-3 py-2 text-green-400 hover:text-green-300"
                    >
                      🎁 List Reward
                    </button>
                  )}
                  <button
                    onClick={() => { setShowProfileModal(true); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
                  >
                    Profile
                  </button>
                  <button
                    onClick={onLogout}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
                  >
                    Logout
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
              🎯 Partner Rewards
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Redeem your points for exclusive discounts at partner stores
            </p>
            {currentUser && (
              <div className="inline-flex items-center space-x-2 bg-blue-600/20 border border-blue-400/30 rounded-full px-6 py-3">
                <FaGift className="text-blue-400" />
                <span className="text-white font-medium">
                  Your Points: <span className="text-blue-400 font-bold">{userPoints.toLocaleString()}</span>
                </span>
              </div>
            )}
          </motion.div>
        </div>

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

        {/* Category Filter Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FaFilter className="mr-2 text-blue-400" />
            Filter by Category
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
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
                    src={partner.logo}
                    alt={partner.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/api/placeholder/200/128';
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-blue-600/80 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                    {React.createElement(getCategoryIcon(partner.category), { size: 12 })}
                    <span>{partner.category}</span>
                  </div>
                  <a
                    href={partner.website}
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
                    {partner.name}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {partner.description}
                  </p>

                  {/* Available Offers */}
                  <div className="space-y-2">
                    {(partner.activeOffers || partner.discountOffers.filter(offer => 
                      offer.isActive && new Date(offer.expiryDate) > new Date()
                    )).map((offer, offerIndex) => (
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
                          <span className="text-blue-400 font-bold text-sm">
                            {offer.pointTier.toLocaleString()} pts
                          </span>
                          <button
                            onClick={() => handleRedemption(partner, offer)}
                            disabled={!currentUser || userPoints < offer.pointTier}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              !currentUser
                                ? 'bg-gray-600 text-gray-400 cursor-pointer'
                                : userPoints >= offer.pointTier
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {!currentUser ? 'Login' : userPoints >= offer.pointTier ? 'Redeem' : 'Need More'}
                          </button>
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

      {/* Redemption Modal */}
      {showRedemptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            {!redemptionResult ? (
              <>
                <h3 className="text-xl font-bold text-white mb-4">Confirm Redemption</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-gray-300">Partner:</div>
                    <div className="text-white font-medium">{selectedOffer?.partner.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-300">Offer:</div>
                    <div className="text-white font-medium">{selectedOffer?.offer.title}</div>
                  </div>
                  <div>
                    <div className="text-gray-300">Points Required:</div>
                    <div className="text-blue-400 font-bold">{selectedOffer?.offer.pointTier.toLocaleString()} points</div>
                  </div>
                  <div>
                    <div className="text-gray-300">Your Balance After:</div>
                    <div className="text-white">{(userPoints - (selectedOffer?.offer.pointTier || 0)).toLocaleString()} points</div>
                  </div>
                </div>
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={closeRedemptionModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRedemption}
                    disabled={redeeming}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {redeeming ? 'Redeeming...' : 'Confirm'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-green-400 mb-4">✅ Redemption Successful!</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-gray-300">Your Discount Code:</div>
                    <div className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-white font-mono text-lg">{redemptionResult.discountCode}</span>
                      <button
                        onClick={copyDiscountCode}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                      >
                        {copiedCode ? <FaCheck /> : <FaCopy />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-300">Expires:</div>
                    <div className="text-white">{new Date(redemptionResult.expiresAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-300">Instructions:</div>
                    <div className="text-white">Enter this code at checkout on the partner's website</div>
                  </div>
                  <div>
                    <div className="text-gray-300">New Points Balance:</div>
                    <div className="text-blue-400 font-bold">{userPoints.toLocaleString()} points</div>
                  </div>
                </div>
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={closeRedemptionModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href={redemptionResult.partnerWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors text-center"
                  >
                    Visit Store
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      {showDashboard && (
        <Dashboard
          currentUser={currentUser}
          onClose={() => setShowDashboard(false)}
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
