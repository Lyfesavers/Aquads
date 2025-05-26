import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LiFiWidget } from '@lifi/widget';
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

  // Initialize on component mount
  useEffect(() => {
    // Load widget after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 100);
  }, []);

  // Li.Fi Widget configuration
  const widgetConfig = {
    integrator: 'aquaswap',
    fee: FEE_PERCENTAGE,
    feeRecipient: ETH_FEE_WALLET,
    theme: {
      palette: {
        mode: 'dark',
        primary: {
          main: '#4285F4',
        },
        background: {
          default: '#1f2937',
          paper: '#374151',
        },
      },
      shape: {
        borderRadius: 12,
      },
    },
    appearance: 'dark',
    variant: 'drawer',
    hidePoweredBy: true,
    containerStyle: {
      minHeight: '700px',
      border: 'none',
      borderRadius: '12px',
    },
    // Disable any unwanted features
    disableAppearance: false,
    // Custom branding
    logoUrl: `${window.location.origin}/AquaSwap.svg`,
    // Fee configuration for different chains
    sdkConfig: {
      defaultRouteOptions: {
        maxPriceImpact: 0.4, // 40% max price impact
        slippage: 0.005, // 0.5% slippage
      },
    },
    // Wallet management
    walletManagement: {
      connect: async () => {
        // Custom wallet connection logic if needed
        logger.info('Wallet connection requested');
      },
      disconnect: async () => {
        // Custom wallet disconnection logic if needed
        logger.info('Wallet disconnection requested');
      },
    },
    // Event handlers
    onRouteExecutionStarted: (route) => {
      logger.info('Route execution started:', route);
      if (showNotification) {
        showNotification('Transaction started', 'info');
      }
    },
    onRouteExecutionCompleted: (route) => {
      logger.info('Route execution completed:', route);
      if (showNotification) {
        showNotification('Transaction completed successfully!', 'success');
      }
    },
    onRouteExecutionFailed: (route, error) => {
      logger.error('Route execution failed:', error);
      if (showNotification) {
        showNotification('Transaction failed. Please try again.', 'error');
      }
    },
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
              AquaSwap - Li.Fi
            </h2>
          </div>
          <div className="swap-body">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading Li.Fi swap interface...</p>
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
              AquaSwap - Li.Fi
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
            AquaSwap - Li.Fi
          </h2>
        </div>
        
        <div className="lifi-widget-container">
          <LiFiWidget 
            integrator="aquaswap"
            config={widgetConfig}
            onError={(error) => {
              logger.error('Li.Fi Widget error:', error);
              setError('Failed to load Li.Fi widget. Please refresh and try again.');
            }}
          />
        </div>
        
        <div className="powered-by">
          <p>Powered by Li.Fi Protocol</p>
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