import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaTwitter, FaRocket, FaUsers, FaClock, FaCheck, FaSpinner, FaHistory, FaTimes, FaChevronDown, FaChevronUp, FaBolt, FaFire, FaGem, FaShieldAlt, FaHeadphones, FaInfoCircle, FaExternalLinkAlt, FaHome, FaArrowLeft, FaStopwatch, FaChartLine, FaFingerprint, FaCrown } from 'react-icons/fa';
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

// Countdown Timer Component for active deliveries
const CountdownTimer = ({ endsAt, onComplete, compact = false }) => {
  const [timeLeft, setTimeLeft] = React.useState(null);
  
  React.useEffect(() => {
    if (!endsAt) return;
    
    const calculateTimeLeft = () => {
      const now = Date.now();
      const endTime = new Date(endsAt).getTime();
      const diff = endTime - now;
      
      if (diff <= 0) {
        onComplete?.();
        return { hours: 0, minutes: 0, seconds: 0, expired: true };
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return { hours, minutes, seconds, expired: false };
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [endsAt, onComplete]);
  
  if (!timeLeft || timeLeft.expired) {
    return (
      <span className="text-green-400 text-xs font-medium flex items-center gap-1">
        <FaCheck className="text-[10px]" />
        Complete
      </span>
    );
  }
  
  const { hours, minutes, seconds } = timeLeft;
  const isLowTime = hours === 0 && minutes < 5;
  
  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs font-mono ${isLowTime ? 'text-red-400' : 'text-cyan-400'}`}>
        <FaStopwatch className={`text-[10px] ${isLowTime ? 'animate-pulse' : ''}`} />
        <span>
          {hours > 0 && `${hours}:`}
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${
      isLowTime 
        ? 'bg-red-500/20 border border-red-500/30' 
        : 'bg-cyan-500/20 border border-cyan-500/30'
    }`}>
      <FaStopwatch className={`text-xs ${isLowTime ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
      <span className={`text-xs font-mono font-bold ${isLowTime ? 'text-red-400' : 'text-cyan-400'}`}>
        {hours > 0 && `${hours}:`}
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      <span className={`text-[10px] ${isLowTime ? 'text-red-400/70' : 'text-cyan-400/70'}`}>left</span>
    </div>
  );
};

const STORAGE_KEY_PAYPAL_RETURN = 'hyperspacePaypalReturnOrder';
const PAYPAL_RETURN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const HyperSpace = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
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
  const [confirmingPayPal, setConfirmingPayPal] = useState(false);

  // Refs for sticky horizontal scrollbar sync
  const tableScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableWidthRef = useRef(null);
  const scrollSyncRef = useRef(false);

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

  // When user returns from PayPal (return-to-merchant): show confirmation modal
  useEffect(() => {
    if (!currentUser?.token) return;

    const fromPayPal = searchParams.get('paypal') === 'return' || searchParams.get('paypal') === 'success';
    let stored;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAYPAL_RETURN);
      if (!raw) return;
      stored = JSON.parse(raw);
      if (!stored?.orderId || !stored?.ts) return;
      const age = Date.now() - stored.ts;
      if (age > PAYPAL_RETURN_WINDOW_MS && !fromPayPal) return; // only use old storage if URL says we came from PayPal
      if (age > PAYPAL_RETURN_WINDOW_MS) return;
    } catch {
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/hyperspace/order/${stored.orderId}`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        if (cancelled || !response.data.success || !response.data.order) return;
        const order = response.data.order;
        if (order.status === 'awaiting_payment') return; // not paid yet
        setConfirmedOrder({
          orderId: order.orderId,
          status: order.status,
          listenerCount: order.listenerCount ?? order.listeners,
          duration: order.duration,
          deliveryEndsAt: order.deliveryEndsAt
        });
        setShowConfirmation(true);
        setShowPayment(false);
        setCurrentOrderId(order.orderId);
        fetchMyOrders();
      } catch {
        // Silent fail
      } finally {
        try {
          localStorage.removeItem(STORAGE_KEY_PAYPAL_RETURN);
        } catch {}
      }
    };
    run();
    return () => { cancelled = true; };
  }, [currentUser?.token, searchParams]);

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

  // Socket listener for real-time order status updates - ALWAYS listen when we have an orderId
  useEffect(() => {
    if (!socket || !currentOrderId) return;

    const handleOrderStatusChange = (data) => {
      // Check if this update is for our current order
      if (data.orderId === currentOrderId) {
        setOrderStatus(data.status);
        
        // If order is no longer awaiting payment, show confirmation immediately
        if (data.status !== 'awaiting_payment') {
          setShowPayment(false);
          setConfirmedOrder({
            orderId: data.orderId,
            status: data.status,
            message: data.message,
            listenerCount: data.listenerCount,
            duration: data.duration,
            deliveryEndsAt: data.deliveryEndsAt,
            autoCompleted: data.autoCompleted
          });
          setShowConfirmation(true);
          setSpaceUrl('');
          // Request updated orders via socket
          if (currentUser) {
            socket.emit('requestUserHyperSpaceOrders', { userId: currentUser.userId || currentUser.id });
          }
        }
      }
    };

    const handleOrderStatusLoaded = (data) => {
      if (data.order && data.order.orderId === currentOrderId) {
        setOrderStatus(data.order.status);
        if (data.order.status !== 'awaiting_payment') {
          setShowPayment(false);
          setConfirmedOrder(data.order);
          setShowConfirmation(true);
          setSpaceUrl('');
          if (currentUser) {
            socket.emit('requestUserHyperSpaceOrders', { userId: currentUser.userId || currentUser.id });
          }
        }
      }
    };

    socket.on('hyperSpaceOrderStatusChanged', handleOrderStatusChange);
    socket.on('hyperSpaceOrderStatusLoaded', handleOrderStatusLoaded);

    // Request current status immediately
    socket.emit('requestHyperSpaceOrderStatus', { orderId: currentOrderId });

    return () => {
      socket.off('hyperSpaceOrderStatusChanged', handleOrderStatusChange);
      socket.off('hyperSpaceOrderStatusLoaded', handleOrderStatusLoaded);
    };
  }, [socket, currentOrderId, currentUser]);

  // Fallback polling - check every 1.5 seconds while payment modal is open
  useEffect(() => {
    if (!currentOrderId || !showPayment || !currentUser?.token) return;

    const checkOrderStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/hyperspace/order/${currentOrderId}`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        if (response.data.success && response.data.order.status !== 'awaiting_payment') {
          setShowPayment(false);
          setConfirmedOrder(response.data.order);
          setShowConfirmation(true);
          setSpaceUrl('');
          fetchMyOrders();
        }
      } catch (err) {
        // Silent fail for polling
      }
    };

    // Check immediately after 1 second, then every 1.5 seconds
    const initialCheck = setTimeout(checkOrderStatus, 1000);
    const pollInterval = setInterval(checkOrderStatus, 1500);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(pollInterval);
    };
  }, [currentOrderId, showPayment, currentUser?.token]);

  // Fetch packages via socket with API fallback
  const fetchPackages = useCallback(() => {
    if (socket) {
      socket.emit('requestHyperSpacePackages');
      // Fallback to API if socket doesn't respond in 1.5s
      setTimeout(async () => {
        if (loading) {
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
        }
      }, 1500);
    } else {
      // No socket, use API directly
      axios.get(`${API_URL}/api/hyperspace/packages`)
        .then(res => {
          if (res.data.success) setPackages(res.data.packages);
        })
        .catch(err => {
          console.error('Error fetching packages:', err);
          setError('Failed to load packages. Please refresh the page.');
        })
        .finally(() => setLoading(false));
    }
  }, [socket, loading]);

  // Socket listener for packages
  useEffect(() => {
    if (!socket) return;

    const handlePackagesLoaded = (data) => {
      if (data.packages) {
        setPackages(data.packages);
        setLoading(false);
      }
    };

    socket.on('hyperSpacePackagesLoaded', handlePackagesLoaded);

    return () => {
      socket.off('hyperSpacePackagesLoaded', handlePackagesLoaded);
    };
  }, [socket]);

  // Fetch orders via socket (faster) with API fallback - uses limit 100 to get all orders
  const fetchMyOrders = useCallback(() => {
    if (!currentUser) return;
    
    setLoadingOrders(true);
    
    const fetchViaApi = () => {
      if (!currentUser?.token) return;
      axios.get(`${API_URL}/api/hyperspace/my-orders`, {
        params: { limit: 100 },
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        if (res.data.success) setMyOrders(res.data.orders);
      }).catch(err => {
        console.error('Error fetching orders:', err);
      }).finally(() => {
        setLoadingOrders(false);
      });
    };

    if (socket) {
      socket.emit('requestUserHyperSpaceOrders', { 
        userId: currentUser.userId || currentUser.id 
      });
      setTimeout(fetchViaApi, 1500);
    } else {
      fetchViaApi();
    }
  }, [currentUser, socket]);

  // Socket listener for user's order history
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleOrdersLoaded = (data) => {
      if (data.orders) {
        setMyOrders(data.orders);
        setLoadingOrders(false);
      }
    };

    const handleOrdersError = () => {
      setLoadingOrders(false);
    };

    socket.on('userHyperSpaceOrdersLoaded', handleOrdersLoaded);
    socket.on('userHyperSpaceOrdersError', handleOrdersError);

    return () => {
      socket.off('userHyperSpaceOrdersLoaded', handleOrdersLoaded);
      socket.off('userHyperSpaceOrdersError', handleOrdersError);
    };
  }, [socket, currentUser]);

  // Sync table width for sticky horizontal scrollbar
  useEffect(() => {
    if (!showOrderHistory || !myOrders.length || loadingOrders) return;
    const syncWidth = () => {
      if (tableScrollRef.current && tableWidthRef.current) {
        tableWidthRef.current.style.width = `${tableScrollRef.current.scrollWidth}px`;
      }
    };
    syncWidth();
    const t = setTimeout(syncWidth, 50);
    return () => clearTimeout(t);
  }, [showOrderHistory, myOrders.length, loadingOrders]);

  // Sticky horizontal scrollbar - sync table and bottom scrollbar (avoid mutual trigger loop)
  const handleTableScroll = useCallback(() => {
    if (scrollSyncRef.current) return;
    scrollSyncRef.current = true;
    if (bottomScrollRef.current && tableScrollRef.current) {
      bottomScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { scrollSyncRef.current = false; });
  }, []);
  const handleBottomScroll = useCallback(() => {
    if (scrollSyncRef.current) return;
    scrollSyncRef.current = true;
    if (tableScrollRef.current && bottomScrollRef.current) {
      tableScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { scrollSyncRef.current = false; });
  }, []);

  // Get current package price
  const getCurrentPrice = useCallback(() => {
    const pkg = packages.find(p => p.listeners === selectedListeners && p.duration === selectedDuration);
    return pkg ? pkg.price : 0;
  }, [packages, selectedListeners, selectedDuration]);

  // Get PayPal payment link based on selected duration
  const getPayPalLink = useCallback(() => {
    const paypalLinks = {
      30: 'https://www.paypal.com/ncp/payment/PR4ZXFNWU7WFL',   // 30 min
      60: 'https://www.paypal.com/ncp/payment/DAG9HMLF7SZGJ',   // 1 hour
      120: 'https://www.paypal.com/ncp/payment/FK744D3UZL298'  // 2 hours
    };
    return paypalLinks[selectedDuration] || paypalLinks[60]; // Default to 1 hour if duration not found
  }, [selectedDuration]);

  // When user pays via PayPal: confirm payment so order moves to pending_approval and shows in admin tab
  const handlePayPalPayment = useCallback(async () => {
    if (!currentOrderId || !currentUser) return;
    setConfirmingPayPal(true);
    setError(null);
    try {
      await axios.post(
        `${API_URL}/api/hyperspace/order/${currentOrderId}/confirm-payment`,
        { txSignature: 'paypal' },
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      setSuccess('Order submitted for verification. Complete payment in the new tab. Our team will process it shortly.');
      // Store for return-to-merchant: when PayPal redirects back to /hyperspace we can show confirmation modal
      try {
        localStorage.setItem(STORAGE_KEY_PAYPAL_RETURN, JSON.stringify({
          orderId: currentOrderId,
          listenerCount: selectedListeners,
          duration: selectedDuration,
          ts: Date.now()
        }));
      } catch {}
      window.open(getPayPalLink(), '_blank');
      // Show confirmation UI so user sees order is "pending"
      setShowPayment(false);
      setConfirmedOrder({
        orderId: currentOrderId,
        status: 'pending_approval',
        listenerCount: selectedListeners,
        duration: selectedDuration
      });
      setShowConfirmation(true);
      setSpaceUrl('');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to confirm payment. Please try again.';
      setError(msg);
    } finally {
      setConfirmingPayPal(false);
    }
  }, [currentOrderId, currentUser, getPayPalLink, selectedListeners, selectedDuration]);

  // Get current package details including savings
  const getCurrentPackage = useCallback(() => {
    return packages.find(p => p.listeners === selectedListeners && p.duration === selectedDuration);
  }, [packages, selectedListeners, selectedDuration]);

  // Get savings for a specific duration
  const getSavingsForDuration = useCallback((duration) => {
    const pkg = packages.find(p => p.listeners === selectedListeners && p.duration === duration);
    return pkg ? { savings: pkg.savings, savingsPercent: pkg.savingsPercent, originalPrice: pkg.originalPrice } : null;
  }, [packages, selectedListeners]);

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
      {/* Immersive background - nebula + subtle grid */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-purple-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 sm:-left-40 w-48 h-48 sm:w-96 sm:h-96 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="hidden sm:block absolute bottom-20 right-1/3 w-64 h-64 bg-pink-500/8 rounded-full blur-3xl" />
        {/* Subtle radial vignette for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        {/* Stars */}
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white/60 rounded-full"
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
        {/* Top bar: Back to Home (left) + My Orders (right) */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all duration-200 group text-sm"
          >
            <FaArrowLeft className="text-xs group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </button>
          {currentUser && (
            <button
              onClick={() => {
                setShowOrderHistory(true);
                fetchMyOrders();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all duration-200 text-sm font-medium"
            >
              <FaHistory className="text-sm" />
              <span>My Orders</span>
              {myOrders.length > 0 && (
                <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full">
                  {myOrders.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Header - Immersive hero */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600 mb-5 sm:mb-6 shadow-xl shadow-purple-500/25 ring-2 ring-white/10">
            <FaHeadphones className="text-2xl sm:text-4xl text-white drop-shadow-sm" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              HyperSpace
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mt-3 px-2 leading-relaxed">
            Boost your Twitter Space to trend. Choose your package, add your Space URL, and launch.
          </p>
          {/* Compact trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mt-5 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Safe & Secure
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Timely Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Boost Trending
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Package Selection */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            {/* Step 1: Duration Selection */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700/80 hover:border-purple-500/30 transition-colors">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-500/30 text-purple-300 text-xs sm:text-sm font-bold">1</span>
                <FaClock className="text-purple-400" />
                Select Duration
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {DURATIONS.map((duration) => {
                  const Icon = duration.icon;
                  const isSelected = selectedDuration === duration.value;
                  const savingsInfo = getSavingsForDuration(duration.value);
                  const hasSavings = savingsInfo && savingsInfo.savingsPercent > 0;
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
                      {hasSavings && (
                        <span className="absolute -top-1.5 -right-1 sm:-top-2 sm:-right-2 px-1.5 sm:px-2 py-0.5 bg-green-500 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-lg">
                          SAVE {savingsInfo.savingsPercent}%
                        </span>
                      )}
                      {duration.popular && !hasSavings && (
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

            {/* Step 2: Listeners Selection */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700/80 hover:border-purple-500/30 transition-colors">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-500/30 text-purple-300 text-xs sm:text-sm font-bold">2</span>
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

            {/* Step 3: Space URL Input - right after listeners for logical flow */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700/80 hover:border-purple-500/30 transition-colors">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-500/30 text-purple-300 text-xs sm:text-sm font-bold">3</span>
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

            {/* Info section - consolidated, cleaner cards */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-gray-800/40 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-gray-700/60">
                <h3 className="text-xs sm:text-sm font-semibold text-amber-400/90 mb-1.5 flex items-center gap-2">
                  <FaClock className="text-[10px] sm:text-xs" />
                  Payment & Timing
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  <span className="text-white">Crypto</span> — delivery starts right away. <span className="text-white">Card</span> — place order at least 24 hours before your Space.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-800/40 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-gray-700/60">
                  <h3 className="text-xs sm:text-sm font-semibold text-amber-400/90 mb-1.5 flex items-center gap-2">
                    <FaInfoCircle className="text-[10px] sm:text-xs" />
                    How It Works
                  </h3>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Listeners in overflow section</li>
                    <li>• Helps your Space trend</li>
                    <li>• Add real speakers for authenticity</li>
                  </ul>
                </div>
                <div className="bg-gray-800/40 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-gray-700/60">
                  <h3 className="text-xs sm:text-sm font-semibold text-green-400/90 mb-1.5 flex items-center gap-2">
                    <FaShieldAlt className="text-[10px] sm:text-xs" />
                    Safe & Compliant
                  </h3>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>✓ No risk to your account</li>
                    <li>✓ Undetectable, organic behavior</li>
                    <li>✓ Trusted by thousands</li>
                  </ul>
                </div>
              </div>
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
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/80 sticky top-8 shadow-xl shadow-black/20">
              <h2 className="text-lg font-semibold text-white mb-5">Order Summary</h2>
              
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
                  <div className="text-right">
                    {getCurrentPackage()?.originalPrice && getCurrentPackage()?.savings > 0 && (
                      <div className="text-sm text-gray-400 line-through mb-0.5">
                        ${getCurrentPackage().originalPrice} USDC
                      </div>
                    )}
                    <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {getCurrentPrice()} USDC
                    </span>
                    {getCurrentPackage()?.savings > 0 && (
                      <div className="text-sm text-green-400 font-medium mt-0.5">
                        You save ${getCurrentPackage().savings}!
                      </div>
                    )}
                  </div>
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
                    Card
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
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl hover:shadow-purple-500/25 hover:scale-[1.01] active:scale-[0.99] ring-2 ring-purple-400/20'
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

              {/* Pro tip */}
              <p className="mt-4 text-[11px] text-blue-300/80">
                💡 Invite real speakers so their PFPs show in the main circle.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits & Perks Section - Card layout with infographics */}
        <section className="max-w-6xl mx-auto mt-16 sm:mt-24 mb-12 sm:mb-16">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
              Why HyperSpace?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
              Built for creators who want their Spaces to trend.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { icon: FaChartLine, title: 'Trend Amplification', desc: 'High listener counts signal popularity to X\'s algorithm. Get your Space featured in trending and discovered by thousands.', stat: '↑ Trending', statColor: 'text-emerald-400' },
              { icon: FaFingerprint, title: 'Undetectable & Organic', desc: 'Listeners join in the overflow section with real-profile behavior. Mimics genuine engagement that algorithms love.', stat: 'Organic', statColor: 'text-violet-400' },
              { icon: FaShieldAlt, title: 'Zero Account Risk', desc: 'Listeners join and leave naturally. No bans, no flags. Trusted by brands, influencers, and crypto projects daily.', stat: '100% Safe', statColor: 'text-green-400' },
              { icon: FaBolt, title: 'Instant Crypto Delivery', desc: 'Pay with USDC, delivery starts right away. No waiting—listeners flow in before your Space even begins.', stat: 'Instant', statColor: 'text-amber-400' },
              { icon: FaRocket, title: 'No Limits—Run Anywhere', desc: 'As many Spaces as you want, anytime, anywhere. Run multiple Spaces in parallel with no caps.', stat: '∞ Unlimited', statColor: 'text-pink-400' },
              { icon: FaCrown, title: 'Creator-First', desc: 'We built this for the same creators we serve. Simple pricing, real support, and delivery you can count on.', stat: '24/7', statColor: 'text-cyan-400' }
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <article
                  key={i}
                  className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 hover:border-purple-500/40 transition-all duration-300"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/30" />
                  <span className="absolute top-4 right-4 text-xs font-bold text-gray-500 tabular-nums">0{i + 1}</span>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-700/60 flex items-center justify-center border border-gray-600/50">
                      <Icon className={`text-xl ${b.statColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white mb-1.5">{b.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed mb-3">{b.desc}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${b.statColor} bg-white/5`}>{b.stat}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

      </div>

      {/* Order History - Slide-out panel (desktop) / Full-width drawer (mobile) */}
      {currentUser && showOrderHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowOrderHistory(false)}
            aria-hidden="true"
          />
          {/* Panel: desktop = 420px from right, mobile = full width drawer */}
          <div
            className="relative flex flex-col w-full sm:max-w-[420px] bg-gray-900 border-l border-gray-700/80 shadow-2xl animate-slide-in-right"
            style={{ maxHeight: '100vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-gray-700/80 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FaHistory className="text-purple-400" />
                  My Orders
                  {myOrders.length > 0 && (
                    <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full">
                      {myOrders.length}
                    </span>
                  )}
                </h2>
                {!loadingOrders && myOrders.length > 0 && (
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    · <span className="text-white font-medium">
                      {myOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0).toFixed(2)} USDC
                    </span> total
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowOrderHistory(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                aria-label="Close"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            {/* Content - flex column so sticky scrollbar stays at bottom on desktop */}
            <div className="flex-1 min-h-0 flex flex-col">
              {loadingOrders ? (
                <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
                  <FaSpinner className="animate-spin text-xl sm:text-2xl text-purple-400" />
                </div>
              ) : myOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6 sm:p-8 text-center text-gray-400">
                  <div>
                    <FaHistory className="text-3xl sm:text-4xl mx-auto mb-2 opacity-50" />
                    <p className="text-sm sm:text-base">No orders yet</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile: Card View */}
                  <div className="sm:hidden flex-1 overflow-y-auto divide-y divide-gray-700">
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
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>{formatDuration(order.duration)}</span>
                          {order.status === 'delivering' && order.deliveryEndsAt ? (
                            <CountdownTimer 
                              endsAt={order.deliveryEndsAt} 
                              onComplete={() => fetchMyOrders()}
                              compact={true}
                            />
                          ) : (
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        {order.status === 'delivering' && order.deliveryEndsAt && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-cyan-400 font-medium">🔴 LIVE - Package Active</span>
                            </div>
                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Desktop: Table View - table scrolls vertically, sticky horizontal scrollbar at bottom */}
                  <div className="hidden sm:flex flex-1 min-h-0 flex-col">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                      <div ref={tableScrollRef} className="overflow-x-auto" onScroll={handleTableScroll}>
                        <table className="w-full min-w-[600px]">
                          <thead className="bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Order ID</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Listeners</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Duration</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Price</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Timer</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {myOrders.map((order) => (
                              <tr key={order.orderId} className={`hover:bg-gray-700/30 transition-colors ${order.status === 'delivering' ? 'bg-cyan-500/5' : ''}`}>
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
                                <td className="px-4 py-3">
                                  {order.status === 'delivering' && order.deliveryEndsAt ? (
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Live"></span>
                                      <CountdownTimer endsAt={order.deliveryEndsAt} onComplete={() => fetchMyOrders()} />
                                    </div>
                                  ) : order.status === 'completed' ? (
                                    <span className="text-green-400 text-xs flex items-center gap-1">
                                      <FaCheck className="text-[10px]" />
                                      {order.autoCompleted ? 'Auto-completed' : 'Completed'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Sticky horizontal scrollbar at bottom of panel - syncs with table */}
                    <div
                      ref={bottomScrollRef}
                      className="flex-shrink-0 overflow-x-auto overflow-y-hidden bg-gray-800/80 border-t border-gray-700/50"
                      style={{ height: 14 }}
                      onScroll={handleBottomScroll}
                    >
                      <div ref={tableWidthRef} style={{ height: 1, minWidth: 1 }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/80 p-3 sm:p-4 z-40">
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
                Card
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
                  You'll be redirected to complete payment with your card. Your order will appear for our team to verify once you click below.
                </p>
                <button
                  onClick={handlePayPalPayment}
                  disabled={confirmingPayPal}
                  className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {confirmingPayPal ? (
                    <FaSpinner className="animate-spin text-sm" />
                  ) : (
                    <FaExternalLinkAlt className="text-sm" />
                  )}
                  {confirmingPayPal ? 'Submitting...' : 'Pay with Card'}
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
                      ? 'Your order is confirmed. Paying with card? It will be processed within 24 hours before your Space starts.'
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

            {/* Live indicator and countdown timer for delivering status */}
            {confirmedOrder.status === 'delivering' && (
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 text-blue-400 mb-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                  <span className="text-sm">Listeners are joining your Space in real-time</span>
                </div>
                {confirmedOrder.deliveryEndsAt && (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-cyan-400/80 font-medium">Package Timer</span>
                      <CountdownTimer 
                        endsAt={confirmedOrder.deliveryEndsAt} 
                        onComplete={() => {
                          setConfirmedOrder(prev => ({ ...prev, status: 'completed' }));
                          fetchMyOrders();
                        }}
                      />
                      <span className="text-[10px] text-gray-400">Auto-completes when timer ends</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pending approval info */}
            {confirmedOrder.status === 'pending_approval' && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaClock className="text-purple-400 text-lg flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-purple-300 mb-1">Order Confirmed!</p>
                    <p>Listeners will be delivered before your scheduled Space. Crypto payments start delivery right away. Paying with card? Place your order at least 24 hours before your Space.</p>
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
                  fetchMyOrders();
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
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HyperSpace;
