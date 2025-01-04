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
  registerUser,
  createBumpRequest,
  approveBumpRequest,
  rejectBumpRequest,
  fetchBumpRequests
} from './services/api';
import BumpStore from './components/BumpStore';
import LoginModal from './components/LoginModal';
import CreateAdModal from './components/CreateAdModal';
import CreateAccountModal from './components/CreateAccountModal';
import Dashboard from './components/Dashboard';
import EditAdModal from './components/EditAdModal';

window.Buffer = Buffer;

// Constants for ad sizes and animations
const MAX_SIZE = 200;
const MIN_SIZE = 50;
const SHRINK_RATE = 5; // Amount to shrink by each interval
const SHRINK_INTERVAL = 30000; // 30 seconds
const SHRINK_PERCENTAGE = 0.95; // More gradual shrinking
const TOKEN_PRICE = 0.01; // SOL per token
const AD_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const AD_WARNING_TIME = 24 * 60 * 60 * 1000; // 1 day
const FREE_AD_LIMIT = 1;
const LAYOUT_DEBOUNCE = 200; // Debounce time for layout calculations
const ANIMATION_DURATION = '0.3s'; // Slower animations
const REPOSITION_INTERVAL = 5000; // 5 seconds between position updates
const BUBBLE_PADDING = 30; // Space between bubbles
const MERCHANT_WALLET = "J8ewxZwntodH8sT8LAXN5j6sAsDhtCh8sQA6GwRuLTSv"; // Replace with your wallet address
const ADMIN_USERNAME = "admin"; // You can change this to your preferred admin username

// Helper functions for responsive positioning
function calculateSafePosition(size, windowWidth, windowHeight, existingAds) {
  const minX = BUBBLE_PADDING;
  const maxX = windowWidth - size - BUBBLE_PADDING;
  const minY = BUBBLE_PADDING + 64; // Account for navbar height
  const maxY = windowHeight - size - BUBBLE_PADDING;
  
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const x = Math.min(Math.max(minX, Math.random() * maxX), maxX);
    const y = Math.min(Math.max(minY, Math.random() * maxY), maxY);
    
    // Check if this position overlaps with any existing ads
    const hasOverlap = existingAds.some(ad => {
      const distance = calculateDistance(x + size/2, y + size/2, ad.x + ad.size/2, ad.y + ad.size/2);
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING;
      return distance < minDistance;
    });
    
    if (!hasOverlap) {
      return { x, y };
    }
    
    attempts++;
  }
  
  // If we couldn't find a non-overlapping position, try to find the position with minimal overlap
  let bestPosition = { x: minX, y: minY };
  let minOverlap = Infinity;
  
  for (let i = 0; i < 10; i++) {
    const x = Math.min(Math.max(minX, Math.random() * maxX), maxX);
    const y = Math.min(Math.max(minY, Math.random() * maxY), maxY);
    
    const totalOverlap = existingAds.reduce((sum, ad) => {
      const distance = calculateDistance(x + size/2, y + size/2, ad.x + ad.size/2, ad.y + ad.size/2);
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING;
      return sum + Math.max(0, minDistance - distance);
    }, 0);
    
    if (totalOverlap < minOverlap) {
      minOverlap = totalOverlap;
      bestPosition = { x, y };
    }
  }
  
  return bestPosition;
}

function ensureInViewport(x, y, size, windowWidth, windowHeight, existingAds, currentAdId) {
  const minX = BUBBLE_PADDING;
  const maxX = windowWidth - size - BUBBLE_PADDING;
  const minY = BUBBLE_PADDING + 64; // Account for navbar height
  const maxY = windowHeight - size - BUBBLE_PADDING;

  let newX = Math.min(Math.max(x, minX), maxX);
  let newY = Math.min(Math.max(y, minY), maxY);

  // Check for overlaps with other ads
  const otherAds = existingAds.filter(ad => ad.id !== currentAdId);
  const hasOverlap = otherAds.some(ad => {
    const distance = calculateDistance(newX + size/2, newY + size/2, ad.x + ad.size/2, ad.y + ad.size/2);
    const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING;
    return distance < minDistance;
  });

  if (hasOverlap) {
    // Try to find a nearby non-overlapping position
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    for (const angle of angles) {
      const radians = angle * (Math.PI / 180);
      const testX = newX + Math.cos(radians) * (BUBBLE_PADDING * 2);
      const testY = newY + Math.sin(radians) * (BUBBLE_PADDING * 2);
      
      if (
        testX >= minX && testX <= maxX &&
        testY >= minY && testY <= maxY &&
        !otherAds.some(ad => {
          const distance = calculateDistance(testX + size/2, testY + size/2, ad.x + ad.size/2, ad.y + ad.size/2);
          const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING;
          return distance < minDistance;
        })
      ) {
        return { x: testX, y: testY };
      }
    }
  }

  return { x: newX, y: newY };
}

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function App() {
  const [ads, setAds] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
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

  // Load ads on mount
  useEffect(() => {
    const loadAds = async () => {
      try {
        const fetchedAds = await fetchAds();
        console.log('Fetched ads:', fetchedAds);
        setAds(fetchedAds);
      } catch (error) {
        console.error('Error loading ads:', error);
        showNotification('Failed to load ads', 'error');
      }
    };

    loadAds();
  }, []);

  // Socket.io event handlers
  useEffect(() => {
    socket.on('adsUpdated', ({ type, ad }) => {
      console.log('Received adsUpdated event:', type, ad);
      
      if (type === 'create') {
        setAds(prevAds => [...prevAds, ad]);
      } else if (type === 'update') {
        setAds(prevAds => prevAds.map(a => a.id === ad.id ? ad : a));
      } else if (type === 'delete') {
        setAds(prevAds => prevAds.filter(a => a.id !== ad.id));
      }
    });

    return () => {
      socket.off('adsUpdated');
    };
  }, []);

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
      localStorage.setItem('token', user.token);
      setCurrentUser(user);
      setShowLoginModal(false);
      showNotification('Logged in successfully!', 'success');
    } catch (error) {
      console.error('Login error:', error);
      showNotification('Login failed. Please try again.', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    showNotification('Logged out successfully!', 'success');
  };

  const handleCreateAccount = async (userData) => {
    try {
      const user = await registerUser(userData);
      setCurrentUser(user);
      setShowCreateAccountModal(false);
      showNotification('Account created successfully!', 'success');
    } catch (error) {
      console.error('Account creation error:', error);
      showNotification('Failed to create account. Please try again.', 'error');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
      {/* Tech Background Animation */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">AQUADS</span>
            </div>
            <div className="flex items-center space-x-4">
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
                    onClick={() => setShowCreateModal(true)}
                    className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Create Ad
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
        </div>
      </nav>

      {/* Main content */}
      <div className="pt-16 relative min-h-screen z-10">
        {/* Ads */}
        {ads.map(ad => {
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
            <div
              key={ad.id}
              className="absolute cursor-pointer transform transition-all hover:scale-105 bubble"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${ad.size}px`,
                height: `${ad.size}px`,
                transition: `all ${ANIMATION_DURATION} ease-in-out`,
                zIndex: ad.isBumped ? 2 : 1,
                animationDuration: `${8 + Math.random() * 4}s` // Random duration between 8-12s
              }}
              onClick={() => {
                if (requireAuth()) {
                  window.open(ad.url, '_blank');
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
                    className="w-full h-full object-cover"
                    style={{
                      objectFit: 'cover',
                      width: '100%',
                      height: '100%'
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
            </div>
          );
        })}
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

      {showCreateAccountModal && (
        <CreateAccountModal
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

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2">
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
    </div>
  );
}

export default App;
