import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { API_URL } from '../services/api';
import ServiceMediaDisplay from './ServiceMediaDisplay';
import BookingButton from './BookingButton';
import ServiceReviews from './ServiceReviews';
import SkillBadges from './SkillBadges';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import NotificationBell from './NotificationBell';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import ProfileModal from './ProfileModal';
import Dashboard from './Dashboard';
import CreateServiceModal from './CreateServiceModal';
import CreateBannerModal from './CreateBannerModal';
import PremiumPaymentModal from './PremiumPaymentModal';
import CreateJobModal from './CreateJobModal';
import { FaCrown, FaCheck, FaArrowLeft, FaEye, FaUsers, FaHandshake, FaChartLine, FaStar, FaGlobe, FaClock, FaDollarSign } from 'react-icons/fa';
import logger from '../utils/logger';

// Helper function for country flags
const CountryFlag = ({ countryCode }) => {
  if (!countryCode) return null;
  
  const code = countryCode.toUpperCase();
  
  return (
    <img 
      src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 2x`}
      width="20" 
      height="15"
      alt={code}
      title={code}
      className="inline-block align-middle"
    />
  );
};

const ServicePage = ({ currentUser, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  
  // Header state variables
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showPremiumPaymentModal, setShowPremiumPaymentModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    const fetchServiceDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Extract service ID from slug (format: title-id)
        const serviceId = slug.split('-').pop();
        
        const response = await fetch(`${API_URL}/services/${serviceId}/details`);
        
        if (!response.ok) {
          throw new Error('Service not found');
        }
        
        const serviceData = await response.json();
        setService(serviceData);
      } catch (err) {
        logger.error('Error fetching service details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchServiceDetails();
    }
  }, [slug]);

  const handleBookingCreate = (booking) => {
    // Handle booking creation success
    logger.log('Booking created:', booking);
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const handleCreateAccountClick = () => {
    setShowCreateAccountModal(true);
  };

  const handleLoginSubmit = async (credentials) => {
    try {
      await onLogin(credentials);
      setShowLoginModal(false);
    } catch (error) {
      logger.error('Login error:', error);
    }
  };

  const handleCreateAccountSubmit = async (formData) => {
    try {
      await onCreateAccount(formData);
      setShowCreateAccountModal(false);
    } catch (error) {
      logger.error('Create account error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
          <div className="tech-lines"></div>
          <div className="tech-dots"></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400 text-lg">Loading service details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
          <div className="tech-lines"></div>
          <div className="tech-dots"></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold mb-4">Service Not Found</h1>
            <p className="text-gray-400 mb-6">The service you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/marketplace')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{service.title} - {service.seller?.username} | AQUADS</title>
        <meta name="description" content={service.description?.slice(0, 160)} />
        <meta property="og:title" content={`${service.title} - ${service.seller?.username}`} />
        <meta property="og:description" content={service.description?.slice(0, 160)} />
        {service.image && <meta property="og:image" content={service.image} />}
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Fixed Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
          <div className="tech-lines"></div>
          <div className="tech-dots"></div>
        </div>

        {/* Fixed Navigation */}
        <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
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
                  to="/"
                  className="bg-indigo-500/80 hover:bg-indigo-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                >
                  Home
                </Link>
                <Link
                  to="/games"
                  className="bg-indigo-500/80 hover:bg-indigo-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                >
                  Games
                </Link>
                <button
                  onClick={openMintFunnelPlatform}
                  className="bg-gradient-to-r from-green-500/80 to-emerald-600/80 hover:from-green-600/80 hover:to-emerald-700/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
                >
                  Paid Ads
                </button>
                <Link
                  to="/how-to"
                  className="bg-indigo-500/80 hover:bg-indigo-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                >
                  Learn
                </Link>
                <Link
                  to="/freelancer-benefits"
                  className="bg-gradient-to-r from-purple-500/80 to-pink-600/80 hover:from-purple-600/80 hover:to-pink-700/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                >
                  Benefits
                </Link>

                {currentUser ? (
                  <>
                    <NotificationBell currentUser={currentUser} />
                    
                    {/* User Dropdown */}
                    <div className="relative user-dropdown">
                      <button 
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="flex items-center bg-blue-500/80 hover:bg-blue-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                      >
                        <span className="mr-1">{currentUser.username}</span>
                        <svg className={`w-4 h-4 ml-1 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showUserDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-50">
                          <div className="py-2">
                            <button
                              onClick={() => {
                                setShowDashboard(true);
                                setShowUserDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                            >
                              📊 Dashboard
                            </button>
                            <button
                              onClick={() => {
                                setShowCreateModal(true);
                                setShowUserDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                            >
                              ➕ List Service
                            </button>
                            <button
                              onClick={() => {
                                setShowBannerModal(true);
                                setShowUserDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                            >
                              🎨 Create Banner Ad
                            </button>
                            <button
                              onClick={() => {
                                setShowProfileModal(true);
                                setShowUserDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                            >
                              ⚙️ Edit Profile
                            </button>
                            <hr className="my-2 border-gray-700" />
                            <button
                              onClick={() => {
                                onLogout();
                                setShowUserDropdown(false);
                              }}
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
                      onClick={handleLoginClick}
                      className="bg-blue-500/80 hover:bg-blue-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      Login
                    </button>
                    <button
                      onClick={handleCreateAccountClick}
                      className="bg-green-500/80 hover:bg-green-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      Create Account
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu */}
            <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-2 z-[200000] relative`}>
              <div className="flex flex-col space-y-2">
                <Link
                  to="/"
                  className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                >
                  Home
                </Link>
                <Link
                  to="/games"
                  className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                >
                  GameHub
                </Link>
                <button
                  onClick={openMintFunnelPlatform}
                  className="bg-gradient-to-r from-green-500/80 to-emerald-600/80 hover:from-green-600/80 hover:to-emerald-700/80 px-4 py-2 rounded shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                >
                  Paid Ads
                </button>
                <Link
                  to="/how-to"
                  className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                >
                  Learn
                </Link>
                <Link
                  to="/freelancer-benefits"
                  className="bg-gradient-to-r from-purple-500/80 to-pink-600/80 hover:from-purple-600/80 hover:to-pink-700/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                >
                  Benefits
                </Link>
                {currentUser ? (
                  <>
                    <div className="flex justify-center">
                      <NotificationBell currentUser={currentUser} />
                    </div>
                    <span className="text-blue-300 text-center">Welcome, {currentUser.username}!</span>
                    <button
                      onClick={() => {
                        setShowDashboard(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      List Service
                    </button>
                    <button
                      onClick={() => {
                        setShowBannerModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      Create Banner Ad
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        onLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-red-500/80 hover:bg-red-600/80 px-4 py-2 rounded shadow-lg hover:shadow-red-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleLoginClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => {
                        handleCreateAccountClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-green-500/80 hover:bg-green-600/80 px-4 py-2 rounded shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
                    >
                      Create Account
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left Column - Service Media & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Media */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl"
              >
                <ServiceMediaDisplay 
                  service={service}
                  className="w-full h-96 lg:h-[500px]"
                />
                {service.isPremium && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                      <FaCrown />
                      <span className="font-semibold">Premium</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Service Title & Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl"
              >
                <h1 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {service.title}
                </h1>
                
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                    {service.description}
                  </p>
                </div>
              </motion.div>

              {/* Requirements */}
              {service.requirements && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl"
                >
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                    <FaCheck className="text-green-400" />
                    Requirements
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {service.requirements}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Reviews Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <FaStar className="text-yellow-400" />
                    Reviews
                  </h2>
                  <button
                    onClick={() => setShowReviews(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    View All Reviews
                  </button>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold text-yellow-400">
                    {service.rating || '0.0'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar
                          key={star}
                          className={`text-sm ${
                            star <= (service.rating || 0) ? 'text-yellow-400' : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-400">
                      {service.reviews || 0} reviews
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Seller Info & Booking */}
            <div className="space-y-6">
              {/* Seller Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src={service.seller?.image || 'https://placehold.co/100x100?text=User'}
                    alt={service.seller?.username || 'Seller'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/100x100?text=User';
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">
                        {service.seller?.username}
                      </h3>
                      {service.isPremium && (
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-2 py-1 rounded-full text-xs">
                          <FaCheck />
                          verified
                        </span>
                      )}
                    </div>
                    {service.seller?.country && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <CountryFlag countryCode={service.seller.country} />
                        <span>{service.seller.country}</span>
                      </div>
                    )}
                    {service.seller?._id && (
                      <OnlineStatusIndicator 
                        user={service.seller}
                        size="small"
                        showText={true}
                      />
                    )}
                  </div>
                </div>

                {/* Skill Badges */}
                {service.seller?.skillBadges && service.seller.skillBadges.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Skills & Certifications</h4>
                    <SkillBadges badges={service.seller.skillBadges} compact={true} />
                  </div>
                )}

                {/* Seller Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{service.seller?.rating || '0.0'}</div>
                    <div className="text-xs text-gray-400">Rating</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">{service.seller?.reviews || '0'}</div>
                    <div className="text-xs text-gray-400">Reviews</div>
                  </div>
                </div>
              </motion.div>

              {/* Analytics Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FaChartLine className="text-green-400" />
                  Service Analytics
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaEye className="text-blue-400" />
                      <span className="text-gray-300">Views</span>
                    </div>
                    <span className="font-bold text-blue-400">{service.analytics?.views || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaUsers className="text-purple-400" />
                      <span className="text-gray-300">Contacts</span>
                    </div>
                    <span className="font-bold text-purple-400">{service.analytics?.contacts || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaHandshake className="text-green-400" />
                      <span className="text-gray-300">Bookings</span>
                    </div>
                    <span className="font-bold text-green-400">{service.analytics?.bookings || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaChartLine className="text-yellow-400" />
                      <span className="text-gray-300">Completion Rate</span>
                    </div>
                    <span className="font-bold text-yellow-400">{service.analytics?.completionRate || 0}%</span>
                  </div>
                </div>
              </motion.div>

              {/* Service Details Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-4">Service Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FaDollarSign className="text-green-400" />
                      <span className="text-gray-300">Starting Price</span>
                    </div>
                    <span className="font-bold text-green-400">{service.price} USDC</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FaClock className="text-blue-400" />
                      <span className="text-gray-300">Delivery Time</span>
                    </div>
                    <span className="font-bold text-blue-400">{service.deliveryTime} Days</span>
                  </div>
                  
                  {service.category && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaGlobe className="text-purple-400" />
                        <span className="text-gray-300">Category</span>
                      </div>
                      <span className="font-bold text-purple-400">{service.category}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Booking Button */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl"
              >
                <BookingButton
                  service={service}
                  currentUser={currentUser}
                  onBookingCreate={handleBookingCreate}
                  showNotification={(message, type) => {
                    alert(message); // Using alert for now, can be replaced with a better notification system
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Reviews Modal */}
        {showReviews && (
          <ServiceReviews
            service={service}
            onClose={() => setShowReviews(false)}
            currentUser={currentUser}
            showNotification={(message, type) => {
              alert(message);
            }}
            onReviewsUpdate={() => {
              // Refresh service data if needed
            }}
            viewOnly={true}
          />
        )}

        {/* Login Modal */}
        {showLoginModal && (
          <LoginModal
            show={showLoginModal}
            onHide={() => setShowLoginModal(false)}
            onLogin={handleLoginSubmit}
            currentUser={currentUser}
          />
        )}

        {/* Create Account Modal */}
        {showCreateAccountModal && (
          <CreateAccountModal
            show={showCreateAccountModal}
            onHide={() => setShowCreateAccountModal(false)}
            onCreateAccount={handleCreateAccountSubmit}
            currentUser={currentUser}
          />
        )}

        {/* Profile Modal */}
        {showProfileModal && (
          <ProfileModal
            show={showProfileModal}
            onHide={() => setShowProfileModal(false)}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        )}

        {/* Dashboard Modal */}
        {showDashboard && (
          <Dashboard
            show={showDashboard}
            onHide={() => setShowDashboard(false)}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        )}

        {/* Create Service Modal */}
        {showCreateModal && (
          <CreateServiceModal
            show={showCreateModal}
            onHide={() => setShowCreateModal(false)}
            currentUser={currentUser}
            onServiceCreated={(newService) => {
              setShowCreateModal(false);
              // Optionally navigate to the new service page
              const slug = `${newService.title.replace(/\s+/g, '-').toLowerCase()}-${newService._id}`;
              navigate(`/service/${slug}`);
            }}
          />
        )}

        {/* Create Banner Modal */}
        {showBannerModal && (
          <CreateBannerModal
            show={showBannerModal}
            onHide={() => setShowBannerModal(false)}
            currentUser={currentUser}
            onBannerSubmit={(bannerData) => {
              setShowBannerModal(false);
              // Handle banner creation success
            }}
          />
        )}

        {/* Premium Payment Modal */}
        {showPremiumPaymentModal && (
          <PremiumPaymentModal
            show={showPremiumPaymentModal}
            onHide={() => setShowPremiumPaymentModal(false)}
            currentUser={currentUser}
            serviceToUpgrade={service}
            onUpgradeSuccess={() => {
              setShowPremiumPaymentModal(false);
              // Refresh service data
              window.location.reload();
            }}
          />
        )}

        {/* Create Job Modal */}
        {showJobModal && (
          <CreateJobModal
            show={showJobModal}
            onHide={() => setShowJobModal(false)}
            currentUser={currentUser}
            onJobCreated={(newJob) => {
              setShowJobModal(false);
              // Handle job creation success
            }}
          />
        )}
      </div>
    </>
  );
};

export default ServicePage;
