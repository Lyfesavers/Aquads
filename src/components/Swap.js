import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LiFiWidget, WidgetEvent } from '@lifi/widget';
import { createTheme, ThemeProvider } from '@mui/material';
import logger from '../utils/logger';
import './Swap.css';

// Constants
const FEE_PERCENTAGE = 0.5; // 0.5% fee
const FEE_WALLET = process.env.REACT_APP_FEE_WALLET || '6MtTEBWBXPTwbrVCqiHp4iTe84J8CfXHPspYYWTfBPG9'; // Default fee wallet

// Style to hide unwanted UI elements
const hideDuckHuntStyle = `
  <style>
    /* Basic targeting for duck hunt buttons */
    div[style*="position: fixed"][style*="bottom"][style*="right"],
    div[data-testid="duck-hunt-button"],
    [id*="duck-hunt"],
    [id*="start-duck"],
    [class*="duck-hunt"],
    .start-duck-hunt,
    #start-duck-hunt,
    #duck-hunt-button,
    .duck-hunt-button {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    
    /* Notification button fix */
    .notification-button {
      z-index: 5 !important;
    }
  </style>
`;

// Create a custom theme matching AquaSwap's aesthetic
const theme = createTheme({
  palette: {
    primary: {
      main: '#1D9BF0', // AquaSwap blue
    },
    secondary: {
      main: '#38E8C6', // Secondary teal color
    },
    background: {
      default: '#0A1929',
      paper: '#12263F',
    },
    text: {
      primary: '#ffffff',
      secondary: '#B0B7C3',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

const Swap = ({ currentUser, showNotification }) => {
  // Track widget events
  const [widgetEvents, setWidgetEvents] = useState([]);

  // Initialize on component mount
  useEffect(() => {
    // Style injection to hide unwanted UI elements
    const styleEl = document.createElement('div');
    styleEl.innerHTML = hideDuckHuntStyle;
    document.head.appendChild(styleEl);
    
    // Hide duck hunt buttons
    const intervalId = setInterval(() => {
      const hideSelectors = [
        '#duck-hunt-button',
        '#start-duck-hunt',
        '.duck-hunt-button',
        '.start-duck-hunt',
        '[data-testid="duck-hunt-button"]'
      ];
      
      hideSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            if (el) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
            }
          });
        } catch (e) {
          // Ignore errors
        }
      });
    }, 2000);
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);
  
  // Define LiFi widget configuration
  const widgetConfig = {
    integrator: 'AquaSwap', // Your platform name for tracking
    fee: FEE_PERCENTAGE, // 0.5% fee
    toAddress: FEE_WALLET, // Fee recipient
    containerStyle: {
      width: '100%',
      height: '640px',
      border: 'none',
      borderRadius: '16px',
    },
    theme: {
      palette: {
        primary: { main: '#1D9BF0' },
        secondary: { main: '#38E8C6' },
        background: {
          default: '#0A1929',
          paper: '#12263F',
        },
      },
    },
    appearance: 'dark',
    variant: 'expandable', // 'drawer', 'expandable', or 'wide'
    disableI18n: false,
    hiddenUI: [
      'appearance',
      'poweredBy', // Remove if you want to keep LiFi branding
    ],
    languages: {
      en: {
        title: 'AquaSwap',
        subtitle: 'Powered by LiFi',
        footer: `All swaps include a ${FEE_PERCENTAGE}% platform fee`,
      },
    },
  };

  // Handle widget events
  const handleWidgetEvents = (event) => {
    const { type, data } = event;
    
    setWidgetEvents((prev) => [...prev, event]);
    logger.info(`LiFi widget event: ${type}`, data);
    
    switch (type) {
      case WidgetEvent.RouteExecutionStarted:
        showNotification('Swap started!', 'info');
        break;
      case WidgetEvent.RouteExecutionCompleted:
        showNotification('Swap completed successfully!', 'success');
        break;
      case WidgetEvent.RouteExecutionFailed:
        showNotification(`Swap failed: ${data?.error?.message || 'Unknown error'}`, 'error');
        break;
      case WidgetEvent.RouteHighValueLoss:
        showNotification('Warning: High value loss detected on this route', 'warning');
        break;
      case WidgetEvent.WalletConnected:
        showNotification(`Wallet connected: ${data?.address?.slice(0, 6)}...${data?.address?.slice(-4)}`, 'success');
        break;
      case WidgetEvent.WalletDisconnected:
        showNotification('Wallet disconnected', 'info');
        break;
      default:
        // No notification for other events
        break;
    }
  };

  return (
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
            AquaSwap
          </h2>
        </div>
        
        <ThemeProvider theme={theme}>
          <LiFiWidget
            config={widgetConfig}
            onEvent={handleWidgetEvents}
            integrator="AquaSwap"
            fee={FEE_PERCENTAGE}
            toAddress={FEE_WALLET}
          />
        </ThemeProvider>
        
        <div className="powered-by">
          <div>Cross-chain swaps powered by <a href="https://li.fi" target="_blank" rel="noopener noreferrer">Li.Fi</a></div>
          <div className="fee-disclaimer">All swaps include a {FEE_PERCENTAGE}% platform fee</div>
        </div>
      </div>
    </div>
  );
};

Swap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default Swap;
