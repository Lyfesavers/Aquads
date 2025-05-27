import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import logger from '../utils/logger';
import './Swap.css';

// Constants for Li.Fi integration
const FEE_PERCENTAGE = 0.025; // 2.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

const LiFiSwap = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const widgetContainerRef = useRef(null);

  // Initialize component
  useEffect(() => {
    // Simple loading delay to show the interface
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // Direct Li.Fi widget iframe with proper swap interface
  const renderLiFiWidget = () => {
    // Use the correct Li.Fi widget URL that opens swap interface directly
    const lifiUrl = `https://widget.li.fi/?integrator=aquaswap&theme=dark&variant=default&fee=${FEE_PERCENTAGE}&toAddress=${ETH_FEE_WALLET}&appearance=dark&hiddenUI=poweredBy&fromChain=1&toChain=137&fromToken=0x0000000000000000000000000000000000000000&toToken=0x0000000000000000000000000000000000000000`;

    return (
      <div className="iframe-container">
        <iframe
          src={lifiUrl}
          className="lifi-iframe"
          title="Li.Fi Swap Widget"
          allow="clipboard-read; clipboard-write"
          style={{
            width: '100%',
            height: '600px',
            border: 'none',
            borderRadius: '12px',
          }}
        />
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen overflow-y-auto text-white">
        {/* Fixed Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
          <div className="tech-lines"></div>
          <div className="tech-dots"></div>
        </div>

        {/* Fixed Navigation */}
        <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                  AQUADS
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  to="/" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10">
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
                  AquaSwap Cross-Chain
                </h2>
              </div>
              <div className="swap-body">
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading cross-chain swap interface...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen overflow-y-auto text-white">
        {/* Fixed Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
          <div className="tech-lines"></div>
          <div className="tech-dots"></div>
        </div>

        {/* Fixed Navigation */}
        <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                  AQUADS
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  to="/" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10">
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
                  AquaSwap Cross-Chain
                </h2>
              </div>
              <div className="swap-body">
                <div className="error-container">
                  <p className="error-message">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="retry-button"
                  >
                    Retry
                  </button>
                </div>
                {/* Fallback to iframe */}
                {renderLiFiWidget()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Li.Fi swap interface
  return (
    <div className="h-screen overflow-y-auto text-white">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Fixed Navigation */}
      <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                AQUADS
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10">
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
                AquaSwap Cross-Chain
              </h2>
            </div>
          
            {/* Li.Fi Widget Container */}
            <div className="lifi-widget-wrapper">
              {renderLiFiWidget()}
            </div>
            
            <div className="powered-by">
              <div className="fee-disclaimer">
                Cross-chain swaps powered by AquaSwap
              </div>
              <a 
                href="https://aquads.xyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Learn more about AquaSwap
              </a>
            </div>
          </div>
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