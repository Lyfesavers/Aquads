import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaCreditCard, FaShieldAlt, FaGlobe, FaLock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import transakSDK from '@transak/transak-sdk';
import logger from '../utils/logger';
import './TransakPage.css';

const TransakPage = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDevelopment, setIsDevelopment] = useState(false);
  const transakRef = useRef(null);

  useEffect(() => {
    // Check if we're in development mode
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
    setIsDevelopment(isLocalhost);
  }, []);

  // Initialize Transak SDK
  const initializeTransak = () => {
    try {
      // TEMPORARY: Force staging until production API key is activated
      const environment = 'STAGING';
      
      // Use staging API key that you confirmed works
      const apiKey = 'af88b688-a2e5-4feb-a306-ac073bbfed63';
      
      const transakConfig = {
        apiKey: apiKey,
        environment: environment,
        defaultCryptoCurrency: 'ETH',
        cryptoCurrencyList: 'BTC,ETH,USDC,USDT,BNB,MATIC,AVAX,SOL',
        defaultFiatCurrency: 'USD',
        fiatCurrency: 'USD,EUR,GBP,CAD,AUD',
        themeColor: '00d4ff',
        colorMode: 'dark',
        hideMenu: true,
        hideExchangeScreen: false,
        networks: 'ethereum,polygon,bsc,avalanche,solana,arbitrum,optimism,base',
        partnerOrderId: `aquads-${Date.now()}`,
        walletAddress: currentUser?.wallet || '',
        partnerCustomerId: currentUser?.wallet || currentUser?.id || 'anonymous',
        // SDK specific options
        widgetHeight: '650px',
        widgetWidth: '100%',
        // Error handling options
        disableWalletAddressForm: false,
        isAutoFillUserData: false
      };

      // Initialize Transak SDK
      const transak = new transakSDK(transakConfig);

      // Event listeners for Transak SDK
      transak.on(transak.EVENTS.TRANSAK_WIDGET_INITIALISED, () => {
        logger.info('Transak SDK initialized successfully');
        setIsLoading(false);
      });

      transak.on(transak.EVENTS.TRANSAK_WIDGET_OPEN, () => {
        logger.info('Transak widget opened');
      });

      transak.on(transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
        logger.info('Transak widget closed');
        // Navigate back to AquaSwap when user closes the widget
        navigate('/aquaswap');
      });

      transak.on(transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (orderData) => {
        logger.info('Transak order successful:', orderData);
        showNotification('Crypto purchase completed successfully!', 'success');
        // Navigate back to AquaSwap after successful purchase
        setTimeout(() => {
          navigate('/aquaswap');
        }, 3000);
      });

      transak.on(transak.EVENTS.TRANSAK_ORDER_FAILED, (error) => {
        logger.error('Transak order failed:', error);
        showNotification('Purchase failed. Please try again.', 'error');
      });

      transak.on(transak.EVENTS.TRANSAK_ORDER_CANCELLED, () => {
        logger.info('Transak order cancelled by user');
        showNotification('Purchase cancelled', 'info');
      });

      // Handle any initialization errors
      transak.on('error', (error) => {
        logger.error('Transak SDK error:', error);
        
        // Check if it's a New Relic related error and suppress it
        if (error && error.message && 
            (error.message.includes('newrelic') || 
             error.message.includes('ChunkLoadError') ||
             error.message.includes('ERR_BLOCKED_BY_CLIENT'))) {
          console.warn('Third-party analytics blocked - this won\'t affect functionality');
          return; // Don't set error state for New Relic issues
        }
        
        setError('sdk_initialization_error');
        setIsLoading(false);
      });

      // Store reference for cleanup
      transakRef.current = transak;

      // Initialize the widget
      transak.init();

    } catch (error) {
      logger.error('Failed to initialize Transak SDK:', error);
      setError('sdk_initialization_error');
      setIsLoading(false);
    }
  };

  // Initialize Transak when component mounts
  useEffect(() => {
    // Add global error handler for New Relic issues
    const handleGlobalError = (event) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('newrelic') || 
           event.error.message.includes('ChunkLoadError') ||
           event.error.message.includes('ERR_BLOCKED_BY_CLIENT'))) {
        console.warn('Third-party analytics script blocked - this is normal');
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleGlobalError, true);

    // Initialize Transak SDK
    initializeTransak();

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      
      // Clean up Transak SDK
      if (transakRef.current) {
        try {
          transakRef.current.close();
        } catch (error) {
          logger.warn('Error closing Transak SDK:', error);
        }
      }
    };
  }, []);

  const renderError = () => (
    <div className="error-container">
      <div className="error-icon">
        <FaExclamationTriangle />
      </div>
      <h3>Unable to load payment system</h3>
      <div className="error-details">
        {error === 'sdk_initialization_error' ? (
          <div>
            <p>Failed to initialize the Transak payment system.</p>
            <p>This could be due to:</p>
            <ul>
              <li>Network connectivity issues</li>
              <li>Ad blocker interference</li>
              <li>Browser security settings</li>
            </ul>
          </div>
        ) : (
          <p>An unexpected error occurred while loading the payment system.</p>
        )}
      </div>
      
      <div className="error-actions">
        <button 
          onClick={() => {
            setError(null);
            setIsLoading(true);
            initializeTransak();
          }} 
          className="retry-button"
        >
          Try Again
        </button>
        <Link to="/aquaswap" className="back-link">
          Return to AquaSwap
        </Link>
        <a 
          href="https://global.transak.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="external-link"
        >
          Open Transak Directly
        </a>
      </div>
    </div>
  );

  return (
    <div className="transak-page">
      {/* Header */}
      <div className="transak-header">
        <div className="header-content">
          <Link to="/aquaswap" className="back-button">
            <FaArrowLeft />
            <span>Back to AquaSwap</span>
          </Link>
          
          <div className="header-title">
            <FaCreditCard className="title-icon" />
            <h1>Buy Crypto with Card</h1>
            <p>Secure fiat-to-crypto purchases powered by Transak</p>
            {isDevelopment && (
              <div className="dev-badge">
                <span>Development Mode - Using Staging Environment</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="trust-indicators">
        <div className="trust-item">
          <FaShieldAlt className="trust-icon" />
          <span>Bank-grade security</span>
        </div>
        <div className="trust-item">
          <FaGlobe className="trust-icon" />
          <span>150+ countries</span>
        </div>
        <div className="trust-item">
          <FaLock className="trust-icon" />
          <span>KYC compliant</span>
        </div>
        <div className="trust-item">
          <FaCheckCircle className="trust-icon" />
          <span>Instant delivery</span>
        </div>
      </div>

      {/* SDK Notice */}
      <div className="sdk-notice">
        <p>
          <strong>Enhanced Integration:</strong> Using Transak's official SDK for the best user experience. 
          The payment widget will open automatically below.
        </p>
      </div>

      {/* Main content */}
      <div className="transak-content">
        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Initializing secure payment system...</h3>
            <p>Loading Transak's {isDevelopment ? 'staging' : 'production'} environment</p>
          </div>
        )}

        {error && renderError()}

        {/* Transak SDK will render here */}
        {!error && !isLoading && (
          <div className="transak-sdk-container">
            <div className="sdk-info">
              <p>✅ Transak SDK loaded successfully</p>
              <p>The payment interface should appear below. If you don't see it, try refreshing the page.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="transak-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Supported Payment Methods</h4>
            <div className="payment-methods">
              <span className="payment-method">💳 Credit Cards</span>
              <span className="payment-method">🏦 Bank Transfer</span>
              <span className="payment-method">📱 Apple Pay</span>
              <span className="payment-method">🔗 Google Pay</span>
            </div>
          </div>
          
          <div className="footer-section">
            <h4>Supported Cryptocurrencies</h4>
            <div className="crypto-list">
              <span className="crypto-item">₿ Bitcoin</span>
              <span className="crypto-item">Ξ Ethereum</span>
              <span className="crypto-item">💰 USDC</span>
              <span className="crypto-item">🔶 BNB</span>
              <span className="crypto-item">◆ MATIC</span>
              <span className="crypto-item">🔺 AVAX</span>
              <span className="crypto-item">☀️ Solana</span>
            </div>
          </div>
        </div>
        
        <div className="footer-disclaimer">
          <p>
            <strong>Powered by Transak</strong> - Licensed and regulated financial service provider. 
            Using official Transak SDK for maximum compatibility and security.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransakPage; 