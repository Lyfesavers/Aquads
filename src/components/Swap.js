import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import logger from '../utils/logger';
import './Swap.css';

// Constants
const FEE_PERCENTAGE = 0.025; // 2.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

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

// CSS to replace the widget logo
const replaceBrandingCSS = `
  /* Override Jumper/LiFi branding with our own */
  img[alt*="Jumper"],
  img[alt*="jumper"],
  img[alt*="LI.FI"],
  img[alt*="li.fi"],
  .jumper-logo,
  .lifi-logo {
    content: url("${window.location.origin}/AquaSwap.svg") !important;
    width: 32px !important;
    height: 32px !important;
    object-fit: contain !important;
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
    }, 100);
  }, []);

  // Simple iframe-based LiFi integration
  const renderLiFiWidget = () => {
    // Get absolute URL to logo
    const logoUrl = new URL('/AquaSwap.svg', window.location.origin).toString();
    
    // Basic URL with essential parameters
    const lifiUrl = `https://transferto.xyz/swap?integrator=aquaswap&fee=${FEE_PERCENTAGE}&toAddress=${ETH_FEE_WALLET}&solanaToAddress=${SOLANA_FEE_WALLET}&suiToAddress=${SUI_FEE_WALLET}&theme=dark&variant=drawer&containerStyle=min-height:700px;&logoUrl=${encodeURIComponent(logoUrl)}&primaryColor=%234285F4&hidePoweredBy=true&hideWalletBanner=true&disableI18n=true&appTitle=AquaSwap&appearanceScheme=dark`;
    
    return (
      <div className="iframe-container">
        <iframe
          ref={iframeRef}
          src={lifiUrl}
          title="AquaSwap powered by LiFi"
          frameBorder="0"
          className="lifi-iframe"
          allow="clipboard-write"
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
                
                // Inject our CSS to replace branding
                if (!doc.querySelector('#aquaswap-branding-css')) {
                  const styleEl = doc.createElement('style');
                  styleEl.id = 'aquaswap-branding-css';
                  styleEl.textContent = replaceBrandingCSS;
                  doc.head.appendChild(styleEl);
                }
              });
              
              // Start observing the iframe's document
              const doc = iframe.contentDocument;
              if (doc) {
                // Inject our CSS right away
                const styleEl = doc.createElement('style');
                styleEl.id = 'aquaswap-branding-css';
                styleEl.textContent = replaceBrandingCSS;
                doc.head.appendChild(styleEl);
                
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
      </div>
    </div>
  );
};

Swap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default Swap; 
