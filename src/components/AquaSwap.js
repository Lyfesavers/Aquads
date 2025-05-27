import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
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

  // Initialize on component mount
  useEffect(() => {
    // Load widget after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 100);
  }, []);

  // Li.Fi widget with iframe approach (avoiding build dependency issues)
  const renderLiFiWidget = () => {
    // Use the actual Li.Fi widget URL (not Jumper) with AquaSwap branding
    const lifiUrl = `https://widget.li.fi/?integrator=aquaswap&fee=${FEE_PERCENTAGE}&feeRecipient=${ETH_FEE_WALLET}&theme=dark&variant=expandable&logoUrl=${encodeURIComponent(window.location.origin + '/AquaSwap.svg')}&primaryColor=%234285F4&appearance=dark&brandColor=%2300D4FF&accentColor=%234285F4&hidePoweredBy=false`;

    return (
      <div className="lifi-container">
        <iframe
          ref={iframeRef}
          src={lifiUrl}
          title="AquaSwap - Powered by Li.Fi"
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