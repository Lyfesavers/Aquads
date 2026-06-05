import React, { useState, useEffect, useRef } from 'react';
import { LiFiWidget, useWidgetEvents, WidgetEvent, ChainId } from '@lifi/widget';
import logger from '../utils/logger';
import EtmTagline from './EtmTagline';
import './AquaSwapEmbed.css';

// Constants - using the same fee structure as the main swap
const FEE_PERCENTAGE = 0.005; // 0.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET;
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET;
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET;

const SOLANA_RPC_URL = (process.env.REACT_APP_SOLANA_RPC_URL || '').trim();

const readEmbedOptionsFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    hideLogo: urlParams.get('hideLogo') === 'true',
    /** Official Chrome extension iframe only (`?extension=1`) — public embeds must not earn swap points */
    isExtensionEmbed: urlParams.get('extension') === '1'
  };
};

const AquaSwapEmbed = () => {
  const [embedOptions, setEmbedOptions] = useState(readEmbedOptionsFromUrl);

  const widgetEvents = useWidgetEvents();

  const notifyExtensionParentSwapCompleted = (route) => {
    if (!embedOptions.isExtensionEmbed || window.parent === window) return;

    window.parent.postMessage({
      type: 'AQUASWAP_SWAP_COMPLETED',
      timestamp: Date.now(),
      route: route ? {
        fromChain: route.fromChain,
        toChain: route.toChain,
        fromToken: route.fromToken,
        toToken: route.toToken
      } : null
    }, '*');
  };

  useEffect(() => {
    setEmbedOptions(readEmbedOptionsFromUrl());
  }, []);

  // Extension iframe only: notify parent to award points (not public /embed embeds)
  useEffect(() => {
    if (!embedOptions.isExtensionEmbed) return;

    const handleSwapComplete = (route) => {
      logger.info('Swap completed in extension embed', { route });
      notifyExtensionParentSwapCompleted(route);
    };

    if (widgetEvents) {
      widgetEvents.on(WidgetEvent.RouteExecutionCompleted, handleSwapComplete);
    }

    return () => {
      if (widgetEvents) {
        widgetEvents.off(WidgetEvent.RouteExecutionCompleted, handleSwapComplete);
      }
    };
  }, [widgetEvents, embedOptions.isExtensionEmbed]);

  // LiFi Widget configuration optimized for embedding
  const widgetConfig = {
    integrator: "aquaswap", // Use same integrator as main swap (registered in LI.FI dashboard)
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
      notifyExtensionParentSwapCompleted(route);
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
    
    // Route finding events - CRITICAL for debugging iframe route issues
    onRouteFound: (route) => {
      logger.info('✅ Route found in embed', { route });
    },
    
    onRouteNotFound: (error) => {
      logger.error('❌ Route NOT found in embed', { error });
      // Send error to parent for debugging
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'AQUASWAP_ROUTE_ERROR',
          error: error?.message || 'Route not found',
          timestamp: Date.now()
        }, '*');
      }
    },
    
    // ============ END OF EVENT HANDLERS ============
    
    // Hide branding for clean embed (keep fromAmount and toAddress visible for route requests)
    hiddenUI: ["poweredBy"],
    // Use compact variant for embedding
    variant: "compact",
    // Dark appearance
    appearance: "dark",
    // Minimize widget size (matches main swap exactly)
    containerStyle: {
      maxWidth: "100%",
      padding: "8px",
    },
    // Compact design settings (matches main swap exactly)
    design: {
      compact: true,
    },
    // Enable URL building for mobile deep linking (matches main swap)
    buildUrl: true,
    walletConfig: {
      // Standalone embed: same as main AquaSwap (mobile-friendly hybrid). Iframe (e.g. extension): false so balances/RPC behave reliably inside embedded context.
      usePartialWalletManagement: window.parent === window,
      // Provide WalletConnect for EVM chains while LiFi handles Solana
      walletConnect: {
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
        metadata: {
          name: "Aquads",
          description: "Aquads — the launch stack for new crypto projects. List, grow, hire, and get paid after your token launches.",
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
        ...(SOLANA_RPC_URL ? { [ChainId.SOL]: [SOLANA_RPC_URL] } : {}),
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
          <div className="embed-header-inner">
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
            <EtmTagline compact className="embed-etm-tagline" />
          </div>
        </div>
      )}

      {/* Swap Widget */}
      <div className="embed-widget">
        <LiFiWidget integrator="aquaswap" config={widgetConfig} />
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