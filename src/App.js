import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { 
  socket, 
  fetchAds, 
  createAd as apiCreateAd, 
  updateAd as apiUpdateAd,
  updateAdPosition as apiUpdateAdPosition,
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
import GameHub from './components/GameHub';
import ProfileModal from './components/ProfileModal';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import Whitepaper from './components/Whitepaper';
import HowTo from './components/HowTo';
import Affiliate from './components/Affiliate';
import Terms from './components/Terms';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import emailService from './services/emailService';
import emailjs from '@emailjs/browser';
import NotificationBell from './components/NotificationBell';

window.Buffer = Buffer;

// Initialize EmailJS right after imports
emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);

// Constants for ad sizes and animations
const BASE_MAX_SIZE = 150;
const MIN_SIZE = 50;
// Function to get responsive size based on screen width
function getResponsiveSize(baseSize) {
  // Get current viewport width
  const viewportWidth = window.innerWidth;
  
  if (viewportWidth <= 480) {
    // Mobile - smaller bubbles
    return Math.floor(baseSize * 0.65);
  } else if (viewportWidth <= 768) {
    // Tablet - medium bubbles
    return Math.floor(baseSize * 0.8);
  }
  // Desktop - normal size
  return baseSize;
}

// Use this function to get current max size
function getMaxSize() {
  return getResponsiveSize(BASE_MAX_SIZE);
}

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
const BUBBLE_PADDING = 20; // Increased from 25 to 40 for much more space between bubbles
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
  const minY = BUBBLE_PADDING + 50; // Increased to account for navbar and prevent bubbles at very top
  const maxY = windowHeight - size - BUBBLE_PADDING;
  
  // Grid-based approach for better distribution
  const gridSize = Math.max(size + BUBBLE_PADDING * 3, 200); // Significantly increased grid size
  const cols = Math.floor(windowWidth / gridSize);
  const rows = Math.floor(windowHeight / gridSize);
  
  // Try all grid positions in random order
  const positions = [];
  for(let i = 0; i < cols; i++) {
    for(let j = 0; j < rows; j++) {
      // Add some randomness within each grid cell
      const randomOffsetX = Math.random() * (gridSize / 3);
      const randomOffsetY = Math.random() * (gridSize / 3);
      
      positions.push({
        x: minX + (i * gridSize) + randomOffsetX,
        y: minY + (j * gridSize) + randomOffsetY
      });
    }
  }
  
  // Shuffle positions
  positions.sort(() => Math.random() - 0.5);
  
  // Try each position with a larger minimum distance check
  for(const pos of positions) {
    const hasOverlap = existingAds.some(ad => {
      const distance = calculateDistance(
        pos.x + size/2, 
        pos.y + size/2, 
        ad.x + ad.size/2, 
        ad.y + ad.size/2
      );
      // Increased minimum distance to prevent overlaps
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING * 2;
      return distance < minDistance;
    });
    
    if (!hasOverlap) {
      return pos;
    }
  }
  
  // If no free position found, find position with minimal overlap
  // and push it further away from overlapping bubbles
  let bestPosition = { x: minX, y: minY };
  let minOverlap = Infinity;
  
  for(const pos of positions) {
    let totalOverlap = 0;
    let overlaps = [];
    
    for(const ad of existingAds) {
      const distance = calculateDistance(
        pos.x + size/2, 
        pos.y + size/2, 
        ad.x + ad.size/2, 
        ad.y + ad.size/2
      );
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING * 2;
      const overlap = Math.max(0, minDistance - distance);
      
      if (overlap > 0) {
        overlaps.push({
          ad: ad,
          overlap: overlap,
          distance: distance,
          minDistance: minDistance
        });
      }
      
      totalOverlap += overlap;
    }
    
    if (totalOverlap < minOverlap) {
      minOverlap = totalOverlap;
      bestPosition = pos;
    }
  }
  
  // Apply additional push away from overlapping bubbles
  if (minOverlap > 0) {
    const overlappingAds = existingAds.filter(ad => {
      const distance = calculateDistance(
        bestPosition.x + size/2, 
        bestPosition.y + size/2, 
        ad.x + ad.size/2, 
        ad.y + ad.size/2
      );
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING * 2;
      return distance < minDistance;
    });
    
    if (overlappingAds.length > 0) {
      let pushX = 0, pushY = 0;
      
      for (const ad of overlappingAds) {
        const dx = bestPosition.x + size/2 - (ad.x + ad.size/2);
        const dy = bestPosition.y + size/2 - (ad.y + ad.size/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING * 2;
        const pushFactor = (minDistance - distance) / distance;
        
        pushX += dx * pushFactor;
        pushY += dy * pushFactor;
      }
      
      // Apply the push and ensure we're still in bounds
      bestPosition.x += pushX;
      bestPosition.y += pushY;
      
      bestPosition.x = Math.min(Math.max(bestPosition.x, minX), maxX);
      bestPosition.y = Math.min(Math.max(bestPosition.y, minY), maxY);
    }
  }
  
  return bestPosition;
}

