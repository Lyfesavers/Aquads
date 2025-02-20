import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { 
  socket, 
  fetchAds, 
  createAd as apiCreateAd, 
  updateAd as apiUpdateAd, 
  deleteAd as apiDeleteAd, 
  loginUser, 
  register as apiRegister,
  createBumpRequest,
  approveBumpRequest,
  rejectBumpRequest,
  fetchBumpRequests,
  verifyToken,
  pingServer,
  API_URL
} from './services/api';
import BumpStore from './components/BumpStore';
import LoginModal from './components/LoginModal';
import CreateAdModal from './components/CreateAdModal';
import CreateAccountModal from './components/CreateAccountModal';
import Dashboard from './components/Dashboard';
import EditAdModal from './components/EditAdModal';
import TokenBanner from './components/TokenBanner';
import TokenList from './components/TokenList';
import TokenRating from './components/TokenRating';
import Marketplace from './components/Marketplace';
import ProfileModal from './components/ProfileModal';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import Whitepaper from './components/Whitepaper';
import HowTo from './components/HowTo';
import Affiliate from './components/Affiliate';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import emailService from './services/emailService';
import emailjs from '@emailjs/browser';

window.Buffer = Buffer;

// Initialize EmailJS right after imports
emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);

// Constants for ad sizes and animations
const MAX_SIZE = 150;
const MIN_SIZE = 50;
const SHRINK_RATE = 5; // Amount to shrink by each interval
const SHRINK_INTERVAL = 30000; // 30 seconds
const SHRINK_PERCENTAGE = 0.9; // More gradual shrinking
const TOKEN_PRICE = 0.01; // SOL per token
const AD_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const AD_WARNING_TIME = 24 * 60 * 60 * 1000; // 1 day
const FREE_AD_LIMIT = 1;
const LAYOUT_DEBOUNCE = 200; // Debounce time for layout calculations
const ANIMATION_DURATION = '0.3s'; // Slower animations
const REPOSITION_INTERVAL = 10000; // 5 seconds between position updates
const BUBBLE_PADDING = 10; // Space between bubbles
const MERCHANT_WALLET = {
    SOL: "J8ewxZwntodH8sT8LAXN5j6sAsDhtCh8sQA6GwRuLTSv",
    ETH: "0x98BC1BEC892d9f74B606D478E6b45089D2faAB05",
    BTC: "bc1qdh9ar2elv6cvhfqccvlf8w6rwy0r592f9a6dyt",
    BASE: "0x98BC1BEC892d9f74B606D478E6b45089D2faAB05"
}; // Replace with your wallet address
const ADMIN_USERNAME = "admin"; // You can change this to your preferred admin username

// Helper functions for responsive positioning
function calculateSafePosition(size, windowWidth, windowHeight, existingAds) {
  const minX = BUBBLE_PADDING;
  const maxX = windowWidth - size - BUBBLE_PADDING;
  const minY = BUBBLE_PADDING + 5; // <- Decrease this value (currently accounts for navbar height)
  const maxY = windowHeight - size - BUBBLE_PADDING;
  
  // Grid-based approach for better distribution
  const gridSize = Math.max(size + BUBBLE_PADDING, 100);
  const cols = Math.floor(windowWidth / gridSize);
  const rows = Math.floor(windowHeight / gridSize);
  
  // Try all grid positions in random order
  const positions = [];
  for(let i = 0; i < cols; i++) {
    for(let j = 0; j < rows; j++) {
      positions.push({
        x: minX + (i * gridSize),
        y: minY + (j * gridSize)
      });
    }
  }
  
  // Shuffle positions
  positions.sort(() => Math.random() - 0.5);
  
  // Try each position
  for(const pos of positions) {
    const hasOverlap = existingAds.some(ad => {
      const distance = calculateDistance(
        pos.x + size/2, 
        pos.y + size/2, 
        ad.x + ad.size/2, 
        ad.y + ad.size/2
      );
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING;
      return distance < minDistance;
    });
    
    if (!hasOverlap) {
      return pos;
    }
  }
  
  // If no free position found, find position with minimal overlap
  let bestPosition = { x: minX, y: minY };
  let minOverlap = Infinity;
  
  for(const pos of positions) {
    const totalOverlap = existingAds.reduce((sum, ad) => {
      const distance = calculateDistance(
        pos.x + size/2, 
        pos.y + size/2, 
        ad.x + ad.size/2, 
        ad.y + ad.size/2
      );
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING;
      return sum + Math.max(0, minDistance - distance);
    }, 0);
    
    if (totalOverlap < minOverlap) {
      minOverlap = totalOverlap;
      bestPosition = pos;
    }
  }
  
  return bestPosition;
}

