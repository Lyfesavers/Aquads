import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { LiFiWidget } from '@lifi/widget';
import logger from '../utils/logger';
import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.015; // 1.5% fee
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

  // LI.FI Widget configuration - force internal wallet management
  const widgetConfig = {
    variant: "compact",
    appearance: "dark",
    integrator: "aquaswap",
    // Force the widget to show internal wallet management even with WagmiProvider
    walletConfig: {
      usePartialWalletManagement: true,
    },
    fee: FEE_PERCENTAGE,
    feeConfig: {
      fee: FEE_PERCENTAGE,
      feeRecipient: ETH_FEE_WALLET || "0x0000000000000000000000000000000000000000",
      // Multi-chain fee recipients
      solanaFeeRecipient: SOLANA_FEE_WALLET,
      suiFeeRecipient: SUI_FEE_WALLET,
    },
    hiddenUI: ["poweredBy"],
    // Custom theme to match AquaSwap design
    theme: {
      container: {
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '20px',
        background: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        maxWidth: '520px',
      },
      palette: {
        mode: 'dark',
        primary: {
          main: '#00D4FF',
          light: '#4285F4',
          dark: '#0099CC',
        },
        secondary: {
          main: '#4285F4',
          light: '#66A3FF',
          dark: '#2563EB',
        },
        background: {
          default: '#111827',
          paper: 'rgba(31, 41, 55, 0.9)',
        },
        text: {
          primary: '#ffffff',
          secondary: '#9ca3af',
        },
        grey: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        success: {
          main: '#10b981',
        },
        error: {
          main: '#ef4444',
        },
        warning: {
          main: '#f59e0b',
        },
      },
      shape: {
        borderRadius: 12,
        borderRadiusSecondary: 16,
        borderRadiusTertiary: 20,
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { color: '#ffffff', fontWeight: 600 },
        h2: { color: '#ffffff', fontWeight: 600 },
        h3: { color: '#ffffff', fontWeight: 600 },
        h4: { color: '#ffffff', fontWeight: 600 },
        h5: { color: '#ffffff', fontWeight: 600 },
        h6: { color: '#ffffff', fontWeight: 600 },
        body1: { color: '#ffffff' },
        body2: { color: '#9ca3af' },
      },
      components: {
        MuiCard: {
          defaultProps: { 
            variant: 'outlined' 
          },
          styleOverrides: {
            root: {
              background: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              backdropFilter: 'blur(8px)',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 500,
              transition: 'all 0.3s ease',
            },
            contained: {
              background: 'linear-gradient(135deg, #00D4FF, #4285F4)',
              color: '#111827',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4285F4, #00D4FF)',
                boxShadow: '0 6px 16px rgba(0, 212, 255, 0.4)',
                transform: 'translateY(-1px)',
              },
            },
            outlined: {
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              color: '#00D4FF',
              '&:hover': {
                background: 'rgba(0, 212, 255, 0.2)',
                borderColor: 'rgba(0, 212, 255, 0.5)',
                boxShadow: '0 4px 12px rgba(0, 212, 255, 0.2)',
                transform: 'translateY(-1px)',
              },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: '#00D4FF',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '8px',
              '&:hover': {
                background: 'rgba(0, 212, 255, 0.2)',
                color: '#4285F4',
              },
            },
          },
        },
        MuiInputBase: {
          styleOverrides: {
            root: {
              background: 'rgba(17, 24, 39, 0.8)',
              color: '#ffffff',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: '8px',
              '&:hover': {
                borderColor: 'rgba(0, 212, 255, 0.4)',
              },
              '&.Mui-focused': {
                borderColor: '#00D4FF',
                boxShadow: '0 0 0 2px rgba(0, 212, 255, 0.2)',
              },
            },
          },
        },
        MuiAvatar: {
          styleOverrides: {
            root: {
              border: '2px solid rgba(0, 212, 255, 0.3)',
              boxShadow: '0 2px 8px rgba(0, 212, 255, 0.2)',
            },
          },
        },
        MuiTabs: {
          styleOverrides: {
            root: {
              background: 'rgba(17, 24, 39, 0.9)',
              borderRadius: '12px',
              border: '1px solid rgba(0, 212, 255, 0.2)',
            },
            indicator: {
              background: 'linear-gradient(90deg, #00D4FF, #4285F4)',
              height: '3px',
              borderRadius: '2px',
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              color: '#9ca3af',
              transition: 'all 0.3s ease',
              '&.Mui-selected': {
                color: '#00D4FF',
                background: 'rgba(0, 212, 255, 0.1)',
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              background: 'rgba(0, 212, 255, 0.1)',
              color: '#00D4FF',
              border: '1px solid rgba(0, 212, 255, 0.3)',
            },
          },
        },
        MuiLinearProgress: {
          styleOverrides: {
            root: {
              background: 'rgba(0, 212, 255, 0.1)',
            },
            bar: {
              background: 'linear-gradient(90deg, #00D4FF, #4285F4)',
            },
          },
        },
        MuiCircularProgress: {
          styleOverrides: {
            root: {
              color: '#00D4FF',
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              background: 'rgba(17, 24, 39, 0.95)',
              color: '#ffffff',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              backdropFilter: 'blur(8px)',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              background: 'rgba(31, 41, 55, 0.9)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              backdropFilter: 'blur(8px)',
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              background: 'rgba(31, 41, 55, 0.95)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 212, 255, 0.2)',
            },
          },
        },
      },
    },
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
    
      {/* LiFi Widget - Direct on page */}
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