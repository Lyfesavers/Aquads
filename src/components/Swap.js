import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import logger from '../utils/logger';
import './Swap.css';

// Constants
const FEE_PERCENTAGE = 0.5; // 0.5% fee
const FEE_WALLET = process.env.REACT_APP_FEE_WALLET || '6MtTEBWBXPTwbrVCqiHp4iTe84J8CfXHPspYYWTfBPG9'; // Default fee wallet

// Style for notification button fix
const notificationFixStyle = `
  <style>
    /* Notification button fix */
    .notification-button {
      z-index: 5 !important;
    }
  </style>
`;

// CSS to hide duck hunt inside iframe
const hideDuckHuntCSS = `
  div[style*="position: fixed"][style*="bottom"][style*="right"],
  div[data-testid="duck-hunt-button"],
  [id*="duck-hunt"],
  [id*="start-duck"],
  [class*="duck-hunt"],
  .start-duck-hunt,
  #start-duck-hunt,
  #duck-hunt-button,
  .duck-hunt-button {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
    position: absolute !important;
    z-index: -1 !important;
  }
`;

const Swap = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  const iframeContainer = useRef(null);

  // Custom approach to hide Duck Hunt without affecting main page
  useEffect(() => {
    // Initial load delay
    const loadTimer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    // Set up MutationObserver to watch for Duck Hunt button in the iframe
    const setupDuckHuntRemoval = () => {
      if (!iframeRef.current || !iframeContainer.current) return;

      try {
        // Try periodically to access iframe contents (if same origin)
        const cleanupInterval = setInterval(() => {
          try {
            // If we can access the iframe content document
            if (iframeRef.current.contentDocument) {
              const doc = iframeRef.current.contentDocument;
              
              // Hide all duck hunt buttons
              const selectors = [
                'div[style*="position: fixed"][style*="bottom"][style*="right"]',
                'div[data-testid="duck-hunt-button"]',
                'div[class*="DuckHuntWidget"]',
                'button[class*="duck-hunt"]',
                '[id*="duck-hunt"]',
                '[id*="start-duck"]',
                '[class*="duck-hunt"]',
                '.start-duck-hunt',
                '#start-duck-hunt',
                '#duck-hunt-button',
                '.duck-hunt-button'
              ];
              
              selectors.forEach(selector => {
                const elements = doc.querySelectorAll(selector);
                if (elements.length > 0) {
                  console.log(`Found ${elements.length} duck hunt elements`);
                  elements.forEach(el => el.remove());
                }
              });
              
              // Also inject a style to continuously hide it
              if (!doc.getElementById('duck-hunt-blocker')) {
                const style = doc.createElement('style');
                style.id = 'duck-hunt-blocker';
                style.textContent = `
                  div[style*="position: fixed"][style*="bottom"][style*="right"],
                  div[data-testid="duck-hunt-button"],
                  div[class*="DuckHuntWidget"],
                  button[class*="duck-hunt"],
                  [id*="duck-hunt"],
                  [id*="start-duck"],
                  [class*="duck-hunt"],
                  .start-duck-hunt,
                  #start-duck-hunt,
                  #duck-hunt-button,
                  .duck-hunt-button {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    width: 0 !important;
                    height: 0 !important;
                    max-width: 0 !important;
                    max-height: 0 !important;
                    overflow: hidden !important;
                    position: absolute !important;
                    pointer-events: none !important;
                    z-index: -9999 !important;
                  }
                `;
                doc.head.appendChild(style);
                
                // Add cleanup script as well
                const script = doc.createElement('script');
                script.textContent = `
                  (function() {
                    function removeDuckHunt() {
                      const selectors = [
                        'div[style*="position: fixed"][style*="bottom"][style*="right"]',
                        'div[data-testid="duck-hunt-button"]',
                        'div[class*="DuckHuntWidget"]',
                        'button[class*="duck-hunt"]',
                        '[id*="duck-hunt"]',
                        '[id*="start-duck"]',
                        '[class*="duck-hunt"]',
                        '.start-duck-hunt',
                        '#start-duck-hunt',
                        '#duck-hunt-button',
                        '.duck-hunt-button'
                      ];
                      
                      selectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                          if (el) el.remove();
                        });
                      });
                    }
                    
                    // Run immediately and periodically
                    removeDuckHunt();
                    setInterval(removeDuckHunt, 300);
                    
                    // Watch for dynamically added elements
                    const observer = new MutationObserver(function(mutations) {
                      removeDuckHunt();
                    });
                    
                    observer.observe(document.body, { 
                      childList: true,
                      subtree: true
                    });
                  })();
                `;
                doc.body.appendChild(script);
              }
            }
          } catch (err) {
            // Cross-origin errors are expected, just continue
          }
        }, 500);
        
        return () => {
          clearInterval(cleanupInterval);
        };
      } catch (err) {
        console.error('Error setting up duck hunt removal:', err);
      }
    };
    
    // Apply CSS via wrapper
    const applyDuckHuntCSS = () => {
      if (!iframeContainer.current) return;
      
      // Add CSS to the iframe wrapper
      iframeContainer.current.style.position = 'relative';
      
      // Create overlay element to intercept duck hunt
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        width: 150px;
        height: 150px;
        background: transparent;
        z-index: 100000;
      `;
      iframeContainer.current.appendChild(overlay);
    };
    
    // Wait for iframe to be available
    const initTimer = setTimeout(() => {
      setupDuckHuntRemoval();
      applyDuckHuntCSS();
    }, 1500);
    
    return () => {
      clearTimeout(loadTimer);
      clearTimeout(initTimer);
    };
  }, []);

  // Handle iframe load
  const handleIframeLoad = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        // Try using postMessage to communicate with iframe
        iframeRef.current.contentWindow.postMessage({
          type: 'HIDE_DUCK_HUNT',
          hide: true
        }, '*');
      }
    } catch (err) {
      // Ignore cross-origin errors
    }
  };

  // Simple iframe-based LiFi integration with all possible parameters to hide duck hunt
  const renderLiFiWidget = () => {
    // Add all possible parameters to hide duck hunt
    const lifiUrl = `https://transferto.xyz/swap?integrator=AquaSwap&fee=${FEE_PERCENTAGE}&toAddress=${FEE_WALLET}&theme=dark&variant=default&hideDuckHunt=true&disableDuckHunt=true&disableWidgets=true&disable=duckHunt`;
    
    return (
      <div ref={iframeContainer} className="iframe-wrapper">
        <iframe
          ref={iframeRef}
          src={lifiUrl}
          title="AquaSwap powered by LiFi"
          frameBorder="0"
          className="lifi-iframe"
          allow="clipboard-write"
          onLoad={handleIframeLoad}
        />
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="swap-container">
        <div className="swap-card">
          <div className="swap-header">
            <h2>
              <img 
                src="/AquaSwap.svg" 
                alt="AquaSwap" 
                className="aquaswap-logo" 
                width="24" 
                height="24"
              />
              AquaSwap
            </h2>
          </div>
          <div className="swap-body">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading swap interface...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main swap interface with iframe
  return (
    <div className="swap-container">
      <div className="swap-card lifi-container">
        <div className="swap-header">
          <h2>
            <img 
              src="/AquaSwap.svg" 
              alt="AquaSwap" 
              className="aquaswap-logo" 
              width="24" 
              height="24"
            />
            AquaSwap
          </h2>
        </div>
      
        {renderLiFiWidget()}
        
        <div className="powered-by">
          <div>Cross-chain swaps powered by <a href="https://li.fi" target="_blank" rel="noopener noreferrer">Li.Fi</a></div>
          <div className="fee-disclaimer">All swaps include a {FEE_PERCENTAGE}% platform fee</div>
        </div>
      </div>
    </div>
  );
};

Swap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default Swap; 
