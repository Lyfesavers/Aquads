import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTwitter, FaRocket, FaUsers, FaClock, FaCheck, FaSpinner, FaHistory, FaTimes, FaChevronDown, FaChevronUp, FaBolt, FaFire, FaGem, FaShieldAlt, FaHeadphones, FaInfoCircle, FaExternalLinkAlt } from 'react-icons/fa';
import axios from 'axios';
import { socket } from '../services/api';
import Footer from './Footer';

const API_URL = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com';

// Payment chains
const CHAINS = {
  solana: { name: 'Solana', symbol: 'SOL', icon: '◎', gradient: 'from-purple-500 to-violet-600' },
  ethereum: { name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', gradient: 'from-blue-500 to-indigo-600' },
  base: { name: 'Base', symbol: 'ETH', icon: '🔵', gradient: 'from-blue-400 to-blue-600' },
  polygon: { name: 'Polygon', symbol: 'MATIC', icon: '⬡', gradient: 'from-purple-400 to-violet-600' },
  bnb: { name: 'BNB', symbol: 'BNB', icon: '🟡', gradient: 'from-yellow-400 to-amber-500' }
};

// Duration options
const DURATIONS = [
  { value: 30, label: '30 Min', fullLabel: '30 Minutes', icon: FaBolt, color: 'from-cyan-500 to-blue-500', description: 'Quick trending push' },
  { value: 60, label: '1 Hour', fullLabel: '1 Hour', icon: FaFire, color: 'from-orange-500 to-red-500', description: 'Full Space coverage', popular: true },
  { value: 120, label: '2 Hours', fullLabel: '2 Hours', icon: FaGem, color: 'from-purple-500 to-pink-500', description: 'Extended trending' }
];

// Listener options
const LISTENER_OPTIONS = [100, 200, 500, 1000, 2500, 5000];

const HyperSpace = ({ currentUser }) => {
  const navigate = useNavigate();
  
  // Package selection state
  const [packages, setPackages] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [selectedListeners, setSelectedListeners] = useState(500);
  const [spaceUrl, setSpaceUrl] = useState('');
  
  // Order state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('crypto');
  const [selectedChain, setSelectedChain] = useState('solana');
  const [currentOrderId, setCurrentOrderId] = useState(null);
  
  // Orders history
  const [myOrders, setMyOrders] = useState([]);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Mobile state
  const [showMobileOrderSummary, setShowMobileOrderSummary] = useState(false);
  
  // Order confirmation state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [pollingOrder, setPollingOrder] = useState(false);

  // Memoized star positions for background
  const stars = useMemo(() => 
    [...Array(30)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      opacity: Math.random() * 0.5 + 0.3
    })), []
  );

  // Fetch packages on mount
  useEffect(() => {
    fetchPackages();
  }, []);

  // Fetch user's orders
  useEffect(() => {
    if (currentUser) {
      fetchMyOrders();
    }
  }, [currentUser]);

  // Clear error/success after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Socket listener for real-time order status updates (much faster than polling)
  useEffect(() => {
    if (!currentOrderId) return;

    let fallbackTimeout;
    let isResolved = false;

    const resolveOrder = (order) => {
      if (isResolved) return;
      isResolved = true;
      
      setOrderStatus(order.status);
      if (order.status !== 'awaiting_payment') {
        setShowPayment(false);
        setConfirmedOrder(order);
        setShowConfirmation(true);
        setSpaceUrl('');
        // Refresh orders list
        if (currentUser?.token) {
          axios.get(`${API_URL}/api/hyperspace/my-orders`, {
            headers: { Authorization: `Bearer ${currentUser.token}` }
          }).then(res => {
            if (res.data.success) setMyOrders(res.data.orders);
          }).catch(() => {});
        }
      }
    };

    const handleOrderStatusChange = (data) => {
      if (data.orderId === currentOrderId) {
        resolveOrder({
          orderId: data.orderId,
          status: data.status,
          message: data.message
        });
      }
    };

    const handleOrderStatusLoaded = (data) => {
      if (data.order && data.order.orderId === currentOrderId) {
        resolveOrder(data.order);
      }
    };

    // Listen for socket updates
    if (socket) {
      socket.on('hyperSpaceOrderStatusChanged', handleOrderStatusChange);
      socket.on('hyperSpaceOrderStatusLoaded', handleOrderStatusLoaded);
      
      // Request current status via socket
      if (showPayment) {
        socket.emit('requestHyperSpaceOrderStatus', { orderId: currentOrderId });
      }
    }

    // Fallback: Check via API after 2 seconds if socket hasn't responded
    if (showPayment && currentUser?.token) {
      fallbackTimeout = setTimeout(async () => {
        if (isResolved) return;
        try {
          const response = await axios.get(`${API_URL}/api/hyperspace/order/${currentOrderId}`, {
            headers: { Authorization: `Bearer ${currentUser.token}` }
          });
          if (response.data.success) {
            resolveOrder(response.data.order);
          }
        } catch (err) {
          console.log('Fallback order check:', err.message);
        }
      }, 2000);
    }

    return () => {
      if (socket) {
        socket.off('hyperSpaceOrderStatusChanged', handleOrderStatusChange);
        socket.off('hyperSpaceOrderStatusLoaded', handleOrderStatusLoaded);
      }
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [currentOrderId, showPayment, currentUser?.token]);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/hyperspace/packages`);
      if (response.data.success) {
        setPackages(response.data.packages);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError('Failed to load packages. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOrders = async () => {
    if (!currentUser?.token) return;
    
    setLoadingOrders(true);
    try {
      const response = await axios.get(`${API_URL}/api/hyperspace/my-orders`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (response.data.success) {
        setMyOrders(response.data.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Get current package price
  const getCurrentPrice = useCallback(() => {
    const pkg = packages.find(p => p.listeners === selectedListeners && p.duration === selectedDuration);
    return pkg ? pkg.price : 0;
  }, [packages, selectedListeners, selectedDuration]);

  // Validate Twitter Space URL
  const validateSpaceUrl = (url) => {
    if (!url) return false;
    const twitterSpacePattern = /(twitter\.com|x\.com)\/i\/spaces\//i;
    return twitterSpacePattern.test(url);
  };

  const isValidOrder = spaceUrl && validateSpaceUrl(spaceUrl);

  // Handle order submission
  const handleOrder = async () => {
    if (!currentUser) {
      setError('Please log in to place an order');
      return;
    }

    if (!isValidOrder) {
      setError('Please enter a valid Twitter Space URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/hyperspace/order`, {
        spaceUrl,
        listeners: selectedListeners,
        duration: selectedDuration,
        paymentMethod: selectedPaymentMethod
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      if (response.data.success) {
        setCurrentOrderId(response.data.order.orderId);
        setShowPayment(true);
        setShowMobileOrderSummary(false);
      }
    } catch (err) {
      console.error('Order error:', err);
      setError(err.response?.data?.error || 'Failed to create order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      completed: 'text-green-400 bg-green-400/20 border-green-400/30',
      delivering: 'text-blue-400 bg-blue-400/20 border-blue-400/30',
      processing: 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30',
      pending_approval: 'text-purple-400 bg-purple-400/20 border-purple-400/30',
      failed: 'text-red-400 bg-red-400/20 border-red-400/30',
      awaiting_payment: 'text-orange-400 bg-orange-400/20 border-orange-400/30'
    };
    return colors[status] || 'text-gray-400 bg-gray-400/20 border-gray-400/30';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    if (status === 'completed') return <FaCheck className="text-xs" />;
    if (status === 'delivering' || status === 'processing') return <FaSpinner className="animate-spin text-xs" />;
    return <FaClock className="text-xs" />;
  };

  // Format listener count
  const formatListeners = (count) => count >= 1000 ? `${count / 1000}K` : count;

  // Format duration
  const formatDuration = (mins) => mins >= 60 ? `${mins / 60}h` : `${mins}m`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-300 text-base sm:text-lg">Loading HyperSpace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Animated background - reduced on mobile for performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 sm:-left-40 w-48 h-48 sm:w-96 sm:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="hidden sm:block absolute bottom-20 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        {/* Stars - fewer on mobile */}
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-full animate-pulse"
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.delay,
              opacity: star.opacity
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-6 sm:py-12 pb-32 lg:pb-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-4 sm:mb-6 shadow-lg shadow-purple-500/30">
            <FaHeadphones className="text-2xl sm:text-4xl text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-3 sm:mb-4">
            HyperSpace
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto px-2">
            Boost your listener count to help your Twitter Space trend
          </p>
          
          {/* Feature badges - horizontal scroll on mobile */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 text-xs sm:text-sm overflow-x-auto pb-2 px-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-green-400 whitespace-nowrap">
              <FaShieldAlt className="text-sm sm:text-base" />
              <span>Safe & Secure</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-blue-400 whitespace-nowrap">
              <FaClock className="text-sm sm:text-base" />
              <span>Timely Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-purple-400 whitespace-nowrap">
              <FaUsers className="text-sm sm:text-base" />
              <span>Boost Trending</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Package Selection */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Duration Selection */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-500/20">
              <h2 className="text-base sm:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <FaClock className="text-purple-400" />
                Select Duration
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {DURATIONS.map((duration) => {
                  const Icon = duration.icon;
                  const isSelected = selectedDuration === duration.value;
                  return (
                    <button
                      key={duration.value}
                      onClick={() => setSelectedDuration(duration.value)}
                      className={`relative p-2.5 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 active:scale-95 ${
                        isSelected
                          ? `border-transparent bg-gradient-to-br ${duration.color} shadow-lg`
                          : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50 active:bg-gray-700'
                      }`}
                    >
                      {duration.popular && (
                        <span className="absolute -top-1.5 -right-1 sm:-top-2 sm:-right-2 px-1.5 sm:px-2 py-0.5 bg-yellow-500 text-black text-[10px] sm:text-xs font-bold rounded-full">
                          HOT
                        </span>
                      )}
                      <Icon className={`text-lg sm:text-2xl mb-1 sm:mb-2 mx-auto ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                      <div className={`font-bold text-sm sm:text-lg ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                        <span className="sm:hidden">{duration.label}</span>
                        <span className="hidden sm:inline">{duration.fullLabel}</span>
                      </div>
                      <div className={`text-[10px] sm:text-sm mt-0.5 sm:mt-1 ${isSelected ? 'text-white/80' : 'text-gray-400'} hidden xs:block`}>
                        {duration.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Listeners Selection */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-500/20">
              <h2 className="text-base sm:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <FaUsers className="text-pink-400" />
                Number of Listeners
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {LISTENER_OPTIONS.map((count) => {
                  const isSelected = selectedListeners === count;
                  return (
                    <button
                      key={count}
                      onClick={() => setSelectedListeners(count)}
                      className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all duration-200 active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-gray-700/50 text-gray-300 border border-gray-600 hover:border-purple-500/50 active:bg-gray-700'
                      }`}
                    >
                      {formatListeners(count)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3 flex items-center gap-1.5">
                <FaInfoCircle className="flex-shrink-0" />
                <span>More listeners = higher trending potential + bulk savings!</span>
              </p>
            </div>

            {/* Important Notice - 24 Hour Scheduling */}
            <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-red-500/30">
              <h3 className="text-sm sm:text-base font-semibold text-red-400 mb-2 flex items-center gap-2">
                <FaClock />
                ⚠️ Important: Schedule Ahead
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                <strong className="text-white">Your Space must be scheduled at least 24 hours in advance</strong> to ensure delivery. 
                Orders placed for Spaces starting sooner may not be fulfilled in time. Plan ahead!
              </p>
            </div>

            {/* How It Works Info Box */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-amber-500/30">
              <h3 className="text-sm sm:text-base font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <FaInfoCircle />
                How It Works
              </h3>
              <ul className="text-xs sm:text-sm text-gray-300 space-y-1.5 sm:space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>Listeners appear in the <strong className="text-white">overflow section</strong> (not in the visible listener circle)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>High listener count helps your Space <strong className="text-white">trend on Twitter</strong> and get discovered</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span><strong className="text-white">Important:</strong> Have real profiles with PFPs as speakers/co-hosts to keep your Space looking authentic</span>
                </li>
              </ul>
            </div>

            {/* Space URL Input */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-500/20">
              <h2 className="text-base sm:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <FaTwitter className="text-cyan-400" />
                Twitter Space URL
              </h2>
              <div className="relative">
                <input
                  type="url"
                  value={spaceUrl}
                  onChange={(e) => setSpaceUrl(e.target.value)}
                  placeholder="https://twitter.com/i/spaces/..."
                  className={`w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-700/50 border-2 rounded-lg sm:rounded-xl text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none transition-all pr-10 ${
                    spaceUrl && !validateSpaceUrl(spaceUrl)
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-gray-600 focus:border-purple-500'
                  }`}
                />
                {spaceUrl && (
                  <div className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 ${
                    validateSpaceUrl(spaceUrl) ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {validateSpaceUrl(spaceUrl) ? <FaCheck /> : <FaTimes />}
                  </div>
                )}
              </div>
              {spaceUrl && !validateSpaceUrl(spaceUrl) && (
                <p className="text-xs sm:text-sm text-red-400 mt-2">
                  Enter a valid Twitter Space URL (twitter.com/i/spaces/...)
                </p>
              )}
            </div>

            {/* Error/Success Messages - Mobile */}
            {(error || success) && (
              <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl text-sm ${
                error 
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400' 
                  : 'bg-green-500/20 border border-green-500/30 text-green-400'
              }`}>
                {error || success}
              </div>
            )}
          </div>

          {/* Right Column - Order Summary (Desktop) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 sticky top-8">
              <h2 className="text-xl font-semibold text-white mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Listeners</span>
                  <span className="text-white font-bold">{selectedListeners.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white font-bold">
                    {DURATIONS.find(d => d.value === selectedDuration)?.fullLabel}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Delivery</span>
                  <span className="text-purple-400 font-medium">Before Space</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Total Price</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {getCurrentPrice()} USDC
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="text-sm text-gray-400 mb-2 block">Payment Method</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPaymentMethod('crypto')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                      selectedPaymentMethod === 'crypto'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Crypto
                  </button>
                  <button
                    onClick={() => setSelectedPaymentMethod('paypal')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                      selectedPaymentMethod === 'paypal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    PayPal
                  </button>
                </div>
              </div>

              {/* Order Button */}
              {currentUser ? (
                <button
                  onClick={handleOrder}
                  disabled={submitting || !isValidOrder}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                    submitting || !isValidOrder
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <FaSpinner className="animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <FaRocket />
                      Launch HyperSpace
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/home')}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg transition-all"
                >
                  Log In to Order
                </button>
              )}

              {/* Features */}
              <div className="mt-6 space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <FaCheck className="text-green-400 flex-shrink-0" />
                  <span>Delivered before your Space</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheck className="text-green-400 flex-shrink-0" />
                  <span>Boost trending potential</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheck className="text-green-400 flex-shrink-0" />
                  <span>Overflow section listeners</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheck className="text-green-400 flex-shrink-0" />
                  <span>24/7 support available</span>
                </div>
              </div>

              {/* Important Notice */}
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-300">
                  <strong>⚠️ Important:</strong> Schedule your Space at least 24 hours in advance to ensure delivery!
                </p>
              </div>

              {/* Pro Tip */}
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300">
                  <strong>💡 Pro Tip:</strong> Invite real friends as speakers/co-hosts so their PFPs show in the main circle while our listeners boost your count!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order History Section */}
        {currentUser && (
          <div className="max-w-6xl mx-auto mt-8 sm:mt-12">
            <button
              onClick={() => setShowOrderHistory(!showOrderHistory)}
              className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 hover:text-purple-400 transition-colors"
            >
              <FaHistory />
              Order History
              {myOrders.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full">
                  {myOrders.length}
                </span>
              )}
              {showOrderHistory ? <FaChevronUp className="ml-auto" /> : <FaChevronDown className="ml-auto" />}
            </button>

            {showOrderHistory && (
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-purple-500/20 overflow-hidden">
                {loadingOrders ? (
                  <div className="p-6 sm:p-8 text-center">
                    <FaSpinner className="animate-spin text-xl sm:text-2xl text-purple-400 mx-auto" />
                  </div>
                ) : myOrders.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center text-gray-400">
                    <FaHistory className="text-3xl sm:text-4xl mx-auto mb-2 opacity-50" />
                    <p className="text-sm sm:text-base">No orders yet</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: Card View */}
                    <div className="sm:hidden divide-y divide-gray-700">
                      {myOrders.map((order) => (
                        <div key={order.orderId} className="p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-mono text-gray-400">{order.orderId}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-white">
                              <span className="font-bold">{order.listeners.toLocaleString()}</span>
                              <span className="text-gray-400"> listeners</span>
                            </div>
                            <span className="text-white font-bold">{order.price} USDC</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{formatDuration(order.duration)}</span>
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Desktop: Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Order ID</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Listeners</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Duration</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Price</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {myOrders.map((order) => (
                            <tr key={order.orderId} className="hover:bg-gray-700/30 transition-colors">
                              <td className="px-4 py-3 text-sm text-white font-mono">{order.orderId}</td>
                              <td className="px-4 py-3 text-sm text-white">{order.listeners.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-white">
                                {order.duration >= 60 ? `${order.duration / 60} Hour${order.duration > 60 ? 's' : ''}` : `${order.duration} Min`}
                              </td>
                              <td className="px-4 py-3 text-sm text-white font-bold">{order.price} USDC</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                  {getStatusIcon(order.status)}
                                  {order.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-400">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-purple-500/30 p-3 sm:p-4 z-40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-xs text-gray-400">
              {formatListeners(selectedListeners)} listeners • {DURATIONS.find(d => d.value === selectedDuration)?.label}
            </div>
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {getCurrentPrice()} <span className="text-sm">USDC</span>
            </div>
          </div>
          
          {currentUser ? (
            <button
              onClick={handleOrder}
              disabled={submitting || !isValidOrder}
              className={`px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all whitespace-nowrap ${
                submitting || !isValidOrder
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white active:scale-95'
              }`}
            >
              {submitting ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <FaRocket />
                  <span>Launch</span>
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => navigate('/home')}
              className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-cyan-600 to-blue-600 text-white whitespace-nowrap active:scale-95"
            >
              Log In
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 border-t sm:border border-purple-500/30 animate-slide-up sm:animate-none">
            <div className="flex justify-between items-center mb-5 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white">Complete Payment</h3>
              <button
                onClick={() => {
                  setShowPayment(false);
                  setCurrentOrderId(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-4 mb-5 sm:mb-6">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gray-400">Order ID</span>
                <span className="text-white font-mono text-xs sm:text-sm">{currentOrderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Amount</span>
                <span className="text-2xl sm:text-3xl font-bold text-purple-400">{getCurrentPrice()} USDC</span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelectedPaymentMethod('crypto')}
                className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                  selectedPaymentMethod === 'crypto'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                Crypto
              </button>
              <button
                onClick={() => setSelectedPaymentMethod('paypal')}
                className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                  selectedPaymentMethod === 'paypal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                PayPal
              </button>
            </div>

            {selectedPaymentMethod === 'crypto' ? (
              <>
                <p className="text-gray-300 text-sm mb-4">
                  Select your preferred chain:
                </p>
                
                {/* Chain Selection - Better mobile grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {Object.entries(CHAINS).map(([key, chain]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedChain(key)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                        selectedChain === key
                          ? `bg-gradient-to-r ${chain.gradient} text-white`
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <span>{chain.icon}</span>
                      <span>{chain.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const aquaPayUrl = `https://aquads.xyz/pay/aquads?amount=${getCurrentPrice()}&hyperspaceOrderId=${currentOrderId}`;
                    window.open(aquaPayUrl, '_blank');
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <FaExternalLinkAlt className="text-sm" />
                  Pay with AquaPay
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-300 text-sm mb-4">
                  You'll be redirected to PayPal to complete payment.
                </p>
                <button
                  onClick={() => {
                    window.open(`https://paypal.me/aquads/${getCurrentPrice()}`, '_blank');
                  }}
                  className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <FaExternalLinkAlt className="text-sm" />
                  Pay with PayPal
                </button>
              </>
            )}

            <p className="text-xs text-gray-500 mt-4 text-center">
              Your order will be processed and delivered before your scheduled Space.
            </p>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {showConfirmation && confirmedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-3xl p-8 max-w-md w-full border border-purple-500/30 shadow-2xl shadow-purple-500/20 animate-slide-up">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                confirmedOrder.status === 'failed' 
                  ? 'bg-gradient-to-br from-red-500 to-red-600' 
                  : confirmedOrder.status === 'completed'
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
              }`}>
                {confirmedOrder.status === 'failed' ? (
                  <FaTimes className="text-4xl text-white" />
                ) : confirmedOrder.status === 'completed' ? (
                  <FaCheck className="text-4xl text-white" />
                ) : (
                  <FaHeadphones className="text-4xl text-white animate-pulse" />
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-center mb-2 text-white">
              {confirmedOrder.status === 'failed' 
                ? 'Order Failed' 
                : confirmedOrder.status === 'completed'
                  ? 'Order Completed!'
                  : 'Payment Received!'}
            </h3>

            {/* Status message */}
            <p className="text-gray-300 text-center mb-6">
              {confirmedOrder.status === 'failed' 
                ? 'Something went wrong. Please contact support.' 
                : confirmedOrder.status === 'completed'
                  ? 'Your listeners have been delivered successfully!'
                  : confirmedOrder.status === 'delivering'
                    ? 'Listeners are being delivered to your Space!'
                    : confirmedOrder.status === 'pending_approval'
                      ? 'Your order is confirmed and will be processed within 24 hours before your Space starts.'
                      : 'Your order is being processed...'}
            </p>

            {/* Order Details */}
            <div className="bg-black/40 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Order ID</span>
                <span className="text-white font-mono">{confirmedOrder.orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Package</span>
                <span className="text-white">{confirmedOrder.listenerCount || confirmedOrder.listeners} listeners</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Duration</span>
                <span className="text-white">{confirmedOrder.duration} minutes</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`font-semibold ${
                  confirmedOrder.status === 'failed' ? 'text-red-400' :
                  confirmedOrder.status === 'completed' ? 'text-green-400' :
                  confirmedOrder.status === 'delivering' ? 'text-blue-400' :
                  confirmedOrder.status === 'pending_approval' ? 'text-purple-400' :
                  'text-yellow-400'
                }`}>
                  {confirmedOrder.status === 'delivering' ? '🚀 Delivering...' :
                   confirmedOrder.status === 'completed' ? '✅ Completed' :
                   confirmedOrder.status === 'failed' ? '❌ Failed' :
                   confirmedOrder.status === 'pending_approval' ? '✨ Confirmed' :
                   '⏳ Processing...'}
                </span>
              </div>
            </div>

            {/* Live indicator for delivering status */}
            {confirmedOrder.status === 'delivering' && (
              <div className="flex items-center justify-center gap-2 mb-6 text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                <span className="text-sm">Listeners are joining your Space in real-time</span>
              </div>
            )}

            {/* Pending approval info */}
            {confirmedOrder.status === 'pending_approval' && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaClock className="text-purple-400 text-lg flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-purple-300 mb-1">Order Confirmed!</p>
                    <p>Listeners will be delivered before your scheduled Space. Make sure your Space is scheduled at least 24 hours in advance.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmedOrder(null);
                  setShowOrderHistory(true);
                }}
                className="flex-1 py-3 bg-gray-700/50 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors"
              >
                View Orders
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmedOrder(null);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-20 lg:pb-0">
        <Footer />
      </div>

      {/* Custom styles */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HyperSpace;
