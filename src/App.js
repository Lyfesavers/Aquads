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
  API_URL,
  reconnectSocket
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
import logger from './utils/logger';

// Simple debounce function implementation
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

window.Buffer = Buffer;

// Initialize EmailJS right after imports
emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);

// Constants for ad sizes and animations
const BASE_MAX_SIZE = 100;
const MIN_SIZE = 50;
// Function to get responsive size based on screen width
function getResponsiveSize(baseSize) {
  // Get current viewport width
  const viewportWidth = window.innerWidth;
  
  if (viewportWidth <= 480) {
    // Mobile - smaller bubbles (reduced from 0.65 to 0.5)
    return Math.floor(baseSize * 0.5);
  } else if (viewportWidth <= 768) {
    // Tablet - medium bubbles (reduced from 0.8 to 0.7)
    return Math.floor(baseSize * 0.7);
  }
  // Desktop - normal size
  return baseSize;
}

// Use this function to get current max size
function getMaxSize() {
  return getResponsiveSize(BASE_MAX_SIZE);
}

const SHRINK_RATE = 4; // Amount to shrink by each interval
const SHRINK_INTERVAL = 30000; // 30 seconds
const SHRINK_PERCENTAGE = 0.9; // More gradual shrinking
const TOKEN_PRICE = 0.01; // SOL per token
const AD_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const AD_WARNING_TIME = 24 * 60 * 60 * 1000; // 1 day
const FREE_AD_LIMIT = 1;
const LAYOUT_DEBOUNCE = 200; // Debounce time for layout calculations
const ANIMATION_DURATION = '0.3s'; // Slower animations
const REPOSITION_INTERVAL = 10000; // 5 seconds between position updates
const BUBBLE_PADDING = 20; // Padding from edges
const BANNER_HEIGHT = 0; // Height of the banner area including nav and token banner
const TOP_PADDING = BANNER_HEIGHT + 0; // Additional padding from top to account for banner
const MERCHANT_WALLET = {
    SOL: "J8ewxZwntodH8sT8LAXN5j6sAsDhtCh8sQA6GwRuLTSv",
    ETH: "0x98BC1BEC892d9f74B606D478E6b45089D2faAB05",
    BTC: "bc1qdh9ar2elv6cvhfqccvlf8w6rwy0r592f9a6dyt",
    BASE: "0x98BC1BEC892d9f74B606D478E6b45089D2faAB05"
}; // Replace with your wallet address
const ADMIN_USERNAME = "admin"; // You can change this to your preferred admin username

// Helper functions for responsive positioning
function calculateSafePosition(size, windowWidth, windowHeight, existingAds) {
  // Center of the available space (excluding banner)
  const centerX = windowWidth / 2;
  const centerY = (windowHeight - TOP_PADDING) / 1 + TOP_PADDING;
  
  // If this is the first bubble, place it directly in the center of available space
  if (existingAds.length === 0) {
    return {
      x: centerX - size/2,
      y: centerY - size/2
    };
  }
  
  // Reduced spacing between bubbles for tighter packing
  const bubbleSpacing = 0.50;
  
  // Calculate spiral position with optimized parameters
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const startRadius = size/3;
  const scaleFactor = 0.7;
  
  // Create a grid-based optimization for larger numbers of bubbles
  const useGridApproach = existingAds.length > 12;
  
  if (useGridApproach) {
    const cellSize = size * bubbleSpacing;
    const gridColumns = Math.floor((windowWidth - 2 * BUBBLE_PADDING) / cellSize);
    const gridRows = Math.floor((windowHeight - TOP_PADDING - BUBBLE_PADDING) / cellSize);
    
    const grid = Array(gridRows).fill().map(() => Array(gridColumns).fill(false));
    
    existingAds.forEach(ad => {
      const col = Math.floor((ad.x - BUBBLE_PADDING) / cellSize);
      const row = Math.floor((ad.y - TOP_PADDING) / cellSize);
      
      if (col >= 0 && col < gridColumns && row >= 0 && row < gridRows) {
        grid[row][col] = true;
        
        for (let r = Math.max(0, row-1); r <= Math.min(gridRows-1, row+1); r++) {
          for (let c = Math.max(0, col-1); c <= Math.min(gridColumns-1, col+1); c++) {
            if (Math.sqrt(Math.pow(r-row, 2) + Math.pow(c-col, 2)) <= 1) {
              grid[r][c] = true;
            }
          }
        }
      }
    });
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        if (!grid[row][col]) {
          const x = BUBBLE_PADDING + col * cellSize;
          const y = TOP_PADDING + row * cellSize;
          
          let hasOverlap = false;
          for (const ad of existingAds) {
            const distance = calculateDistance(
              x + size/2, 
              y + size/2, 
              ad.x + ad.size/2, 
              ad.y + ad.size/2
            );
            
            const minDistance = ((size + ad.size) / 2) * bubbleSpacing;
            
            if (distance < minDistance) {
              hasOverlap = true;
              break;
            }
          }
          
          if (!hasOverlap) {
            return { x, y };
          }
        }
      }
    }
  }
  
  for (let i = 0; i < 1000; i++) {
    const angle = goldenAngle * i;
    const radius = startRadius * scaleFactor * Math.sqrt(i + 1);
    
    const x = centerX + radius * Math.cos(angle) - size/2;
    const y = centerY + radius * Math.sin(angle) - size/2;
    
    if (x < BUBBLE_PADDING || x + size > windowWidth - BUBBLE_PADDING || 
        y < TOP_PADDING || y + size > windowHeight - BUBBLE_PADDING) {
      continue;
    }
    
    let hasOverlap = false;
    for (const ad of existingAds) {
      const distance = calculateDistance(
        x + size/2, 
        y + size/2, 
        ad.x + ad.size/2, 
        ad.y + ad.size/2
      );
      
      const minDistance = ((size + ad.size) / 2) * bubbleSpacing;
      
      if (distance < minDistance) {
        hasOverlap = true;
        break;
      }
    }
    
    if (!hasOverlap) {
      return { x, y };
    }
  }
  
  return {
    x: Math.max(BUBBLE_PADDING, Math.min(windowWidth - size - BUBBLE_PADDING, Math.random() * windowWidth)),
    y: Math.max(TOP_PADDING, Math.min(windowHeight - size - BUBBLE_PADDING, Math.random() * (windowHeight - TOP_PADDING)))
  };
}

