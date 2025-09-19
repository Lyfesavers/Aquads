import React, { useState, useEffect, useRef } from 'react';
import { LiFiWidget } from '@lifi/widget';
import logger from '../utils/logger';
import './AquaSwapEmbed.css';

// Constants - using the same fee structure as the main swap
const FEE_PERCENTAGE = 0.0025; // 0.25% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET;
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET;
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET;

const AquaSwapEmbed = () => {
  const [embedOptions, setEmbedOptions] = useState({
    hideLogo: false
  });

  // Parse URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hideLogo = urlParams.get('hideLogo') === 'true';
    
    setEmbedOptions({
      hideLogo
    });
  }, []);

  // LiFi Widget configuration optimized for embedding
  const widgetConfig = {
    integrator: "aquaswap-embed",
    fee: FEE_PERCENTAGE,
    feeConfig: {
      fee: FEE_PERCENTAGE,
      feeRecipient: ETH_FEE_WALLET || "0x0000000000000000000000000000000000000000",
      solanaFeeRecipient: SOLANA_FEE_WALLET,
      suiFeeRecipient: SUI_FEE_WALLET,
    },
    // Hide branding for clean embed
    hiddenUI: ["poweredBy", "toAddress", "fromAmount"],
    // Use compact variant for embedding
    variant: "compact",
    // Dark appearance
    appearance: "dark",
    // Enable URL building for mobile deep linking
    buildUrl: true,
    // Wallet configuration
    walletConfig: {
      usePartialWalletManagement: true,
      walletConnect: {
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
        metadata: {
          name: "Aquads",
          description: "Aquads - Web3 Crypto Hub & Freelancer Marketplace",
          url: "https://www.aquads.xyz",
          icons: ["https://www.aquads.xyz/logo192.png"],
        },
      },
    },
    // SDK configuration for better performance
    sdkConfig: {
      routeOptions: {
        order: 'FASTEST',
        allowPartialRoutes: true,
        maxPriceImpact: 0.5,
      },
    },
    // Enhanced theme configuration for embedding
    theme: {
      palette: {
        mode: 'dark',
      },
      container: {
        borderRadius: '12px',
        boxShadow: '0 4px 20px 0 rgba(0, 212, 255, 0.1)',
      },
    },
  };

  // Initialize on component mount
  useEffect(() => {
    // Add class to body for embed styling
    document.body.classList.add('aquaswap-embed');

    // Send message to parent window about successful load
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'AQUASWAP_EMBED_LOADED',
        timestamp: Date.now()
      }, '*');
    }

    // Cleanup
    return () => {
      document.body.classList.remove('aquaswap-embed');
    };
  }, []);

  return (
    <div className="aquaswap-embed-container">
      {/* Compact header - only show if logo is not hidden */}
      {!embedOptions.hideLogo && (
        <div className="embed-header">
          <div className="embed-title">
            <img 
              src="/AquaSwap.svg" 
              alt="AquaSwap" 
              className="embed-logo" 
              width="20" 
              height="20"
            />
            <span>AquaSwap</span>
          </div>
        </div>
      )}

      {/* Swap Widget */}
      <div className="embed-widget">
        <LiFiWidget integrator="aquaswap-embed" config={widgetConfig} />
      </div>

      {/* Footer with Powered by Aquads and description */}
      <div className="embed-footer">
        <p>Cross-chain swaps across 38+ blockchains</p>
        <a 
          href="https://www.aquads.xyz/aquaswap" 
          target="_blank" 
          rel="noopener noreferrer"
          className="powered-by-link"
        >
          Powered by Aquads
        </a>
      </div>
    </div>
  );
};

export default AquaSwapEmbed; 