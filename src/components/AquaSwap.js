import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LiFiWidget } from '@lifi/widget';
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

  // Initialize on component mount
  useEffect(() => {
    // Load widget after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 100);
  }, []);

  // Li.Fi widget configuration with custom AquaSwap branding
  const lifiConfig = {
    integrator: 'aquaswap',
    fee: FEE_PERCENTAGE,
    feeConfig: {
      fee: FEE_PERCENTAGE,
      feeRecipient: ETH_FEE_WALLET,
    },
    theme: {
      palette: {
        mode: 'dark',
        primary: {
          main: '#4285F4',
        },
        secondary: {
          main: '#00D4FF',
        },
        background: {
          paper: '#1f2937',
          default: '#111827',
        },
      },
      shape: {
        borderRadius: 12,
      },
    },
    appearance: 'dark',
    variant: 'expandable',
    subvariant: 'default',
    hiddenUI: ['poweredBy'],
    buildUrl: true,
    fromChain: 1, // Ethereum
    toChain: 137, // Polygon
    fromToken: '0x0000000000000000000000000000000000000000', // ETH
    toToken: '0x0000000000000000000000000000000000000000', // MATIC
  };

  const renderLiFiWidget = () => {
    return (
      <div className="lifi-container">
        <LiFiWidget 
          config={lifiConfig}
          integrator="aquaswap"
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