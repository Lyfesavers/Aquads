import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CreateServiceModal from './CreateServiceModal';
import ServiceReviews from './ServiceReviews';
import { createService, fetchServices, fetchJobs, createJob, updateJob, deleteJob, refreshJob } from '../services/api';
import { API_URL } from '../services/api';
import ProfileModal from './ProfileModal';
import BannerDisplay from './BannerDisplay';
import CreateBannerModal from './CreateBannerModal';
import { Button } from 'react-bootstrap';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import EditServiceModal from './EditServiceModal';
import { FaTelegram, FaTwitter, FaDiscord, FaEnvelope, FaLinkedin, FaGlobe, FaCrown, FaCheck } from 'react-icons/fa';
import BookingButton from './BookingButton';
import Dashboard from './Dashboard';
import PremiumBadge from './PremiumBadge';
import PremiumPaymentModal from './PremiumPaymentModal';
import CreateJobModal from './CreateJobModal';
import JobList from './JobList';
import NotificationBell from './NotificationBell';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import useUserPresence from '../hooks/useUserPresence';
import useUserStatusUpdates from '../hooks/useUserStatusUpdates';
import logger from '../utils/logger';

// Helper function for country flags - using images instead of emojis
const CountryFlag = ({ countryCode }) => {
  if (!countryCode) return null;
  
  const code = countryCode.toUpperCase();
  
  // Return an actual flag image from a CDN
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
  // If no image path provided, return default placeholder
  if (!imagePath) {
    return 'https://placehold.co/400x300?text=No+Image';
  }

  // If it's already a valid URL (starts with http/https), return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // Return placeholder for invalid URLs
  return 'https://placehold.co/400x300?text=No+Image';
};

// Update image components with simpler URL handling
const ServiceImageComponent = ({ src, alt, className }) => {
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

const UserImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(getImageUrl(src));

  return (
    <img 
      src={imgSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        logger.warn(`User image failed to load: ${imgSrc}`);
        e.target.onerror = null;
        setImgSrc('https://placehold.co/40x40?text=User');
      }}
    />
  );
};

