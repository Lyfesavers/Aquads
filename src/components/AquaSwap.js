import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { LiFiWidget } from '@lifi/widget';
import logger from '../utils/logger';
import BannerDisplay from './BannerDisplay';
import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.02; // 2% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

const AquaSwap = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();

  // Initialize on component mount
  useEffect(() => {
    // Add class to body to enable scrolling
    document.body.classList.add('aquaswap-page');

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('aquaswap-page');
    };
  }, []);

  // LI.FI Widget configuration following official documentation
  const widgetConfig = {
    integrator: "aquaswap",
    fee: FEE_PERCENTAGE,
    feeConfig: {
      fee: FEE_PERCENTAGE,
      feeRecipient: ETH_FEE_WALLET || "0x0000000000000000000000000000000000000000",
      solanaFeeRecipient: SOLANA_FEE_WALLET,
      suiFeeRecipient: SUI_FEE_WALLET,
    },
    // Hide branding
    hiddenUI: ["poweredBy"],
    // Use compact variant
    variant: "compact",
    // Dark appearance
    appearance: "dark",
    // Enable URL building for mobile deep linking
    buildUrl: true,
    // SDK configuration for better performance
    sdkConfig: {
      rpcUrls: {
        // Add your RPC URLs here if you have custom ones
        // [ChainId.ETH]: ['https://your-ethereum-rpc.com/'],
        // [ChainId.SOL]: ['https://your-solana-rpc.com/'],
      },
    },
    // Theme configuration
    theme: {
      palette: {
        mode: 'dark',
      },
    },
  };

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
    
      {/* LiFi Widget - Clean implementation */}
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