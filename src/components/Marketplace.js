import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CreateServiceModal from './CreateServiceModal';
import ServiceReviews from './ServiceReviews';
import { createService, fetchServices } from '../services/api';
import { API_URL } from '../services/api';
import ProfileModal from './ProfileModal';
import BannerDisplay from './BannerDisplay';
import CreateBannerModal from './CreateBannerModal';
import { Button } from 'react-bootstrap';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import EditServiceModal from './EditServiceModal';

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
const ServiceImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(getImageUrl(src));

  return (
    <img 
      src={imgSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        console.warn(`Image failed to load: ${imgSrc}`);
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
        console.warn(`User image failed to load: ${imgSrc}`);
        e.target.onerror = null;
        setImgSrc('https://placehold.co/40x40?text=User');
      }}
    />
  );
};

const ServiceBadge = ({ badge }) => {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
  const [sortOption, setSortOption] = useState('newest');
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);

  const categories = [
    { id: 'smart-contract', name: 'Smart Contract Development', icon: '⚡' },
    { id: 'audit', name: 'Security Auditing', icon: '🔒' },
    { id: 'marketing', name: 'Crypto Marketing', icon: '📢' },
    { id: 'community', name: 'Community Management', icon: '👥' },
    { id: 'web3', name: 'Web3 Development', icon: '🌐' },
    { id: 'tokenomics', name: 'Tokenomics Design', icon: '📊' },
    { id: 'writing', name: 'Technical Writing', icon: '📝' },
    { id: 'consulting', name: 'Blockchain Consulting', icon: '💡' }
  ];

  // Load services when component mounts
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await fetchServices();
      const services = data.services || [];
      
      // Fetch initial review data for each service
      const servicesWithReviews = await Promise.all(services.map(async (service) => {
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
          console.error(`Error fetching reviews for service ${service._id}:`, error);
          return service;
        }
      }));

      setServices(servicesWithReviews);
      setLoading(false);
    } catch (error) {
      console.error('Error loading services:', error);
      setError('Failed to load services');
      setLoading(false);
    }
  };

  const handleCreateService = async (serviceData) => {
    try {
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
      console.log('Submitting service with data:', serviceData);

      // Create service with direct data
      const newService = await createService(serviceData);
      console.log('Service created successfully:', newService);
      
      // Update services list
      setServices(prevServices => [newService, ...prevServices]);
      
      // Close modal
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating service:', error);
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
      console.error('Error deleting service:', error);
      alert(error.message || 'Failed to delete service. Please try again.');
    }
  };

  const handleShowReviews = (service) => {
    setSelectedService(service);
    setShowReviewsModal(true);
  };

  const handleReviewsUpdate = (updatedService) => {
    if (!updatedService?._id) {
      console.error('No service data provided for update');
      return;
    }

    console.log('Updating service with new data:', updatedService);
    
    // Update the services array with the new data
    setServices(prevServices => {
      const newServices = prevServices.map(service => 
        service._id === updatedService._id 
          ? { ...service, rating: updatedService.rating, reviews: updatedService.reviews }
          : service
      );
      console.log('Updated services:', newServices);
      return newServices;
    });
  };

  const showNotification = (message, type = 'info') => {
    // You can implement this function to show notifications
    // For now, we'll just use alert
    alert(message);
  };

  // Update useEffect to log the correct token source
  useEffect(() => {
    console.log('Current user:', currentUser);
    console.log('Token available:', currentUser?.token ? 'yes' : 'no');
  }, [currentUser]);

  // Add sorting function
  const sortServices = (services, option) => {
    const servicesCopy = [...services];
    switch (option) {
      case 'highest-rated':
        return servicesCopy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'price-low':
        return servicesCopy.sort((a, b) => a.price - b.price);
      case 'price-high':
        return servicesCopy.sort((a, b) => b.price - a.price);
      case 'newest':
      default:
        return servicesCopy; // Services are already sorted by newest from the API
    }
  };

  // Update the filtered services to include sorting
  const filteredServices = sortServices(
    selectedCategory 
      ? services.filter(service => service.category === selectedCategory)
      : services,
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
      // Generate a temporary transaction signature
      const tempTxSignature = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      
      // Log current user data to debug
      console.log('Current user data:', currentUser);
      
      // Get the correct owner ID (it might be in a different property)
      const ownerId = currentUser._id || currentUser.id || currentUser.userId;
      
      if (!ownerId) {
        throw new Error('User ID not found. Please try logging in again.');
      }

      // Ensure all required fields are present
      const requestData = {
        title: bannerData.title,
        gif: bannerData.gif,
        url: bannerData.url,
        duration: bannerData.duration,
        owner: ownerId,
        txSignature: tempTxSignature,
        status: bannerData.status || 'pending'
      };

      console.log('Submitting banner ad with data:', requestData);
      
      const response = await fetch(`${API_URL}/bannerAds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(errorData.error || 'Failed to create banner ad');
      }

      const data = await response.json();
      console.log('Banner ad created:', data);
      setShowBannerModal(false);
    } catch (error) {
      console.error('Error creating banner ad:', error);
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
      console.error('Login error:', error);
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
      console.error('Create account error:', error);
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
      console.error('Error updating service:', error);
      alert(error.message || 'Failed to update service. Please try again.');
    }
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
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                AQUADUCT
              </span>
              {currentUser ? (
                <>
                  <span className="text-blue-300">Welcome, {currentUser.username}!</span>
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
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BannerDisplay />
          {/* Search and Filters */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search services..."
                  className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sortOption}
                  onChange={handleSortChange}
                  className="bg-gray-800/50 text-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="highest-rated">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Browse Categories</h2>
            <div className="relative">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-6 py-4 bg-gray-800/50 backdrop-blur-sm rounded-lg cursor-pointer
                  border-2 border-transparent hover:border-indigo-500/50 focus:border-indigo-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                  transition-all duration-300
                  text-lg font-medium
                  appearance-none
                  shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-indigo-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
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
              <h2 className="text-2xl font-bold">Featured Services</h2>
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
              {filteredServices.length > 0 ? (
                filteredServices.map(service => (
                  <div key={service._id} className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden group hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300">
                    <div className="aspect-w-16 aspect-h-9 relative">
                      <ServiceImage 
                        src={service.image}
                        alt={service.title}
                        className="w-full h-48 object-cover"
                      />
                      <ServiceBadge badge={service.badge} />
                      {currentUser && service.seller?.username === currentUser.username && (
                        <div className="absolute top-2 right-2 flex gap-2 z-10">
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
                            <h4 className="font-medium">{service.seller?.username}</h4>
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
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <span className="text-gray-400 text-sm">
                          Delivered in {service.deliveryTime}
                        </span>
                        <div className="text-right">
                          <div className="text-gray-300 text-sm">
                            <span className="font-semibold">Price:</span>{' '}
                            {service.price} USDC
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/services/${service._id}`;
                            navigator.clipboard.writeText(url);
                            alert('Service link copied to clipboard!');
                          }}
                          className="inline-flex items-center px-4 py-2 bg-indigo-500/80 hover:bg-indigo-600/80 rounded-lg transition-colors text-white"
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                          </svg>
                          Share
                        </button>
                        <a
                          href={`https://t.me/${service.telegramUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-500/80 hover:bg-blue-600/80 rounded-lg transition-colors text-white"
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.056-.056-.212s-.041-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.49-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.324-.437.892-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.119.098.152.228.166.331.016.122.033.391.019.603z"/>
                          </svg>
                          Contact on Telegram
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
                  <p className="text-gray-400 text-center">No services found in this category yet.</p>
                </div>
              )}
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            {/* Remove the Create Banner Ad button from here */}
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
        />
      )}

      {/* Create Banner Modal */}
      {showBannerModal && (
        <CreateBannerModal
          show={showBannerModal}
          onHide={() => setShowBannerModal(false)}
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
    </div>
  );
};

export default Marketplace; 