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

// Popular token examples for quick access
const POPULAR_TOKEN_EXAMPLES = [
  { name: 'PEPE', address: '0xa43fe16908251ee70ef74718545e4fe6c5ccec9f', chain: 'ether' },
  { name: 'SHIB', address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', chain: 'ether' },
  { name: 'FLOKI', address: '0xcf0c122c6b73ff809c693db761e7baebe62b6a2e', chain: 'ether' },
  { name: 'DOGE', address: '0x4206931337dc273a630d328da6441786bfad668f', chain: 'ether' }
];

const AquaSwap = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const [chartProvider, setChartProvider] = useState('tradingview');
  const [tokenSearch, setTokenSearch] = useState('');
  const [selectedChain, setSelectedChain] = useState('ether');
  const tradingViewRef = useRef(null);
  const dexToolsRef = useRef(null);

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
    if (chartProvider === 'tradingview' && tradingViewRef.current) {
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
  }, [chartProvider]);

  // Load DexTools widget using official implementation
  useEffect(() => {
    if (chartProvider === 'dextools' && dexToolsRef.current && tokenSearch.trim()) {
      // Clear previous widget
      dexToolsRef.current.innerHTML = '';
      
      // Create DexTools iframe using official widget format
      const iframe = document.createElement('iframe');
      iframe.id = 'dextools-widget';
      iframe.title = 'DexTools Trading Chart';
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      // Build DexTools widget URL according to their documentation
      const widgetUrl = `https://www.dextools.io/widget-chart/en/${selectedChain}/pe-light/${tokenSearch.trim()}?theme=dark&chartType=1&chartResolution=15&drawingToolbars=false&tvPlatformColor=111827&tvPaneColor=1f2937&headerColor=111827`;
      
      iframe.src = widgetUrl;
      iframe.allow = 'fullscreen';
      
      dexToolsRef.current.appendChild(iframe);
    } else if (chartProvider === 'dextools' && dexToolsRef.current && !tokenSearch.trim()) {
      // Show placeholder when no search term
      dexToolsRef.current.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; color: #9ca3af;">
          <div style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
          <h3 style="color: #ffffff; margin: 0 0 8px 0;">Search Any Token</h3>
          <p style="margin: 0; text-align: center; line-height: 1.5;">Enter a contract address above to view any token's chart</p>
        </div>
      `;
    }
  }, [chartProvider, tokenSearch, selectedChain]);

  // Handle popular token selection
  const handlePopularTokenClick = (token) => {
    setTokenSearch(token.address);
    setSelectedChain(token.chain);
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
      {/* Header Section */}
      <div className="header-section">
        {/* Back button */}
        <button 
          className="back-to-main-button"
          onClick={() => navigate('/')}
          title="Back to Main Page"
        >
          ← Back to Main
        </button>

        {/* Banner Display */}
        <BannerDisplay />

        {/* Title */}
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
      </div>

      {/* Main Trading Interface */}
      <div className="trading-interface with-charts">
        {/* Left Side - Swap Widget */}
        <div className="swap-section">
          <div className="lifi-widget">
            <LiFiWidget integrator="aquaswap" config={widgetConfig} />
          </div>
        </div>

        {/* Right Side - Charts */}
        <div className="chart-section">
          <div className="chart-header">
            <h3 className="chart-title">Professional Trading Charts</h3>
            <div className="chart-provider-selector">
              <button 
                className={`provider-btn ${chartProvider === 'tradingview' ? 'active' : ''}`}
                onClick={() => setChartProvider('tradingview')}
              >
                📊 TradingView
                <span className="provider-desc">Major Tokens</span>
              </button>
              <button 
                className={`provider-btn ${chartProvider === 'dextools' ? 'active' : ''}`}
                onClick={() => setChartProvider('dextools')}
              >
                🚀 DexTools
                <span className="provider-desc">Search Any Token</span>
              </button>
            </div>
            
            {/* DexTools search interface */}
            {chartProvider === 'dextools' && (
              <div className="dextools-search-section">
                <div className="search-controls">
                  <div className="chain-selector">
                    <label className="search-label">Chain:</label>
                    <select 
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className="chain-select"
                    >
                      <option value="ether">Ethereum</option>
                      <option value="bnb">BNB Chain</option>
                      <option value="polygon">Polygon</option>
                      <option value="solana">Solana</option>
                      <option value="arbitrum">Arbitrum</option>
                      <option value="optimism">Optimism</option>
                      <option value="base">Base</option>
                    </select>
                  </div>
                  
                  <div className="token-search">
                    <label className="search-label">Contract Address:</label>
                    <input
                      type="text"
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      placeholder="Enter token contract address (e.g., 0xa43fe16908251ee70ef74718545e4fe6c5ccec9f)"
                      className="token-search-input"
                    />
                  </div>
                </div>
                
                <div className="popular-tokens">
                  <span className="popular-label">Popular:</span>
                  {POPULAR_TOKEN_EXAMPLES.map((token, index) => (
                    <button
                      key={index}
                      onClick={() => handlePopularTokenClick(token)}
                      className="popular-token-btn"
                      title={`${token.name}: ${token.address}`}
                    >
                      {token.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="chart-container">
            {chartProvider === 'tradingview' && (
              <div 
                ref={tradingViewRef}
                id="tradingview_widget" 
                style={{ height: '100%', width: '100%' }}
              />
            )}
            
            {chartProvider === 'dextools' && (
              <div 
                ref={dexToolsRef}
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </div>
          
          <div className="chart-info">
            <p className="chart-note">
              {chartProvider === 'tradingview' ? (
                <>
                  💡 <strong>TradingView (Major Tokens):</strong> Perfect for BTC, ETH, BNB, SOL and other established cryptocurrencies
                  <br />
                  📊 Use the search bar in the chart to find tokens like "BTCUSDT", "ETHUSDT", "SOLUSDT"
                </>
              ) : (
                <>
                  🚀 <strong>DexTools (Any Token):</strong> Enter any token's contract address to view its chart and trading data
                  <br />
                  📈 Find contract addresses on CoinGecko, Etherscan, or the token's official website
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
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