function ensureInViewport(x, y, size, windowWidth, windowHeight, existingAds, currentAdId) {
  const minX = BUBBLE_PADDING;
  const maxX = windowWidth - size - BUBBLE_PADDING;
  const minY = TOP_PADDING;
  const maxY = windowHeight - size - BUBBLE_PADDING;

  let newX = Math.min(Math.max(x, minX), maxX);
  let newY = Math.min(Math.max(y, minY), maxY);

  const otherAds = existingAds.filter(ad => ad.id !== currentAdId);
  
  if (otherAds.length === 0) {
    return { x: newX, y: newY };
  }
  
  const bubbleSpacing = 1.02;
  let iterations = 0;
  const maxIterations = 25;
  
  while(iterations < maxIterations) {
    let hasOverlap = false;
    let totalPushX = 0;
    let totalPushY = 0;
    let overlappingAds = 0;
    
    for (const ad of otherAds) {
      const distance = calculateDistance(
        newX + size/2, 
        newY + size/2, 
        ad.x + ad.size/2, 
        ad.y + ad.size/2
      );
      
      const minDistance = ((size + ad.size) / 2) * bubbleSpacing;
      
      if (distance < minDistance) {
        hasOverlap = true;
        overlappingAds++;
        
        const dx = (ad.x + ad.size/2) - (newX + size/2);
        const dy = (ad.y + ad.size/2) - (newY + size/2);
        
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const pushX = dx === 0 ? 0 : dx / magnitude;
        const pushY = dy === 0 ? 0 : dy / magnitude;
        
        const pushAmount = minDistance - distance;
        
        const multiplier = 1 / Math.sqrt(overlappingAds);
        totalPushX -= pushX * pushAmount * multiplier;
        totalPushY -= pushY * pushAmount * multiplier;
      }

    }
    
    if (!hasOverlap) {
      break;
    }
    
    const dampening = 0.8;
    newX += totalPushX * dampening;
    newY += totalPushY * dampening;
    
    newX = Math.min(Math.max(newX, minX), maxX);
    newY = Math.min(Math.max(newY, minY), maxY);
    
    iterations++;
  }

  return { x: newX, y: newY };
}

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Add Auth Context near the top of the file - outside the App component
const AuthContext = React.createContext();

// Create a custom NavigationListener component to track navigation events
const NavigationListener = ({ onNavigate }) => {
  useEffect(() => {
    // Handle initial navigation
    onNavigate();
    
    // Use MutationObserver to detect navigation changes through component unmounts/mounts
    // This works with both history API navigation and Link component navigation
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && 
            (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
          // Route change detected
          onNavigate();
          break;
        }
      }
    });
    
    // Observe the main app container
    const container = document.getElementById('root');
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }
    
    // Clean up
    return () => observer.disconnect();
  }, [onNavigate]);
  
  return null; // This component doesn't render anything
};

