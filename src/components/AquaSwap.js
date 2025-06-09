import React, { useState, useEffect, useRef } from 'react';
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
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState('tradingview');
  const tradingViewRef = useRef(null);
  const dexScreenerRef = useRef(null);

  // Initialize on component mount
  useEffect(() => {
    // Add class to body to enable scrolling
    document.body.classList.add('aquaswap-page');

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('aquaswap-page');
    };
  }, []);

  // Load TradingView widget
  useEffect(() => {
    if (showChart && chartType === 'tradingview' && tradingViewRef.current) {
      // Clear previous widget
      tradingViewRef.current.innerHTML = '';
      
      // Create TradingView widget
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": "BTCUSDT",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "rgba(17, 24, 39, 1)",
        "gridColor": "rgba(255, 255, 255, 0.1)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_widget",
        "toolbar_bg": "#1f2937",
        "withdateranges": true,
        "allow_symbol_change": true
      });
      
      tradingViewRef.current.appendChild(script);
    }
  }, [showChart, chartType]);

  // Load DexScreener widget
  useEffect(() => {
    if (showChart && chartType === 'dexscreener' && dexScreenerRef.current) {
      // Clear previous content
      dexScreenerRef.current.innerHTML = '';
      
      // Create iframe for DexScreener
      const iframe = document.createElement('iframe');
      iframe.src = 'https://dexscreener.com/';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.title = 'DexScreener Chart';
      iframe.allow = 'fullscreen';
      
      dexScreenerRef.current.appendChild(iframe);
    }
  }, [showChart, chartType]);

  // Toggle chart visibility
  const toggleChart = () => {
    setShowChart(!showChart);
  };

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
    // Wallet configuration - using partial management for mobile Solana support
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
    // SDK configuration for better performance
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
    // Enhanced theme configuration
    theme: {
      palette: {
        mode: 'dark',
      },
      // Improved container styling
      container: {
        // Better border radius for modern look
        borderRadius: '16px',
        // Improved shadow for better depth
        boxShadow: '0 8px 32px 0 rgba(0, 212, 255, 0.1)',
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

      {/* Chart Toggle Button */}
      <div className="chart-toggle-container">
        <button 
          className="chart-toggle-button"
          onClick={toggleChart}
          title={showChart ? "Hide Charts" : "Show Charts"}
        >
          📈 {showChart ? "Hide Charts" : "Show Trading Charts"}
        </button>
      </div>

      {/* Chart Section */}
      {showChart && (
        <div className="chart-section">
          <div className="chart-header">
            <div className="chart-controls">
              <div className="chart-type-selector">
                <label className="chart-label">Chart Provider:</label>
                <select 
                  value={chartType} 
                  onChange={(e) => setChartType(e.target.value)}
                  className="token-select"
                >
                  <option value="tradingview">TradingView (Search Any Token)</option>
                  <option value="dexscreener">DexScreener (Search Any Token)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="chart-container">
            {chartType === 'tradingview' && (
              <div 
                ref={tradingViewRef}
                id="tradingview_widget" 
                style={{ height: '100%', width: '100%' }}
              />
            )}
            
            {chartType === 'dexscreener' && (
              <div 
                ref={dexScreenerRef}
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </div>
          
          <div className="chart-info">
            <p className="chart-note">
              💡 <strong>TradingView:</strong> Use the search bar in the chart to find any token (e.g., "BTCUSDT", "ETHUSDT", "SOLUSDT")
              <br />
              📊 <strong>DexScreener:</strong> Navigate directly on their platform to search and analyze any DEX token
            </p>
          </div>
        </div>
      )}
    
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