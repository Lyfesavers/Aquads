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

  // Initialize on component mount
  useEffect(() => {
    // Load widget after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  // Simple iframe-based LiFi integration
  const renderLiFiWidget = () => {
    // Basic URL with essential parameters
    const lifiUrl = `https://transferto.xyz/swap?integrator=AquaSwap&fee=${FEE_PERCENTAGE}&toAddress=${FEE_WALLET}&theme=dark`;
    
    return (
      <div className="iframe-container">
        <iframe
          ref={iframeRef}
          src={lifiUrl}
          title="AquaSwap powered by LiFi"
          frameBorder="0"
          className="lifi-iframe"
          allow="clipboard-write"
          style={{
            backgroundColor: 'transparent',
            backdropFilter: 'blur(2px)'
          }}
          onLoad={() => {
            try {
              // Get access to the iframe's content window
              const iframe = iframeRef.current;
              if (!iframe || !iframe.contentWindow) return;
              
              // Create a MutationObserver to watch for the duck hunt button 
              // and remove it whenever it's added to the DOM
              const observer = new MutationObserver((mutations) => {
                const doc = iframe.contentDocument;
                if (!doc) return;
                
                // Duck hunt buttons have various identifiers - search and remove all of them
                const duckHuntElements = [
                  ...doc.querySelectorAll('[data-testid="duck-hunt-button"]'),
                  ...doc.querySelectorAll('[id*="duck-hunt"]'),
                  ...doc.querySelectorAll('[id*="start-duck"]'),
                  ...doc.querySelectorAll('[class*="duck-hunt"]'),
                  ...doc.querySelectorAll('.start-duck-hunt'),
                  ...doc.querySelectorAll('#start-duck-hunt'),
                  ...doc.querySelectorAll('#duck-hunt-button'),
                  ...doc.querySelectorAll('.duck-hunt-button'),
                  // Look for elements with specific style patterns
                  ...doc.querySelectorAll('div[style*="position: fixed"][style*="bottom"][style*="right"]')
                ];
                
                // Remove all identified elements
                duckHuntElements.forEach(el => {
                  el.remove();
                });
              });
              
              // Start observing the iframe's document
              const doc = iframe.contentDocument;
              if (doc) {
                observer.observe(doc.body, { 
                  childList: true, 
                  subtree: true
                });
              }
            } catch (error) {
              // Silent catch - cross-origin restrictions may prevent this
              logger.debug('Could not access iframe content:', error);
            }
          }}
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