function ensureInViewport(x, y, size, windowWidth, windowHeight, existingAds, currentAdId) {
  const minX = BUBBLE_PADDING;
  const maxX = windowWidth - size - BUBBLE_PADDING;
  const minY = BUBBLE_PADDING + 5; // <- Decrease this value to match
  const maxY = windowHeight - size - BUBBLE_PADDING;

  let newX = Math.min(Math.max(x, minX), maxX);
  let newY = Math.min(Math.max(y, minY), maxY);

  const otherAds = existingAds.filter(ad => ad.id !== currentAdId);
  
  // Check for overlaps and adjust position
  let iterations = 0;
  const maxIterations = 10;
  
  while(iterations < maxIterations) {
    let hasOverlap = false;
    let pushX = 0;
    let pushY = 0;
    
    for(const ad of otherAds) {
      const dx = (newX + size/2) - (ad.x + ad.size/2);
      const dy = (newY + size/2) - (ad.y + ad.size/2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING;
      
      if(distance < minDistance) {
        hasOverlap = true;
        const angle = Math.atan2(dy, dx);
        const push = (minDistance - distance) / 2;
        pushX += Math.cos(angle) * push;
        pushY += Math.sin(angle) * push;
      }
    }
    
    if(!hasOverlap) break;
    
    newX += pushX;
    newY += pushY;
    
    // Keep in bounds
    newX = Math.min(Math.max(newX, minX), maxX);
    newY = Math.min(Math.max(newY, minY), maxY);
    
    iterations++;
  }

  return { x: newX, y: newY };
}

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function App() {
  const [ads, setAds] = useState(() => {
    const cachedAds = localStorage.getItem('cachedAds');
    return cachedAds ? JSON.parse(cachedAds) : [];
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        // Verify the stored token is valid
        verifyToken(user.token)
          .catch(() => {
            localStorage.removeItem('currentUser');
            return null;
          });
        return user;
      } catch (error) {
        localStorage.removeItem('currentUser');
        return null;
      }
    }
    return null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showBumpStore, setShowBumpStore] = useState(false);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [adToEdit, setAdToEdit] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Add this function to update ads with persistence
  const updateAds = (newAds) => {
    setAds(newAds);
    localStorage.setItem('cachedAds', JSON.stringify(newAds));
  };

  // Load ads on mount
  useEffect(() => {
    const loadAds = async () => {
      try {
        const data = await fetchAds();
        updateAds(data);
      } catch (error) {
        console.error('Error loading ads:', error);
      }
    };

    loadAds();
    const interval = setInterval(loadAds, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Update socket connection handling
  useEffect(() => {
    socket.on('adUpdated', (updatedAd) => {
      setAds(prevAds => {
        const newAds = prevAds.map(ad => 
          ad.id === updatedAd.id ? updatedAd : ad
        );
        localStorage.setItem('cachedAds', JSON.stringify(newAds));
        return newAds;
      });
    });

    socket.on('adDeleted', (deletedAdId) => {
      setAds(prevAds => {
        const newAds = prevAds.filter(ad => ad.id !== deletedAdId);
        localStorage.setItem('cachedAds', JSON.stringify(newAds));
        return newAds;
      });
    });

    return () => {
      socket.off('adUpdated');
      socket.off('adDeleted');
    };
  }, []);

  // Debug ads state changes
  useEffect(() => {
    console.log('Ads state updated:', ads);
  }, [ads]);

  // Clean up expired ads and shrink unbumped ads
  useEffect(() => {
    const shrinkInterval = setInterval(async () => {
      const updatedAds = await Promise.all(ads.map(async (ad) => {
        if (!ad.isBumped && ad.size > MIN_SIZE) {
          const newSize = Math.max(MIN_SIZE, ad.size - SHRINK_RATE);
          const updatedAd = { ...ad, size: newSize };
          try {
            // Update the size in the database
            await apiUpdateAd(ad.id, updatedAd);
            return updatedAd;
          } catch (error) {
            console.error('Error updating ad size:', error);
            return ad;
          }
        }
        return ad;
      }));

      setAds(updatedAds);
    }, SHRINK_INTERVAL);

    return () => clearInterval(shrinkInterval);
  }, [ads]);

  // Handle window resize
  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowSize({ width, height });

      // Reposition ads that are outside viewport
      setAds(prevAds => prevAds.map(ad => {
        const { x, y } = ensureInViewport(ad.x, ad.y, ad.size, width, height, ads, ad.id);
        return x !== ad.x || y !== ad.y ? { ...ad, x, y } : ad;
      }));
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const handleLogin = async (credentials) => {
    try {
      const user = await loginUser(credentials);
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setShowLoginModal(false);
      showNotification('Successfully logged in!', 'success');
    } catch (error) {
      console.error('Login error:', error);
      showNotification(error.message || 'Login failed', 'error');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    showNotification('Successfully logged out!', 'success');
  };

  const handleCreateAccount = async (formData) => {
    try {
      const user = await apiRegister(formData);
      if (user) {
        setCurrentUser(user);
        setNewUsername(user.username);
        
        // Send welcome email if email is provided
        if (formData.email) {
          console.log('Attempting to send welcome email...');
          try {
            await emailService.sendWelcomeEmail(
              formData.email,
              user.username,
              user.referralCode
            );
            console.log('Welcome email sent successfully');
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
          }
        }
        
        setShowWelcomeModal(true);
        setShowCreateAccountModal(false);
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert(error.message || 'Failed to create account');
    }
  };

  const handleCreateAd = async (adData) => {
    try {
      if (!currentUser) {
        showNotification('Please log in first!', 'error');
        setShowLoginModal(true);
        return;
      }

      const existingAd = ads.find(ad => ad.owner === currentUser.username);
      if (existingAd && !currentUser.isAdmin) {
        showNotification('You can only create one ad at a time!', 'error');
        return;
      }

      const { x, y } = calculateSafePosition(MAX_SIZE, windowSize.width, windowSize.height, ads);

      const newAd = {
        id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...adData,
        size: MAX_SIZE,
        x,
        y,
        createdAt: new Date().toISOString(),
        isBumped: false,
        owner: currentUser.username
      };

      console.log('Creating new ad:', newAd);
      const createdAd = await apiCreateAd(newAd);
      console.log('Created ad:', createdAd);
      
      setAds(prevAds => [...prevAds, createdAd]);
      setShowCreateModal(false);
      showNotification('Ad created successfully!', 'success');
    } catch (error) {
      console.error('Error creating ad:', error);
      showNotification('Failed to create ad. Please try again.', 'error');
    }
  };

  const handleBumpPurchase = async (adId, txSignature, duration) => {
    try {
      const ad = ads.find(a => a.id === adId);
      
      if (!currentUser) {
        showNotification('Please log in first!', 'error');
        return;
      }

      if (!ad) {
        showNotification('Ad not found!', 'error');
        return;
      }

      if (!txSignature) {
        showNotification('Transaction signature is required!', 'error');
        return;
      }

      if (!duration) {
        showNotification('Bump duration is required!', 'error');
        return;
      }

      // If admin is approving the bump
      if (currentUser.isAdmin && ad.status === 'pending') {
        try {
          const [bumpResponse, adResponse] = await Promise.all([
            approveBumpRequest(adId, currentUser.username),
            apiUpdateAd(adId, {
              ...ad,
              size: MAX_SIZE,
              isBumped: true,
              status: 'approved',
              bumpedAt: new Date(),
              bumpDuration: duration,
              bumpExpiresAt: new Date(Date.now() + duration)
            })
          ]);

          setAds(prevAds => prevAds.map(a => a.id === adId ? adResponse : a));
          setShowBumpStore(false);
          showNotification('Bump approved successfully!', 'success');
          return;
        } catch (error) {
          console.error('Error approving bump:', error);
          showNotification(error.message || 'Failed to approve bump request', 'error');
          return;
        }
      }

      // If user is submitting a bump request
      try {
        const [bumpResponse, adResponse] = await Promise.all([
          createBumpRequest({
            adId,
            owner: currentUser.username,
            txSignature,
            duration,
            status: 'pending'
          }),
          apiUpdateAd(adId, { ...ad, status: 'pending' })
        ]);

        setAds(prevAds => prevAds.map(a => a.id === adId ? adResponse : a));
        setShowBumpStore(false);
        showNotification('Bump request submitted for approval!', 'success');
      } catch (error) {
        console.error('Error submitting bump request:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to process bump request';
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Bump purchase error:', error);
      showNotification(error.message || 'Failed to process bump purchase!', 'error');
    }
  };

  const handleRejectBump = async (adId, reason) => {
    try {
      if (!currentUser?.isAdmin) {
        showNotification('Only admins can reject bump requests', 'error');
        return;
      }

      const ad = ads.find(a => a.id === adId);
      if (!ad) {
        showNotification('Ad not found!', 'error');
        return;
      }

      const [bumpResponse, adResponse] = await Promise.all([
        rejectBumpRequest(adId, currentUser.username, reason),
        apiUpdateAd(adId, { 
          ...ad, 
          status: 'active',
          isBumped: false 
        })
      ]);

      setAds(prevAds => prevAds.map(a => a.id === adId ? adResponse : a));
      showNotification('Bump request rejected successfully!', 'success');
    } catch (error) {
      console.error('Error rejecting bump:', error);
      showNotification(error.message || 'Failed to reject bump request', 'error');
    }
  };

  const handleDeleteAd = async (adId) => {
    try {
      await apiDeleteAd(adId);
      setAds(prevAds => prevAds.filter(ad => ad.id !== adId));
      showNotification('Ad deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting ad:', error);
      showNotification('Failed to delete ad. Please try again.', 'error');
    }
  };

  const handleEditAd = async (adId, editedData) => {
    try {
      const ad = ads.find(a => a.id === adId);
      if (!ad) {
        showNotification('Ad not found!', 'error');
        return;
      }

      const updatedAd = {
        ...ad,
        ...editedData,
        size: ad.size, // Preserve the current size
        isBumped: ad.isBumped // Preserve the bumped status
      };

      const response = await apiUpdateAd(adId, updatedAd);
      setAds(prevAds => prevAds.map(a => a.id === adId ? response : a));
      setShowEditModal(false);
      setAdToEdit(null);
      showNotification('Ad updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating ad:', error);
      showNotification('Failed to update ad. Please try again.', 'error');
    }
  };

  const handleApproveBump = async (adId) => {
    try {
      if (!currentUser?.isAdmin) {
        showNotification('Only admins can approve bump requests', 'error');
        return;
      }

      const ad = ads.find(a => a.id === adId);
      if (!ad) {
        showNotification('Ad not found!', 'error');
        return;
      }

      // Get the bump request to get the duration
      const bumpRequest = await fetchBumpRequests().then(requests => 
        requests.find(req => req.adId === adId && req.status === 'pending')
      );

      if (!bumpRequest) {
        showNotification('Bump request not found!', 'error');
        return;
      }

      const [bumpResponse, adResponse] = await Promise.all([
        approveBumpRequest(adId, currentUser.username),
        apiUpdateAd(adId, {
          ...ad,
          size: MAX_SIZE,
          isBumped: true,
          status: 'approved',
          bumpedAt: new Date(),
          bumpDuration: bumpRequest.duration,
          bumpExpiresAt: new Date(Date.now() + bumpRequest.duration)
        })
      ]);

      setAds(prevAds => prevAds.map(a => a.id === adId ? adResponse : a));
      showNotification('Bump approved successfully!', 'success');
    } catch (error) {
      console.error('Error approving bump:', error);
      showNotification(error.message || 'Failed to approve bump request', 'error');
    }
  };

  // Add a helper function to check authentication
  const requireAuth = (action) => {
    if (!currentUser) {
      showNotification('Please log in first!', 'error');
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  // Add this to debug render issues
  useEffect(() => {
    console.log('Current ads state:', ads);
  }, [ads]);

  // Add these socket event listeners in useEffect
  useEffect(() => {
    socket.on('reviewAdded', (review) => {
      setReviews(prevReviews => [...prevReviews, review]);
    });

    socket.on('userAuthenticated', (userData) => {
      setCurrentUser(userData);
    });

    return () => {
      socket.off('reviewAdded');
      socket.off('userAuthenticated');
    };
  }, []);

  // Add this effect to periodically refresh ads
  useEffect(() => {
    fetchAds();
    const interval = setInterval(fetchAds, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Add token verification on app load
  useEffect(() => {
    const verifySession = async () => {
      const verifiedUser = await verifyToken();
      if (verifiedUser) {
        setCurrentUser(verifiedUser);
      } else {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
    };

    verifySession();
  }, []);

  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    showNotification('Profile updated successfully!', 'success');
  };

  return (
    <Router>
      <Routes>
        <Route path="/marketplace" element={
          <Marketplace 
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onCreateAccount={handleCreateAccount}
          />
        } />
        <Route path="/" element={
          <div className="bg-gradient-to-br from-gray-900 to-black text-white overflow-y-auto h-screen">
            {/* Background stays fixed */}
            <div className="fixed inset-0 z-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
              <div className="tech-lines"></div>
              <div className="tech-dots"></div>
            </div>

            {/* Remove duplicate TokenBanner */}
            
            {/* Main content wrapper */}
            <div className="relative z-10">
              {/* Navigation and banner stay fixed */}
              <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">AQUADS</span>
                    </div>
                    
                    {/* Mobile menu button */}
                    <div className="md:hidden">
                      <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-gray-300 hover:text-white p-2"
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
                      <Link
                        to="/marketplace"
                        className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                      >
                        Freelancer Hub
                      </Link>
                      <Link
                        to="/how-to"
                        className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                      >
                        How To
                      </Link>
                      {currentUser ? (
                        <>
                          <span className="text-blue-300">Welcome, {currentUser.username}!</span>
                          <button
                            onClick={() => setShowDashboard(true)}
                            className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                          >
                            Dashboard
                          </button>
                          <button
                            onClick={() => setShowProfileModal(true)}
                            className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                          >
                            Edit Profile
                          </button>
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                          >
                            List Project
                          </button>
                          <button
                            onClick={handleLogout}
                            className="bg-red-500/80 hover:bg-red-600/80 px-4 py-2 rounded shadow-lg hover:shadow-red-500/50 transition-all duration-300 backdrop-blur-sm"
                          >
                            Logout
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowLoginModal(true)}
                            className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                          >
                            Login
                          </button>
                          <button
                            onClick={() => setShowCreateAccountModal(true)}
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
                      <Link
                        to="/marketplace"
                        className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                      >
                        Freelancer Hub
                      </Link>
                      <Link
                        to="/how-to"
                        className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                      >
                        How To
                      </Link>
                      {currentUser ? (
                        <>
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
                              setShowProfileModal(true);
                              setIsMobileMenuOpen(false);
                            }}
                            className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                          >
                            Edit Profile
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateModal(true);
                              setIsMobileMenuOpen(false);
                            }}
                            className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                          >
                            Create Ad
                          </button>
                          <button
                            onClick={() => {
                              handleLogout();
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
                              setShowLoginModal(true);
                              setIsMobileMenuOpen(false);
                            }}
                            className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                          >
                            Login
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateAccountModal(true);
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

              <div className="fixed top-16 left-0 right-0 z-40 token-banner-container">
                <TokenBanner />
              </div>

              {/* Main content - allow natural scrolling */}
              <div className="pt-28">
                {/* Bubbles section - keep it as is, remove fixed positioning */}
                <div className="relative min-h-screen">
                  {/* Ads */}
                  {ads && ads.length > 0 ? (
                    ads.map(ad => {
                      const { x, y } = ensureInViewport(
                        ad.x,
                        ad.y,
                        ad.size,
                        windowSize.width,
                        windowSize.height,
                        ads,
                        ad.id
                      );
                      const imageSize = Math.floor(ad.size * 0.75);

                      return (
                        <motion.div
                          key={ad.id}
                          className="absolute cursor-pointer transform hover:scale-105 bubble"
                          style={{
                            position: 'absolute',
                            left: `${x}px`,
                            top: `${y}px`,
                            width: `${ad.size}px`,
                            height: `${ad.size}px`,
                            transition: `all ${ANIMATION_DURATION} ease-in-out`,
                            zIndex: ad.isBumped ? 2 : 1,
                            animationDuration: `${8 + Math.random() * 4}s`,
                            cursor: 'pointer',
                            touchAction: 'auto'
                          }}
                          onClick={(e) => {
                            if (!e.defaultPrevented) {
                              if (requireAuth()) {
                                window.open(ad.url, '_blank');
                              }
                            }
                          }}
                        >
                          <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-gray-800/90 backdrop-blur-sm shadow-lg shadow-blue-500/20 glow"></div>
                            <div 
                              className="relative z-10 mb-2 rounded-full overflow-hidden flex items-center justify-center"
                              style={{
                                width: `${imageSize}px`,
                                height: `${imageSize}px`,
                              }}
                            >
                              <img
                                src={ad.logo}
                                alt={ad.title}
                                loading="eager"
                                className="w-full h-full object-contain"
                                style={{
                                  objectFit: 'contain',
                                  width: '100%',
                                  height: '100%'
                                }}
                                onLoad={(e) => {
                                  if (e.target.src.toLowerCase().endsWith('.gif')) {
                                    e.target.setAttribute('loop', 'infinite');
                                  }
                                }}
                              />
                            </div>
                            <div 
                              className="relative z-10 text-center px-2 w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (requireAuth()) {
                                  setSelectedAdId(ad.id);
                                  setShowBumpStore(true);
                                }
                              }}
                            >
                              <span 
                                className="text-white truncate block hover:text-blue-300 transition-colors duration-300"
                                style={{
                                  fontSize: `${Math.max(ad.size * 0.1, 12)}px`
                                }}
                              >
                                {ad.title}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-screen">
                      <p className="text-gray-500">Loading ads...</p>
                    </div>
                  )}
                </div>

                {/* Token list section - add z-index and proper background */}
                <div className="relative z-10 bg-transparent">
                  {/* Marketplace Banner */}
                  <div className="w-full overflow-hidden">
                    <Link to="/marketplace" className="block">
                      <img
                        src="/ACCESS OUR FREELANCER HUB.png"
                        alt="Visit Marketplace"
                        className="w-full h-[100px] sm:h-[150px] md:h-[200px] object-contain md:object-cover"
                      />
                    </Link>
                  </div>
                  <TokenList 
                    currentUser={currentUser}
                    showNotification={showNotification}
                  />
                </div>
              </div>

              {/* Modals */}
              {showLoginModal && (
                <LoginModal
                  onLogin={handleLogin}
                  onClose={() => setShowLoginModal(false)}
                  onCreateAccount={() => {
                    setShowLoginModal(false);
                    setShowCreateAccountModal(true);
                  }}
                />
              )}

              {showProfileModal && currentUser && (
                <ProfileModal
                  currentUser={currentUser}
                  onClose={() => setShowProfileModal(false)}
                  onProfileUpdate={handleProfileUpdate}
                />
              )}

              {showCreateAccountModal && (
                <CreateAccountModal
                  isOpen={showCreateAccountModal}
                  onCreateAccount={handleCreateAccount}
                  onClose={() => setShowCreateAccountModal(false)}
                />
              )}

              {showCreateModal && currentUser && (
                <CreateAdModal
                  onCreateAd={handleCreateAd}
                  onClose={() => setShowCreateModal(false)}
                />
              )}

              {showBumpStore && selectedAdId && currentUser && (
                <BumpStore
                  ad={ads.find(ad => ad.id === selectedAdId)}
                  onClose={() => {
                    setShowBumpStore(false);
                    setSelectedAdId(null);
                  }}
                  onSubmitPayment={handleBumpPurchase}
                />
              )}

              {showEditModal && adToEdit && currentUser && (
                <EditAdModal
                  ad={adToEdit}
                  onEditAd={handleEditAd}
                  onClose={() => {
                    setShowEditModal(false);
                    setAdToEdit(null);
                  }}
                />
              )}

              {showDashboard && currentUser && (
                <Dashboard
                  ads={ads}
                  currentUser={currentUser}
                  onClose={() => setShowDashboard(false)}
                  onDeleteAd={handleDeleteAd}
                  onBumpAd={(adId) => {
                    setSelectedAdId(adId);
                    setShowBumpStore(true);
                    setShowDashboard(false);
                  }}
                  onEditAd={(ad) => {
                    setAdToEdit(ad);
                    setShowEditModal(true);
                    setShowDashboard(false);
                  }}
                  onRejectBump={handleRejectBump}
                  onApproveBump={handleApproveBump}
                />
              )}

              {showWelcomeModal && (
                <WelcomeModal
                  username={currentUser.username}
                  referralCode={currentUser.referralCode}
                  onClose={() => setShowWelcomeModal(false)}
                />
              )}

              {/* Notifications */}
              <div className="fixed bottom-4 right-4 space-y-2 z-50">
                {notifications.map(({ id, message, type }) => (
                  <div
                    key={id}
                    className={`p-4 rounded shadow-lg ${
                      type === 'error' ? 'bg-red-500' :
                      type === 'success' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}
                  >
                    {message}
                  </div>
                ))}
              </div>

              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 left-4 text-white text-sm z-50">
                  Ads loaded: {ads.length}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="relative z-10">
              <Footer />
            </div>
          </div>
        } />
        <Route path="/whitepaper" element={<Whitepaper />} />
        <Route path="/how-to" element={<HowTo />} />
        <Route path="/affiliate" element={<Affiliate />} />
      </Routes>
    </Router>
  );
}

export default App;