function ensureInViewport(x, y, size, windowWidth, windowHeight, existingAds, currentAdId) {
  const minX = BUBBLE_PADDING;
  const maxX = windowWidth - size - BUBBLE_PADDING;
  const minY = BUBBLE_PADDING + 50; // Increased to match calculateSafePosition
  const maxY = windowHeight - size - BUBBLE_PADDING;

  let newX = Math.min(Math.max(x, minX), maxX);
  let newY = Math.min(Math.max(y, minY), maxY);

  const otherAds = existingAds.filter(ad => ad.id !== currentAdId);
  
  // Check for overlaps and adjust position
  let iterations = 0;
  const maxIterations = 15; // Increased from 10
  
  while(iterations < maxIterations) {
    let hasOverlap = false;
    let pushX = 0;
    let pushY = 0;
    
    for(const ad of otherAds) {
      const dx = (newX + size/2) - (ad.x + ad.size/2);
      const dy = (newY + size/2) - (ad.y + ad.size/2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (size + ad.size) / 2 + BUBBLE_PADDING * 2; // Increased minimum distance
      
      if(distance < minDistance) {
        hasOverlap = true;
        // Calculate push direction
        const angle = Math.atan2(dy, dx);
        // Increased push factor to separate bubbles more strongly
        const push = (minDistance - distance) * 1.2;
        pushX += Math.cos(angle) * push;
        pushY += Math.sin(angle) * push;
      }
    }
    
    if(!hasOverlap) break;
    
    // Apply push with increased strength
    newX += pushX;
    newY += pushY;
    
    // Keep in bounds
    newX = Math.min(Math.max(newX, minX), maxX);
    newY = Math.min(Math.max(newY, minY), maxY);
    
    iterations++;
  }

  // If we still have overlaps after maximum iterations,
  // try a different approach - push to the edges
  if(iterations >= maxIterations) {
    const center = {
      x: windowWidth / 2,
      y: windowHeight / 2
    };
    
    // Push away from the center
    const dx = newX + size/2 - center.x;
    const dy = newY + size/2 - center.y;
    const angle = Math.atan2(dy, dx);
    const pushDistance = 100; // Strong push
    
    newX += Math.cos(angle) * pushDistance;
    newY += Math.sin(angle) * pushDistance;
    
    // Keep in bounds
    newX = Math.min(Math.max(newX, minX), maxX);
    newY = Math.min(Math.max(newY, minY), maxY);
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
  const [activeBookingId, setActiveBookingId] = useState(null);

  // Add this function to update ads with persistence
  const updateAds = (newAds) => {
    setAds(newAds);
    localStorage.setItem('cachedAds', JSON.stringify(newAds));
  };

  // Load ads when component mounts
  useEffect(() => {
    const loadAdsFromApi = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAds();
        const currentMaxSize = getMaxSize(); // Get current max size for this screen
        
        // Reposition any bubbles that have x=0, y=0 coordinates (fix for DB-stored bubbles)
        const repositionedAds = data.map(ad => {
          // Calculate responsive size correctly based on the current screen size
          let adWithMetadata = {
            ...ad,
            originalSize: ad.size, // Store the original size from server
            originalMaxSize: currentMaxSize, // Maximum size for current screen
            currentMaxSize: currentMaxSize
          };
          
          // Check if this ad has zero coordinates (likely from the server bug)
          if (ad.x === 0 && ad.y === 0) {
            console.log('Fixing ad with zero coordinates:', ad.id);
            // Calculate a safe position for this ad
            const position = calculateSafePosition(
              ad.size, 
              windowSize.width, 
              windowSize.height, 
              data.filter(otherAd => otherAd.id !== ad.id)
            );
            adWithMetadata = { ...adWithMetadata, x: position.x, y: position.y };
          }
          
          return adWithMetadata;
        });
        
        setAds(repositionedAds);
        setIsLoading(false);
        
        // Update any repositioned ads on the server (optional)
        for (const ad of repositionedAds) {
          if (ad.x !== 0 || ad.y !== 0) {
            try {
              // Use position-only update to avoid auth issues
              await apiUpdateAdPosition(ad.id, ad.x, ad.y);
            } catch (error) {
              console.error('Error updating ad position:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading ads:', error);
        setIsLoading(false);
      }
    };

    loadAdsFromApi();
  }, []);

  // Update socket connection handling
  useEffect(() => {
    // Replace the current socket event listeners with a single 'adsUpdated' listener
    socket.on('adsUpdated', (data) => {
      console.log('Received adsUpdated event:', data);
      
      if (data.type === 'update') {
        setAds(prevAds => {
          const newAds = prevAds.map(ad => 
            ad.id === data.ad.id ? {...ad, ...data.ad} : ad
          );
          localStorage.setItem('cachedAds', JSON.stringify(newAds));
          return newAds;
        });
      } else if (data.type === 'delete') {
        setAds(prevAds => {
          const newAds = prevAds.filter(ad => ad.id !== data.ad.id);
          localStorage.setItem('cachedAds', JSON.stringify(newAds));
          return newAds;
        });
      } else if (data.type === 'create') {
        setAds(prevAds => {
          // Add the new ad to the list if it doesn't already exist
          const exists = prevAds.some(ad => ad.id === data.ad.id);
          if (!exists) {
            const newAds = [...prevAds, data.ad];
            localStorage.setItem('cachedAds', JSON.stringify(newAds));
            return newAds;
          }
          return prevAds;
        });
      }
    });
    
    // Keep these for backward compatibility if they're still being used elsewhere
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

    socket.on('adCreated', (newAd) => {
      setAds(prevAds => {
        // Add the new ad to the list if it doesn't already exist
        const exists = prevAds.some(ad => ad.id === newAd.id);
        if (!exists) {
          const newAds = [...prevAds, newAd];
          localStorage.setItem('cachedAds', JSON.stringify(newAds));
          return newAds;
        }
        return prevAds;
      });
    });

    return () => {
      socket.off('adsUpdated');
      socket.off('adUpdated');
      socket.off('adDeleted');
      socket.off('adCreated');
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

  // Effect for updating window size
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      // Update bubble sizes when window size changes
      const newMaxSize = getMaxSize();
      setAds(prevAds => {
        const updatedAds = prevAds.map(ad => {
          // For bumped ads, always use the maximum size
          if (ad.isBumped) {
            return ad;
          }
          
          // For shrunk (non-bumped) ads, we need to maintain their proportional size
          // relative to the maximum size for the current screen
          if (ad.originalSize && ad.originalMaxSize) {
            // Calculate how much the ad has shrunk as a percentage of its original max size
            const shrinkPercentage = ad.size / ad.originalMaxSize;
            
            // Calculate the new size based on this percentage of the new max size
            const newSize = Math.max(MIN_SIZE, Math.round(newMaxSize * shrinkPercentage * 10) / 10);
            
            return {
              ...ad,
              size: newSize,
              currentMaxSize: newMaxSize // Track current max size for reference
            };
          } else {
            // First time resize - store original values
            return {
              ...ad,
              originalSize: ad.size,
              originalMaxSize: BASE_MAX_SIZE,
              currentMaxSize: newMaxSize
            };
          }
        });
        return updatedAds;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When ads are loaded, store their original size and max size for the screen
  useEffect(() => {
    if (ads.length > 0) {
      const currentMaxSize = getMaxSize(); // Get max size for current screen
      
      setAds(prevAds => {
        return prevAds.map(ad => {
          if (!ad.originalSize) {
            return {
              ...ad,
              originalSize: ad.size, // Store original size when first loaded
              originalMaxSize: currentMaxSize, // Store the max size for when this ad was loaded
              currentMaxSize: currentMaxSize
            };
          }
          return ad;
        });
      });
    }
  }, [ads.length]);

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

      // Calculate a safe position for the new ad
      const position = calculateSafePosition(getMaxSize(), windowSize.width, windowSize.height, ads);

      // Create the new ad object with explicit x and y coordinates
      const newAd = {
        id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...adData,
        size: getMaxSize(),
        preferredSize: getMaxSize(),
        x: position.x,
        y: position.y,
        createdAt: new Date().toISOString(),
        isBumped: false,
        owner: currentUser.username
      };

      // Log the ad data being sent to the server, including position
      console.log('Creating new ad with position:', { x: position.x, y: position.y });
      console.log('Complete ad data:', newAd);
      
      const createdAd = await apiCreateAd(newAd);
      console.log('Created ad:', createdAd);
      
      setAds(prevAds => [...prevAds, createdAd]);
      setShowCreateModal(false);
      showNotification('Project Listed successfully!', 'success');
    } catch (error) {
      console.error('Error creating ad:', error);
      showNotification('Failed to List Project. Please try again.', 'error');
    }
  };

  const handleBumpPurchase = async (adId, txSignature, duration) => {
    try {
      console.log(`Bump purchase initiated - Ad ID: ${adId}, Signature: ${txSignature}, Duration: ${duration}`);
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
          console.log("Admin approving bump");
          const [bumpResponse, adResponse] = await Promise.all([
            approveBumpRequest(adId, currentUser.username),
            apiUpdateAd(adId, {
              ...ad,
              size: getMaxSize(),
              isBumped: true,
              status: 'approved',
              bumpedAt: new Date(),
              bumpDuration: duration,
              bumpExpiresAt: new Date(Date.now() + duration)
            })
          ]);

          console.log("Bump approved successfully:", bumpResponse);
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
        console.log("User submitting bump request:", {
          adId,
          owner: currentUser.username,
          txSignature,
          duration
        });
        
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

        console.log("Bump request submitted successfully:", bumpResponse);
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
          size: getMaxSize(),
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

  const handleBannerSubmit = async (bannerData) => {
    try {
      if (!currentUser) {
        throw new Error('Please log in first!');
      }

      const submitData = {
        ...bannerData,
        owner: currentUser.userId,
        status: 'pending'
      };

      console.log('Sending to API:', submitData); // Debug log

      const response = await fetch(`${API_URL}/bannerAds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const newBanner = await response.json();
      showNotification('Banner ad created successfully!', 'success');
      return newBanner;
    } catch (error) {
      console.error('Error creating banner ad:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  };

  // Bubble enhancement suggestions for App.js
  // Look for the bubble creation/management code and add these improvements:

  // 1. Subtle size variations for each bubble when created
  const createBubble = (ad) => {
    // Your existing bubble creation code
    
    // Add subtle size variation (5-10% difference between bubbles)
    const sizeVariation = 0.95 + Math.random() * 0.1;
    ad.element.style.transform = `scale(${sizeVariation})`;
    ad.baseScale = sizeVariation; // Store base scale for animations
    
    return ad;
  };

  // 2. Gentler deceleration for more fluid movement
  const updateBubblePosition = (ad) => {
    // Your existing position update code
    
    // Make deceleration slightly gentler (0.98 instead of 0.95)
    ad.vx *= 0.98;
    ad.vy *= 0.98;
    
    // Add subtle wobble effect on movement
    if (Math.abs(ad.vx) > 0.1 || Math.abs(ad.vy) > 0.1) {
      const wobble = Math.sin(Date.now() * 0.01) * 0.03;
      ad.element.style.transform = `scale(${ad.baseScale * (1 + wobble)})`;
    }
  };

  // 3. Improved collision response for more "bouncy" feel and better separation
  const handleCollision = (ad1, ad2) => {
    const dx = (ad1.x + ad1.size/2) - (ad2.x + ad2.size/2);
    const dy = (ad1.y + ad1.size/2) - (ad2.y + ad2.size/2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (ad1.size + ad2.size) / 2 + BUBBLE_PADDING * 2; // Extra padding multiplier
    
    // If bubbles are overlapping
    if (distance < minDistance) {
      // Calculate normalized direction vector
      const nx = dx / (distance || 0.001); // Avoid division by zero
      const ny = dy / (distance || 0.001);
      
      // Calculate relative velocity
      const vx = ad1.vx - ad2.vx;
      const vy = ad1.vy - ad2.vy;
      
      // Calculate dot product of velocity and normal
      const dotProduct = nx * vx + ny * vy;
      
      // Very high elasticity for energetic bounce
      const elasticity = 1.5; // Increased from 1.2
      
      // Calculate impulse
      const impulse = -(1 + elasticity) * dotProduct / 
                      (1/ad1.mass + 1/ad2.mass);
      
      // Apply impulse to each bubble
      ad1.vx += impulse * nx / ad1.mass;
      ad1.vy += impulse * ny / ad1.mass;
      ad2.vx -= impulse * nx / ad2.mass;
      ad2.vy -= impulse * ny / ad2.mass;
      
      // Strong immediate separation to prevent overlaps
      const overlap = minDistance - distance;
      const separationFactor = 1.0; // Doubled from 0.5 for immediate full separation
      
      // Apply immediate position correction
      ad1.x += nx * overlap * separationFactor;
      ad1.y += ny * overlap * separationFactor;
      ad2.x -= nx * overlap * separationFactor;
      ad2.y -= ny * overlap * separationFactor;
      
      // Add stronger random jitter
      const jitterAmount = 2.0; // Increased from 0.5
      ad1.vx += (Math.random() - 0.5) * jitterAmount;
      ad1.vy += (Math.random() - 0.5) * jitterAmount;
      ad2.vx += (Math.random() - 0.5) * jitterAmount;
      ad2.vy += (Math.random() - 0.5) * jitterAmount;
      
      // Apply additional minimum velocity to ensure bubbles move apart
      const minVelocity = 3.0;
      const vxMag = Math.abs(ad1.vx);
      const vyMag = Math.abs(ad1.vy);
      
      if (vxMag < minVelocity) ad1.vx += (ad1.vx >= 0 ? 1 : -1) * (minVelocity - vxMag);
      if (vyMag < minVelocity) ad1.vy += (ad1.vy >= 0 ? 1 : -1) * (minVelocity - vyMag);
      
      const vxMag2 = Math.abs(ad2.vx);
      const vyMag2 = Math.abs(ad2.vy);
      
      if (vxMag2 < minVelocity) ad2.vx += (ad2.vx >= 0 ? 1 : -1) * (minVelocity - vxMag2);
      if (vyMag2 < minVelocity) ad2.vy += (ad2.vy >= 0 ? 1 : -1) * (minVelocity - vyMag2);
    }
  };

  // Function to smoothly refresh bubbles without glitching
  const refreshBubbles = (newAds, currentAds) => {
    // 1. Add transition styling for smooth position changes
    document.querySelectorAll('.bubble').forEach(bubble => {
      bubble.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
    });
    
    // 2. For existing bubbles that will remain, keep their positions/velocities
    const persistentBubbles = currentAds.filter(currentAd => 
      newAds.some(newAd => newAd.id === currentAd.id)
    );
    
    // 3. For new bubbles, start with opacity 0 and fade in
    const newBubblesData = newAds.filter(newAd => 
      !currentAds.some(currentAd => currentAd.id === newAd.id)
    );
    
    // Apply fade-in for new bubbles
    newBubblesData.forEach(newAd => {
      // When creating the DOM element for this bubble
      if (newAd.element) {
        newAd.element.style.opacity = '0';
        
        // Fade in gradually
        setTimeout(() => {
          newAd.element.style.transition = 'opacity 0.8s ease-in-out, transform 0.5s ease-out';
          newAd.element.style.opacity = '1';
        }, 50);
      }
    });
    
    // 4. For bubbles that will be removed, fade them out before removal
    const removedBubbles = currentAds.filter(currentAd => 
      !newAds.some(newAd => newAd.id === currentAd.id)
    );
    
    removedBubbles.forEach(oldAd => {
      if (oldAd.element) {
        oldAd.element.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        oldAd.element.style.opacity = '0';
        
        // Remove after fade-out completes
        setTimeout(() => {
          if (oldAd.element && oldAd.element.parentNode) {
            oldAd.element.parentNode.removeChild(oldAd.element);
          }
        }, 500);
      }
    });
    
    // 5. After everything is stable, remove transitions to allow physics to work normally
    setTimeout(() => {
      document.querySelectorAll('.bubble').forEach(bubble => {
        bubble.style.transition = '';
      });
    }, 600);
    
    return [...persistentBubbles, ...newBubblesData];
  };

  // Function to periodically check and fix overlapping bubbles
  const fixOverlappingBubbles = useCallback(() => {
    const adsCopy = [...ads];
    let hasOverlaps = false;
    
    // Check each pair of bubbles for overlaps
    for (let i = 0; i < adsCopy.length; i++) {
      for (let j = i + 1; j < adsCopy.length; j++) {
        const ad1 = adsCopy[i];
        const ad2 = adsCopy[j];
        
        if (ad1.element && ad2.element) {
          const dx = (ad1.x + ad1.size/2) - (ad2.x + ad2.size/2);
          const dy = (ad1.y + ad1.size/2) - (ad2.y + ad2.size/2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (ad1.size + ad2.size) / 2 + BUBBLE_PADDING * 2;
          
          if (distance < minDistance) {
            hasOverlaps = true;
            
            // Calculate push direction and amount
            const pushDirection = { 
              x: dx / (distance || 0.001), 
              y: dy / (distance || 0.001) 
            };
            const pushAmount = (minDistance - distance) + 10; // Extra 10px buffer
            
            // Apply strong immediate push
            ad1.x += pushDirection.x * pushAmount * 0.6;
            ad1.y += pushDirection.y * pushAmount * 0.6;
            ad2.x -= pushDirection.x * pushAmount * 0.6;
            ad2.y -= pushDirection.y * pushAmount * 0.6;
            
            // Update DOM elements
            if (ad1.element) {
              ad1.element.style.left = `${ad1.x}px`;
              ad1.element.style.top = `${ad1.y}px`;
            }
            if (ad2.element) {
              ad2.element.style.left = `${ad2.x}px`;
              ad2.element.style.top = `${ad2.y}px`;
            }
            
            // Add velocity to keep them moving apart
            const velocityBoost = 2.0;
            ad1.vx += pushDirection.x * velocityBoost;
            ad1.vy += pushDirection.y * velocityBoost;
            ad2.vx -= pushDirection.x * velocityBoost;
            ad2.vy -= pushDirection.y * velocityBoost;
          }
        }
      }
    }
    
    if (hasOverlaps) {
      // If we found overlaps, update the ads state
      setAds(adsCopy);
    }
  }, [ads]);
  
  // Set up periodic checks to fix overlaps
  useEffect(() => {
    const checkInterval = setInterval(fixOverlappingBubbles, 2000);
    return () => clearInterval(checkInterval);
  }, [fixOverlappingBubbles]);

  // Add effect to check for showCreateAccount parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('showCreateAccount') === 'true') {
      setShowCreateAccountModal(true);
      
      // Clear the parameter from the URL to avoid reopening modal on refresh
      const newUrl = window.location.pathname + 
        (window.location.search ? 
          window.location.search.replace('showCreateAccount=true', '').replace(/(\?|&)$/, '') : 
          '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Set up event listeners for dashboard opening from notifications
  useEffect(() => {
    // Define handler for opening dashboard with booking
    const handleOpenDashboardWithBooking = (event) => {
      console.log('Opening dashboard with booking:', event.detail.bookingId);
      setActiveBookingId(event.detail.bookingId);
      setShowDashboard(true);
    };
    
    // Define handler for opening dashboard without specific booking
    const handleOpenDashboard = () => {
      console.log('Opening dashboard');
      setShowDashboard(true);
    };
    
    // Add event listeners
    window.addEventListener('openDashboardWithBooking', handleOpenDashboardWithBooking);
    window.addEventListener('openDashboard', handleOpenDashboard);
    
    // Add global function to show dashboard (for use by other components)
    window.showDashboard = (tab, bookingId) => {
      console.log('Global showDashboard called', tab, bookingId);
      if (bookingId) {
        setActiveBookingId(bookingId);
      }
      setShowDashboard(true);
    };
    
    // Check localStorage for dashboard open flag (fallback method)
    const checkLocalStorage = () => {
      const shouldOpenDashboard = localStorage.getItem('aquads_open_dashboard');
      const bookingId = localStorage.getItem('aquads_open_booking');
      const timestamp = localStorage.getItem('aquads_notification_timestamp');
      
      // Only process recent requests (within last 5 seconds)
      const isRecent = timestamp && (Date.now() - parseInt(timestamp, 10)) < 5000;
      
      if (shouldOpenDashboard === 'true' && isRecent) {
        console.log('Opening dashboard from localStorage flag');
        
        if (bookingId) {
          setActiveBookingId(bookingId);
        }
        
        setShowDashboard(true);
        
        // Clear the flags
        localStorage.removeItem('aquads_open_dashboard');
        localStorage.removeItem('aquads_open_booking');
        localStorage.removeItem('aquads_notification_timestamp');
      }
    };
    
    // Check for localStorage flags on mount
    checkLocalStorage();
    
    // Return cleanup function
    return () => {
      window.removeEventListener('openDashboardWithBooking', handleOpenDashboardWithBooking);
      window.removeEventListener('openDashboard', handleOpenDashboard);
      delete window.showDashboard;
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/marketplace" element={
          <Marketplace 
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onCreateAccount={handleCreateAccount}
            onBannerSubmit={handleBannerSubmit}
          />
        } />
        <Route path="/games" element={
          <GameHub 
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onCreateAccount={handleCreateAccount}
          />
        } />
        <Route path="/" element={
          <div className="bg-gradient-to-br from-gray-900 to-black text-white overflow-y-auto h-screen">
            {/* Background stays fixed */}
            <div className="fixed inset-0">
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
                        Marketplace
                      </Link>
                      <Link
                        to="/games"
                        className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                      >
                        GameHub
                      </Link>
                      {currentUser ? (
                        <>
                          <NotificationBell currentUser={currentUser} />
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
                        Marketplace
                      </Link>
                      <Link
                        to="/games"
                        className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                      >
                        GameHub
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
                            List Project
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
                        <div 
                          key={ad.id}
                          className="bubble-container"
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                            width: `${ad.size}px`,
                            height: `${ad.size}px`,
                          }}
                        >
                          <motion.div
                            className="absolute transform hover:scale-105 bubble"
                            style={{
                              width: `${ad.size}px`,
                              height: `${ad.size}px`,
                              transition: `all ${ANIMATION_DURATION} ease-in-out`,
                              zIndex: ad.isBumped ? 2 : 1,
                              animationDuration: `${8 + Math.random() * 4}s`,
                              cursor: 'pointer',
                              touchAction: 'auto',
                              position: 'absolute',
                              top: 0,
                              left: 0
                            }}
                            onClick={(e) => {
                              if (!e.defaultPrevented) {
                                if (requireAuth()) {
                                  window.open(ad.url, '_blank');
                                }
                              }
                            }}
                          >
                            <div className="bubble-content">
                              {/* Background of bubble */}
                              <div className="bubble-bg"></div>
                              
                              {/* Curved text at top */}
                              <div 
                                className="bubble-text-curved"
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
                                    fontSize: `${Math.max(ad.size * 0.09, 10)}px`
                                  }}
                                >
                                  {ad.title}
                                </span>
                              </div>
                              
                              {/* Larger Logo */}
                              <div 
                                className="bubble-logo-container"
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
                            </div>
                          </motion.div>
                        </div>
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
                  onClose={() => {
                    setShowDashboard(false);
                    setActiveBookingId(null);
                  }}
                  onDeleteAd={handleDeleteAd}
                  onBumpAd={handleBumpPurchase}
                  onEditAd={handleEditAd}
                  onRejectBump={handleRejectBump}
                  onApproveBump={handleApproveBump}
                  initialBookingId={activeBookingId}
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
        <Route path="/how-to" element={<HowTo currentUser={currentUser} />} />
        <Route path="/how-to/:slug" element={<HowTo currentUser={currentUser} />} />
        <Route path="/affiliate" element={<Affiliate />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </Router>
  );
}

export default App;
