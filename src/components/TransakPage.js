import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaCreditCard, FaShieldAlt, FaGlobe, FaLock, FaCheckCircle } from 'react-icons/fa';
import logger from '../utils/logger';
import './TransakPage.css';

const TransakPage = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Build Transak iframe URL
  const buildTransakURL = () => {
    const apiKey = process.env.REACT_APP_TRANSAK_API_KEY || 'your-api-key-here';
    const environment = process.env.REACT_APP_TRANSAK_ENVIRONMENT || 'PRODUCTION';
    
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
    setError('Failed to load Transak payment system');
    setIsLoading(false);
    logger.error('Transak iframe failed to load');
  };

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
          </div>
        )}

        {error && (
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