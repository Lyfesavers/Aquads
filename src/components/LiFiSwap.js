import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import logger from '../utils/logger';
import './Swap.css';

// Constants
const FEE_PERCENTAGE = 0.025; // 2.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

const LiFiSwap = ({ currentUser, showNotification }) => {
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

  // Widget using iframe (same approach as current Swap)
  const renderWidget = () => {
    // Widget URL with AquaSwap branding - configured for swap/bridge mode
    const widgetUrl = `https://li.fi/?fromChain=1&fromToken=0x0000000000000000000000000000000000000000&toChain=137&fromAmount=1&integrator=aquaswap&fee=${FEE_PERCENTAGE}&feeRecipient=${ETH_FEE_WALLET}&theme=dark&logoUrl=${encodeURIComponent(window.location.origin + '/AquaSwap.svg')}&primaryColor=%234285F4&appearance=dark&hidePoweredBy=true`;
    
    return (
      <div className="iframe-container">
        <iframe
          ref={iframeRef}
          src={widgetUrl}
          title="AquaSwap"
          frameBorder="0"
          className="lifi-iframe"
          allow="clipboard-write"
          style={{
            width: '100%',
            height: '630px',
            border: 'none',
            borderRadius: '12px',
            overflow: 'hidden'
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

  // Error state
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
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                setTimeout(() => setLoading(false), 100);
              }}
              className="swap-button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Li.Fi widget interface
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
        
        {renderWidget()}
        
        <div className="powered-by">
          <p className="fee-disclaimer">
            A {(FEE_PERCENTAGE * 100).toFixed(2)}% fee is applied to support AquaSwap development
          </p>
        </div>
      </div>
    </div>
  );
};

LiFiSwap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default LiFiSwap; 