const ServiceBadgeComponent = ({ badge }) => {
  if (!badge) return null;

  const badgeColors = {
    bronze: 'bg-amber-600',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-400'
  };

  const badgeIcons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇'
  };

  return (
    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full ${badgeColors[badge]} text-white text-sm font-medium shadow-lg flex items-center gap-1 backdrop-blur-sm`}>
      <span>{badgeIcons[badge]}</span>
      <span className="capitalize">{badge}</span>
    </div>
  );
};

const Marketplace = ({ currentUser, onLogin, onLogout, onCreateAccount }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [services, setServices] = useState([]);
  const [originalServices, setOriginalServices] = useState([]); // Store original services for search reset
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
  const [sortOption, setSortOption] = useState('highest-rated');
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [showPremiumPaymentModal, setShowPremiumPaymentModal] = useState(false);
  const [serviceToUpgrade, setServiceToUpgrade] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState({ jobs: true });

  // Initialize user presence tracking
  useUserPresence(currentUser);
  const { getUserStatus, bulkUpdateUserStatuses } = useUserStatusUpdates(currentUser);

  const categories = [
    { id: 'smart-contract', name: 'Smart Contract', icon: '📝' },
    { id: 'audit', name: 'Audit', icon: '🔍' },
    { id: 'marketing', name: 'Marketing', icon: '📈' },
    { id: 'community', name: 'Community', icon: '👥' },
    { id: 'web3', name: 'Web3', icon: '🌐' },
    { id: 'tokenomics', name: 'Tokenomics', icon: '📊' },
    { id: 'writing', name: 'Writing', icon: '✍️' },
    { id: 'consulting', name: 'Consulting', icon: '💡' },
    { id: 'graphic-designer', name: 'Graphic Designer', icon: '🎨' },
    { id: 'other', name: 'Other', icon: '🔧' }
  ];

  // Load services when component mounts
  useEffect(() => {
    loadServices();
  }, []);

  // Add effect to handle shared service links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedServiceId = params.get('service');
    
    if (sharedServiceId && services.length > 0) {
      const service = services.find(s => s._id === sharedServiceId);
      if (service) {
        // Update meta tags for sharing
        const dynamicTwitterImage = document.getElementById('dynamic-twitter-image');
        const dynamicTwitterTitle = document.getElementById('dynamic-twitter-title');
        const dynamicTwitterDesc = document.getElementById('dynamic-twitter-description');
        const dynamicOgImage = document.getElementById('dynamic-og-image');
        const dynamicOgTitle = document.getElementById('dynamic-og-title');
        const dynamicOgDesc = document.getElementById('dynamic-og-description');
        const dynamicOgUrl = document.getElementById('dynamic-og-url');

        if (dynamicTwitterImage) dynamicTwitterImage.content = service.image;
        if (dynamicTwitterTitle) dynamicTwitterTitle.content = `${service.title} - Aquads Marketplace`;
        if (dynamicTwitterDesc) dynamicTwitterDesc.content = service.description?.slice(0, 200) + '...';
        if (dynamicOgImage) dynamicOgImage.content = service.image;
        if (dynamicOgTitle) dynamicOgTitle.content = `${service.title} - Aquads Marketplace`;
        if (dynamicOgDesc) dynamicOgDesc.content = service.description?.slice(0, 200) + '...';
        
        // Create clean URL without referral parameters for og:url
        const cleanUrl = `${window.location.origin}/marketplace?service=${sharedServiceId}`;
        if (dynamicOgUrl) dynamicOgUrl.content = cleanUrl;

        // Expand the description of the shared service
        setExpandedDescriptions(prev => new Set([...prev, sharedServiceId]));
        
        // Scroll to the service card
        const element = document.getElementById(`service-${sharedServiceId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-opacity-50');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-opacity-50');
          }, 3000);
        }
      }
    }
  }, [services]);

  const loadServices = async () => {
    try {
      const data = await fetchServices();
      
      // Check data structure and extract services array properly
      let servicesArray = [];
      if (Array.isArray(data)) {
        // If data is already an array of services
        servicesArray = data;
      } else if (data && Array.isArray(data.services)) {
        // If data has a services property that is an array
        servicesArray = data.services;
      } else if (data && typeof data === 'object') {
        // If data is an object but not in expected format
        servicesArray = data.services || [];
      } else {
        servicesArray = [];
      }
      
      // Fetch initial review data for each service
      const servicesWithReviews = await Promise.all(servicesArray.map(async (service) => {
        try {
          const response = await fetch(`${API_URL}/service-reviews/${service._id}`);
          if (!response.ok) return service;
          
          const reviews = await response.json();
          if (reviews && reviews.length > 0) {
            const totalRating = reviews.reduce((sum, review) => sum + Number(review.rating), 0);
            const avgRating = totalRating / reviews.length;
            return { ...service, rating: avgRating, reviews: reviews.length };
          }
          return { ...service, rating: 0, reviews: 0 };
        } catch (error) {
          logger.error(`Error fetching reviews for service ${service._id}:`, error);
          return service;
        }
      }));

      setServices(servicesWithReviews);
      setOriginalServices(servicesWithReviews);
      
      // Initialize user statuses for all service sellers
      const sellers = servicesWithReviews
        .map(service => service.seller)
        .filter(seller => seller && seller._id);
      bulkUpdateUserStatuses(sellers);
      
      setLoading(false);
    } catch (error) {
      logger.error('Error loading services:', error);
      setError('Failed to load services');
      setLoading(false);
    }
  };

  const handleCreateService = async (serviceData) => {
    try {
      if (!currentUser) {
        alert('Please log in to create a service.');
        setShowCreateModal(false);
        return;
      }

      // Check if user already has a service in this category
      const userServicesInCategory = services.filter(service => 
        service.seller?.username === currentUser.username && 
        service.category === serviceData.category
      );

      if (userServicesInCategory.length > 0) {
        alert('You can only have one service listing per category. Please edit your existing service or choose a different category.');
        setShowCreateModal(false);
        return;
      }

      // No need for FormData since we're just sending JSON
      logger.log('Submitting service with data:', serviceData);

      // Create service with direct data
      const newService = await createService(serviceData);
      logger.log('Service created successfully:', newService);
      
      // Update services list
      setServices(prevServices => [newService, ...prevServices]);
      
      // Close modal
      setShowCreateModal(false);
    } catch (error) {
      logger.error('Error creating service:', error);
      alert(error.response?.data?.message || 'Failed to create service. Please try again.');
    }
  };

  const handleProfileUpdate = (updatedUser) => {
    // We need to propagate this update to the parent component
    // You may want to add an onProfileUpdate prop to handle this
    setShowProfileModal(false);
  };

  const handleDeleteService = async (serviceId) => {
    try {
      // Get token from currentUser object
      if (!currentUser || !currentUser.token) {
        alert('Please log in to delete your service');
        onLogout();
        return;
      }

      if (!window.confirm('Are you sure you want to delete this service?')) {
        return;
      }

      const response = await fetch(`${API_URL}/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Your session has expired. Please log in again.');
          onLogout();
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete service');
      }

      // If delete was successful, update the services list
      setServices(prevServices => prevServices.filter(service => service._id !== serviceId));
      alert('Service deleted successfully');
    } catch (error) {
      logger.error('Error deleting service:', error);
      alert(error.message || 'Failed to delete service. Please try again.');
    }
  };

  const handleShowReviews = (service) => {
    setSelectedService(service);
    setShowReviewsModal(true);
  };

  const handleReviewsUpdate = (updatedService) => {
    if (!updatedService?._id) {
      logger.error('No service data provided for update');
      return;
    }

    logger.log('Updating service with new data:', updatedService);
    
    // Update the services array with the new data
    setServices(prevServices => {
      const newServices = prevServices.map(service => 
        service._id === updatedService._id 
          ? { ...service, rating: updatedService.rating, reviews: updatedService.reviews }
          : service
      );
      logger.log('Updated services:', newServices);
      return newServices;
    });
  };

  const showNotification = (message, type = 'success') => {
    // You can implement this with a toast library or custom notification
    alert(message); // Basic implementation
  };

  // Update useEffect to log the correct token source
  useEffect(() => {
    logger.log('Current user:', currentUser);
    logger.log('Token available:', currentUser?.token ? 'yes' : 'no');
  }, [currentUser]);

  // Modify the sortServices function
  const sortServices = (services, option) => {
    const servicesCopy = [...services];
    
    // First sort by the selected option
    const sortedServices = servicesCopy.sort((a, b) => {
      // First prioritize premium status
      if (a.isPremium && !b.isPremium) return -1;
      if (!a.isPremium && b.isPremium) return 1;
      
      // Then apply the selected sort option within each group
      switch (option) {
        case 'highest-rated':
          return (b.rating || 0) - (a.rating || 0);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });

    return sortedServices;
  };

  // Update the filtered services to include sorting
  const filteredServices = sortServices(
    services
      .filter(service => {
        // First check premium filter
        if (showPremiumOnly && !service.isPremium) {
          return false;
        }
        
        // Then check category filter
        if (selectedCategory && service.category !== selectedCategory) {
          return false;
        }
        
        // Then apply search term filter if there is one
        if (searchTerm && searchTerm.trim() !== '') {
          const searchQuery = searchTerm.toLowerCase();
          const username = service.seller?.username?.toLowerCase() || '';
          const title = service.title?.toLowerCase() || '';
          const description = service.description?.toLowerCase() || '';
          const category = service.category?.toLowerCase() || '';
          
          return username.includes(searchQuery) || 
                 title.includes(searchQuery) || 
                 description.includes(searchQuery) ||
                 category.includes(searchQuery);
        }
        
        // If we get here, show the service (it passed all filters)
        return true;
      }),
    sortOption
  );

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const toggleDescription = (serviceId) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const handleBannerSubmit = async (bannerData) => {
    try {
      if (!currentUser || !currentUser.token) {
        throw new Error('Please log in to create a banner ad');
      }

      const response = await fetch(`${API_URL}/bannerAds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          ...bannerData,
          owner: currentUser.userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create banner ad');
      }

      const newBanner = await response.json();
      setShowBannerModal(false);
      return newBanner;
    } catch (error) {
      logger.error('Error creating banner ad:', error);
      throw error;
    }
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
      // No need to set currentUser or localStorage here as it's handled in App.js
    } catch (error) {
      logger.error('Login error:', error);
      // Show error in the LoginModal
      // The error will be shown in the LoginModal component
    }
  };

  const handleCreateAccountSubmit = async (formData) => {
    try {
      await onCreateAccount(formData);
      setShowCreateAccountModal(false);
      // The welcome modal and other state updates are handled in App.js
      // No need to duplicate that logic here
    } catch (error) {
      logger.error('Create account error:', error);
      // Error will be shown in the CreateAccountModal component
    }
  };

  const handleEditService = async (serviceId, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Your session has expired. Please log in again.');
          onLogout();
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update service');
      }

      const updatedService = await response.json();
      
      // Update the services list with the edited service
      setServices(prevServices => 
        prevServices.map(service => 
          service._id === serviceId ? updatedService : service
        )
      );

      setShowEditModal(false);
      setServiceToEdit(null);
      alert('Service updated successfully');
    } catch (error) {
      logger.error('Error updating service:', error);
      alert(error.message || 'Failed to update service. Please try again.');
    }
  };

  const handleBookingCreate = async (serviceId, requirements) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ serviceId, requirements })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const renderPremiumToggle = () => (
    <button
      onClick={() => setShowPremiumOnly(!showPremiumOnly)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        showPremiumOnly 
          ? 'bg-yellow-500/80 text-white' 
          : 'bg-gray-700/80 text-gray-300'
      }`}
    >
      <FaCrown className={showPremiumOnly ? 'text-white' : 'text-gray-300'} />
      {showPremiumOnly ? 'Show All' : 'Premium Only'}
    </button>
  );

  const handlePremiumUpgrade = (serviceId) => {
    setServiceToUpgrade(serviceId);
    setShowPremiumPaymentModal(true);
  };

  const handlePremiumPaymentSubmit = async (paymentSignature) => {
    try {
      const response = await fetch(`${API_URL}/services/${serviceToUpgrade}/premium-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ paymentId: paymentSignature })
      });

      if (!response.ok) throw new Error('Failed to request premium status');
      
      alert('Premium request submitted successfully! Admin will review your payment.');
      setShowPremiumPaymentModal(false);
      setServiceToUpgrade(null);
    } catch (error) {
      logger.error('Error requesting premium:', error);
      alert('Failed to request premium status');
    }
  };

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setIsLoading(prevState => ({ ...prevState, jobs: true }));
        const data = await fetchJobs();
        setJobs(data);
        setIsLoading(prevState => ({ ...prevState, jobs: false }));
      } catch (error) {
        logger.error('Error fetching jobs:', error);
        // No notification needed here - we'll just retry silently
        
        // Set up a retry after a slight delay
        setTimeout(() => {
          loadJobs();
        }, 2000);
        
        setIsLoading(prevState => ({ ...prevState, jobs: false }));
      }
    };

    loadJobs();
  }, []);

  const handleRefreshJob = async (jobId) => {
    if (!currentUser) {
      showNotification('Please login to refresh your job', 'error');
      return;
    }

    try {
      const refreshedJob = await refreshJob(jobId, currentUser.token);
      setJobs(prevJobs => [refreshedJob, ...prevJobs.filter(job => job._id !== jobId)]);
      showNotification('Job refreshed successfully and moved to top of listing', 'success');
    } catch (error) {
      logger.error('Error refreshing job:', error);
      showNotification(error.message || 'Failed to refresh job', 'error');
    }
  };

  const handleCreateJob = async (jobData) => {
    if (!currentUser) {
      showNotification('Please login to post a job', 'error');
      return;
    }

    try {
      const newJob = await createJob(jobData, currentUser.token);
      setJobs(prevJobs => [newJob, ...prevJobs]);
      setShowJobModal(false);
      showNotification('Job posted successfully', 'success');
    } catch (error) {
      logger.error('Error creating job:', error);
      showNotification(error.message || 'Failed to create job', 'error');
    }
  };

  const handleEditJob = async (jobData) => {
    try {
      const updatedJob = await updateJob(jobData._id, jobData, currentUser.token);
      setJobs(prev => prev.map(job => 
        job._id === updatedJob._id ? updatedJob : job
      ));
      setJobToEdit(null);
      showNotification('Job updated successfully', 'success');
    } catch (error) {
      logger.error('Error updating job:', error);
      showNotification('Failed to update job', 'error');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;

    try {
      await deleteJob(jobId, currentUser.token);
      setJobs(prev => prev.filter(job => job._id !== jobId));
      showNotification('Job deleted successfully', 'success');
    } catch (error) {
      logger.error('Error deleting job:', error);
      showNotification('Failed to delete job', 'error');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-gray-900 to-black text-white">
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
              <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                AQUADS
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
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                Freelancer Hub
              </span>
              {currentUser ? (
                <>
                  <NotificationBell currentUser={currentUser} />
                  <span className="text-blue-300">Welcome, {currentUser.username}!</span>
                  <button
                    onClick={() => setShowDashboard(true)}
                    className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setShowBannerModal(true)}
                    className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Create Banner Ad
                  </button>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={onLogout}
                    className="bg-red-500/80 hover:bg-red-600/80 px-4 py-2 rounded shadow-lg hover:shadow-red-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLoginClick}
                    className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleCreateAccountClick}
                    className="bg-green-500/80 hover:bg-green-600/80 px-4 py-2 rounded shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-2`}>
            <div className="flex flex-col space-y-2">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 text-center">
                Freelancer Hub
              </span>
              {currentUser ? (
                <>
                  <div className="flex justify-center">
                    <NotificationBell currentUser={currentUser} />
                  </div>
                  <span className="text-blue-300 text-center">Welcome, {currentUser.username}!</span>
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
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <BannerDisplay />
          {/* Search and Filters */}
          <div className="mt-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 mb-4 md:mb-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search services..."
                    className="w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-gray-700/80 text-white px-3 py-3 rounded-lg text-sm w-full sm:w-auto"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowPremiumOnly(!showPremiumOnly)}
                  className={`px-3 py-3 rounded-lg transition-colors w-full sm:w-auto text-sm ${
                    showPremiumOnly 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Premium
                </button>
                <button
                  onClick={() => setShowJobs(!showJobs)}
                  className={`px-3 py-3 rounded-lg transition-colors w-full sm:w-auto text-sm ${
                    showJobs 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Jobs
                </button>
                {currentUser && (
                  <button
                    onClick={() => setShowJobModal(true)}
                    className="px-3 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors w-full sm:w-auto text-sm"
                  >
                    Post Job
                  </button>
                )}
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-gray-700/80 text-white px-3 py-3 rounded-lg text-sm w-full sm:w-auto"
                >
                  <option value="highest-rated">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-12 bg-gray-800/30 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">How It Works</h2>
              <button 
                onClick={() => setShowHowItWorks(!showHowItWorks)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showHowItWorks ? '▼ Hide' : '▶ Show'}
              </button>
            </div>
            {showHowItWorks && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
                  <div className="text-3xl mb-3">🔍</div>
                  <h3 className="font-medium text-lg mb-2">1. Find Services</h3>
                  <p className="text-gray-400">Browse through various crypto and blockchain services offered by professionals</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
                  <div className="text-3xl mb-3">💬</div>
                  <h3 className="font-medium text-lg mb-2">2. Connect</h3>
                  <p className="text-gray-400">Contact service providers and discuss your project requirements</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
                  <div className="text-3xl mb-3">✨</div>
                  <h3 className="font-medium text-lg mb-2">3. Get It Done</h3>
                  <p className="text-gray-400">Work with professionals and bring your crypto project to life</p>
                </div>
              </div>
            )}
          </div>

          {/* Featured Services */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{showJobs ? "Job Postings" : "Freelancer Services"}</h2>
              {currentUser ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-indigo-500/80 hover:bg-indigo-600/80 rounded-lg transition-colors"
                >
                  List Your Service
                </button>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="px-4 py-2 bg-indigo-500/80 hover:bg-indigo-600/80 rounded-lg transition-colors"
                >
                  Login to List Service
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {showJobs ? (
                <div className="col-span-3">
                  {isLoading?.jobs ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                      <p className="text-gray-400">Loading jobs...</p>
                    </div>
                  ) : jobs.length > 0 ? (
                    <JobList
                      jobs={jobs}
                      currentUser={currentUser}
                      onEditJob={setJobToEdit}
                      onDeleteJob={handleDeleteJob}
                      onRefreshJob={handleRefreshJob}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No jobs found. <a href="#" onClick={(e) => {e.preventDefault(); setShowJobModal(true);}} className="text-blue-400 hover:underline">Post a job?</a>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {filteredServices.length > 0 ? (
                    filteredServices.map((service) => (
                      <div 
                        key={service._id} 
                        id={`service-${service._id}`}
                        className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden group hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300"
                      >
                        <div className="aspect-w-16 aspect-h-9 relative">
                          <ServiceImageComponent 
                            src={service.image}
                            alt={service.title}
                            className="w-full h-48 object-cover"
                          />
                          <ServiceBadgeComponent badge={service.badge} />
                          {service.isPremium && <PremiumBadge />}
                          {currentUser && service.seller?.username === currentUser.username && (
                            <div className="absolute top-2 right-2 flex gap-2 z-[200000]">
                              {!service.isPremium && (
                                <button
                                  onClick={() => handlePremiumUpgrade(service._id)}
                                  className="bg-yellow-500/80 hover:bg-yellow-600/80 text-white px-3 py-1 rounded-lg shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 backdrop-blur-sm flex items-center gap-1"
                                >
                                  <FaCrown className="text-white" />
                                  Premium
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setServiceToEdit(service);
                                  setShowEditModal(true);
                                }}
                                className="bg-blue-500/80 hover:bg-blue-600/80 text-white px-3 py-1 rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteService(service._id)}
                                className="bg-red-500/80 hover:bg-red-600/80 text-white px-3 py-1 rounded-lg shadow-lg hover:shadow-red-500/50 transition-all duration-300 backdrop-blur-sm"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <UserImage 
                              src={service.seller?.image}
                              alt={service.seller?.username || 'Seller'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">
                                    {service.seller?.username}
                                    {service.isPremium && (
                                      <span className="inline-flex items-center justify-center ml-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full">
                                        <FaCheck className="text-white text-xs" />
                                      </span>
                                    )}
                                    {service.seller?.country && (
                                      <span className="ml-2" title={service.seller.country}>
                                        <CountryFlag countryCode={service.seller.country} />
                                      </span>
                                    )}
                                  </h4>
                                  {service.seller?._id && (
                                    <OnlineStatusIndicator 
                                      user={(() => {
                                        const realTimeStatus = getUserStatus(service.seller._id);
                                        const userData = realTimeStatus || service.seller;
                                        return userData;
                                      })()} 
                                      size="small"
                                    />
                                  )}
                                </div>
                                {service.linkedin && (
                                  <a
                                    href={service.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                    </svg>
                                  </a>
                                )}
                              </div>
                              <button
                                onClick={() => handleShowReviews(service)}
                                className="flex items-center text-sm text-gray-400 hover:text-yellow-500 transition-colors"
                              >
                                <span className="text-yellow-500">★</span>
                                <span className="ml-1">{service.rating || '0.0'}</span>
                                <span className="ml-1">({service.reviews || '0'} reviews)</span>
                              </button>
                            </div>
                          </div>
                          <h3 className="text-lg font-medium mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                            {service.title}
                          </h3>
                          <div className="relative">
                            <p className={`text-gray-400 text-sm mb-4 whitespace-pre-wrap ${expandedDescriptions.has(service._id) ? '' : 'line-clamp-2'}`}>
                              {service.description?.slice(0, 1000)}
                              {service.description?.length > 1000 && '...'}
                            </p>
                            {service.description?.length > 80 && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleDescription(service._id);
                                }}
                                className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
                              >
                                {expandedDescriptions.has(service._id) ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </div>
                          <div className="mt-4">
                            <BookingButton
                              service={service}
                              currentUser={currentUser}
                              onBookingCreate={handleBookingCreate}
                              showNotification={(message, type) => {
                                alert(message); // Using alert for now, can be replaced with a better notification system
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                            <span className="text-gray-400 text-sm">
                              Delivered in {service.deliveryTime} Days
                            </span>
                            <div className="text-right">
                              <div className="text-gray-300 text-sm">
                                <span className="font-semibold">Starting Price:</span>{' '}
                                {service.price} USDC
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {service.telegramUsername && (
                              <a
                                href={`https://t.me/${service.telegramUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-full transition-all duration-300"
                              >
                                <FaTelegram className="mr-1" />
                                <span>Telegram</span>
                              </a>
                            )}
                            {service.twitter && (
                              <a
                                href={service.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-full transition-all duration-300"
                              >
                                <FaTwitter className="mr-1" />
                                <span>Twitter</span>
                              </a>
                            )}
                            {service.discord && (
                              <a
                                href={service.discord}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-full transition-all duration-300"
                              >
                                <FaDiscord className="mr-1" />
                                <span>Discord</span>
                              </a>
                            )}
                            {service.email && (
                              <a
                                href={`mailto:${service.email}`}
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-all duration-300"
                              >
                                <FaEnvelope className="mr-1" />
                                <span>Email</span>
                              </a>
                            )}
                            {service.linkedin && (
                              <a
                                href={service.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-full transition-all duration-300"
                              >
                                <FaLinkedin className="mr-1" />
                                <span>LinkedIn</span>
                              </a>
                            )}
                            {service.website && (
                              <a
                                href={service.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-full transition-all duration-300"
                              >
                                <FaGlobe className="mr-1" />
                                <span>Website</span>
                              </a>
                            )}
                            <button
                              onClick={() => {
                                const referralCode = currentUser?.username || ''; // Get current user's username as referral code
                                const url = `${window.location.origin}/marketplace?service=${service._id}&ref=${referralCode}#${service.title.replace(/\s+/g, '-')}`;
                                navigator.clipboard.writeText(url);
                                alert('Service link copied to clipboard! Share this link with others to help them find your service in the marketplace.');
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-full transition-all duration-300"
                            >
                              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                              </svg>
                              Share
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : services.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-400">No services available yet. Be the first to create one!</p>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-lg text-gray-300 mb-3">No results found{searchTerm ? ` for "${searchTerm}"` : ''}</p>
                      <p className="text-gray-400 mb-4">Try a different search term or clear the search.</p>
                      {searchTerm && (
                        <button 
                          onClick={handleClearSearch}
                          className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Service Modal */}
      {showCreateModal && (
        <CreateServiceModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onCreateService={handleCreateService}
        />
      )}

      {/* Modals */}
      {showProfileModal && currentUser && (
        <ProfileModal
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {/* Reviews Modal */}
      {showReviewsModal && selectedService && (
        <ServiceReviews
          service={selectedService}
          onClose={() => {
            setShowReviewsModal(false);
            setSelectedService(null);
          }}
          currentUser={currentUser}
          showNotification={showNotification}
          onReviewsUpdate={handleReviewsUpdate}
          viewOnly={true}
        />
      )}

      {/* Create Banner Modal */}
      {showBannerModal && (
        <CreateBannerModal
          onClose={() => setShowBannerModal(false)}
          onSubmit={handleBannerSubmit}
        />
      )}

      {/* Login Modal */}
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

      {/* Create Account Modal */}
      {showCreateAccountModal && (
        <CreateAccountModal
          onClose={() => setShowCreateAccountModal(false)}
          onCreateAccount={handleCreateAccountSubmit}
        />
      )}

      {/* Edit Service Modal */}
      {showEditModal && serviceToEdit && (
        <EditServiceModal
          service={serviceToEdit}
          categories={categories}
          onClose={() => {
            setShowEditModal(false);
            setServiceToEdit(null);
          }}
          onEditService={handleEditService}
        />
      )}

      {/* Add Dashboard component */}
      {showDashboard && (
        <Dashboard
          currentUser={currentUser}
          onClose={() => setShowDashboard(false)}
          ads={[]}  // Pass empty array since marketplace doesn't handle ads
        />
      )}

      {/* Premium Payment Modal */}
      {showPremiumPaymentModal && (
        <PremiumPaymentModal
          onClose={() => {
            setShowPremiumPaymentModal(false);
            setServiceToUpgrade(null);
          }}
          onSubmit={handlePremiumPaymentSubmit}
        />
      )}

      {/* Job List */}
      {showJobModal && (
        <CreateJobModal
          onClose={() => setShowJobModal(false)}
          onCreateJob={handleCreateJob}
        />
      )}

      {/* Edit Job Modal */}
      {jobToEdit && (
        <CreateJobModal
          job={jobToEdit}
          onClose={() => setJobToEdit(null)}
          onCreateJob={handleEditJob}
        />
      )}
    </div>
  );
};

export default Marketplace; 