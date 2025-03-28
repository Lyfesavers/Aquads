import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import emailService from './services/emailService';
import emailjs from '@emailjs/browser';
import NotificationBell from './components/NotificationBell';
import logger from './utils/logger';
import useDimension from './hooks/useDimension';

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

/**
 * Calculates a safe position for a bubble to avoid overlaps
 * @param {number} size - Size of the bubble
 * @param {number} windowWidth - Width of the window
 * @param {number} windowHeight - Height of the window
 * @param {Array} existingAds - Array of existing ads to avoid
 * @returns {Object} - Safe x and y coordinates
 */
function calculateSafePosition(size, windowWidth, windowHeight, existingAds = []) {
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
  const bubbleSpacing = 1.02;
  
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

/**
 * Calculates the distance between two points
 * @param {number} x1 - X coordinate of the first point
 * @param {number} y1 - Y coordinate of the first point
 * @param {number} x2 - X coordinate of the second point
 * @param {number} y2 - Y coordinate of the second point
 * @returns {number} - Distance between the two points
 */
function calculateDistance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Actively resolves any overlapping bubbles
 * @param {Array} ads - Array of ads to check and resolve overlaps
 * @param {number} windowWidth - Width of the window
 * @param {number} windowHeight - Height of the window  
 * @returns {Array} - New array of ads with resolved positions
 */
function resolveOverlaps(ads, windowWidth, windowHeight) {
  if (!ads || ads.length <= 1 || windowWidth <= 0 || windowHeight <= 0) {
    return ads;
  }

  // Make a deep copy of the ads array to avoid mutating the original
  const adsCopy = JSON.parse(JSON.stringify(ads));
  
  // Maximum iterations to prevent infinite loops
  const MAX_ITERATIONS = 10;
  let iterations = 0;
  let hasOverlap = true;
  
  // Track which ads have been moved in each iteration to avoid ping-pong effects
  let movedAdsInIteration = new Set();
  
  // Continue resolving until no overlaps or max iterations reached
  while (hasOverlap && iterations < MAX_ITERATIONS) {
    iterations++;
    hasOverlap = false;
    movedAdsInIteration.clear();
    
    // Check each pair of ads for overlap
    for (let i = 0; i < adsCopy.length; i++) {
      for (let j = i + 1; j < adsCopy.length; j++) {
        const ad1 = adsCopy[i];
        const ad2 = adsCopy[j];
        
        // Skip if either ad is being dragged
        if (ad1.isDragging || ad2.isDragging) continue;
        
        // Calculate the distance between ads centers
        const distance = calculateDistance(
          ad1.x, ad1.y,
          ad2.x, ad2.y
        );
        
        // Calculate the minimum distance required based on bubble sizes
        const minDistance = (ad1.size + ad2.size) / 2 * 1.2; // Add 20% buffer
        
        if (distance < minDistance) {
          // We found an overlap!
          hasOverlap = true;
          
          // Determine which ad to move
          let adToMove, otherAd;
          
          // If one ad has been moved this iteration, move the other
          if (movedAdsInIteration.has(ad1.id) && !movedAdsInIteration.has(ad2.id)) {
            adToMove = ad2;
            otherAd = ad1;
          } else if (!movedAdsInIteration.has(ad1.id) && movedAdsInIteration.has(ad2.id)) {
            adToMove = ad1;
            otherAd = ad2;
          } else {
            // If neither or both have been moved, base decision on other factors
            // Priority: 1) Bumped status, 2) ad array order (newer ads move first)
            if (ad1.isBumped && !ad2.isBumped) {
              adToMove = ad2; // Move the non-bumped ad
              otherAd = ad1;
            } else if (!ad1.isBumped && ad2.isBumped) {
              adToMove = ad1; // Move the non-bumped ad
              otherAd = ad2;
            } else {
              // If both are bumped or both are not bumped, move the newer one
              adToMove = i > j ? ad1 : ad2;
              otherAd = i > j ? ad2 : ad1;
            }
          }
          
          // Mark this ad as moved in this iteration
          movedAdsInIteration.add(adToMove.id);
          
          // Find a new position for the ad to move
          // First try to move directly away from the other ad
          const pushDirection = {
            x: adToMove.x - otherAd.x,
            y: adToMove.y - otherAd.y
          };
          
          // Normalize the direction
          const pushDistance = Math.sqrt(pushDirection.x * pushDirection.x + pushDirection.y * pushDirection.y) || 1;
          const normalizedDirection = {
            x: pushDirection.x / pushDistance,
            y: pushDirection.y / pushDistance
          };
          
          // Calculate the distance to push (the overlap amount plus a buffer)
          const pushAmount = (minDistance - distance) + 15; // 15px extra buffer
          
          // Calculate the new position by pushing away
          const newX = adToMove.x + normalizedDirection.x * pushAmount;
          const newY = adToMove.y + normalizedDirection.y * pushAmount;
          
          // Ensure the new position is within the viewport
          const adjustedX = Math.max(adToMove.size/2, Math.min(windowWidth - adToMove.size/2, newX));
          const adjustedY = Math.max(adToMove.size/2, Math.min(windowHeight - adToMove.size/2, newY));
          
          // Check if the new position would overlap with any other ads
          let wouldOverlap = false;
          for (let k = 0; k < adsCopy.length; k++) {
            if (k === i || k === j) continue; // Skip the ads we're already checking
            
            const otherAd = adsCopy[k];
            const newDistance = calculateDistance(
              adjustedX, adjustedY,
              otherAd.x, otherAd.y
            );
            const newMinDistance = (adToMove.size + otherAd.size) / 2 * 1.2;
            
            if (newDistance < newMinDistance) {
              wouldOverlap = true;
              break;
            }
          }
          
          // If the direct push would cause overlap, find a completely new position
          if (wouldOverlap) {
            // Use the existing calculateSafePosition function to find a new spot
            const filteredAds = adsCopy.filter(ad => ad.id !== adToMove.id);
            const safePosition = calculateSafePosition(adToMove.size, windowWidth, windowHeight, filteredAds);
            
            // Update the ad's position with the safe position
            adToMove.x = safePosition.x;
            adToMove.y = safePosition.y;
          } else {
            // Otherwise use the pushed position
            adToMove.x = adjustedX;
            adToMove.y = adjustedY;
          }
        }
      }
    }
  }
  
  return adsCopy;
}

/**
 * Ensures that a bubble stays within the viewport while respecting other bubbles
 * @param {number} x - X coordinate of the bubble
 * @param {number} y - Y coordinate of the bubble
 * @param {number} size - Size of the bubble
 * @param {number} windowWidth - Width of the window
 * @param {number} windowHeight - Height of the window
 * @param {Array} existingAds - Array of existing ads
 * @param {string} adId - ID of the current ad
 * @returns {Object} - Adjusted x and y coordinates
 */
function ensureInViewport(x, y, size, windowWidth, windowHeight, existingAds, adId) {
  // Basic boundary checks
  let newX = Math.max(size/2, Math.min(windowWidth - size/2, x));
  let newY = Math.max(size/2, Math.min(windowHeight - size/2, y));

  // After ensuring the bubble is in viewport, check for overlaps
  const otherAds = existingAds.filter(ad => ad.id !== adId);
  
  // Check if new position overlaps with any other ad
  let hasOverlap = false;
  for (const ad of otherAds) {
    const distance = calculateDistance(newX, newY, ad.x, ad.y);
    const minDistance = (size + ad.size) / 2 * 1.2; // Same buffer as resolveOverlaps
    
    if (distance < minDistance) {
      hasOverlap = true;
      break;
    }
  }
  
  // If there's an overlap, find a new position
  if (hasOverlap) {
    // Create a temporary ad object for our current ad
    const currentAd = { id: adId, x: newX, y: newY, size: size };
    
    // Copy all ads for processing
    const allAds = [...otherAds, currentAd];
    
    // Use our resolveOverlaps function to fix the overlaps
    const resolvedAds = resolveOverlaps(allAds, windowWidth, windowHeight);
    
    // Find our ad in the resolved list and use its new position
    const resolvedAd = resolvedAds.find(ad => ad.id === adId);
    if (resolvedAd) {
      newX = resolvedAd.x;
      newY = resolvedAd.y;
    }
  }
  
  return { x: newX, y: newY };
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
    return cachedAds ? JSON.parse(cachedAds) : [];
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
  
  // Add state to track if we need to check for overlaps
  const [checkOverlaps, setCheckOverlaps] = useState(false);

  // Enhanced ad update function to resolve overlaps
  const updateAds = (newAds) => {
    // Resolve any overlaps before setting the ads
    const resolvedAds = resolveOverlaps(newAds, windowSize.width, windowSize.height);
    setAds(resolvedAds);
    localStorage.setItem('cachedAds', JSON.stringify(resolvedAds));
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
            logger.log('Fixing ad with zero coordinates:', ad.id);
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
        
        // Resolve any overlaps in the loaded ads
        const resolvedAds = resolveOverlaps(repositionedAds, windowSize.width, windowSize.height);
        setAds(resolvedAds);
        setIsLoading(false);
        
        // Update any repositioned ads on the server (optional)
        for (const ad of resolvedAds) {
          if (ad.x !== 0 || ad.y !== 0) {
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
        
        // Trigger overlap resolution after window resize
        setCheckOverlaps(true);
        return updatedAds;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Add a new effect to check for and resolve overlaps
  useEffect(() => {
    // Only run this if we need to check for overlaps
    if (checkOverlaps && windowSize.width > 0 && windowSize.height > 0 && ads.length > 1) {
      const resolvedAds = resolveOverlaps(ads, windowSize.width, windowSize.height);
      
      // Only update if positions actually changed
      const positionsChanged = resolvedAds.some((ad, index) => {
        return ad.x !== ads[index].x || ad.y !== ads[index].y;
      });
      
      if (positionsChanged) {
        setAds(resolvedAds);
        localStorage.setItem('cachedAds', JSON.stringify(resolvedAds));
      }
      
      // Reset the check flag
      setCheckOverlaps(false);
    }
  }, [checkOverlaps, ads, windowSize.width, windowSize.height]);
  
  // Periodically check for overlaps (every 5 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCheckOverlaps(true);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Rest of the component code...
  // ... (keep all the existing code)

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
          {/* ... (keep all the existing routes) */}
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;