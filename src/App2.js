
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
import SocialMediaRaids from './components/SocialMediaRaids';
import './App.css';

function App() {
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
          <Route path="/service/:slug" element={
            <ServicePage 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
          } />
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
                                <span className="mr-1">{currentUser.username}</span>
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
                            <span className="text-blue-300 text-center">Welcome, {currentUser.username}!</span>
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
                                Swap & bridge across 38+ blockchains
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
                    <BannerDisplay />
                    
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
            <Route path="/aquafi" element={<AquaFi currentUser={currentUser} showNotification={showNotification} />} />
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
