import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import EmailVerificationModal from './components/EmailVerificationModal';
import Dashboard from './components/Dashboard';
import EditAdModal from './components/EditAdModal';
import CreateBannerModal from './components/CreateBannerModal';
import TokenBanner from './components/TokenBanner';
import TokenList from './components/TokenList';
import TokenRating from './components/TokenRating';
import Marketplace from './components/Marketplace';
import PartnerMarketplace from './components/PartnerMarketplace';
import GameHub from './components/GameHub';
import ProfileModal from './components/ProfileModal';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import Whitepaper from './components/Whitepaper';
import HowTo from './components/HowTo';
import BlogPage from './components/BlogPage';
import Affiliate from './components/Affiliate';
import Terms from './components/Terms';
import PrivacyPolicy from './components/PrivacyPolicy';
import AquaFi from './components/AquaFi';
import AquaSwap from './components/AquaSwap';
import AquaSwapEmbed from './components/AquaSwapEmbed';
import TransakPage from './components/TransakPage';
import VerifyUser from './components/VerifyUser';
import MemberVerification from './components/MemberVerification';
import BannerDisplay from './components/BannerDisplay';
import useUserPresence from './hooks/useUserPresence';

import ProjectInfo from './components/ProjectInfo';
import FreelancerBenefits from './components/FreelancerBenefits';
import BookingConversationPage from './components/BookingConversationPage';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import emailService from './services/emailService';
import emailjs from '@emailjs/browser';
import NotificationBell from './components/NotificationBell';
import { getDisplayName } from './utils/nameUtils';
import BumpReminderModal from './components/BumpReminderModal';
import logger from './utils/logger';
import './App.css';
import FilterControls from './components/FilterControls';
import DotsAndBoxes from './components/DotsAndBoxes';
import HorseRacing from './components/HorseRacing';

import ServicePage from './components/ServicePage';

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
    // Mobile - bigger bubbles for better interaction
    return Math.floor(baseSize * 0.65);
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