function App() {
  const [ads, setAds] = useState(() => {
    const cachedAds = localStorage.getItem('cachedAds');
    if (cachedAds) {
      try {
        // Ensure vote properties exist
        return JSON.parse(cachedAds).map(ad => ({
          ...ad,
          bullishVotes: ad.bullishVotes || 0,
          bearishVotes: ad.bearishVotes || 0
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        return user; // Return user immediately for initial state
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
        const repositionedAds = data.map((ad, index) => {
          // Calculate responsive size correctly based on the current screen size
          let adWithMetadata = {
            ...ad,
            originalSize: ad.size, // Store the original size from server
            originalMaxSize: currentMaxSize, // Maximum size for current screen
            currentMaxSize: currentMaxSize
          };
          
          // Check if this ad has zero coordinates or y less than TOP_PADDING
          if (ad.x === 0 || ad.y === 0 || ad.y < TOP_PADDING) {
            logger.log('Fixing ad with invalid coordinates:', ad.id);
            
            // Use staggered positioning if many ads need fixing
            let position;
            if (index > 0) {
              // Try a position that's definitely not (0,0)
              const baseX = windowSize.width / 2;
              const baseY = windowSize.height / 2;
              
              // Apply a spiral pattern
              const angle = index * (Math.PI * 0.618033988749895); // Golden ratio
              const radius = 50 + 20 * Math.sqrt(index);
              
              position = {
                x: baseX + Math.cos(angle) * radius - (ad.size / 2),
                y: baseY + Math.sin(angle) * radius - (ad.size / 2)
              };
              
              // Then use calculateSafePosition to fine-tune
              position = calculateSafePosition(
                ad.size, 
                windowSize.width, 
                windowSize.height, 
                data.filter(otherAd => otherAd.id !== ad.id)
              );
            } else {
              // Calculate a safe position for this ad
              position = calculateSafePosition(
                ad.size, 
                windowSize.width, 
                windowSize.height, 
                data.filter(otherAd => otherAd.id !== ad.id)
              );
            }
            
            // Make sure y is at least TOP_PADDING + some margin
            if (position.y < TOP_PADDING) {
              position.y = TOP_PADDING + 20;
            }
            
            adWithMetadata = { ...adWithMetadata, x: position.x, y: position.y };
          }
          
          return adWithMetadata;
        });
        
        setAds(repositionedAds);
        setIsLoading(false);
        
        // Update any repositioned ads on the server (optional)
        for (const ad of repositionedAds) {
          if (ad.x !== 0 && ad.y !== 0) {
            try {
              // Use position-only update to avoid auth issues
              await apiUpdateAdPosition(ad.id, ad.x, ad.y);
            } catch (error) {
              logger.error('Error updating ad position:', error);
            }
          }
        }
      } catch (error) {
        logger.error('Error loading ads:', error);
        setIsLoading(false);
      }
    };

    loadAdsFromApi();
  }, []);

  // Update socket connection handling
  useEffect(() => {
    // Replace the current socket event listeners with a single 'adsUpdated' listener
    socket.on('adsUpdated', (data) => {
      logger.log('Received adsUpdated event:', data);
      
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
    logger.log('Ads state updated:', ads);
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
            logger.error('Error updating ad size:', error);
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
      // Store current width to detect mobile/desktop transitions
      const wasMobile = window.innerWidth <= 480;
      
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
      
      // If transitioning from mobile to desktop, restore original positions
      const isNowDesktop = window.innerWidth > 480;
      if (wasMobile && isNowDesktop) {
        // Small delay to let React update the DOM
        setTimeout(arrangeDesktopGrid, 100);
      }
      // Apply mobile-specific adjustments after short delay to let DOM update
      else if (window.innerWidth <= 480) {
        setTimeout(adjustBubblesForMobile, 100);
      } else {
        // On any desktop resize, re-arrange the grid
        setTimeout(arrangeDesktopGrid, 100);
      }
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
      logger.error('Login error:', error);
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
          logger.log('Attempting to send welcome email...');
          try {
            await emailService.sendWelcomeEmail(
              formData.email,
              user.username,
              user.referralCode
            );
            logger.log('Welcome email sent successfully');
          } catch (emailError) {
            logger.error('Failed to send welcome email:', emailError);
          }
        }
        
        setShowWelcomeModal(true);
        setShowCreateAccountModal(false);
      }
    } catch (error) {
      logger.error('Error creating account:', error);
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

      // Ensure position is valid and not at y=0
      if (position.y === 0 || position.y < TOP_PADDING) {
        // Force y to be at least below the top padding with some margin
        position.y = TOP_PADDING + (getMaxSize() / 2) + 20;
        
        // Make sure it doesn't overlap with other ads
        const otherAds = [...ads];
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts) {
          let hasOverlap = false;
          
          for (const ad of otherAds) {
            const distance = calculateDistance(
              position.x + getMaxSize()/2,
              position.y + getMaxSize()/2,
              ad.x + ad.size/2,
              ad.y + ad.size/2
            );
            
            // Consider bubbles too close if they are less than 75% of their combined sizes apart
            const minDistance = ((getMaxSize() + ad.size) / 2) * 0.75;
            
            if (distance < minDistance) {
              hasOverlap = true;
              // Move position down a bit and try again
              position.y += 20;
              break;
            }
          }
          
          if (!hasOverlap) {
            break;
          }
          
          attempts++;
          
          // If we can't find a spot vertically, try changing x as well
          if (attempts > maxAttempts / 2) {
            position.x = BUBBLE_PADDING + Math.random() * (windowSize.width - 2 * BUBBLE_PADDING - getMaxSize());
          }
        }
      }

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
      logger.log('Creating new ad with position:', { x: position.x, y: position.y });
      logger.log('Complete ad data:', newAd);
      
      const createdAd = await apiCreateAd(newAd);
      logger.log('Created ad:', createdAd);
      
      setAds(prevAds => [...prevAds, createdAd]);
      setShowCreateModal(false);
      showNotification('Project Listed successfully!', 'success');
    } catch (error) {
      logger.error('Error creating ad:', error);
      showNotification('Failed to List Project. Please try again.', 'error');
    }
  };

  const handleBumpPurchase = async (adId, txSignature, duration) => {
    try {
      logger.log(`Bump purchase initiated - Ad ID: ${adId}, Signature: ${txSignature}, Duration: ${duration}`);
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
          logger.log("Admin approving bump");
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

          logger.log("Bump approved successfully:", bumpResponse);
          setAds(prevAds => prevAds.map(a => a.id === adId ? adResponse : a));
          setShowBumpStore(false);
          showNotification('Bump approved successfully!', 'success');
          return;
        } catch (error) {
          logger.error('Error approving bump:', error);
          showNotification(error.message || 'Failed to approve bump request', 'error');
          return;
        }
      }

      // If user is submitting a bump request
      try {
        logger.log("User submitting bump request:", {
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

        logger.log("Bump request submitted successfully:", bumpResponse);
        setAds(prevAds => prevAds.map(a => a.id === adId ? adResponse : a));
        setShowBumpStore(false);
        showNotification('Bump request submitted for approval!', 'success');
      } catch (error) {
        logger.error('Error submitting bump request:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to process bump request';
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      logger.error('Bump purchase error:', error);
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
      logger.error('Error rejecting bump:', error);
      showNotification(error.message || 'Failed to reject bump request', 'error');
    }
  };

  const handleDeleteAd = async (adId) => {
    try {
      await apiDeleteAd(adId);
      setAds(prevAds => prevAds.filter(ad => ad.id !== adId));
      showNotification('Ad deleted successfully!', 'success');
    } catch (error) {
      logger.error('Error deleting ad:', error);
      showNotification('Failed to delete ad. Please try again.', 'error');
    }
  };

  const handleEditAd = async (adIdOrAd, editedData) => {
    try {
      // Handle case where first parameter is the entire ad object
      let adId, updatedFields;
      if (typeof adIdOrAd === 'object') {
        adId = adIdOrAd.id;
        setAdToEdit(adIdOrAd);
        setShowEditModal(true);
        return; // Exit early as we're just opening the modal
      } else {
        adId = adIdOrAd;
        updatedFields = editedData;
      }

      const ad = ads.find(a => a.id === adId);
      if (!ad) {
        showNotification('Ad not found!', 'error');
        return;
      }

      const updatedAd = {
        ...ad,
        ...updatedFields,
        size: ad.size, // Preserve the current size
        isBumped: ad.isBumped // Preserve the bumped status
      };

      const response = await apiUpdateAd(adId, updatedAd);
      setAds(prevAds => prevAds.map(a => a.id === adId ? response : a));
      setShowEditModal(false);
      setAdToEdit(null);
      showNotification('Ad updated successfully!', 'success');
    } catch (error) {
      logger.error('Error updating ad:', error);
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
      logger.error('Error approving bump:', error);
      showNotification(error.message || 'Failed to approve bump request', 'error');
    }
  };

  // Add sentiment voting function
  const handleSentimentVote = async (adId, voteType) => {
    if (!requireAuth()) return;
    
    try {
      const response = await fetch(`${API_URL}/ads/${adId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ voteType })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register vote');
      }

      const data = await response.json();
      
      // Update the ads state with the new vote counts and user's vote
      setAds(prevAds => prevAds.map(ad => 
        ad.id === adId 
          ? { 
              ...ad, 
              bullishVotes: data.bullishVotes, 
              bearishVotes: data.bearishVotes,
              userVote: data.userVote // Track what the user voted
            } 
          : ad
      ));
      
      showNotification(`Voted ${voteType} successfully!`, 'success');
    } catch (error) {
      logger.error('Error voting on ad:', error);
      showNotification(error.message || 'Failed to vote', 'error');
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
    logger.log('Current ads state:', ads);
  }, [ads]);

  // Add these socket event listeners in useEffect
  useEffect(() => {
    socket.on('reviewAdded', (review) => {
      setReviews(prevReviews => [...prevReviews, review]);
    });

    socket.on('userAuthenticated', (userData) => {
      setCurrentUser(userData);
    });

    // Add listener for vote updates
    socket.on('adVoteUpdated', (voteData) => {
      setAds(prevAds => prevAds.map(ad => 
        ad.id === voteData.adId 
          ? { 
              ...ad, 
              bullishVotes: voteData.bullishVotes, 
              bearishVotes: voteData.bearishVotes 
            } 
          : ad
      ));
    });

    return () => {
      socket.off('reviewAdded');
      socket.off('userAuthenticated');
      socket.off('adVoteUpdated'); // Remove listener on cleanup
    };
  }, []);

  // Add this effect to periodically refresh ads
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch(`${API_URL}/ads`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ensure ads have bullishVotes and bearishVotes properties if not present
        const processedAds = data.map(ad => ({
          ...ad,
          bullishVotes: ad.bullishVotes || 0,
          bearishVotes: ad.bearishVotes || 0
        }));
        
        // Cache the ads
        localStorage.setItem('cachedAds', JSON.stringify(processedAds));
        
        // Update state
        setAds(processedAds);
      } catch (error) {
        logger.error('Error fetching ads:', error);
        // Use cached ads if available and the API call fails
        const cachedAds = localStorage.getItem('cachedAds');
        if (cachedAds) {
          setAds(JSON.parse(cachedAds));
        }
      }
    };

    fetchAds();
    const interval = setInterval(fetchAds, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Then add a special hook to handle route changes inside the App component
  useEffect(() => {
    // Periodic token validation function
    const validateToken = async () => {
      if (currentUser && currentUser.token) {
        try {
          const verifiedUser = await verifyToken(currentUser.token);
          if (verifiedUser) {
            // Only update if there are actual changes to avoid unnecessary re-renders
            if (JSON.stringify(verifiedUser) !== JSON.stringify(currentUser)) {
              setCurrentUser(verifiedUser);
            }
          } else {
            // Token invalid, log out
            setCurrentUser(null);
            localStorage.removeItem('currentUser');
          }
        } catch (error) {
          logger.error('Periodic token validation failed:', error);
        }
      }
    };

    // Listen for router navigation events to maintain authentication across routes
    const handleRouteChange = () => {
      if (currentUser) {
        // Reconnect socket when changing routes
        reconnectSocket();
        
        // Also verify token on route change
        validateToken();
      }
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    // Also ensure authentication on initial load
    if (currentUser) {
      reconnectSocket();
    }

    // Set up periodic validation (every 5 minutes)
    const interval = setInterval(validateToken, 5 * 60 * 1000);
    
    // Initial validation
    validateToken();

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      clearInterval(interval);
    };
  }, [currentUser]);

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

      logger.log('Sending to API:', submitData); // Debug log

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
      logger.error('Error creating banner ad:', error);
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

  // 3. Improved collision response for spiral layout
  const handleCollision = (ad1, ad2) => {
    const dx = ad2.x - ad1.x;
    const dy = ad2.y - ad1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate minimum distance based on bubble sizes plus a buffer
    const minDistance = (ad1.size + ad2.size) / 2 + 15; // Added 15px buffer
    
    if (distance < minDistance) {
      // Calculate the overlap amount
      const overlap = minDistance - distance;
      
      // Calculate normalized direction vector
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Move bubbles apart with more force
      const moveAmount = overlap * 0.6; // 60% of overlap for smoother separation
      
      // Apply stronger separation for bumped bubbles
      const ad1Move = ad1.isBumped ? 0.3 : 0.5;
      const ad2Move = ad2.isBumped ? 0.3 : 0.5;
      
      // Update positions
      if (!ad1.isBumped) {
        ad1.x -= nx * moveAmount * ad1Move;
        ad1.y -= ny * moveAmount * ad1Move;
      }
      
      if (!ad2.isBumped) {
        ad2.x += nx * moveAmount * ad2Move;
        ad2.y += ny * moveAmount * ad2Move;
      }
      
      // Add velocity components to help bubbles naturally separate
      const velocityFactor = 0.5;
      ad1.velocityX = -nx * velocityFactor;
      ad1.velocityY = -ny * velocityFactor;
      ad2.velocityX = nx * velocityFactor;
      ad2.velocityY = ny * velocityFactor;
      
      // Update DOM immediately to prevent visual overlap
      const element1 = document.getElementById(ad1.id);
      const element2 = document.getElementById(ad2.id);
      
      if (element1) {
        element1.style.transform = `translate(${ad1.x}px, ${ad1.y}px)`;
        element1.style.transition = 'transform 0.3s ease-out';
      }
      
      if (element2) {
        element2.style.transform = `translate(${ad2.x}px, ${ad2.y}px)`;
        element2.style.transition = 'transform 0.3s ease-out';
      }
      
      return true;
    }
    return false;
  };

  // Function to smoothly refresh bubbles without glitching
  const refreshBubbles = (newAds, currentAds) => {
    if (!newAds?.length) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let hasCollision;
    let iterations = 0;
    const maxIterations = 50;

    do {
      hasCollision = false;
      iterations++;

      // Process each ad
      for (let i = 0; i < newAds.length; i++) {
        const ad = newAds[i];
        
        // Skip if the ad is being dragged
        if (ad.isDragging) continue;

        // Apply velocity with decay
        if (ad.velocityX || ad.velocityY) {
          ad.x += ad.velocityX;
          ad.y += ad.velocityY;
          ad.velocityX *= 0.95;
          ad.velocityY *= 0.95;
          
          // Clear tiny velocities
          if (Math.abs(ad.velocityX) < 0.01) ad.velocityX = 0;
          if (Math.abs(ad.velocityY) < 0.01) ad.velocityY = 0;
        }

        // Check collisions with other bubbles
        for (let j = i + 1; j < newAds.length; j++) {
          const otherAd = newAds[j];
          if (handleCollision(ad, otherAd)) {
            hasCollision = true;
          }
        }

        // Keep bubbles within viewport with padding
        const padding = 20;
        const maxX = windowWidth - ad.size - padding;
        const maxY = windowHeight - ad.size - padding;

        if (ad.x < padding) {
          ad.x = padding;
          ad.velocityX = Math.abs(ad.velocityX || 0) * 0.5;
        } else if (ad.x > maxX) {
          ad.x = maxX;
          ad.velocityX = -Math.abs(ad.velocityX || 0) * 0.5;
        }

        if (ad.y < padding) {
          ad.y = padding;
          ad.velocityY = Math.abs(ad.velocityY || 0) * 0.5;
        } else if (ad.y > maxY) {
          ad.y = maxY;
          ad.velocityY = -Math.abs(ad.velocityY || 0) * 0.5;
        }
      }
    } while (hasCollision && iterations < maxIterations);

    // Update all bubble positions in the DOM
    newAds.forEach(ad => {
      const element = document.getElementById(ad.id);
      if (element) {
        element.style.transform = `translate(${ad.x}px, ${ad.y}px)`;
        element.style.transition = iterations > 1 ? 'transform 0.3s ease-out' : 'none';
      }
    });
  };

  // Function to periodically check and fix overlapping bubbles
  const fixOverlappingBubbles = useCallback(() => {
    // We'll only run this function when necessary, not periodically
    // This reduces the constant repositioning that causes glitchy appearance
    
    const adsCopy = [...ads];
    let hasOverlaps = false;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Check all pairs of bubbles for overlaps
    for (let i = 0; i < adsCopy.length; i++) {
      for (let j = i + 1; j < adsCopy.length; j++) {
        const ad1 = adsCopy[i];
        const ad2 = adsCopy[j];
        
        if (ad1.element && ad2.element) {
          const dx = (ad1.x + ad1.size/2) - (ad2.x + ad2.size/2);
          const dy = (ad1.y + ad1.size/2) - (ad2.y + ad2.size/2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Check for any meaningful overlap (more aggressive - 95% of expected distance)
          const minDistance = (ad1.size + ad2.size) / 2 * 0.95;
          
          if (distance < minDistance) {
            hasOverlaps = true;
            
            // Calculate push direction - normalized vector
            const pushDirection = { 
              x: dx / (distance || 0.001), 
              y: dy / (distance || 0.001) 
            };
            
            // Calculate stronger push amount (extra 5px buffer)
            const pushAmount = (minDistance - distance) + 5;
            
            // Determine which ad should move more
            let push1 = 0.5;
            let push2 = 0.5;
            
            // If one is bumped, the other one moves more
            if (ad1.isBumped) {
              push1 = 0.1; // Bumped ad moves less
              push2 = 0.9; // Other ad moves more
            } else if (ad2.isBumped) {
              push1 = 0.9;
              push2 = 0.1;
            }
            // If one is newer, it gets priority
            else if (ad1.id > ad2.id) {
              push1 = 0.3;
              push2 = 0.7;
            } else if (ad2.id > ad1.id) {
              push1 = 0.7;
              push2 = 0.3;
            }
            
            // Move the bubbles apart with the calculated ratios
            ad1.x += pushDirection.x * pushAmount * push1;
            ad1.y += pushDirection.y * pushAmount * push1;
            ad2.x -= pushDirection.x * pushAmount * push2;
            ad2.y -= pushDirection.y * pushAmount * push2;
            
            // Add a velocity component to help them separate naturally
            ad1.vx = (ad1.vx || 0) + pushDirection.x * 0.8;
            ad1.vy = (ad1.vy || 0) + pushDirection.y * 0.8;
            ad2.vx = (ad2.vx || 0) - pushDirection.x * 0.8;
            ad2.vy = (ad2.vy || 0) - pushDirection.y * 0.8;
            
            // Keep bubbles on screen
            ad1.x = Math.max(BUBBLE_PADDING, Math.min(windowWidth - ad1.size - BUBBLE_PADDING, ad1.x));
            ad1.y = Math.max(BUBBLE_PADDING, Math.min(windowHeight - ad1.size - BUBBLE_PADDING, ad1.y));
            ad2.x = Math.max(BUBBLE_PADDING, Math.min(windowWidth - ad2.size - BUBBLE_PADDING, ad2.x));
            ad2.y = Math.max(BUBBLE_PADDING, Math.min(windowHeight - ad2.size - BUBBLE_PADDING, ad2.y));
            
            // Update DOM elements immediately
            if (ad1.element) {
              ad1.element.style.left = `${ad1.x}px`;
              ad1.element.style.top = `${ad1.y}px`;
              // Add a slight transition for smoother movement
              ad1.element.style.transition = 'left 0.1s, top 0.1s';
            }
            if (ad2.element) {
              ad2.element.style.left = `${ad2.x}px`;
              ad2.element.style.top = `${ad2.y}px`;
              // Add a slight transition for smoother movement
              ad2.element.style.transition = 'left 0.1s, top 0.1s';
            }
          }
        }
      }
    }
    
    // If we fixed overlaps, update the state
    if (hasOverlaps) {
      setAds(adsCopy);
      
      // Schedule another check after a short delay to handle cascading conflicts
      setTimeout(() => {
        fixOverlappingBubbles();
      }, 100);
    }
  }, [ads, setAds]);
  
  // Set up periodic checks to fix overlaps
  useEffect(() => {
    // Run initially to handle any existing overlaps
    fixOverlappingBubbles();
    
    // Run periodically to ensure bubbles don't overlap
    const checkInterval = setInterval(fixOverlappingBubbles, 2000);
    
    // Run when window resizes
    const handleResize = debounce(() => {
      fixOverlappingBubbles();
    }, 500);
    
    window.addEventListener('resize', handleResize);
    
    // Setup custom event listener for bubble updates
    const handleBubbleUpdate = () => {
      fixOverlappingBubbles();
    };
    
    // Create custom events for bubble operations
    window.addEventListener('bubbleAdded', handleBubbleUpdate);
    window.addEventListener('bubbleBumped', handleBubbleUpdate);
    window.addEventListener('bubbleMoved', handleBubbleUpdate);
    
    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('bubbleAdded', handleBubbleUpdate);
      window.removeEventListener('bubbleBumped', handleBubbleUpdate);
      window.removeEventListener('bubbleMoved', handleBubbleUpdate);
    };
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
      logger.log('Opening dashboard with booking:', event.detail.bookingId);
      setActiveBookingId(event.detail.bookingId);
      setShowDashboard(true);
    };
    
    // Define handler for opening dashboard without specific booking
    const handleOpenDashboard = () => {
      logger.log('Opening dashboard');
      setShowDashboard(true);
    };
    
    // Add event listeners
    window.addEventListener('openDashboardWithBooking', handleOpenDashboardWithBooking);
    window.addEventListener('openDashboard', handleOpenDashboard);
    
    // Add global function to show dashboard (for use by other components)
    window.showDashboard = (tab, bookingId) => {
      logger.log('Global showDashboard called', tab, bookingId);
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
        logger.log('Opening dashboard from localStorage flag');
        
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

  // For mobile view only, adjust bubbles in viewport to prevent overlaps
  function adjustBubblesForMobile() {
    // CRITICAL: Only run on mobile devices, exit immediately on desktop
    if (window.innerWidth > 480) return;
    
    // Find all bubble containers
    const bubbles = document.querySelectorAll('.bubble-container');
    if (bubbles.length === 0) return;
    
    // Calculate optimal grid layout based on screen width
    const screenWidth = window.innerWidth;
    const bubbleSize = parseInt(bubbles[0].style.width) || 60;
    
    // Determine optimal number of columns based on screen width
    // Use more columns for better space utilization
    let columns;
    if (screenWidth <= 320) {
      columns = 2; // For very small screens (iPhone SE etc)
    } else if (screenWidth <= 375) {
      columns = 3; // For medium mobile (iPhone X, etc)
    } else {
      columns = 4; // For larger mobile screens (iPhone 12 Pro, etc)
    }
    
    // Make bubbles smaller on very small screens if needed, then add a size increase for better visibility
    let effectiveBubbleSize = screenWidth <= 320 ? Math.min(bubbleSize, 90) : bubbleSize;
    
    // Increase bubble size by 10% for better visibility on mobile
    effectiveBubbleSize = Math.round(effectiveBubbleSize * 1.1);
    
    // Calculate optimal positioning values with minimal gaps
    const horizontalGap = 5; // Fixed smaller gap between columns
    const verticalGap = 0; // Minimal vertical gap - bubbles will be close together
    
    // Store original positions to restore if needed
    if (!window.originalBubblePositions) {
      window.originalBubblePositions = Array.from(bubbles).map(bubble => {
        const transform = bubble.style.transform;
        return {
          id: bubble.id,
          transform: transform
        };
      });
    }
    
    // Sort bubbles by bullish votes just like desktop view
    const sortedBubbles = Array.from(bubbles).sort((a, b) => {
      // Get the corresponding ad for each bubble using the bubble ID
      const adA = ads.find(ad => ad.id === a.id);
      const adB = ads.find(ad => ad.id === b.id);
      
      // If we can't find the ad, put it at the end
      if (!adA) return 1;
      if (!adB) return -1;
      
      // Sort by bullish votes (highest first)
      return (adB.bullishVotes || 0) - (adA.bullishVotes || 0);
    });
    
    // Create a grid layout optimized for mobile
    sortedBubbles.forEach((bubble, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      // Calculate new position with tighter spacing
      const x = horizontalGap + (col * (effectiveBubbleSize + horizontalGap));
      // Use row * bubbleSize to make rows touch each other with minimal gap
      const y = TOP_PADDING + (row * (effectiveBubbleSize + verticalGap));
      
      // Apply the new position directly with CSS transform
      bubble.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  // Add effect to apply mobile layout whenever ads update
  useEffect(() => {
    // Only run this effect on mobile
    if (window.innerWidth <= 480 && ads.length > 0) {
      // Short delay to ensure the DOM has updated with bubble elements
      setTimeout(adjustBubblesForMobile, 300);
    }
  }, [ads]);
  
  // Add effect to apply mobile layout on initial load
  useEffect(() => {
    if (window.innerWidth <= 480) {
      // Check for bubbles and apply layout periodically until they exist
      const checkInterval = setInterval(() => {
        const bubbles = document.querySelectorAll('.bubble-container');
        if (bubbles.length > 0) {
          adjustBubblesForMobile();
          clearInterval(checkInterval);
        }
      }, 500);
      
      // Clear interval after 10 seconds at most to prevent infinite checking
      setTimeout(() => clearInterval(checkInterval), 10000);
      
      return () => clearInterval(checkInterval);
    }
  }, []);

  // Restore original bubble positions when going back to desktop
  function restoreOriginalPositions() {
    // Only do this if we have stored positions and we're on desktop now
    if (!window.originalBubblePositions || window.innerWidth <= 480) return;
    
    // Find all bubble containers
    const bubbles = document.querySelectorAll('.bubble-container');
    if (bubbles.length === 0) return;
    
    // First try to reset using the model data (most accurate)
    resetBubblePositionsFromModel();
    
    // If model reset doesn't work, fall back to stored positions
    if (window.originalBubblePositions) {
      bubbles.forEach(bubble => {
        const originalData = window.originalBubblePositions.find(item => item.id === bubble.id);
        if (originalData && originalData.transform) {
          bubble.style.transform = originalData.transform;
        }
      });
    }
  }

  // Reset all bubble positions to match their state in the ads array
  function resetBubblePositionsFromModel() {
    const bubbles = document.querySelectorAll('.bubble-container');
    if (bubbles.length === 0) return;
    
    // For each bubble in the DOM, find its corresponding ad in the state
    // and apply the position from the state
    bubbles.forEach(bubble => {
      const adId = bubble.id;
      const ad = ads.find(a => a.id === adId);
      
      if (ad) {
        // Apply the position from the state model
        bubble.style.transform = `translate(${ad.x}px, ${ad.y}px)`;
      }
    });
    
    // Clear the stored positions to ensure fresh calculations next time
    window.originalBubblePositions = null;
  }

  // Update the ads model based on DOM positions
  function updateModelFromDomPositions() {
    // Prevent recursive updates by checking if we're already updating
    if (window.isUpdatingModelFromDom) return;
    window.isUpdatingModelFromDom = true;
    
    
    // Get all bubble containers
    const bubbles = document.querySelectorAll('.bubble-container');
    if (!bubbles.length) {
      window.isUpdatingModelFromDom = false;
      return;
    }
    
    // Create batch of updates to apply at once
    const updates = {};
    
    // Extract position from each bubble DOM element
    bubbles.forEach(bubble => {
      const adId = bubble.id;
      if (!adId) return;
      
      const transform = bubble.style.transform;
      const match = transform.match(/translate\((.+?)px,\s*(.+?)px\)/);
      
      if (match && match.length === 3) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        
        // Only update if the position has significantly changed
        if (ads[adId] && 
            (Math.abs(ads[adId].x - x) > 1 || Math.abs(ads[adId].y - y) > 1)) {
          updates[adId] = {
            ...ads[adId],
            x,
            y
          };
        }
      }
    });
    
    // Only update state if we have actual changes
    if (Object.keys(updates).length > 0) {
      // Set a flag to prevent layout recalculation when this update happens
      window.skipNextLayoutUpdate = true;
      
      // Batch all updates together
      setAds(currentAds => {
        const newAds = { ...currentAds };
        Object.keys(updates).forEach(adId => {
          newAds[adId] = updates[adId];
        });
        return newAds;
      });
      
      // Add a small delay before allowing the next update
      setTimeout(() => {
        window.isUpdatingModelFromDom = false;
      }, 300); // Increased delay to prevent rapid updates
    } else {
      window.isUpdatingModelFromDom = false;
    }
  }

  // Add an immediate fix to restore desktop layout 
  useEffect(() => {
    // Only run on desktop to fix current layout issues
    if (window.innerWidth > 480) {
      // Set a flag to track whether we've already done the initial layout
      if (!window.initialLayoutApplied) {
        window.initialLayoutApplied = true;
        // Wait for DOM to be ready
        setTimeout(() => {
          arrangeDesktopGrid();
        }, 500);
      }
    }
  }, []);
  
  // Add effect to apply mobile layout whenever ads update
  useEffect(() => {
    // Skip this effect if we just updated the model from DOM positions
    if (window.skipNextLayoutUpdate) {
      window.skipNextLayoutUpdate = false;
      return;
    }
    
    // Only run this effect on mobile
    if (window.innerWidth <= 480 && Object.keys(ads).length > 0) {
      // Short delay to ensure the DOM has updated with bubble elements
      setTimeout(adjustBubblesForMobile, 300);
    } else if (window.innerWidth > 480 && Object.keys(ads).length > 0) {
      // Apply desktop grid layout when ads update on desktop
      setTimeout(arrangeDesktopGrid, 300);
    }
  }, [ads]);

  // Arrange bubbles in a spiral pattern for desktop layout
  function arrangeDesktopBubbleSpiral() {
    // Only run on desktop
    if (window.innerWidth <= 480) return;
    
    // Find all bubble containers
    const bubbles = document.querySelectorAll('.bubble-container');
    if (bubbles.length === 0) return;
    
    // Get screen dimensions
    const centerX = window.innerWidth / 2;
    const centerY = (window.innerHeight - TOP_PADDING) / 2 + TOP_PADDING;
    
    // Sort by ID to ensure consistent arrangement
    const sortedBubbles = Array.from(bubbles).sort((a, b) => a.id.localeCompare(b.id));
    
    // Use golden ratio for nice spiral
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    
    // First bubble goes in center
    if (sortedBubbles.length > 0) {
      const firstBubbleSize = parseInt(sortedBubbles[0].style.width) || 50;
      sortedBubbles[0].style.transform = `translate(${centerX - firstBubbleSize/2}px, ${centerY - firstBubbleSize/2}px)`;
    }
    
    // Arrange rest in spiral - use MUCH wider spread for desktop
    for (let i = 1; i < sortedBubbles.length; i++) {
      const bubble = sortedBubbles[i];
      const size = parseInt(bubble.style.width) || 50;
      
      // Calculate spiral position with SUBSTANTIALLY increased spacing
      const angle = i * goldenAngle;
      const radius = 200 + 90 * Math.sqrt(i); // Extreme wide spacing for desktop
      
      // Calculate position, ensuring bubbles don't go off screen
      let x = centerX + radius * Math.cos(angle) - size/2;
      let y = centerY + radius * Math.sin(angle) - size/2;
      
      // Boundary checks
      const margin = 30;
      x = Math.max(margin, Math.min(window.innerWidth - size - margin, x));
      y = Math.max(TOP_PADDING + margin, Math.min(window.innerHeight - size - margin, y));
      
      // Apply position
      bubble.style.transform = `translate(${x}px, ${y}px)`;
    }
    
    // Update the model to match the DOM positions
    updateModelFromDomPositions();
  }

  // Call immediately to fix desktop layout
  // This ensures it runs before any React rendering completes
  setTimeout(() => {
    // Make sure this only runs on desktop
    if (window.innerWidth > 480 && !window.initialGridLayoutApplied) {
      // Set flag to prevent this from running multiple times
      window.initialGridLayoutApplied = true;
      
      // Direct DOM manipulation to force proper grid layout
      const bubbles = document.querySelectorAll('.bubble-container');
      if (bubbles.length > 0) {
        // Sort by bullish votes instead of just by ID
        const bubblesArray = Array.from(bubbles);
        
        // Sort bubbles by bullish votes (highest to lowest)
        const sortedBubbles = bubblesArray.sort((a, b) => {
          // Get the corresponding ad for each bubble using the bubble ID
          const adA = ads.find(ad => ad.id === a.id);
          const adB = ads.find(ad => ad.id === b.id);
          
          // If we can't find the ad, put it at the end
          if (!adA) return 1;
          if (!adB) return -1;
          
          // Sort by bullish votes (highest first)
          return (adB.bullishVotes || 0) - (adA.bullishVotes || 0);
        });
        
        // Get first bubble size to use as reference
        const bubbleSize = parseInt(sortedBubbles[0].style.width) || 100;
        
        // Calculate columns based on screen width - enhanced for larger monitors
        const screenWidth = window.innerWidth;
        const columns = screenWidth >= 2400 ? 12 : 
                       screenWidth >= 1800 ? 11 : 
                       screenWidth >= 1440 ? 10 : 
                       screenWidth >= 1200 ? 8 : 
                       screenWidth >= 1000 ? 6 : 5;
        
        // Calculate margins and spacing - reduced for larger screens
        const horizontalMargin = screenWidth >= 1440 ? 20 : 40; // Smaller margin for larger screens
        const verticalMargin = 20; // Reduced vertical margin
        
        // Calculate available width and cell size
        const availableWidth = screenWidth - (horizontalMargin * 2);
        const cellWidth = availableWidth / columns;
        
        // Arrange in grid
        sortedBubbles.forEach((bubble, index) => {
          const row = Math.floor(index / columns);
          const column = index % columns;
          
          // Center in grid cell
          const x = horizontalMargin + (column * cellWidth) + (cellWidth / 2) - (bubbleSize / 2);
          const y = TOP_PADDING + verticalMargin + (row * (bubbleSize + verticalMargin));
          
          // Set position
          bubble.style.transform = `translate(${x}px, ${y}px)`;
        });
        
        // Skip updating the model from this initial layout to prevent loops
        window.skipNextModelUpdate = true;
      }
    }
  }, 100);

  // Arrange bubbles in a clean grid for desktop
  function arrangeDesktopGrid() {
    // Only run on desktop
    if (window.innerWidth <= 480) return;
    
    // Prevent multiple executions in quick succession
    if (window.isArrangingDesktopGrid) return;
    window.isArrangingDesktopGrid = true;
    
    // Find all bubble containers
    const bubbles = document.querySelectorAll('.bubble-container');
    if (bubbles.length === 0) {
      window.isArrangingDesktopGrid = false;
      return;
    }
    
    // Get all bubbles as an array
    const bubblesArray = Array.from(bubbles);
    
    // Sort bubbles by bullish votes (highest to lowest)
    const sortedBubbles = bubblesArray.sort((a, b) => {
      // Get the corresponding ad for each bubble using the bubble ID
      const adA = ads.find(ad => ad.id === a.id);
      const adB = ads.find(ad => ad.id === b.id);
      
      // If we can't find the ad, put it at the end
      if (!adA) return 1;
      if (!adB) return -1;
      
      // Sort by bullish votes (highest first)
      return (adB.bullishVotes || 0) - (adA.bullishVotes || 0);
    });
    
    // Get first bubble size to use as reference
    const firstBubble = sortedBubbles[0];
    const bubbleSize = parseInt(firstBubble.style.width) || 100;
    
    // Calculate optimal columns based on screen width
    // Enhanced for larger monitors
    const screenWidth = window.innerWidth;
    const columns = screenWidth >= 2400 ? 10 : 
                   screenWidth >= 1800 ? 9 : 
                   screenWidth >= 1440 ? 8 : 
                   screenWidth >= 1200 ? 7 : 
                   screenWidth >= 1000 ? 6 : 5;
    
    // Calculate margins and spacing - reduced for larger screens
    const horizontalMargin = screenWidth >= 1440 ? 40 : 60; // Smaller margin for larger screens
    const verticalMargin = 40; // Reduced vertical margin
    
    // Calculate available width and the cell size
    const availableWidth = screenWidth - (horizontalMargin * 2);
    const cellWidth = availableWidth / columns;
    
    // Store current positions to check if we need to update the model
    const originalPositions = {};
    // Record original positions before moving
    sortedBubbles.forEach(bubble => {
      const adId = bubble.id;
      const transform = bubble.style.transform;
      const match = transform.match(/translate\((.+?)px,\s*(.+?)px\)/);
      
      if (match && match.length === 3) {
        originalPositions[adId] = {
          x: parseFloat(match[1]),
          y: parseFloat(match[2])
        };
      }
    });
    
    // Now place each bubble in its grid cell
    sortedBubbles.forEach((bubble, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      
      // Center bubble in its grid cell
      const x = horizontalMargin + (column * cellWidth) + (cellWidth / 2) - (bubbleSize / 2);
      const y = TOP_PADDING + verticalMargin + (row * (bubbleSize + verticalMargin));
      
      // Set position
      bubble.style.transform = `translate(${x}px, ${y}px)`;
    });
    
    // Check if positions actually changed
    let positionsChanged = false;
    sortedBubbles.forEach(bubble => {
      const adId = bubble.id;
      const transform = bubble.style.transform;
      const match = transform.match(/translate\((.+?)px,\s*(.+?)px\)/);
      
      if (match && match.length === 3) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        
        if (!originalPositions[adId] || 
            Math.abs(originalPositions[adId].x - x) > 5 || // Increased threshold to reduce updates
            Math.abs(originalPositions[adId].y - y) > 5) {
          positionsChanged = true;
        }
      }
    });
    
    // Only update model if positions actually changed and we're not skipping
    if (positionsChanged && !window.skipNextModelUpdate) {
      // Use a timeout to allow DOM to settle and prevent rapid state updates
      setTimeout(() => {
        updateModelFromDomPositions();
        window.isArrangingDesktopGrid = false;
      }, 200); // Increased delay
    } else {
      // Clear the skip flag if it was set
      window.skipNextModelUpdate = false;
      window.isArrangingDesktopGrid = false;
    }
  }

  // Modify the return statement to wrap everything in the Auth context provider
  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      <Router>
        <NavigationListener 
          onNavigate={() => {
            if (currentUser) {
              reconnectSocket();
              verifyToken(currentUser.token)
                .then(verifiedUser => {
                  if (verifiedUser && JSON.stringify(verifiedUser) !== JSON.stringify(currentUser)) {
                    setCurrentUser(verifiedUser);
                  }
                })
                .catch(err => {
                  logger.error('Route navigation token verification error:', err);
                });
            }
          }} 
        />
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
                <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-[200000]">
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
                          to="/games"
                          className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                        >
                          GameHub
                        </Link>
                        <Link
                          to="/how-to"
                          className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
                        >
                          How To
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
                    <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-2 z-[200000] relative`}>
                      <div className="flex flex-col space-y-2">
                        <Link
                          to="/marketplace"
                          className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                        >
                          Freelancer Hub
                        </Link>
                        <Link
                          to="/games"
                          className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                        >
                          GameHub
                        </Link>
                        <Link
                          to="/how-to"
                          className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                        >
                          How To
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

                <div className="fixed top-16 left-0 right-0 z-[3] token-banner-container">
                  <TokenBanner />
                </div>

                {/* Main content - allow natural scrolling */}
                <div className="pt-20">
                  {/* Bubbles section - keep it as is, remove fixed positioning */}
                  <div className="relative min-h-screen overflow-hidden">
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

                        return (
                          <div 
                            key={ad.id}
                            id={ad.id}
                            className="bubble-container"
                            style={{
                              position: 'absolute',
                              transform: `translate(${x}px, ${y}px)`,
                              width: `${ad.size}px`,
                              height: `${ad.size}px`,
                              transition: 'transform 0.3s ease-out',
                              zIndex: ad.isBumped ? 2 : 1
                            }}
                          >
                            <motion.div
                              className={`absolute bubble ${ad.isBumped ? 'bumped-ad' : ''} ${ad.blockchain ? `bubble-${ad.blockchain.toLowerCase()}` : 'bubble-ethereum'}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                transition: `all ${ANIMATION_DURATION} ease-in-out`,
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
                              {/* Voting popup that appears on hover */}
                              <div className="vote-popup">
                                <button 
                                  className={`vote-button bearish-vote ${ad.userVote === 'bearish' ? 'active-vote' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSentimentVote(ad.id, 'bearish');
                                  }}
                                  aria-label="Vote bearish"
                                >
                                  🐻
                                </button>
                                <button 
                                  className={`vote-button bullish-vote ${ad.userVote === 'bullish' ? 'active-vote' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSentimentVote(ad.id, 'bullish');
                                  }}
                                  aria-label="Vote bullish"
                                >
                                  🐂
                                </button>
                              </div>
                              
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
                                
                                {/* Logo Container */}
                                <div className="bubble-logo-container">
                                  <img
                                    src={ad.logo}
                                    alt={ad.title}
                                    loading="eager"
                                    className="w-full h-full object-contain"
                                    style={{
                                      objectFit: 'contain',
                                      maxWidth: '95%',
                                      maxHeight: '95%'
                                    }}
                                    onLoad={(e) => {
                                      if (e.target.src.toLowerCase().endsWith('.gif')) {
                                        e.target.setAttribute('loop', 'infinite');
                                      }
                                    }}
                                  />
                                </div>
                                
                                {/* Simple percentage indicator - changed to BUY/SELL */}
                                {(ad.bullishVotes > 0 || ad.bearishVotes > 0) && (
                                  <div 
                                    className={`vote-percentage ${
                                      ad.bullishVotes > ad.bearishVotes 
                                        ? 'vote-bullish' 
                                        : ad.bearishVotes > ad.bullishVotes 
                                          ? 'vote-bearish' 
                                          : 'vote-neutral'
                                    }`}
                                  >
                                    {ad.bullishVotes + ad.bearishVotes > 0 
                                      ? ad.bullishVotes > ad.bearishVotes 
                                        ? 'BUY' 
                                        : ad.bearishVotes > ad.bullishVotes 
                                          ? 'SELL' 
                                          : '50/50'
                                      : 'No votes'}
                                  </div>
                                )}
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
                    {/* Multi-Section Banner (GameHub, Freelancer, Affiliate) */}
                    <div className="w-full overflow-hidden relative">
                      {/* SVG Banner Image */}
                      <img
                        src="/FREELANCER-HUB.svg"
                        alt="Navigation Banner"
                        className="w-full h-auto max-h-[100px] sm:max-h-[150px] md:max-h-[200px]"
                      />
                      
                      {/* Clickable overlay areas */}
                      <div className="absolute inset-0">
                        {/* GameHub Section (left third) */}
                        <Link 
                          to="/games" 
                          className="absolute top-0 bottom-0 left-0 w-1/3"
                          aria-label="Go to Game Hub"
                        >
                          <span className="sr-only">Game Hub</span>
                        </Link>
                        
                        {/* Freelancer Hub Section (middle third) */}
                        <Link 
                          to="/marketplace" 
                          className="absolute top-0 bottom-0 left-1/3 w-1/3"
                          aria-label="Go to Freelancer Hub"
                        >
                          <span className="sr-only">Freelancer Hub</span>
                        </Link>
                        
                        {/* Affiliate Program Section (right third) */}
                        <Link 
                          to="/affiliate" 
                          className="absolute top-0 bottom-0 left-2/3 w-1/3"
                          aria-label="Go to Affiliate Program"
                        >
                          <span className="sr-only">Affiliate Program</span>
                        </Link>
                      </div>
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
    </AuthContext.Provider>
  );
}

export default App;