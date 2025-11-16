import React, { useState, useEffect, useRef } from 'react';
import { LiFiWidget } from '@lifi/widget';
import logger from '../utils/logger';
import './AquaSwapEmbed.css';

// Constants - using the same fee structure as the main swap
const FEE_PERCENTAGE = 0.005; // 0.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET;
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET;
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET;

const AquaSwapEmbed = () => {
  // CRITICAL: Clear swap-related URL parameters IMMEDIATELY on component initialization
  // This must happen before widget renders to prevent auto-fetching routes with invalid params
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const paramsToRemove = ['fromChain', 'toChain', 'fromToken', 'toToken', 'fromAmount', 'toAmount'];
    let urlChanged = false;
    
    paramsToRemove.forEach(param => {
      if (urlParams.has(param)) {
        urlParams.delete(param);
        urlChanged = true;
      }
    });

    // Update URL without swap parameters BEFORE widget initializes
    if (urlChanged && window.history && window.history.replaceState) {
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }

  const [embedOptions, setEmbedOptions] = useState({
    hideLogo: false
  });

  // Parse URL parameters (only for hideLogo, swap params already cleared above)
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
    
    // ============ EVENT HANDLERS FOR WALLET CONNECTION & SWAP FEEDBACK ============
    
    // Wallet connection events
    onWalletConnect: (wallet) => {
      logger.info('Wallet connected to AquaSwap Embed', { 
        address: wallet?.address, 
        chainId: wallet?.chainId 
      });
      
      // Send message to parent window about wallet connection
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'AQUASWAP_WALLET_CONNECTED',
          wallet: {
            address: wallet?.address,
            chainId: wallet?.chainId
          },
          timestamp: Date.now()
        }, '*');
      }
    },
    
    onWalletDisconnect: () => {
      logger.info('Wallet disconnected from AquaSwap Embed');
      
      // Send message to parent window about wallet disconnection
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'AQUASWAP_WALLET_DISCONNECTED',
          timestamp: Date.now()
        }, '*');
      }
    },
    
    // Swap lifecycle events
    onRouteExecutionStarted: (route) => {
      logger.info('Swap execution started in embed', { route });
      
      // Send message to parent window
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'AQUASWAP_SWAP_STARTED',
          timestamp: Date.now()
        }, '*');
      }
    },
    
    onRouteExecutionCompleted: (route) => {
      logger.info('Swap execution completed in embed', { route });
      
      // Send message to parent window
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'AQUASWAP_SWAP_COMPLETED',
          timestamp: Date.now()
        }, '*');
      }
    },
    
    onRouteExecutionFailed: (route, error) => {
      logger.error('Swap execution failed in embed', { route, error });
      
      // Send message to parent window
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'AQUASWAP_SWAP_FAILED',
          error: error?.message || 'Unknown error',
          timestamp: Date.now()
        }, '*');
      }
    },
    
    // Route update events
    onRouteExecutionUpdated: (route) => {
      logger.info('Swap execution updated in embed', { route });
      // Optional: Send progress updates to parent
    },
    
    // ============ END OF EVENT HANDLERS ============
    
    // Hide branding for clean embed (keep fromAmount and toAddress visible for route requests)
    hiddenUI: ["poweredBy"],
    // Use compact variant for embedding
    variant: "compact",
    // Dark appearance
    appearance: "dark",
    // Minimize widget size (matches main swap)
    containerStyle: {
      maxWidth: "100%",
      padding: "8px",
    },
    // Compact design settings (matches main swap)
    design: {
      compact: true,
    },
    // Disable URL building in iframe to prevent auto-fetching routes from URL parameters
    // This is the ROOT CAUSE - URL params in iframe trigger invalid route requests
    buildUrl: false,
    // Wallet configuration
    walletConfig: {
      // Enable partial wallet management to handle mobile Solana limitations
      usePartialWalletManagement: true,
      // Provide WalletConnect for EVM chains while LiFi handles Solana
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
    // SDK configuration for better performance (matches main swap exactly)
    sdkConfig: {
      // Improved route options for better performance and user experience
      routeOptions: {
        // Prioritize speed and success rate
        order: 'FASTEST',
        // Allow partial routes for better UX
        allowPartialRoutes: true,
        // Maximum number of routes to fetch for better performance
        maxPriceImpact: 0.5, // 50% max price impact
      },
      rpcUrls: {
        // Add your RPC URLs here if you have custom ones
        // [ChainId.ETH]: ['https://your-ethereum-rpc.com/'],
        // [ChainId.SOL]: ['https://your-solana-rpc.com/'],
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
        <p>Cross-chain swaps across 50+ blockchains</p>
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