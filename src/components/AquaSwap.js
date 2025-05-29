import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { LiFiWidget, WidgetConfig } from '@lifi/widget';
import logger from '../utils/logger';
import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.025; // 2.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

const AquaSwap = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize on component mount
  useEffect(() => {
    // Add class to body to enable scrolling
    document.body.classList.add('aquaswap-page');
    
    // Load widget after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 100);

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('aquaswap-page');
    };
  }, []);

  // LI.FI Widget configuration with custom theme matching website colors
  const widgetConfig = {
    variant: "expandable",
    appearance: "dark",
    theme: {
      colorSchemes: {
        light: {
          palette: {
            primary: {
              main: "#00D4FF"
            },
            secondary: {
              main: "#4285F4"
            },
            background: {
              default: "#FFFFFF",
              paper: "#F8F9FA"
            },
            text: {
              primary: "#1F2937",
              secondary: "#6B7280"
            }
          }
        },
        dark: {
          palette: {
            primary: {
              main: "#00D4FF"
            },
            secondary: {
              main: "#4285F4"
            },
            background: {
              default: "#111827",
              paper: "#1F2937"
            },
            text: {
              primary: "#FFFFFF",
              secondary: "#00D4FF"
            }
          }
        }
      },
      typography: {
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      },
      container: {
        boxShadow: "0px 20px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 212, 255, 0.1)",
        borderRadius: "12px",
        background: "rgba(31, 41, 55, 0.9)",
        border: "1px solid rgba(0, 212, 255, 0.2)"
      }
    },
    integrator: "aquaswap",
    fee: FEE_PERCENTAGE,
    feeConfig: {
      fee: FEE_PERCENTAGE,
      feeRecipient: ETH_FEE_WALLET,
    },
    hiddenUI: ["poweredBy"],
    buildUrl: true,
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
    <div className="aquaswap-container">
      <div className="aquaswap-card">
        <div className="aquaswap-header">
          <div className="aquaswap-nav">
            <button 
              className="back-to-main-button"
              onClick={() => navigate('/')}
              title="Back to Main Page"
            >
              ← Back to Main
            </button>
          </div>
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
      
        <div className="lifi-container">
          <LiFiWidget integrator="aquaswap" config={widgetConfig} />
        </div>

        <div className="powered-by">
          <div className="fee-disclaimer">
            <p>✨ AquaSwap</p>
          </div>
          <p>
            Swap and bridge across 38+ blockchains with the best rates and lowest fees.
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