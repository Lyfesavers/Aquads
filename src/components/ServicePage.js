import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { FaArrowLeft, FaShare, FaEdit, FaTrash, FaClock, FaUser, FaStar, FaEye, FaUsers, FaDollarSign, FaCheckCircle, FaCrown, FaBookmark, FaFlag } from 'react-icons/fa';
import { motion } from 'framer-motion';
import ServiceMediaDisplay from './ServiceMediaDisplay';
import BookingButton from './BookingButton';
import ServiceReviews from './ServiceReviews';
import SkillBadges from './SkillBadges';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { API_URL } from '../services/api';

// Helper function to create URL-friendly slugs
const createSlug = (title) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Limit slug length to prevent extremely long URLs
  const maxLength = 50;
  if (slug.length > maxLength) {
    const truncated = slug.substring(0, maxLength);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
  }
  
  return slug;
};

// Helper function to extract serviceId from slug
const extractServiceIdFromSlug = (slug) => {
  if (!slug) return null;
  const parts = slug.split('-');
  return parts[parts.length - 1];
};

// Helper function to get flag emoji
const getFlagEmoji = (countryCode) => {
  if (!countryCode) return null;
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

// Helper function to get image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return 'https://placehold.co/400x400?text=User';
  }
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return 'https://placehold.co/400x400?text=User';
};

const ServicePage = ({ currentUser, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Extract service ID from slug or URL params
  const serviceId = extractServiceIdFromSlug(slug) || new URLSearchParams(location.search).get('serviceId');

  useEffect(() => {
    if (!serviceId) {
      setError('Service ID not found');
      setLoading(false);
      return;
    }

    fetchService();
  }, [serviceId]);

  const fetchService = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/services/${serviceId}/details`);
      if (!response.ok) {
        throw new Error('Service not found');
      }
      const data = await response.json();
      setService(data.service);
      setAnalytics(data.analytics);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert('Service link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    alert(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
  };

  const handleReport = () => {
    alert('Report feature coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-400 text-lg">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Service Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The service you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Helmet>
        <title>{service.title} - Aquads Marketplace</title>
        <meta name="description" content={service.description?.substring(0, 160) + '...'} />
        <meta property="og:title" content={`${service.title} - Aquads Marketplace`} />
        <meta property="og:description" content={service.description?.substring(0, 160) + '...'} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/marketplace')}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Marketplace
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked 
                    ? 'bg-yellow-500/20 text-yellow-400' 
                    : 'bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
              >
                <FaBookmark />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              >
                <FaShare />
              </button>
              <button
                onClick={handleReport}
                className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              >
                <FaFlag />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Service Media */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden"
            >
              <ServiceMediaDisplay service={service} />
            </motion.div>

            {/* Service Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-white">{service.title}</h1>
                {service.isPremium && (
                  <div className="flex items-center bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm">
                    <FaCrown className="mr-1" />
                    Premium
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center text-gray-300">
                  <FaStar className="text-yellow-400 mr-1" />
                  <span>{service.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-500 ml-1">({service.reviews?.length || 0} reviews)</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <FaClock className="mr-1" />
                  <span>Delivery in {service.deliveryTime} days</span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <h3 className="text-xl font-semibold text-white mb-3">Description</h3>
                <p className="text-gray-300 leading-relaxed">{service.description}</p>
              </div>
            </motion.div>

            {/* Requirements */}
            {service.requirements && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4">Requirements</h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed">{service.requirements}</p>
                </div>
              </motion.div>
            )}

            {/* Analytics */}
            {analytics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4">Service Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-400">{analytics.views}</div>
                    <div className="text-gray-400 text-sm">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{analytics.contacts}</div>
                    <div className="text-gray-400 text-sm">Contacts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{analytics.bookings}</div>
                    <div className="text-gray-400 text-sm">Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{analytics.completionRate}%</div>
                    <div className="text-gray-400 text-sm">Completion Rate</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Reviews</h3>
                <button
                  onClick={() => setShowReviews(true)}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View All Reviews
                </button>
              </div>
              {service.reviews && service.reviews.length > 0 ? (
                <div className="space-y-4">
                  {service.reviews.slice(0, 3).map((review, index) => (
                    <div key={index} className="border-b border-gray-700 pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <img
                            src={getImageUrl(review.user?.image)}
                            alt={review.user?.username || 'User'}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/400x400?text=User';
                            }}
                          />
                          <span className="text-white font-medium">{review.user?.username || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-600'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No reviews yet. Be the first to review this service!</p>
              )}
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Seller Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Seller</h3>
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={getImageUrl(service.seller?.image)}
                  alt={service.seller?.username || 'Seller'}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/400x400?text=User';
                  }}
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{service.seller?.username}</span>
                    <OnlineStatusIndicator isOnline={service.seller?.isOnline} />
                    {service.seller?.country && (
                      <span className="text-lg" title={service.seller.country}>
                        {getFlagEmoji(service.seller.country)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span>{service.seller?.rating?.toFixed(1) || '0.0'}</span>
                    <span className="ml-1">({service.seller?.reviews?.length || 0} reviews)</span>
                  </div>
                </div>
              </div>
              
              {service.seller?.skillBadges && service.seller.skillBadges.length > 0 && (
                <div className="mb-4">
                  <SkillBadges badges={service.seller.skillBadges} />
                </div>
              )}

              <div className="text-gray-400 text-sm">
                <div>Member since {formatDate(service.seller?.createdAt)}</div>
                <div>Last active {formatDate(service.seller?.lastActivity)}</div>
              </div>
            </motion.div>

            {/* Pricing & Booking */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
            >
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-white mb-2">
                  ${service.price} {service.currency}
                </div>
                <div className="text-gray-400">Starting price</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center text-gray-300">
                  <FaClock className="mr-3 text-indigo-400" />
                  <span>Delivery in {service.deliveryTime} days</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <FaDollarSign className="mr-3 text-green-400" />
                  <span>Secure payment</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <FaCheckCircle className="mr-3 text-blue-400" />
                  <span>Money-back guarantee</span>
                </div>
              </div>

              <BookingButton
                service={service}
                currentUser={currentUser}
                onBookingCreate={(booking) => {
                  alert('Booking request sent successfully!');
                }}
                showNotification={(message, type) => alert(message)}
                className="w-full"
              />
            </motion.div>

            {/* Service Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Service Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Category</span>
                  <span className="text-white capitalize">{service.category?.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Created</span>
                  <span className="text-white">
                    {formatDate(service.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last updated</span>
                  <span className="text-white">
                    {formatDate(service.updatedAt)}
                  </span>
                </div>
                {service.badge && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Badge</span>
                    <span className={`capitalize ${
                      service.badge === 'gold' ? 'text-yellow-400' :
                      service.badge === 'silver' ? 'text-gray-400' :
                      'text-orange-400'
                    }`}>
                      {service.badge}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      {showReviews && (
        <ServiceReviews
          service={service}
          onClose={() => setShowReviews(false)}
          currentUser={currentUser}
          showNotification={(message, type) => alert(message)}
          viewOnly={true}
        />
      )}
    </div>
  );
};

export default ServicePage;
