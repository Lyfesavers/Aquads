import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { LiFiWidget } from '@lifi/widget';
import logger from '../utils/logger';
import BannerDisplay from './BannerDisplay';
import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.015; // 1.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

const AquaSwap = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Detect if user is on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Initialize on component mount
  useEffect(() => {
    // Add class to body to enable scrolling
    document.body.classList.add('aquaswap-page');
    
    // Add mobile class if on mobile
    if (isMobile) {
      document.body.classList.add('mobile-device');
    }
    
    // Load widget after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 100);

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('aquaswap-page');
      document.body.classList.remove('mobile-device');
    };
  }, [isMobile]);

  // LI.FI Widget configuration - optimized for mobile wallet support
  const widgetConfig = {
    variant: "compact",
    appearance: "dark",
    integrator: "aquaswap",
    fee: FEE_PERCENTAGE,
    feeConfig: {
      fee: FEE_PERCENTAGE,
      feeRecipient: ETH_FEE_WALLET || "0x0000000000000000000000000000000000000000",
      solanaFeeRecipient: SOLANA_FEE_WALLET,
      suiFeeRecipient: SUI_FEE_WALLET,
    },
    // Hide branding but keep all wallet functionality
    hiddenUI: ["poweredBy"],
    // Mobile wallet configuration
    walletConfig: {
      onConnect: () => {
        logger.log('Wallet connected');
        if (showNotification) {
          showNotification('Wallet connected successfully!', 'success');
        }
      },
      onDisconnect: () => {
        logger.log('Wallet disconnected');
        if (showNotification) {
          showNotification('Wallet disconnected', 'info');
        }
      },
    },
    // Enable mobile wallet detection and deep linking
    buildUrl: true,
    // Ensure all chains and wallets are available
    chains: {
      allow: [], // Allow all chains
      deny: [], // Don't deny any chains
    },
    // Don't restrict any wallets - let LiFi detect all available wallets
    wallets: {
      allow: [], // Allow all wallets
      deny: [], // Don't deny any wallets
    },
    // Mobile-specific settings
    theme: {
      container: {
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
      },
      palette: {
        mode: 'dark',
      },
    },
    // Enable deep linking for mobile wallets and better mobile support
    sdkConfig: {
      apiUrl: 'https://li.quest/v1',
      rpcs: {}, // Let LiFi use default RPCs
      defaultRouteOptions: {
        allowSwitchChain: true, // Allow chain switching
        bridges: {
          allow: [], // Allow all bridges
          deny: [], // Don't deny any bridges
        },
        exchanges: {
          allow: [], // Allow all exchanges
          deny: [], // Don't deny any exchanges
        },
      },
      // Mobile-specific configurations
      ...(isMobile && {
        walletConnect: {
          projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'default-project-id',
          metadata: {
            name: 'AquaSwap',
            description: 'The Ultimate Cross-Chain DEX',
            url: 'https://aquads.io',
            icons: ['https://aquads.io/AquaSwap.svg'],
          },
        },
      }),
    },
    // Additional mobile optimizations
    ...(isMobile && {
      containerStyle: {
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
      },
    }),
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
    <div className="aquaswap-page">
      {/* Simple back button */}
      <button 
        className="back-to-main-button"
        onClick={() => navigate('/')}
        title="Back to Main Page"
      >
        ← Back to Main
      </button>

      {/* Banner Display */}
      <BannerDisplay />

      {/* Simple title */}
      <div className="page-title">
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
        <p>The Ultimate Cross-Chain DEX</p>
      </div>
    
      {/* LiFi Widget - Full wallet management */}
      <div className="lifi-widget">
        <LiFiWidget integrator="aquaswap" config={widgetConfig} />
      </div>

      {/* Simple footer text */}
      <div className="simple-footer">
        <p>✨ Swap and bridge across 38+ blockchains with the best rates and lowest fees.</p>
      </div>
    </div>
  );
};

AquaSwap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default AquaSwap; 