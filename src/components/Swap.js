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
    /* Notification button fix */
    .notification-button {
      z-index: 5 !important;
    }
  </style>
`;

const Swap = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize on component mount
  useEffect(() => {
    // Style injection for notification button fix
    const styleEl = document.createElement('div');
    styleEl.innerHTML = hideDuckHuntStyle;
    document.head.appendChild(styleEl);
    
    // Load LiFi using iframe approach
    const loadLiFiWidget = () => {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    };
    
    loadLiFiWidget();
    
    // Cleanup
    return () => {
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);

  // Simple iframe-based LiFi integration
  const renderLiFiWidget = () => {
    const lifiUrl = `https://transferto.xyz/swap?integrator=AquaSwap&fee=${FEE_PERCENTAGE}&toAddress=${FEE_WALLET}&theme=dark&variant=default`;
    
    return (
      <iframe
        src={lifiUrl}
        title="AquaSwap powered by LiFi"
        frameBorder="0"
        className="lifi-iframe"
        allow="clipboard-write"
      />
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
