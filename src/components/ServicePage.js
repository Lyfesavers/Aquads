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
import { FaCrown, FaCheck, FaEye, FaUsers, FaClipboardCheck, FaStar, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
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

// Helper function to check if URL is valid
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return 'https://placehold.co/400x300?text=No+Image';
  }
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return 'https://placehold.co/400x300?text=No+Image';
};

const UserImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(getImageUrl(src));

  return (
    <img 
      src={imgSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        logger.warn(`Image failed to load: ${imgSrc}`);
        e.target.onerror = null;
        setImgSrc('https://placehold.co/400x300?text=No+Image');
      }}
    />
  );
};

const ServicePage = ({ currentUser, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServiceDetails = async () => {
      try {
        setLoading(true);
        
        // Extract service ID from slug (format: title-id)
        const serviceId = slug.split('-').pop();
        
        const response = await fetch(`${API_URL}/services/${serviceId}/details`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Service not found');
          } else {
            setError('Failed to load service details');
          }
          return;
        }
        
        const data = await response.json();
        setService(data.service);
        setAnalytics(data.analytics);
      } catch (err) {
        logger.error('Error fetching service details:', err);
        setError('Failed to load service details');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchServiceDetails();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-white mt-4 text-lg">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-2">Service Not Found</h1>
          <p className="text-gray-300 mb-6">{error || 'The service you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full transition duration-300"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const seller = service.seller;

  return (
    <>
      <Helmet>
        <title>{service.title} - Aquads Freelancer Service</title>
        <meta name="description" content={service.description.substring(0, 160)} />
        <meta property="og:title" content={`${service.title} - Aquads`} />
        <meta property="og:description" content={service.description.substring(0, 160)} />
        <meta property="og:image" content={service.image || 'https://www.aquads.xyz/logo712.png'} />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/marketplace')}
                className="flex items-center text-white hover:text-blue-400 transition duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Marketplace
              </button>
              
              <div className="flex items-center space-x-4">
                {currentUser ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-sm">Welcome, {currentUser.username}</span>
                    <button
                      onClick={onLogout}
                      className="text-white hover:text-red-400 transition duration-300"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={onLogin}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition duration-300"
                    >
                      Login
                    </button>
                    <button
                      onClick={onCreateAccount}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition duration-300"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Service Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      {service.badge && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-black">
                          <FaCrown className="w-3 h-3 mr-1" />
                          {service.badge}
                        </span>
                      )}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                        {service.category}
                      </span>
                    </div>
                    
                    <h1 className="text-4xl font-bold text-white mb-4">{service.title}</h1>
                    
                    <div className="flex items-center space-x-6 text-gray-300">
                      <div className="flex items-center">
                        <FaStar className="w-4 h-4 text-yellow-400 mr-2" />
                        <span>{service.rating || 0} ({service.reviews || 0} reviews)</span>
                      </div>
                      <div className="flex items-center">
                        <FaClock className="w-4 h-4 text-blue-400 mr-2" />
                        <span>{service.deliveryTime} days delivery</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white mb-2">
                      ${service.price}
                    </div>
                    <div className="text-gray-400 text-sm">Starting from</div>
                  </div>
                </div>

                {/* Service Media */}
                {(service.image || service.videoUrl) && (
                  <div className="mb-6">
                    <ServiceMediaDisplay 
                      image={service.image}
                      videoUrl={service.videoUrl}
                      className="rounded-xl overflow-hidden"
                    />
                  </div>
                )}

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Description</h3>
                  <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {service.description}
                  </div>
                </div>

                {/* Requirements */}
                {service.requirements && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Requirements</h3>
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {service.requirements}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Reviews Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10"
              >
                <h3 className="text-2xl font-semibold text-white mb-6">Reviews</h3>
                <ServiceReviews serviceId={service._id} currentUser={currentUser} />
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Seller Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10"
              >
                <h3 className="text-xl font-semibold text-white mb-4">About the Seller</h3>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative">
                    <UserImage
                      src={seller?.image}
                      alt={seller?.username}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                    />
                    <OnlineStatusIndicator 
                      isOnline={seller?.isOnline} 
                      lastSeen={seller?.lastSeen}
                      className="absolute -bottom-1 -right-1"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-lg font-semibold text-white">{seller?.username}</h4>
                      {seller?.country && <CountryFlag countryCode={seller.country} />}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-300 text-sm">
                      <FaStar className="w-3 h-3 text-yellow-400" />
                      <span>{seller?.rating || 0} ({seller?.reviews || 0} reviews)</span>
                    </div>
                    
                    <div className="text-gray-400 text-xs">
                      Member since {new Date(seller?.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {seller?.skillBadges && seller.skillBadges.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Skills</h5>
                    <SkillBadges badges={seller.skillBadges} />
                  </div>
                )}

                <button
                  onClick={() => navigate(`/profile/${seller?._id}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-full transition duration-300"
                >
                  View Full Profile
                </button>
              </motion.div>

              {/* Analytics */}
              {analytics && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10"
                >
                  <h3 className="text-xl font-semibold text-white mb-4">Service Analytics</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-300">
                        <FaEye className="w-4 h-4 mr-2" />
                        <span>Views</span>
                      </div>
                      <span className="text-white font-semibold">{analytics.views}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-300">
                        <FaUsers className="w-4 h-4 mr-2" />
                        <span>Contacts</span>
                      </div>
                      <span className="text-white font-semibold">{analytics.contacts}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-300">
                        <FaClipboardCheck className="w-4 h-4 mr-2" />
                        <span>Bookings</span>
                      </div>
                      <span className="text-white font-semibold">{analytics.bookings}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-300">
                        <FaCheck className="w-4 h-4 mr-2" />
                        <span>Completion Rate</span>
                      </div>
                      <span className="text-white font-semibold">{analytics.completionRate}%</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Booking Button */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10"
              >
                <BookingButton
                  service={service}
                  currentUser={currentUser}
                  onLogin={onLogin}
                  onCreateAccount={onCreateAccount}
                  openMintFunnelPlatform={openMintFunnelPlatform}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ServicePage;
