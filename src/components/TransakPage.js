import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaCreditCard, FaShieldAlt, FaGlobe, FaLock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import logger from '../utils/logger';
import './TransakPage.css';

const TransakPage = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDevelopment, setIsDevelopment] = useState(false);

  useEffect(() => {
    // Check if we're in development mode
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
    setIsDevelopment(isLocalhost);
  }, []);

  // Build Transak iframe URL
  const buildTransakURL = () => {
    // TEMPORARY: Force staging until production API key is activated
    const environment = 'STAGING';
    
    // Use staging API key that you confirmed works
    const apiKey = 'af88b688-a2e5-4feb-a306-ac073bbfed63';
    
    const baseURL = environment === 'STAGING' 
      ? 'https://staging-global.transak.com' 
      : 'https://global.transak.com';

    const params = new URLSearchParams({
      apiKey: apiKey,
      environment: environment,
      defaultCryptoCurrency: 'ETH',
      cryptoCurrencyList: 'BTC,ETH,USDC,USDT,BNB,MATIC,AVAX,SOL',
      defaultFiatCurrency: 'USD',
      fiatCurrency: 'USD,EUR,GBP,CAD,AUD',
      themeColor: '00d4ff',
      colorMode: 'dark',
      hideMenu: 'true',
      hideExchangeScreen: 'false',
      networks: 'ethereum,polygon,bsc,avalanche,solana,arbitrum,optimism,base',
      partnerOrderId: `aquads-${Date.now()}`,
      walletAddress: currentUser?.wallet || '',
      partnerCustomerId: currentUser?.wallet || currentUser?.id || 'anonymous'
    });

    return `${baseURL}/?${params.toString()}`;
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    logger.info('Transak iframe loaded successfully');
  };

  const handleIframeError = () => {
    setError('domain_restriction');
    setIsLoading(false);
    logger.error('Transak iframe failed to load - likely domain restriction');
  };

  // Handle iframe load errors (403, domain restrictions)
  useEffect(() => {
    const handleMessage = (event) => {
      // Listen for iframe errors
      if (event.data && event.data.type === 'TRANSAK_WIDGET_ERROR') {
        setError('domain_restriction');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const renderDomainRestrictionError = () => (
    <div className="error-container domain-error">
      <div className="error-icon">
        <FaExclamationTriangle />
      </div>
      <h3>Domain Access Restricted</h3>
      <div className="error-details">
        <p>The Transak API key is currently restricted to specific domains.</p>
        
        {isDevelopment ? (
          <div className="dev-info">
            <h4>Development Mode Detected</h4>
            <p>You're running on localhost. The staging environment should work, but if you see this error:</p>
            <ol>
              <li>The staging API key may also have restrictions</li>
              <li>Try running on a different port</li>
              <li>Contact Transak support to allowlist localhost</li>
            </ol>
          </div>
        ) : (
          <div className="production-info">
            <h4>Production Environment</h4>
            <p>Current domain: <code>{window.location.hostname}</code></p>
            <p>To fix this issue:</p>
            <ol>
              <li>Contact Transak support at <a href="mailto:support@transak.com">support@transak.com</a></li>
              <li>Request to add your domain: <strong>{window.location.hostname}</strong></li>
              <li>Provide your API key: <code>8330ddd4-106a-41f0-8153-f2aa741cb18c</code></li>
              <li>Mention error code: <strong>T-INF-101</strong></li>
            </ol>
          </div>
        )}
        
        <div className="alternative-options">
          <h4>Alternative Options</h4>
          <p>While waiting for domain approval, users can:</p>
          <ul>
            <li>Visit <a href="https://global.transak.com" target="_blank" rel="noopener noreferrer">Transak directly</a></li>
            <li>Use other crypto purchase methods</li>
            <li>Contact support for assistance</li>
          </ul>
        </div>
      </div>
      
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

      {/* Main content */}
      <div className="transak-content">
        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Loading secure payment system...</h3>
            <p>Connecting to Transak's {isDevelopment ? 'staging' : 'production'} servers</p>
          </div>
        )}

        {error === 'domain_restriction' && renderDomainRestrictionError()}

        {error && error !== 'domain_restriction' && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>Unable to load payment system</h3>
            <p>{error}</p>
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
        )}

        {/* Transak iframe */}
        {!error && (
          <div className={`transak-iframe-container ${isLoading ? 'hidden' : ''}`}>
            <iframe
              src={buildTransakURL()}
              title="Transak Widget"
              width="100%"
              height="650"
              frameBorder="0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              allow="camera; microphone; payment"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            />
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