// Define blockchain options for filters and display
const BLOCKCHAIN_OPTIONS = [
  { value: 'all', label: 'All Blockchains' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bsc', label: 'Binance Smart Chain' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'solana', label: 'Solana' },
  { value: 'avalanche', label: 'Avalanche' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'base', label: 'Base' },
  { value: 'sui', label: 'Sui' },
  { value: 'near', label: 'NEAR' },
  { value: 'fantom', label: 'Fantom' },
  { value: 'tron', label: 'TRON' },
  { value: 'cronos', label: 'Cronos' },
  { value: 'celo', label: 'Celo' },
  { value: 'harmony', label: 'Harmony' },
  { value: 'polkadot', label: 'Polkadot' },
  { value: 'cosmos', label: 'Cosmos' },
  { value: 'aptos', label: 'Aptos' },
  { value: 'flow', label: 'Flow' },
  { value: 'cardano', label: 'Cardano' },
  { value: 'kaspa', label: 'Kaspa' }
];

const SHRINK_RATE = 4; // Amount to shrink by each interval
const SHRINK_INTERVAL = 15000; // 15 seconds (matches backend for real-time sync)
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
const TOP_PADDING = BANNER_HEIGHT + 5; // Additional padding from top to account for banner
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
const NavigationListener = ({ onNavigate, arrangeDesktopGrid, adjustBubblesForMobile }) => {
  const location = useLocation();
  const prevLocationRef = useRef(location);
  
  useEffect(() => {
    if (location.pathname !== prevLocationRef.current.pathname) {
      onNavigate();
      prevLocationRef.current = location;
      
      // Immediately arrange bubbles when returning to the main page
      if (location.pathname === '/') {
        // Small timeout to ensure DOM is ready
        setTimeout(() => {
          if (window.innerWidth > 480) {
            arrangeDesktopGrid();
          } else {
            adjustBubblesForMobile();
          }
        }, 50);
      }
    }
  }, [location, onNavigate, arrangeDesktopGrid, adjustBubblesForMobile]);
  
  return null;
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
  
  // Detect iOS for better touch handling
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      document.documentElement.classList.add('ios');
    }
  }, []);
  
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
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
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
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showBumpReminderModal, setShowBumpReminderModal] = useState(false);
  const [unbumpedAd, setUnbumpedAd] = useState(null);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [dashboardActiveTab, setDashboardActiveTab] = useState('ads');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // New state for blockchain filter and pagination
  const [blockchainFilter, setBlockchainFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [votePopup, setVotePopup] = useState(null);
  const [partnershipPopup, setPartnershipPopup] = useState(null);
  
  // Initialize user presence tracking across all pages
  useUserPresence(currentUser);
  
  /**
   * Determine how many bubbles to show per page based on screen size.
   * User testing has determined optimal bubble counts for different screens:
   * - 2560x1440: 70 bubbles maximum
   * - 1366x768: 32 bubbles maximum
   * 
   * Limiting bubbles per page based on screen size prevents performance issues
   * and improves the user experience by avoiding overcrowded displays.
   * Additional bubbles are placed on subsequent pages accessible via pagination.
   */
  useEffect(() => {
    const calculateItemsPerPage = () => {
      // Get current viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Specific screen size optimizations based on user testing
      if (viewportWidth === 2560 && viewportHeight === 1440) {
        return 70; // 2560x1440 can fit 70 bubbles
      } else if (viewportWidth === 1366 && viewportHeight === 768) {
        return 32; // 1366x768 can fit 32 bubbles
      } else if (viewportWidth >= 400 && viewportWidth <= 420 && viewportHeight >= 900 && viewportHeight <= 930) {
        return 48; // For mobile screens around 412x915 
      } else if (viewportWidth <= 480) {
        return 40; // Other smaller mobile screens
      } else if (viewportWidth <= 768) {
        return 35; // Tablet
      } else if (viewportWidth >= 2400) {
        return 70; // Large desktop similar to 2560x1440
      } else if (viewportWidth >= 1440) {
        return 55; // Medium-large desktop
      } else if (viewportWidth >= 1200) {
        return 45; // Medium desktop
      } else {
        return 32; // Default to similar to 1366x768
      }
    };
    setItemsPerPage(calculateItemsPerPage());
  }, [windowSize]);

  // Calculate total pages whenever ads or filter changes
  useEffect(() => {
    const filteredAds = blockchainFilter === 'all' 
      ? ads 
      : ads.filter(ad => (ad.blockchain || 'ethereum').toLowerCase() === blockchainFilter.toLowerCase());
    
    // Separate bumped and non-bumped ads to calculate pages
    const bumpedAds = filteredAds.filter(ad => ad.isBumped);
    const nonBumpedAds = filteredAds.filter(ad => !ad.isBumped);
    
    // Calculate pages needed for bumped ads (minimum 1 page)
    const bumpedPages = Math.max(1, Math.ceil(bumpedAds.length / itemsPerPage));
    
    // Calculate pages needed for non-bumped ads
    const nonBumpedPages = nonBumpedAds.length > 0 
      ? Math.ceil(nonBumpedAds.length / itemsPerPage) 
      : 0;
    
    // Total pages is bumped pages + non-bumped pages
    // If bumped ads need more than 1 page, we reduce non-bumped pages by 1
    // since some non-bumped ads will share page with overflow bumped ads
    const adjustedNonBumpedPages = bumpedPages > 1 
      ? Math.max(0, nonBumpedPages - 1) 
      : nonBumpedPages;
    
    setTotalPages(Math.max(1, bumpedPages + adjustedNonBumpedPages));
    
    // Reset to page 1 when filter changes
    if (currentPage > (bumpedPages + adjustedNonBumpedPages)) {
      setCurrentPage(1);
    }
  }, [ads, blockchainFilter, itemsPerPage, currentPage]);

  // Function to get currently visible ads
  const getVisibleAds = () => {
    const filteredAds = blockchainFilter === 'all' 
      ? ads 
      : ads.filter(ad => (ad.blockchain || 'ethereum').toLowerCase() === blockchainFilter.toLowerCase());
    
    // First, sort ads to put bumped ads first, then sort by bullish votes
    const sortedAds = [...filteredAds].sort((a, b) => {
      // First prioritize bumped bubbles - all bumped bubbles come before unbumped ones
      if (a.isBumped && !b.isBumped) return -1;
      if (!a.isBumped && b.isBumped) return 1;
      
      // Then sort by bullish votes (highest first)
      return (b.bullishVotes || 0) - (a.bullishVotes || 0);
    });
    
    // Separate bumped and non-bumped ads
    const bumpedAds = sortedAds.filter(ad => ad.isBumped);
    const nonBumpedAds = sortedAds.filter(ad => !ad.isBumped);
    
    // If we're on the first page, only show bumped ads
    if (currentPage === 1) {
      // Only return bumped ads for the first page, limited to itemsPerPage
      return bumpedAds.slice(0, itemsPerPage);
    } else {
      // For subsequent pages, calculate the proper slice of non-bumped ads
      // Start from first page of non-bumped ads
      const startIndex = (currentPage - 2) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      
      // If there are more bumped ads than fit on the first page, show overflow on second page
      if (currentPage === 2 && bumpedAds.length > itemsPerPage) {
        const bumpedOverflow = bumpedAds.slice(itemsPerPage);
        const remainingSlots = itemsPerPage - bumpedOverflow.length;
        
        if (remainingSlots > 0) {
          // Fill remaining slots with non-bumped ads
          return [...bumpedOverflow, ...nonBumpedAds.slice(0, remainingSlots)];
        } else {
          // If no space left, just show the bumped overflow
          return bumpedOverflow.slice(0, itemsPerPage);
        }
      }
      
      // For pages beyond 2, or if no bumped overflow, show non-bumped ads
      // Adjust startIndex to account for any bumped overflow on page 2
      const adjustedStartIndex = currentPage === 2 
        ? 0 
        : startIndex - Math.max(0, bumpedAds.length - itemsPerPage);
      
      const adjustedEndIndex = adjustedStartIndex + itemsPerPage;
      
      return nonBumpedAds.slice(adjustedStartIndex, adjustedEndIndex);
    }
  };

  // Function to handle blockchain filter change
  const handleBlockchainFilterChange = (blockchain) => {
    setBlockchainFilter(blockchain);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Function to handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    
    // Add a short delay to allow state update before arranging bubbles
    setTimeout(() => {
      if (window.innerWidth <= 480) {
        adjustBubblesForMobile();
      } else {
        arrangeDesktopGrid();
      }
    }, 100);
  };

  // Add this function to update ads with persistence
  const updateAds = (newAds) => {
    setAds(newAds);
    localStorage.setItem('cachedAds', JSON.stringify(newAds));
  };

  // Load ads when component mounts
  useEffect(() => {
    const loadAdsFromApi = async () => {
      try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        setIsLoading(true);
        setLoadingMessage(isMobile ? 'Connecting to server...' : 'Loading ads...');
        
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
        setLoadingMessage('');
        
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
        setLoadingMessage('');
        showNotification('Connection issue. Using cached data.', 'warning');
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

  // Backend handles automatic ad shrinking every 15 seconds
  // WebSocket events will update the frontend in real-time
  // No need for frontend shrinking interval

  // Effect for updating window size
  useEffect(() => {
    const handleResize = () => {
      // Store current width to detect mobile/desktop transitions
      const wasMobile = window.innerWidth <= 480;
      
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      // Calculate items per page based on new window size
      const calculateItemsPerPage = () => {
        if (window.innerWidth <= 480) {
          return 25; // Mobile
        } else if (window.innerWidth <= 768) {
          return 35; // Tablet
        } else {
          return 50; // Desktop
        }
      };
      setItemsPerPage(calculateItemsPerPage());
      
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

      // Check for unbumped ad if user is already logged in
      if (currentUser) {
        checkForUnbumpedAd(currentUser);
      }
    }
  }, [ads.length, currentUser]);

  const showNotification = (message, type = 'info', adDetails = null) => {
    const id = Date.now();
    
    // Special handling for successful votes
    if (type === 'success' && message.includes('Voted') && adDetails) {
      setVotePopup({
        id,
        message,
        type,
        adDetails
      });
      
      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setVotePopup(null);
      }, 3000);
    } else {
      // Regular notifications
      setNotifications(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    }
  };

  // Function to check if user has an unbumped ad and show reminder
  const checkForUnbumpedAd = (user) => {
    if (!user || !ads.length) return;
    
    // Find the user's ad
    const userAd = ads.find(ad => ad.owner === user.username);
    
    if (userAd) {
      // Check if the ad is not bumped or bump has expired
      const isNotBumped = !userAd.isBumped;
      const isBumpExpired = userAd.bumpExpiresAt && new Date() > new Date(userAd.bumpExpiresAt);
      
      if (isNotBumped || isBumpExpired) {
        setUnbumpedAd(userAd);
        setShowBumpReminderModal(true);
      }
    }
  };

  // Function to handle when user clicks "Bump Now" from the reminder modal
  const handleBumpFromReminder = (adId) => {
    setSelectedAdId(adId);
    setShowBumpStore(true);
    setShowBumpReminderModal(false);
  };

  const handleLogin = async (credentials) => {
    try {
      const user = await loginUser(credentials);
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setShowLoginModal(false);
      showNotification('Successfully logged in!', 'success');
      
      // Check if user has an unbumped ad after successful login
      setTimeout(() => {
        checkForUnbumpedAd(user);
      }, 1000); // Small delay to ensure ads are loaded
    } catch (error) {
      logger.error('Login error:', error);
      
      // Handle email verification requirement
      if (error.emailVerificationRequired && error.email) {
        setShowLoginModal(false);
        setPendingVerificationEmail(error.email);
        setShowEmailVerificationModal(true);
        showNotification('Please verify your email to continue', 'info');
      } else {
        showNotification(error.message || 'Login failed', 'error');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    showNotification('Successfully logged out!', 'success');
  };

    // Open MintFunnel platform in full-screen popup
  const openMintFunnelPlatform = () => {
    const popup = window.open(
      'https://mintfunnel.co/crypto-ad-network/?ref=Aquads',
      'mintfunnel-platform',
      'width=' + window.screen.width + ',height=' + window.screen.height + ',scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no,directories=no'
    );

    if (!popup) {
      showNotification('Popup blocked! Please allow popups for this site and try again.', 'error');
    }
  };

  const handleCreateAccount = async (formData) => {
    try {
      const user = await apiRegister(formData);
      if (user) {
        setCurrentUser(user);
        setNewUsername(user.username);
        
        // Check if email verification is required
        if (user.verificationRequired && !user.emailVerified) {
          // Send verification email
          if (user.verificationCode) {
            logger.log('Attempting to send verification email...');
            try {
              await emailService.sendVerificationEmail(
                user.email,
                user.username,
                user.verificationCode
              );
              logger.log('Verification email sent successfully');
            } catch (emailError) {
              logger.error('Failed to send verification email:', emailError);
              alert('Account created but failed to send verification email. Please try resending.');
            }
          }
          
          setPendingVerificationEmail(user.email);
          setShowEmailVerificationModal(true);
          setShowCreateAccountModal(false);
        } else {
          // Send welcome email if email is provided and verified
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
      }
    } catch (error) {
      logger.error('Error creating account:', error);
      alert(error.message || 'Failed to create account');
    }
  };

  const handleEmailVerificationComplete = async (message) => {
    alert(message);
    
    // Send welcome email after successful verification
    if (pendingVerificationEmail && currentUser) {
      logger.log('Sending welcome email after verification...');
      try {
        await emailService.sendWelcomeEmail(
          pendingVerificationEmail,
          currentUser.username,
          currentUser.referralCode
        );
        logger.log('Welcome email sent successfully after verification');
      } catch (emailError) {
        logger.error('Failed to send welcome email after verification:', emailError);
      }
    }
    
    setShowWelcomeModal(true);
    setShowEmailVerificationModal(false);
    setPendingVerificationEmail('');
  };

  const handleCreateAd = async (adData) => {
    try {
      if (!currentUser) {
        showNotification('Please log in first!', 'error');
        setShowLoginModal(true);
        return;
      }

      // Removed the one ad per user limit - users can now create multiple ads

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
      
      // Only add to UI if admin (active immediately) or if it has active status
      if (currentUser?.isAdmin || createdAd.status === 'active') {
        setAds(prevAds => [...prevAds, createdAd]);
      }
      
      setShowCreateModal(false);
      
      // Show partnership popup after successful submission for all users
      setPartnershipPopup({
        projectName: adData.title,
        projectId: createdAd.id
      });
      
      // Auto dismiss after 30 seconds
      setTimeout(() => {
        setPartnershipPopup(null);
      }, 30000);
      
      // Show different messages based on user role or ad status
      if (currentUser?.isAdmin || createdAd.status === 'active') {
        showNotification('Project Listed successfully!', 'success');
      } else {
        showNotification('Project submitted for listing! It will be visible once approved by admins.', 'success');
      }
    } catch (error) {
      logger.error('Error creating ad:', error);
      
      // Handle email verification requirement
      if (error.emailVerificationRequired) {
        setShowCreateModal(false);
        if (currentUser?.email) {
          setPendingVerificationEmail(currentUser.email);
          setShowEmailVerificationModal(true);
          showNotification('Please verify your email to create listings', 'info');
        }
        return;
      }
      
      showNotification('Failed to List Project. Please try again.', 'error');
    }
  };

  const handleBumpPurchase = async (adId, txSignature, duration, discountCode = null) => {
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
              bumpExpiresAt: duration === -1 ? null : new Date(Date.now() + duration)
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
        
        const bumpResponse = await createBumpRequest({
          adId,
          owner: currentUser.username,
          txSignature,
          duration,
          status: 'pending',
          discountCode
        });

        logger.log("Bump request submitted successfully:", bumpResponse);
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
          bumpExpiresAt: bumpRequest.duration === -1 ? null : new Date(Date.now() + bumpRequest.duration)
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
    if (!currentUser) {
      showNotification('Please log in to vote', 'info');
      setShowLoginModal(true);
      return;
    }
    
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
      
      // Get the ad details for the notification
      const votedAd = ads.find(ad => ad.id === adId);
      
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
      
      // Show enhanced notification about vote and points if awarded
      if (data.pointsAwarded > 0) {
        showNotification(`Voted ${voteType} successfully! You earned ${data.pointsAwarded} points!`, 'success', votedAd);
      } else {
        showNotification(`Voted ${voteType} successfully!`, 'success', votedAd);
      }
    } catch (error) {
      logger.error('Error voting on ad:', error);
      showNotification(error.message || 'Failed to vote', 'error');
    }
  };

  // Add this effect to handle wallet authentication requests
  useEffect(() => {
    const handleAuthRequest = () => {
      if (!currentUser) {
        showNotification('Authentication required before connecting wallet', 'warning');
        setShowLoginModal(true);
      }
    };
    
    window.addEventListener('requestAuthentication', handleAuthRequest);
    
    return () => {
      window.removeEventListener('requestAuthentication', handleAuthRequest);
    };
  }, [currentUser]);

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
      socket.off('userAuthenticated');
      socket.off('adVoteUpdated'); // Remove listener on cleanup
    };
  }, []);

  // Initial ads fetch - WebSocket handles real-time updates
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
        
        // Filter out pending and rejected ads - only show active ads in the bubbles
        const filteredAds = currentUser?.isAdmin 
          ? processedAds 
          : processedAds.filter(ad => ad.status !== 'pending' && ad.status !== 'rejected');
        
        // Cache the ads (store all ads but only display filtered ones)
        localStorage.setItem('cachedAds', JSON.stringify(processedAds));
        
        // Update state with filtered ads
        setAds(filteredAds);
      } catch (error) {
        logger.error('Error fetching ads:', error);
        // Use cached ads if available and the API call fails
        const cachedAds = localStorage.getItem('cachedAds');
        if (cachedAds) {
          const parsedAds = JSON.parse(cachedAds);
          // Apply same filtering to cached ads
          const filteredAds = currentUser?.isAdmin 
            ? parsedAds 
            : parsedAds.filter(ad => ad.status !== 'pending' && ad.status !== 'rejected');
          setAds(filteredAds);
        }
      }
    };

    fetchAds(); // Only fetch once on mount - WebSocket handles updates
  }, [currentUser]);

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
    const checkInterval = setInterval(fixOverlappingBubbles, 1000);
    
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Set up event listeners for dashboard opening from notifications
  useEffect(() => {
    // Define handler for opening dashboard with booking
    const handleOpenDashboardWithBooking = (event) => {
      logger.log('Opening dashboard with booking:', event.detail.bookingId);
      setActiveBookingId(event.detail.bookingId);
      setDashboardActiveTab('ads');
      setShowDashboard(true);
    };
    
    // Define handler for opening dashboard without specific booking
    const handleOpenDashboard = () => {
      logger.log('Opening dashboard');
      setDashboardActiveTab('ads');
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
      if (tab) {
        setDashboardActiveTab(tab);
      } else {
        setDashboardActiveTab('ads'); // Default to ads tab if not specified
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
        
        setDashboardActiveTab('ads');
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
      columns = 4; // For very small screens (iPhone SE etc)
    } else if (screenWidth <= 375) {
      columns = 4; // For medium mobile (iPhone X, etc)
    } else {
      columns = 4; // For larger mobile screens (iPhone 12 Pro, etc)
    }
    
    // Make bubbles smaller to fit more rows
    let effectiveBubbleSize = screenWidth <= 320 ? Math.min(bubbleSize, 90) : bubbleSize;
    
    // Reduce bubble size by 15% to fit more rows vertically
    effectiveBubbleSize = Math.round(effectiveBubbleSize * 0.85);
    
    // Calculate optimal positioning values with minimal gaps
    const horizontalGap = 5; // Fixed smaller gap between columns
    const verticalGap = 7; // Increased vertical gap to prevent vote icon overlap with buy signals
    
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
      
      // First prioritize bumped bubbles - all bumped bubbles come before unbumped ones
      if (adA.isBumped && !adB.isBumped) return -1;
      if (!adA.isBumped && adB.isBumped) return 1;
      
      // Then sort by bullish votes (highest first)
      return (adB.bullishVotes || 0) - (adA.bullishVotes || 0);
    });
    
    // Create a grid layout optimized for mobile
    sortedBubbles.forEach((bubble, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      // Calculate new position with tighter spacing
      const x = horizontalGap + (col * (effectiveBubbleSize + horizontalGap));
      // Use row * (bubbleSize + verticalGap) for tighter vertical spacing
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
          
          // First prioritize bumped bubbles - all bumped bubbles come before unbumped ones
          if (adA.isBumped && !adB.isBumped) return -1;
          if (!adA.isBumped && adB.isBumped) return 1;
          
          // Then sort by bullish votes (highest first)
          return (adB.bullishVotes || 0) - (adA.bullishVotes || 0);
        });
        
        // Get first bubble size to use as reference
        const bubbleSize = parseInt(sortedBubbles[0].style.width) || 100;
        
        // Calculate columns based on screen width and height
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Specific column counts for tested screen resolutions
        let initialColumns;
        
        // Specific optimizations for known screen sizes based on user testing
        if (screenWidth === 2560 && screenHeight === 1440) {
          initialColumns = 15; // Optimized for 70 bubbles on 2560x1440
        } else if (screenWidth === 1366 && screenHeight === 768) {
          initialColumns = 9; // Optimized for 32 bubbles on 1366x768
        } else if (screenWidth >= 2400) {
          initialColumns = 16; // Similar to 2560x1440
        } else if (screenWidth >= 1800) {
          initialColumns = 14;
        } else if (screenWidth >= 1440) {
          initialColumns = 14;
        } else if (screenWidth >= 1200) {
          initialColumns = 8;
        } else if (screenWidth >= 1000) {
          initialColumns = 6;
        } else {
          initialColumns = 5;
        }
        
        // Calculate margins and spacing
        const initialHorizontalMargin = screenWidth >= 1440 ? 10 : 10;
        const initialVerticalMargin = 30;
        
        // Calculate available width and cell size
        const initialAvailableWidth = screenWidth - (initialHorizontalMargin * 2);
        const cellWidth = initialAvailableWidth / initialColumns;
        
        // Arrange in grid
        sortedBubbles.forEach((bubble, index) => {
          const row = Math.floor(index / initialColumns);
          const column = index % initialColumns;
          
          // Center in grid cell
          const x = initialHorizontalMargin + (column * cellWidth) + (cellWidth / 2) - (bubbleSize / 2);
          const y = TOP_PADDING + initialVerticalMargin + (row * (bubbleSize + initialVerticalMargin));
          
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
    
    // Add transition for immediate positioning (will be faster than the default)
    bubbles.forEach(bubble => {
      bubble.style.transition = 'transform 0.05s ease-out';
    });
    
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
      // First prioritize bumped bubbles - all bumped bubbles come before unbumped ones
      if (adA.isBumped && !adB.isBumped) return -1;
      if (!adA.isBumped && adB.isBumped) return 1;
      

      // Sort by bullish votes (highest first)
      return (adB.bullishVotes || 0) - (adA.bullishVotes || 0);
    });
    
    // Get first bubble size to use as reference
    const firstBubble = sortedBubbles[0];
    const bubbleSize = parseInt(firstBubble.style.width) || 100;
    
    // Calculate optimal columns based on screen width and height
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Specific column counts for tested screen resolutions
    let columns;
    
    // Specific optimizations for known screen sizes based on user testing
    if (screenWidth === 2560 && screenHeight === 1440) {
      columns = 15; // Optimized for 70 bubbles on 2560x1440
    } else if (screenWidth === 1366 && screenHeight === 768) {
      columns = 9; // Optimized for 32 bubbles on 1366x768
    } else if (screenWidth >= 2400) {
      columns = 16; // Similar to 2560x1440
    } else if (screenWidth >= 1800) {
      columns = 14;
    } else if (screenWidth >= 1440) {
      columns = 14;
    } else if (screenWidth >= 1200) {
      columns = 8;
    } else if (screenWidth >= 1000) {
      columns = 6;
    } else {
      columns = 5;
    }
    
    // Calculate margins and spacing
    // Use tighter spacing for known screen resolutions to fit the desired number of bubbles
    const horizontalMargin = screenWidth >= 1440 ? 10 : 10;
    const verticalMargin = 30;
    
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
    
    // Now place each bubble in its grid cell (immediately)
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
    
    // Update model immediately if positions changed and we're not skipping
    if (positionsChanged && !window.skipNextModelUpdate) {
      updateModelFromDomPositions();
    }
    
    // Reset flag and clear arrangement flag immediately
    window.skipNextModelUpdate = false;
    window.isArrangingDesktopGrid = false;
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
          arrangeDesktopGrid={arrangeDesktopGrid}
          adjustBubblesForMobile={adjustBubblesForMobile}
        />
        <Routes>
          <Route path="/marketplace" element={
            <Marketplace 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              onBannerSubmit={handleBannerSubmit}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
          } />
          <Route path="/partner-rewards" element={
            <PartnerMarketplace 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              onBannerSubmit={handleBannerSubmit}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
          } />
          <Route path="/service/:slug" element={
            <ServicePage 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
          } />
          <Route path="/booking-conversation/:bookingId" element={<BookingConversationPage />} />
          <Route path="/games/dots-and-boxes" element={<DotsAndBoxes currentUser={currentUser} />} />
          <Route path="/games/horse-racing" element={<HorseRacing currentUser={currentUser} />} />

          <Route path="/games" element={
            <GameHub 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              openMintFunnelPlatform={openMintFunnelPlatform}
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
                <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm z-[200000]">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                      <div className="flex items-center">
                        <img 
                          src="/Aquadsnewlogo.png" 
                          alt="AQUADS" 
                          className="w-auto filter drop-shadow-lg"
                          style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                        />
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
                      <div className="hidden md:flex items-center space-x-3">
                        {/* Main Navigation - Smaller buttons */}
                        <Link
                          to="/marketplace"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Freelancer
                        </Link>
                        <Link
                          to="/games"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Games
                        </Link>
                        <button
                          onClick={openMintFunnelPlatform}
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Paid Ads
                        </button>
                        <Link
                          to="/learn"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Learn
                        </Link>
                        <Link
                          to="/why-list"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Why List?
                        </Link>

                        {currentUser ? (
                          <>
                            <NotificationBell currentUser={currentUser} />
                            
                            {/* User Dropdown */}
                            <div className="relative user-dropdown">
                              <button 
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className="flex items-center bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                              >
                                <span className="mr-1">{getDisplayName(currentUser)}</span>
                                <svg className={`w-4 h-4 ml-1 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              {/* Dropdown Menu */}
                              {showUserDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-50">
                                  <div className="py-2">
                                    <button
                                      onClick={() => {
                                        setDashboardActiveTab('ads');
                                        setShowDashboard(true);
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                                    >
                                      📊 Dashboard
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowCreateModal(true);
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                                    >
                                      ➕ List Project
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowBannerModal(true);
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                                    >
                                      🎨 Create Banner Ad
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowProfileModal(true);
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                                    >
                                      ⚙️ Edit Profile
                                    </button>
                                    <hr className="my-2 border-gray-700" />
                                    <button
                                      onClick={() => {
                                        handleLogout();
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-600/50 transition-colors"
                                    >
                                      🚪 Logout
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setShowLoginModal(true)}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              Login
                            </button>
                            <button
                              onClick={() => setShowCreateAccountModal(true)}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              Create Account
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mobile menu */}
                    <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-2 z-[200000] relative bg-black`}>
                      <div className="flex flex-col space-y-2">
                        <Link
                          to="/marketplace"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                        >
                          Freelancer Hub
                        </Link>
                        <Link
                          to="/games"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                        >
                          GameHub
                        </Link>
                        <button
                          onClick={() => {
                            openMintFunnelPlatform();
                            setIsMobileMenuOpen(false);
                          }}
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                        >
                          Paid Ads
                        </button>
                        <Link
                          to="/learn"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                        >
                          Learn
                        </Link>
                        <Link
                          to="/why-list"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
                        >
                          Why List?
                        </Link>
                        {currentUser ? (
                          <>
                            <div className="flex justify-center">
                              <NotificationBell currentUser={currentUser} />
                            </div>
                            <span className="text-blue-300 text-center">Welcome, {getDisplayName(currentUser)}!</span>
                            <button
                              onClick={() => {
                                setDashboardActiveTab('ads');
                                setShowDashboard(true);
                                setIsMobileMenuOpen(false);
                              }}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              Dashboard
                            </button>
                            <button
                              onClick={() => {
                                setShowProfileModal(true);
                                setIsMobileMenuOpen(false);
                              }}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              Edit Profile
                            </button>
                            <button
                              onClick={() => {
                                setShowCreateModal(true);
                                setIsMobileMenuOpen(false);
                              }}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              List Project
                            </button>
                            <button
                              onClick={() => {
                                setShowBannerModal(true);
                                setIsMobileMenuOpen(false);
                              }}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              🎨 Create Banner Ad
                            </button>
                            <button
                              onClick={() => {
                                handleLogout();
                                setIsMobileMenuOpen(false);
                              }}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
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
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              Login
                            </button>
                            <button
                              onClick={() => {
                                setShowCreateAccountModal(true);
                                setIsMobileMenuOpen(false);
                              }}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
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
                  {/* AquaSwap Banner - positioned between token banner and filter controls */}
                  <div className="container mx-auto px-4 mb-4">
                    <div className="aquaswap-banner bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 border border-purple-400 rounded-lg p-2 sm:p-3 relative overflow-hidden shadow-lg shadow-purple-500/30">
                      {/* Animated background effects */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent animate-pulse"></div>
                      
                      {/* Floating blockchain icons */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1 left-8 text-yellow-400/60 animate-bounce text-xs sm:text-sm" style={{animationDelay: '0s', animationDuration: '3s'}}>⚡</div>
                        <div className="absolute top-2 right-16 text-yellow-300/60 animate-bounce text-xs sm:text-sm" style={{animationDelay: '1s', animationDuration: '2.5s'}}>🔗</div>
                        <div className="absolute bottom-1 left-16 text-yellow-400/60 animate-bounce text-xs sm:text-sm" style={{animationDelay: '2s', animationDuration: '3.5s'}}>💎</div>
                        <div className="absolute bottom-1 right-8 text-yellow-300/60 animate-bounce text-xs sm:text-sm" style={{animationDelay: '0.5s', animationDuration: '2.8s'}}>🌊</div>
                        <div className="absolute top-1/2 left-1/4 text-yellow-400/60 animate-bounce text-xs sm:text-sm" style={{animationDelay: '1.5s', animationDuration: '3.2s'}}>⭐</div>
                        <div className="absolute top-1/3 right-1/3 text-yellow-300/60 animate-bounce text-xs sm:text-sm" style={{animationDelay: '2.5s', animationDuration: '2.7s'}}>🚀</div>
                      </div>
                      
                      {/* Animated border glow */}
                      <div className="absolute inset-0 rounded-lg border-2 border-transparent bg-gradient-to-r from-yellow-400/50 via-purple-400/50 to-yellow-400/50 opacity-60 animate-pulse"></div>
                      <div className="absolute inset-[2px] rounded-lg bg-purple-600/90 backdrop-blur-sm"></div>
                      
                      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* Enhanced logo with glow effect */}
                          <div className="relative">
                            <img 
                              src="/AquaSwap.svg" 
                              alt="AquaSwap" 
                              className="w-8 h-8 sm:w-10 sm:h-10 filter drop-shadow-lg flex-shrink-0 animate-pulse"
                              style={{filter: 'drop-shadow(0 0 10px rgba(255, 255, 0, 0.8))'}}
                            />
                            <div className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 bg-yellow-400/30 rounded-full animate-ping"></div>
                          </div>
                          
                          <div>
                            <h3 className="text-yellow-300 font-bold text-sm sm:text-base mb-0.5 sm:mb-1 flex items-center gap-1 sm:gap-2">
                              🚀 Use AquaSwap - The Ultimate Cross-Chain BEX!
                              <span className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-300 text-purple-900 px-1.5 py-0.5 sm:px-2 rounded-full font-bold animate-pulse">
                                LIVE
                              </span>
                            </h3>
                            <p className="text-yellow-100 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                                Swap & bridge across 50+ blockchains
                              </span>
                              <span className="hidden sm:inline text-yellow-300">•</span>
                              <span className="hidden sm:inline text-yellow-200 font-semibold">Best rates & speed</span>
                            </p>
                            
                            {/* Feature highlights */}
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs bg-yellow-400/20 text-yellow-200 px-1.5 py-0.5 sm:px-2 rounded-full border border-yellow-400/40">
                                ⚡ Instant Swaps
                              </span>
                              <span className="text-xs bg-yellow-400/20 text-yellow-200 px-1.5 py-0.5 sm:px-2 rounded-full border border-yellow-400/40">
                                🔗 Cross-Chain
                              </span>
                              <span className="text-xs bg-yellow-400/20 text-yellow-200 px-1.5 py-0.5 sm:px-2 rounded-full border border-yellow-400/40">
                                💰 Best Rates
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Enhanced launch button */}
                        <div className="relative">
                          <a
                            href="/aquaswap"
                            className="relative bg-gradient-to-r from-yellow-400 to-yellow-300 hover:from-yellow-300 hover:to-yellow-200 text-purple-900 px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-400/50 whitespace-nowrap flex items-center gap-2 group text-sm sm:text-base"
                          >
                            <span>Buy Crypto</span>
                            <span className="group-hover:translate-x-1 transition-transform duration-300">🚀</span>
                            
                            {/* Button glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-lg blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 -z-10"></div>
                          </a>
                          
                          {/* Floating sparkles around button */}
                          <div className="absolute -top-1 -right-1 text-yellow-300 animate-ping text-xs sm:text-sm">✨</div>
                          <div className="absolute -bottom-1 -left-1 text-yellow-400 animate-ping text-xs sm:text-sm" style={{animationDelay: '1s'}}>💫</div>
                        </div>
                      </div>
                      
                      {/* Animated wave effect at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 opacity-80">
                        <div className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Filter controls */}
                  <div className="container mx-auto px-4">
                    <FilterControls 
                      currentBlockchain={blockchainFilter}
                      onBlockchainChange={handleBlockchainFilterChange}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                      totalItems={blockchainFilter === 'all' 
                        ? ads.length 
                        : ads.filter(ad => (ad.blockchain || 'ethereum').toLowerCase() === blockchainFilter.toLowerCase()).length}
                    />
                  </div>
                  
                  {/* Bubbles section - keep it as is, remove fixed positioning */}
                  <div className="relative min-h-screen overflow-hidden pt-3">
                    {/* Ads */}
                    {getVisibleAds().length > 0 ? (
                      getVisibleAds().map(ad => {
                        const { x, y } = ensureInViewport(
                          ad.x,
                          ad.y,
                          ad.size,
                          windowSize.width,
                          windowSize.height,
                          getVisibleAds(),
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
                              transition: 'transform 0.1s ease-out', // Faster transition
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
                                  // Check if ad has pairAddress or contractAddress for token chart
                                  const tokenAddress = ad.pairAddress || ad.contractAddress;
                                  if (tokenAddress && tokenAddress.trim()) {
                                    const blockchain = ad.blockchain || 'ethereum';
                                    window.location.href = `/aquaswap?token=${encodeURIComponent(tokenAddress.trim())}&blockchain=${encodeURIComponent(blockchain)}`;
                                  }
                                  // If no pair/contract address, do nothing (no redirect)
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
                                  <img 
                                    src="/Bearish.svg" 
                                    alt="Bearish" 
                                    className="w-4 h-4"
                                  />
                                </button>
                                <button 
                                  className={`vote-button bullish-vote ${ad.userVote === 'bullish' ? 'active-vote' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSentimentVote(ad.id, 'bullish');
                                  }}
                                  aria-label="Vote bullish"
                                >
                                  <img 
                                    src="/Bullish.svg" 
                                    alt="Bullish" 
                                    className="w-4 h-4"
                                  />
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
                                    } else {
                                      // Show login prompt for bump store access
                                      showNotification('Please log in to access the bump store', 'info');
                                      setShowLoginModal(true);
                                    }
                                  }}
                                >
                                  <svg 
                                    width="100%" 
                                    height="40" 
                                    viewBox="0 0 120 40"
                                    className="hover:opacity-75 transition-opacity duration-300"
                                    style={{
                                      overflow: 'visible'
                                    }}
                                  >
                                    <defs>
                                      <path 
                                        id={`curve-${ad.id}`} 
                                        d="M 10 30 Q 60 5 110 30" 
                                        fill="transparent"
                                      />
                                    </defs>
                                    <text 
                                      fontSize={`${Math.max(ad.size * 0.15, 14)}px`}
                                      fill="white"
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      className="hover:fill-blue-300 transition-colors duration-300"
                                      style={{
                                        textShadow: '0 0 3px rgba(0, 0, 0, 0.8)',
                                        fontWeight: '500'
                                      }}
                                    >
                                      <textPath 
                                        href={`#curve-${ad.id}`} 
                                        startOffset="50%"
                                      >
                                        {ad.title.toUpperCase()}
                                      </textPath>
                                    </text>
                                  </svg>
                                </div>
                                
                                {/* Logo Container */}
                                <div className="bubble-logo-container">
                                  <img
                                    src={ad.logo}
                                    alt={ad.title}
                                    loading="lazy"
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
                      <div className="flex items-center justify-center min-h-[50vh] flex-col">
                        {isLoading ? (
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                            <p className="text-gray-400 text-xl">{loadingMessage || 'Loading ads...'}</p>
                            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
                              <p className="text-sm text-gray-500 mt-2 text-center px-4">
                                Mobile networks may take longer to connect
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-400 text-xl mb-2">No projects found</p>
                            {blockchainFilter !== 'all' && (
                              <p className="text-gray-500">
                                No projects found for {BLOCKCHAIN_OPTIONS.find(option => option.value === blockchainFilter)?.label || blockchainFilter}.
                                <button 
                                  className="ml-2 text-blue-400 hover:text-blue-300 underline"
                                  onClick={() => handleBlockchainFilterChange('all')}
                                >
                                  View all projects
                                </button>
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Token list section - add z-index and proper background */}
                  <div className="relative z-10 bg-transparent">
                    {/* Multi-Section Banner (GameHub, Freelancer, Telegram, Coinbound) */}
                    <div className="w-full overflow-hidden flex">
                      {/* Game Hub Section */}
                      <div className="flex-1 relative">
                        <img
                          src="/game-hub-section.svg"
                          alt="Game Hub"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[280px] lg:max-h-[320px] block"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable="false"
                        />
                        <Link 
                          to="/games" 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            zIndex: 10,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                      
                      {/* Freelancer Hub Section */}
                      <div className="flex-1 relative">
                        <img
                          src="/freelancer-hub-section.svg"
                          alt="Freelancer Hub"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[280px] lg:max-h-[320px] block"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable="false"
                        />
                        <Link 
                          to="/marketplace" 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            zIndex: 10,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                      
                      {/* Telegram Mini App Section */}
                      <div className="flex-1 relative">
                        <img
                          src="/telegram-section.svg"
                          alt="Telegram Mini App"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[280px] lg:max-h-[320px] block"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable="false"
                        />
                        <a 
                          href="https://t.me/aquadsbumpbot" 
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            zIndex: 10,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                      
                      {/* Coinbound Section */}
                      <div className="flex-1 relative">
                        <img
                          src="/coinbound-section.svg"
                          alt="Free Marketing Plan"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[280px] lg:max-h-[320px] block"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable="false"
                        />
                        <a 
                          href="https://coinbound.io/marketing-plan/?ref=Aquads" 
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            zIndex: 10,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Banner Ad Display */}
                    <BannerDisplay rounded={true} />
                    
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

                {showEmailVerificationModal && (
                  <EmailVerificationModal
                    email={pendingVerificationEmail}
                    onVerificationComplete={handleEmailVerificationComplete}
                    onClose={() => {
                      setShowEmailVerificationModal(false);
                      setPendingVerificationEmail('');
                    }}
                  />
                )}

                {showCreateModal && currentUser && (
                  <CreateAdModal
                    onCreateAd={handleCreateAd}
                    onClose={() => setShowCreateModal(false)}
                    currentUser={currentUser}
                  />
                )}

                {showBannerModal && currentUser && (
                  <CreateBannerModal
                    onSubmit={handleBannerSubmit}
                    onClose={() => setShowBannerModal(false)}
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
                    currentUser={currentUser}
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
                    initialActiveTab={dashboardActiveTab}
                  />
                )}

                {showWelcomeModal && (
                  <WelcomeModal
                    username={currentUser.username}
                    referralCode={currentUser.referralCode}
                    onClose={() => setShowWelcomeModal(false)}
                  />
                )}

                {/* Bump Reminder Modal */}
                {showBumpReminderModal && unbumpedAd && (
                  <BumpReminderModal
                    isOpen={showBumpReminderModal}
                    onClose={() => setShowBumpReminderModal(false)}
                    onBumpNow={handleBumpFromReminder}
                    userAd={unbumpedAd}
                  />
                )}

                {/* Full-screen vote popup */}
                {votePopup && (
                  <div className="fixed inset-0 flex items-center justify-center z-[999] bg-black/70 backdrop-blur-md">
                    <div className="bg-gray-900 border-2 border-purple-500 rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all animate-fadeIn">
                      <div className="flex flex-col items-center">
                        {/* Bubble image/preview */}
                        {votePopup.adDetails && (
                          <div className="mb-4 flex flex-col items-center">
                            <div className={`w-24 h-24 rounded-full mb-2 flex items-center justify-center text-center overflow-hidden ${votePopup.adDetails.blockchain ? `bubble-${votePopup.adDetails.blockchain.toLowerCase()}` : 'bubble-ethereum'}`}>
                              {votePopup.adDetails.logo ? (
                                <img 
                                  src={votePopup.adDetails.logo} 
                                  alt={votePopup.adDetails.title}
                                  className="w-16 h-16 object-contain"
                                />
                              ) : (
                                <span className="text-lg font-bold">{votePopup.adDetails.title.substring(0, 2)}</span>
                              )}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{votePopup.adDetails.title}</h3>
                            <p className="text-sm text-gray-300 mb-4">
                              {votePopup.adDetails.blockchain 
                                ? BLOCKCHAIN_OPTIONS.find(opt => opt.value === votePopup.adDetails.blockchain.toLowerCase())?.label || votePopup.adDetails.blockchain
                                : 'Ethereum'
                              }
                            </p>
                          </div>
                        )}
                        
                        {/* Bullish/Bearish icon */}
                        <div className="text-6xl mb-4 flex justify-center">
                          {votePopup.message.includes('bullish') ? (
                            <img 
                              src="/Bullish.svg" 
                              alt="Bullish" 
                              className="w-16 h-16"
                            />
                          ) : (
                            <img 
                              src="/Bearish.svg" 
                              alt="Bearish" 
                              className="w-16 h-16"
                            />
                          )}
                        </div>
                        
                        {/* Message */}
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-white mb-2">
                            {votePopup.message.includes('bullish') ? 'Bullish Vote!' : 'Bearish Vote!'}
                          </h2>
                          <p className="text-lg text-gray-200">{votePopup.message}</p>
                        </div>
                        
                        {/* Close button */}
                        <button 
                          onClick={() => setVotePopup(null)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full transition duration-300"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Partnership backlink popup */}
                {partnershipPopup && (
                  <div className="fixed inset-0 flex items-center justify-center z-[999] bg-black/70 backdrop-blur-md">
                    <div className="bg-gray-900 border-2 border-purple-500 rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all animate-fadeIn">
                      <div className="flex flex-col items-center">
                        {/* Icon */}
                        <div className="text-6xl mb-4">
                          🔗
                        </div>
                        
                        {/* Message */}
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-white mb-2">
                            Boost Your Visibility!
                          </h2>
                          <p className="text-lg text-gray-200 mb-4">
                            Want to increase your project's reach? Add us as a partner on your website!
                          </p>
                          <p className="text-md text-gray-300">
                            Adding our backlink helps boost both your domain authority and ours.
                          </p>
                        </div>
                        
                        {/* Referral link example */}
                        <div className="bg-gray-800 p-3 rounded-md w-full mb-4 text-sm overflow-x-auto flex items-center">
                          <input 
                            type="text" 
                            value="https://aquads.xyz" 
                            readOnly
                            className="bg-transparent text-green-300 w-full outline-none p-1"
                          />
                        </div>
                        
                        {/* Buttons */}
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText('https://aquads.xyz');
                              showNotification('Link copied to clipboard!', 'success');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition duration-300"
                          >
                            Copy Link
                          </button>
                          <button 
                            onClick={() => setPartnershipPopup(null)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition duration-300"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regular notifications - keep these for non-vote notifications */}
                <div className="fixed bottom-4 right-4 space-y-2" style={{ zIndex: 999999999 }}>
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
              <div className="relative z-0">
                <Footer />
              </div>
            </div>
          } />
                      <Route path="/whitepaper" element={<Whitepaper />} />
            <Route path="/learn" element={<HowTo currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onCreateAccount={handleCreateAccount} openMintFunnelPlatform={openMintFunnelPlatform} />} />
                                 <Route path="/learn/:slug" element={<BlogPage currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onCreateAccount={handleCreateAccount} openMintFunnelPlatform={openMintFunnelPlatform} />} />
            <Route path="/affiliate" element={<Affiliate />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/verify-user" element={<VerifyUser />} />
            <Route path="/verify-member/:memberId" element={<MemberVerification />} />
            <Route path="/aquafi" element={
              <AquaFi 
                currentUser={currentUser} 
                showNotification={showNotification}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onCreateAccount={handleCreateAccount}
                openMintFunnelPlatform={openMintFunnelPlatform}
              />
            } />
            <Route path="/swap" element={<AquaSwap currentUser={currentUser} showNotification={showNotification} />} />
            <Route path="/aquaswap" element={<AquaSwap currentUser={currentUser} showNotification={showNotification} />} />
            <Route path="/buy-crypto" element={<TransakPage currentUser={currentUser} showNotification={showNotification} />} />

            <Route path="/embed/aquaswap" element={<AquaSwapEmbed />} />
            <Route path="/why-list" element={<ProjectInfo currentUser={currentUser} ads={ads} onLogin={() => setShowLoginModal(true)} onCreateAccount={() => setShowCreateAccountModal(true)} />} />
            <Route path="/freelancer-benefits" element={<FreelancerBenefits currentUser={currentUser} />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;

