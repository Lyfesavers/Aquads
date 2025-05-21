import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import logger from '../utils/logger';
import './Swap.css';

// Constants
const FEE_PERCENTAGE = 0.5; // 0.5% fee
const FEE_WALLET = process.env.REACT_APP_FEE_WALLET || '6MtTEBWBXPTwbrVCqiHp4iTe84J8CfXHPspYYWTfBPG9'; // Default fee wallet

// Style to hide unwanted UI elements
const hideDuckHuntStyle = `
  <style>
    /* Basic targeting for duck hunt buttons */
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
    }
    
    /* Notification button fix */
    .notification-button {
      z-index: 5 !important;
    }
  </style>
`;

const Swap = ({ currentUser, showNotification }) => {
  const [isClientSide, setIsClientSide] = useState(false);
  const [lifiLoaded, setLifiLoaded] = useState(false);
  const [LiFiWidget, setLiFiWidget] = useState(null);
  const [error, setError] = useState(null);

  // Initialize on component mount
  useEffect(() => {
    // Style injection to hide unwanted UI elements
    const styleEl = document.createElement('div');
    styleEl.innerHTML = hideDuckHuntStyle;
    document.head.appendChild(styleEl);
    
    // Hide duck hunt buttons
    const intervalId = setInterval(() => {
      const hideSelectors = [
        '#duck-hunt-button',
        '#start-duck-hunt',
        '.duck-hunt-button',
        '.start-duck-hunt',
        '[data-testid="duck-hunt-button"]'
      ];
      
      hideSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            if (el) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
            }
          });
        } catch (e) {
          // Ignore errors
        }
      });
    }, 2000);

    setIsClientSide(true);
    
    // Try to dynamically load LiFi widget
    const loadLifiWidget = async () => {
      try {
        // Dynamically import the LiFi widget
        const lifiModule = await import('@lifi/widget');
        setLiFiWidget(() => lifiModule.LiFiWidget);
        setLifiLoaded(true);
        logger.info('LiFi widget loaded successfully');
      } catch (err) {
        logger.error('Failed to load LiFi widget:', err);
        setError('Could not load the swap widget. Please try again later.');
      }
    };
    
    loadLifiWidget();
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);
  
  // Render fallback UI if LiFi widget fails to load
  if (error) {
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
            <div className="error-message">
              {error}
            </div>
            <p className="fallback-message">
              We're experiencing technical difficulties with our swap interface. Please try again later or use one of these alternatives:
            </p>
            <div className="fallback-links">
              <a href="https://jup.ag" target="_blank" rel="noopener noreferrer" className="fallback-link">
                Jupiter (Solana)
              </a>
              <a href="https://app.uniswap.org" target="_blank" rel="noopener noreferrer" className="fallback-link">
                Uniswap (Ethereum)
              </a>
              <a href="https://li.fi" target="_blank" rel="noopener noreferrer" className="fallback-link">
                Li.Fi (Cross-chain)
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while LiFi is being loaded
  if (!lifiLoaded || !isClientSide) {
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

  // Once LiFi is loaded, conditionally render it
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
        
        {LiFiWidget && (
          <LiFiWidget
            integrator="AquaSwap"
            fee={FEE_PERCENTAGE}
            toAddress={FEE_WALLET}
            config={{
              appearance: 'dark',
              variant: 'expandable',
              hiddenUI: ['appearance', 'poweredBy'],
              containerStyle: {
                width: '100%',
                height: '640px',
                border: 'none',
                borderRadius: '16px',
              },
              theme: {
                palette: {
                  primary: { main: '#1D9BF0' },
                  secondary: { main: '#38E8C6' },
                  background: {
                    default: '#0A1929',
                    paper: '#12263F',
                  },
                },
              },
              languages: {
                en: {
                  title: 'AquaSwap',
                  subtitle: 'Powered by LiFi',
                  footer: `All swaps include a ${FEE_PERCENTAGE}% platform fee`,
                },
              },
            }}
            onEvent={(event) => {
              logger.info(`LiFi widget event: ${event.type}`);
              
              // Handle notifications
              if (event.type === 'routeExecutionStarted') {
                showNotification('Swap started!', 'info');
              } else if (event.type === 'routeExecutionCompleted') {
                showNotification('Swap completed successfully!', 'success');
              } else if (event.type === 'routeExecutionFailed') {
                showNotification(`Swap failed: ${event.data?.error?.message || 'Unknown error'}`, 'error');
              }
            }}
          />
        )}
        
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
