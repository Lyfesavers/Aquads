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
    // Using available theme parameters that match website colors
    const lifiUrl = `https://playground.li.fi/?integrator=aquaswap&fee=${FEE_PERCENTAGE}&feeRecipient=${ETH_FEE_WALLET}&solanaFeeRecipient=${SOLANA_FEE_WALLET}&suiFeeRecipient=${SUI_FEE_WALLET}&theme=dark&variant=expandable&appearance=dark&hiddenUI=PoweredBy,language,toAddress&hidePoweredBy=true&hideFooter=true`;

    return (
      <div className="lifi-container">
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
            overflow: 'hidden',
            // Add custom styling to better match website theme
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9))',
            boxShadow: '0 0 0 1px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
          allow="clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
          onLoad={() => {
            try {
              // Get access to the iframe's content window
              const iframe = iframeRef.current;
              if (!iframe || !iframe.contentWindow) return;
              
              // Create a MutationObserver to watch for and hide Li.Fi branding
              const observer = new MutationObserver((mutations) => {
                const doc = iframe.contentDocument;
                if (!doc) return;
                
                // Hide "Powered by Li.Fi" elements
                const poweredByElements = [
                  ...doc.querySelectorAll('[data-testid*="powered"]'),
                  ...doc.querySelectorAll('[class*="powered"]'),
                  ...doc.querySelectorAll('[class*="PoweredBy"]'),
                  ...doc.querySelectorAll('*[class*="lifi"]'),
                  ...doc.querySelectorAll('*[class*="LiFi"]'),
                  ...doc.querySelectorAll('*[class*="li-fi"]'),
                  ...doc.querySelectorAll('a[href*="li.fi"]'),
                  ...doc.querySelectorAll('a[href*="lifi"]'),
                  // Look for text content containing "Powered by"
                  ...Array.from(doc.querySelectorAll('*')).filter(el => 
                    el.textContent && el.textContent.toLowerCase().includes('powered by')
                  ),
                  // Look for text content containing "Li.Fi"
                  ...Array.from(doc.querySelectorAll('*')).filter(el => 
                    el.textContent && (el.textContent.includes('Li.Fi') || el.textContent.includes('LiFi'))
                  )
                ];
                
                // Hide all identified elements
                poweredByElements.forEach(el => {
                  if (el && el.style) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.opacity = '0';
                  }
                });

                // Try to inject custom CSS to match website theme
                try {
                  const style = doc.createElement('style');
                  style.textContent = `
                    /* Custom theme to match AquaSwap website */
                    :root {
                      --primary-color: #00D4FF !important;
                      --secondary-color: #4285F4 !important;
                      --background-color: #111827 !important;
                      --surface-color: #1F2937 !important;
                    }
                    
                    /* Override LiFi widget colors */
                    [class*="MuiButton-contained"] {
                      background: linear-gradient(135deg, #00D4FF, #4285F4) !important;
                      border: none !important;
                    }
                    
                    [class*="MuiButton-outlined"] {
                      border-color: #00D4FF !important;
                      color: #00D4FF !important;
                    }
                    
                    [class*="MuiPaper-root"] {
                      background: rgba(31, 41, 55, 0.9) !important;
                      border: 1px solid rgba(0, 212, 255, 0.2) !important;
                    }
                    
                    /* Primary color overrides */
                    .MuiButton-containedPrimary,
                    [class*="primary"] {
                      background: linear-gradient(135deg, #00D4FF, #4285F4) !important;
                    }
                    
                    /* Text color overrides */
                    [class*="MuiTypography-root"] {
                      color: #FFFFFF !important;
                    }
                    
                    /* Input field styling */
                    [class*="MuiInputBase-root"] {
                      background: rgba(17, 24, 39, 0.8) !important;
                      border: 1px solid rgba(0, 212, 255, 0.3) !important;
                      color: #FFFFFF !important;
                    }
                    
                    /* Focus states */
                    [class*="MuiInputBase-root"]:focus-within {
                      border-color: #00D4FF !important;
                      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2) !important;
                    }
                  `;
                  doc.head.appendChild(style);
                } catch (styleError) {
                  logger.debug('Could not inject custom styles:', styleError);
                }
              });
              
              // Start observing the iframe's document
              const doc = iframe.contentDocument;
              if (doc) {
                observer.observe(doc.body, { 
                  childList: true, 
                  subtree: true,
                  characterData: true
                });
                
                // Also run immediately to catch existing elements
                setTimeout(() => {
                  observer.disconnect();
                  observer.observe(doc.body, { 
                    childList: true, 
                    subtree: true,
                    characterData: true
                  });
                }, 1000);
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