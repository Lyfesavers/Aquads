import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';
import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.025; // 2.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address



const AquaSwap = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  const navigate = useNavigate();

  // Initialize on component mount
  useEffect(() => {
    // Add class to body to enable scrolling
    document.body.classList.add('aquaswap-page');
    
    // Load widget after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 100);

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('aquaswap-page');
    };
  }, []);

  // Li.Fi widget with iframe approach (avoiding build dependency issues)
  const renderLiFiWidget = () => {
    // Use the Li.Fi playground URL with proper parameters for swap interface
    const lifiUrl = `https://playground.li.fi/?integrator=aquaswap&fee=${FEE_PERCENTAGE}&feeRecipient=${ETH_FEE_WALLET}&solanaFeeRecipient=${SOLANA_FEE_WALLET}&suiFeeRecipient=${SUI_FEE_WALLET}&theme=dark&variant=expandable&appearance=dark&hiddenUI=PoweredBy,language,toAddress,poweredBy,footer&hidePoweredBy=true&hideFooter=true&hideToAddress=true&hideLanguage=true`;

    return (
      <div className="lifi-container" style={{ position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={lifiUrl}
          title="AquaSwap - Cross-Chain DEX"
          className="lifi-iframe"
          style={{
            width: '100%',
            height: '700px',
            border: 'none',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
          allow="clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
          onLoad={() => {
            try {
              // Get access to the iframe's content window
              const iframe = iframeRef.current;
              if (!iframe || !iframe.contentWindow) return;
              
              // Function to aggressively hide Li.Fi branding
              const hideLiFiBranding = () => {
                const doc = iframe.contentDocument;
                if (!doc) return;
                
                // Hide "Powered by Li.Fi" elements with more comprehensive selectors
                const poweredByElements = [
                  // Data attributes
                  ...doc.querySelectorAll('[data-testid*="powered"]'),
                  ...doc.querySelectorAll('[data-testid*="footer"]'),
                  ...doc.querySelectorAll('[data-cy*="powered"]'),
                  
                  // Class-based selectors
                  ...doc.querySelectorAll('[class*="powered"]'),
                  ...doc.querySelectorAll('[class*="PoweredBy"]'),
                  ...doc.querySelectorAll('[class*="footer"]'),
                  ...doc.querySelectorAll('[class*="Footer"]'),
                  ...doc.querySelectorAll('*[class*="lifi"]'),
                  ...doc.querySelectorAll('*[class*="LiFi"]'),
                  ...doc.querySelectorAll('*[class*="li-fi"]'),
                  
                  // Links
                  ...doc.querySelectorAll('a[href*="li.fi"]'),
                  ...doc.querySelectorAll('a[href*="lifi"]'),
                  
                  // Footer elements
                  ...doc.querySelectorAll('footer'),
                  ...doc.querySelectorAll('[role="contentinfo"]'),
                  
                  // Text content searches
                  ...Array.from(doc.querySelectorAll('*')).filter(el => {
                    const text = el.textContent || '';
                    return text.toLowerCase().includes('powered by') ||
                           text.includes('Li.Fi') ||
                           text.includes('LiFi') ||
                           text.toLowerCase().includes('lifi');
                  }),
                  
                  // Common footer/branding containers
                  ...doc.querySelectorAll('div[style*="position: fixed"]'),
                  ...doc.querySelectorAll('div[style*="bottom"]'),
                  ...doc.querySelectorAll('.MuiBox-root'),
                  ...doc.querySelectorAll('[class*="MuiBox"]')
                ];
                
                // Hide all identified elements
                poweredByElements.forEach(el => {
                  if (el && el.style) {
                    el.style.display = 'none !important';
                    el.style.visibility = 'hidden !important';
                    el.style.opacity = '0 !important';
                    el.style.height = '0px !important';
                    el.style.overflow = 'hidden !important';
                    el.setAttribute('hidden', 'true');
                  }
                });
                
                // Also inject CSS to hide any remaining branding
                const style = doc.createElement('style');
                style.textContent = `
                  [data-testid*="powered"],
                  [class*="powered"],
                  [class*="PoweredBy"],
                  [class*="footer"],
                  [class*="Footer"],
                  footer,
                  [role="contentinfo"],
                  *[class*="lifi"],
                  *[class*="LiFi"],
                  *[class*="li-fi"],
                  a[href*="li.fi"],
                  a[href*="lifi"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    height: 0px !important;
                    overflow: hidden !important;
                  }
                `;
                doc.head.appendChild(style);
              };
              
              // Create a MutationObserver to watch for and hide Li.Fi branding
              const observer = new MutationObserver(() => {
                hideLiFiBranding();
              });
              
              // Start observing the iframe's document
              const doc = iframe.contentDocument;
              if (doc) {
                // Run immediately
                hideLiFiBranding();
                
                // Start observing for changes
                observer.observe(doc.body, { 
                  childList: true, 
                  subtree: true,
                  characterData: true,
                  attributes: true
                });
                
                // Run again after delays to catch dynamically loaded content
                setTimeout(hideLiFiBranding, 500);
                setTimeout(hideLiFiBranding, 1000);
                setTimeout(hideLiFiBranding, 2000);
                setTimeout(hideLiFiBranding, 5000);
              }
            } catch (error) {
              // Silent catch - cross-origin restrictions may prevent this
              logger.debug('Could not access iframe content:', error);
            }
          }}
        />
        
        {/* CSS overlay to hide any remaining Li.Fi branding at the bottom */}
        <div 
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '60px',
            background: 'linear-gradient(transparent, #1a1a1a)',
            pointerEvents: 'none',
            zIndex: 10,
            borderRadius: '0 0 12px 12px'
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
            <div className="aquaswap-nav">
              <button 
                className="back-to-main-button"
                onClick={() => navigate('/')}
                title="Back to Main Page"
              >
                ← Back to Main
              </button>
            </div>
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
          <div className="aquaswap-nav">
            <button 
              className="back-to-main-button"
              onClick={() => navigate('/')}
              title="Back to Main Page"
            >
              ← Back to Main
            </button>
          </div>
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
            <p>✨ AquaSwap</p>
          </div>
          <p>
            Swap and bridge across 38+ blockchains with the best rates and lowest fees.
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