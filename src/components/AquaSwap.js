import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import logger from '../utils/logger';
import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.025; // 2.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

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

const AquaSwap = ({ currentUser, showNotification }) => {
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

  // Li.Fi widget with custom AquaSwap branding
  const renderLiFiWidget = () => {
    // Enhanced URL with AquaSwap branding
    const lifiUrl = `https://transferto.xyz/swap?integrator=aquaswap&fee=${FEE_PERCENTAGE}&toAddress=${ETH_FEE_WALLET}&solanaToAddress=${SOLANA_FEE_WALLET}&suiToAddress=${SUI_FEE_WALLET}&theme=dark&variant=drawer&containerStyle=min-height:700px;&logoUrl=${encodeURIComponent(window.location.origin + '/AquaSwap.svg')}&primaryColor=%234285F4&hidePoweredBy=false&appTitle=AquaSwap&appearanceScheme=dark&brandColor=%2300D4FF&accentColor=%234285F4`;

    return (
      <div className="lifi-container">
        <iframe
          ref={iframeRef}
          src={lifiUrl}
          title="AquaSwap - Powered by Li.Fi"
          className="lifi-iframe"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
          referrerPolicy="no-referrer"
          scrolling="yes"
          allow="clipboard-write"
          style={{
            width: '100%',
            height: '700px',
            border: 'none',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
          onLoad={() => {
            try {
              const iframe = iframeRef.current;
              if (!iframe || !iframe.contentWindow) return;
              
              // Create a MutationObserver to watch for duck hunt elements
              const observer = new MutationObserver(() => {
                const doc = iframe.contentDocument;
                if (!doc) return;
                
                // Remove duck hunt elements
                const duckHuntElements = [
                  ...doc.querySelectorAll('[data-testid="duck-hunt-button"]'),
                  ...doc.querySelectorAll('[id*="duck-hunt"]'),
                  ...doc.querySelectorAll('[id*="start-duck"]'),
                  ...doc.querySelectorAll('[class*="duck-hunt"]'),
                  ...doc.querySelectorAll('.start-duck-hunt'),
                  ...doc.querySelectorAll('#start-duck-hunt'),
                  ...doc.querySelectorAll('#duck-hunt-button'),
                  ...doc.querySelectorAll('.duck-hunt-button'),
                  ...doc.querySelectorAll('div[style*="position: fixed"][style*="bottom"][style*="right"]')
                ];
                
                duckHuntElements.forEach(el => {
                  el.remove();
                });

                // Inject CSS to hide duck hunt elements
                const style = doc.createElement('style');
                style.textContent = hideDuckHuntCSS;
                doc.head.appendChild(style);
              });

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
      <div className="aquaswap-container">
        <div className="aquaswap-card">
          <div className="aquaswap-header">
            <h1>
              <img 
                src="/AquaSwap.svg" 
                alt="AquaSwap" 
                className="aquaswap-logo" 
                width="32" 
                height="32"
              />
              AquaSwap
            </h1>
            <p className="aquaswap-subtitle">The Ultimate Cross-Chain DEX</p>
          </div>
          <div className="aquaswap-body">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading AquaSwap...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main AquaSwap interface
  return (
    <div className="aquaswap-container">
      <div className="aquaswap-card">
        <div className="aquaswap-header">
          <h1>
            <img 
              src="/AquaSwap.svg" 
              alt="AquaSwap" 
              className="aquaswap-logo" 
              width="32" 
              height="32"
            />
            AquaSwap
          </h1>
          <p className="aquaswap-subtitle">The Ultimate Cross-Chain DEX</p>
        </div>
      
        {renderLiFiWidget()}

        <div className="powered-by">
          <div className="fee-disclaimer">
            <p>✨ Powered by Li.Fi • 2.5% platform fee applies</p>
          </div>
          <p>
            Swap and bridge across 20+ blockchains with the best rates and lowest fees.
          </p>
        </div>
      </div>
    </div>
  );
};

AquaSwap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default AquaSwap; 