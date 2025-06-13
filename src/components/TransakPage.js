import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaCreditCard, FaShieldAlt, FaGlobe, FaLock, FaCheckCircle } from 'react-icons/fa';
import logger from '../utils/logger';
import './TransakPage.css';

// Import Transak SDK from NPM package
import { TransakConfig, Transak } from '@transak/transak-sdk';

// Transak configuration following official documentation
const getTransakConfig = () => {
  const apiKey = process.env.REACT_APP_TRANSAK_API_KEY;
  const environment = process.env.REACT_APP_TRANSAK_ENVIRONMENT || 'PRODUCTION';
  
  // Log configuration for debugging (without exposing full API key)
  logger.info('Transak Config:', {
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT_SET',
    environment,
    nodeEnv: process.env.NODE_ENV
  });

  return {
    apiKey: apiKey || 'demo-api-key', // Fallback for development
    environment: environment === 'STAGING' ? Transak.ENVIRONMENTS.STAGING : Transak.ENVIRONMENTS.PRODUCTION,
    containerId: 'transak-widget-container',
    // Revenue sharing configuration
    partnerOrderId: `aquads-${Date.now()}`,
    // Supported cryptocurrencies
    defaultCryptoCurrency: 'ETH',
    cryptoCurrencyList: 'BTC,ETH,USDC,USDT,BNB,MATIC,AVAX,SOL',
    // Supported fiat currencies
    defaultFiatCurrency: 'USD',
    fiatCurrency: 'USD,EUR,GBP,CAD,AUD',
    // UI customization
    themeColor: '00d4ff',
    colorMode: 'dark',
    hideMenu: true,
    hideExchangeScreen: false,
    // Network configurations
    networks: 'ethereum,polygon,bsc,avalanche,solana,arbitrum,optimism,base'
  };
};

const TransakPage = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const transakRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transakInstance, setTransakInstance] = useState(null);
  const [error, setError] = useState(null);

  // Initialize Transak widget using NPM package
  useEffect(() => {
    const initializeTransak = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const baseConfig = getTransakConfig();
        
        // Check if API key is properly configured
        if (!process.env.REACT_APP_TRANSAK_API_KEY || process.env.REACT_APP_TRANSAK_API_KEY === 'your-api-key-here') {
          throw new Error('INVALID_API_KEY');
        }

        const config = {
          ...baseConfig,
          // Add wallet address if user is connected
          walletAddress: currentUser?.wallet || '',
          // Revenue sharing
          partnerCustomerId: currentUser?.wallet || currentUser?.id || 'anonymous',
        };

        logger.info('Initializing Transak with config:', {
          ...config,
          apiKey: `${config.apiKey.substring(0, 8)}...` // Don't log full API key
        });

        const transak = new Transak(config);

        // Event listeners following official documentation
        Transak.on('*', (data) => {
          logger.info('Transak event:', data);
        });

        Transak.on(Transak.EVENTS.TRANSAK_WIDGET_INITIALISED, () => {
          logger.info('Transak widget initialized successfully');
          setIsLoading(false);
        });

        Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
          logger.info('Transak widget closed');
          // Navigate back to AquaSwap
          navigate('/aquaswap');
        });

        Transak.on(Transak.EVENTS.TRANSAK_ORDER_CREATED, (orderData) => {
          logger.info('Transak order created:', orderData);
          showNotification?.('Order created successfully! Complete your payment to receive crypto.', 'success');
        });

        Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (orderData) => {
          logger.info('Transak order successful:', orderData);
          showNotification?.('Payment successful! Your crypto will arrive shortly.', 'success');
          
          // Optional: Navigate to success page or back to swap
          setTimeout(() => {
            navigate('/aquaswap');
          }, 3000);
        });

        Transak.on(Transak.EVENTS.TRANSAK_ORDER_FAILED, (orderData) => {
          logger.error('Transak order failed:', orderData);
          showNotification?.('Payment failed. Please try again or contact support.', 'error');
        });

        Transak.on(Transak.EVENTS.TRANSAK_ORDER_CANCELLED, (orderData) => {
          logger.info('Transak order cancelled:', orderData);
          showNotification?.('Payment cancelled.', 'info');
        });

        // Initialize the widget
        transak.init();
        setTransakInstance(transak);

      } catch (err) {
        logger.error('Error initializing Transak:', err);
        
        if (err.message === 'INVALID_API_KEY') {
          setError('API key not configured. Please set up your Transak API key in the environment variables.');
        } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
          setError('Invalid API key or insufficient permissions. Please check your Transak API key configuration.');
        } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
          setError('Network connection issue. Please check your internet connection and try again.');
        } else {
          setError(`Failed to initialize payment system: ${err.message || 'Unknown error'}`);
        }
        
        setIsLoading(false);
      }
    };

    initializeTransak();
  }, [currentUser, navigate, showNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transakInstance) {
        try {
          transakInstance.cleanup();
        } catch (err) {
          logger.error('Error cleaning up Transak instance:', err);
        }
      }
    };
  }, [transakInstance]);

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasApiKey = process.env.REACT_APP_TRANSAK_API_KEY && process.env.REACT_APP_TRANSAK_API_KEY !== 'your-api-key-here';

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

      {/* Main content */}
      <div className="transak-content">
        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Loading secure payment system...</h3>
            <p>Connecting to Transak's encrypted servers</p>
            {isDevelopment && (
              <div className="dev-info">
                <p><strong>Development Mode:</strong></p>
                <p>API Key: {hasApiKey ? '✅ Configured' : '❌ Missing'}</p>
                <p>Environment: {process.env.REACT_APP_TRANSAK_ENVIRONMENT || 'PRODUCTION'}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>Unable to load payment system</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button 
                onClick={() => window.location.reload()} 
                className="retry-button"
              >
                Try Again
              </button>
              <Link to="/aquaswap" className="back-link">
                Return to AquaSwap
              </Link>
            </div>
            <div className="error-help">
              <p><strong>Troubleshooting:</strong></p>
              <ul>
                <li>If you're seeing 403 errors, your API key may be invalid or expired</li>
                <li>Make sure your Transak API key is properly configured in Netlify environment variables</li>
                <li>Check that your API key has the correct permissions for your domain</li>
                <li>Try disabling ad blockers or privacy extensions</li>
                <li>Contact Transak support if the issue persists</li>
              </ul>
              {isDevelopment && (
                <div className="dev-debug">
                  <p><strong>Debug Info:</strong></p>
                  <p>Environment: {process.env.NODE_ENV}</p>
                  <p>Transak Env: {process.env.REACT_APP_TRANSAK_ENVIRONMENT || 'PRODUCTION'}</p>
                  <p>API Key Set: {hasApiKey ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transak widget container */}
        <div 
          id="transak-widget-container" 
          className={`transak-widget-container ${isLoading ? 'hidden' : ''}`}
          ref={transakRef}
        />
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
            Your funds are protected by industry-leading security measures.
          </p>
          <p className="revenue-note">
            AquaSwap earns a small commission on successful purchases to support platform development.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransakPage; 