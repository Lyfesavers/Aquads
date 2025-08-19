import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaStar, FaEye, FaUsers, FaClock, FaDollarSign, FaCheckCircle, FaCrown, FaShare, FaBookmark, FaFlag } from 'react-icons/fa';
import { motion } from 'framer-motion';
import ServiceMediaDisplay from './ServiceMediaDisplay';
import BookingButton from './BookingButton';
import ServiceReviews from './ServiceReviews';
import SkillBadges from './SkillBadges';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import CountryFlag from './CountryFlag';
import UserImage from './UserImage';

const ServiceDetails = ({ currentUser, showNotification }) => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    fetchServiceDetails();
  }, [serviceId]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/services/${serviceId}/details`);
      if (!response.ok) {
        throw new Error('Service not found');
      }
      const data = await response.json();
      setService(data.service);
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/service/${serviceId}`;
    try {
      await navigator.clipboard.writeText(url);
      showNotification('Service link copied to clipboard!', 'success');
    } catch (err) {
      showNotification('Failed to copy link', 'error');
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    showNotification(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks', 'success');
  };

  const handleReport = () => {
    showNotification('Report feature coming soon!', 'info');
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
            
            <div className="flex items-center space-x-4">
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
                className="p-2 bg-gray-700/50 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <FaShare />
              </button>
              <button
                onClick={handleReport}
                className="p-2 bg-gray-700/50 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <FaFlag />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Service Media */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden"
            >
              <ServiceMediaDisplay 
                service={service}
                className="w-full h-96"
              />
            </motion.div>

            {/* Service Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{service.title}</h1>
                  <div className="flex items-center space-x-4 text-gray-400">
                    <span className="flex items-center">
                      <FaStar className="text-yellow-500 mr-1" />
                      {service.rating || '0.0'} ({service.reviews || '0'} reviews)
                    </span>
                    <span className="flex items-center">
                      <FaEye className="mr-1" />
                      {analytics?.views || '0'} views
                    </span>
                  </div>
                </div>
                {service.isPremium && (
                  <div className="flex items-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-full">
                    <FaCrown className="mr-2" />
                    Premium
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">Description</h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {service.description}
                  </p>
                </div>
              </div>

              {/* Requirements */}
              {service.requirements && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Requirements</h3>
                  <div className="bg-gray-700/50 rounded-lg p-6">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {service.requirements}
                    </p>
                  </div>
                </div>
              )}

              {/* Analytics Section */}
              {analytics && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Service Analytics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">{analytics.views || '0'}</div>
                      <div className="text-gray-400 text-sm">Total Views</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{analytics.contacts || '0'}</div>
                      <div className="text-gray-400 text-sm">Contacts</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400">{analytics.bookings || '0'}</div>
                      <div className="text-gray-400 text-sm">Bookings</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-400">{analytics.completionRate || '0'}%</div>
                      <div className="text-gray-400 text-sm">Completion Rate</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Reviews</h3>
                  <button
                    onClick={() => setShowReviews(true)}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View All Reviews
                  </button>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-6">
                  <div className="flex items-center justify-center text-gray-400">
                    <FaStar className="text-2xl text-yellow-500 mr-2" />
                    <span className="text-lg">{service.rating || '0.0'}</span>
                    <span className="ml-2">({service.reviews || '0'} reviews)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">About the Seller</h3>
              <div className="flex items-center mb-4">
                <UserImage 
                  src={service.seller?.image}
                  alt={service.seller?.username || 'Seller'}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-lg">
                      {service.seller?.username}
                      {service.isPremium && (
                        <span className="inline-flex items-center ml-2">
                          <FaCheckCircle className="text-yellow-500 text-sm" />
                        </span>
                      )}
                    </h4>
                    {service.seller?.country && (
                      <CountryFlag countryCode={service.seller.country} />
                    )}
                  </div>
                  <OnlineStatusIndicator 
                    user={service.seller}
                    size="small"
                    showText={true}
                  />
                </div>
              </div>

              {/* Skill Badges */}
              {service.seller?.skillBadges && service.seller.skillBadges.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-gray-400 text-sm mb-2">Skills & Certifications</h5>
                  <SkillBadges badges={service.seller.skillBadges} compact={true} />
                </div>
              )}

              {/* Seller Stats */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Member since</span>
                  <span className="text-white">
                    {new Date(service.seller?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Response time</span>
                  <span className="text-white">Usually within 24h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Completion rate</span>
                  <span className="text-green-400">98%</span>
                </div>
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
                  showNotification('Booking request sent successfully!', 'success');
                }}
                showNotification={showNotification}
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
                  <span className="text-white capitalize">{service.category.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Created</span>
                  <span className="text-white">
                    {new Date(service.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last updated</span>
                  <span className="text-white">
                    {new Date(service.updatedAt).toLocaleDateString()}
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
          showNotification={showNotification}
          viewOnly={true}
        />
      )}
    </div>
  );
};

export default ServiceDetails;
