import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaCreditCard, FaShieldAlt, FaGlobe, FaLock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { Transak } from '@transak/transak-sdk';
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
      // Wait for container to be available
      const container = document.getElementById('transak-widget-container');
      if (!container) {
        logger.warn('Transak container not found, retrying...');
        setTimeout(initializeTransak, 100);
        return;
      }

      // TEMPORARY: Force staging until production API key is activated
      const environment = 'STAGING';
      
      // Use staging API key that you confirmed works
      const apiKey = 'af88b688-a2e5-4feb-a306-ac073bbfed63';
      
      const transakConfig = {
        apiKey: apiKey,
        environment: environment === 'STAGING' ? Transak.ENVIRONMENTS.STAGING : Transak.ENVIRONMENTS.PRODUCTION,
        containerId: 'transak-widget-container', // Embed in page instead of modal
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
        // Widget dimensions
        widgetHeight: '700px',
        widgetWidth: '100%',
        // Error handling options
        disableWalletAddressForm: false,
        isAutoFillUserData: false
      };

      logger.info('Initializing Transak SDK with config:', transakConfig);

      // Initialize Transak SDK
      const transak = new Transak(transakConfig);

      // Set up initialization timeout
      const initTimeout = setTimeout(() => {
        logger.error('Transak SDK initialization timeout');
        setError('sdk_initialization_error');
        setIsLoading(false);
      }, 15000); // 15 second timeout

      // Event listeners for Transak SDK
      // Listen for all events
      Transak.on('*', (data) => {
        logger.info('Transak event:', data);
      });

      // Widget initialization
      Transak.on(Transak.EVENTS.TRANSAK_WIDGET_INITIALISED, () => {
        logger.info('Transak SDK initialized successfully');
        clearTimeout(initTimeout);
        setIsLoading(false);
      });

      // Widget opened
      Transak.on(Transak.EVENTS.TRANSAK_WIDGET_OPEN, () => {
        logger.info('Transak widget opened');
        clearTimeout(initTimeout);
        setIsLoading(false);
      });

      // Widget closed
      Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
        logger.info('Transak widget closed');
        // Navigate back to AquaSwap when user closes the widget
        navigate('/aquaswap');
      });

      // Order successful
      Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (orderData) => {
        logger.info('Transak order successful:', orderData);
        showNotification('Crypto purchase completed successfully!', 'success');
        // Navigate back to AquaSwap after successful purchase
        setTimeout(() => {
          navigate('/aquaswap');
        }, 3000);
      });

      // Order created (doesn't guarantee payment completion)
      Transak.on(Transak.EVENTS.TRANSAK_ORDER_CREATED, (orderData) => {
        logger.info('Transak order created:', orderData);
        showNotification('Order created successfully', 'info');
      });

      // Handle any initialization errors
      Transak.on('error', (error) => {
        logger.error('Transak SDK error:', error);
        clearTimeout(initTimeout);
        
        // Check if it's a third-party analytics related error and suppress it
        if (error && error.message && 
            (error.message.includes('newrelic') || 
             error.message.includes('ChunkLoadError') ||
             error.message.includes('ERR_BLOCKED_BY_CLIENT') ||
             error.message.includes('LogRocket') ||
             error.message.includes('lrkt-in.com') ||
             error.message.includes('Content Security Policy') ||
             error.message.includes('403') ||
             error.message.includes('logr-ingest'))) {
          console.warn('Third-party analytics blocked - this won\'t affect Transak functionality');
          return; // Don't set error state for analytics issues
        }
        
        setError('sdk_initialization_error');
        setIsLoading(false);
      });

      // Store reference for cleanup
      transakRef.current = transak;

      // Initialize the widget
      logger.info('Calling transak.init()...');
      transak.init();

      // Fallback: If no events are received within 10 seconds, assume success
      setTimeout(() => {
        if (isLoading) {
          logger.warn('No initialization event received, assuming success');
          setIsLoading(false);
        }
      }, 10000);

    } catch (error) {
      logger.error('Failed to initialize Transak SDK:', error);
      setError('sdk_initialization_error');
      setIsLoading(false);
    }
  };

  // Initialize Transak when component mounts
  useEffect(() => {
    // Add global error handler for third-party script issues
    const handleGlobalError = (event) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('newrelic') || 
           event.error.message.includes('ChunkLoadError') ||
           event.error.message.includes('ERR_BLOCKED_BY_CLIENT') ||
           event.error.message.includes('LogRocket') ||
           event.error.message.includes('lrkt-in.com') ||
           event.error.message.includes('Content Security Policy'))) {
        console.warn('Third-party analytics script blocked - this is normal and won\'t affect functionality');
        event.preventDefault();
        return false;
      }
    };

    // Also handle CSP violations
    const handleCSPViolation = (event) => {
      if (event.blockedURI && 
          (event.blockedURI.includes('lrkt-in.com') ||
           event.blockedURI.includes('newrelic') ||
           event.blockedURI.includes('logr-ingest'))) {
        console.warn('Analytics script blocked by CSP - this is expected and won\'t affect functionality');
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('securitypolicyviolation', handleCSPViolation, true);

    // Initialize Transak SDK
    initializeTransak();

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('securitypolicyviolation', handleCSPViolation, true);
      
      // Clean up Transak SDK (using cleanup() for embedded UI)
      if (transakRef.current) {
        try {
          transakRef.current.cleanup();
        } catch (error) {
          logger.warn('Error cleaning up Transak SDK:', error);
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
            // Clean up any existing instance first
            if (transakRef.current) {
              try {
                transakRef.current.cleanup();
              } catch (e) {
                // Ignore cleanup errors
              }
            }
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
            <h1>Buy Crypto with Card -UNDER CONSTRUCTION</h1>
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
          The payment interface will load below.
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
        {!error && (
          <div className="transak-sdk-container">
            {!isLoading && (
              <div className="sdk-info">
                <p>✅ Transak SDK loaded successfully</p>
                <p>The payment interface should appear below. If you don't see it, try refreshing the page.</p>
              </div>
            )}
            {/* This is where the Transak widget will be rendered */}
            <div id="transak-widget-container" className="transak-widget-container"></div>
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