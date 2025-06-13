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

  // Build Transak double iframe URL (outer iframe)
  const buildTransakDoubleIframeURL = () => {
    // TEMPORARY: Force staging until production API key is activated
    const environment = 'STAGING';
    
    // Use staging API key that you confirmed works
    const apiKey = 'af88b688-a2e5-4feb-a306-ac073bbfed63';
    
    // Create the outer iframe URL that will contain the inner Transak iframe
    // This follows Transak's double iframe pattern for better isolation
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

    // Create a data URL for the outer iframe HTML
    const outerIframeHTML = `
      <!DOCTYPE html>
      <html lang="en" style="height: 100%; margin: 0; padding: 0;">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Transak Widget</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              height: 100vh;
              background: #0f1419;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .transak-container {
              width: 100%;
              height: 100%;
              max-width: 500px;
              max-height: 700px;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
            }
            .transak-inner-iframe {
              width: 100%;
              height: 100%;
              border: none;
              border-radius: 12px;
            }
            .loading {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              color: #00d4ff;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(0, 212, 255, 0.3);
              border-top: 3px solid #00d4ff;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="transak-container">
            <div id="loading" class="loading">
              <div class="spinner"></div>
              <p>Loading secure payment system...</p>
            </div>
            <iframe
              id="transakInnerIframe"
              class="transak-inner-iframe"
              src="${environment === 'STAGING' ? 'https://global-stg.transak.com' : 'https://global.transak.com'}/?${params.toString()}"
              allow="camera;microphone;payment"
              style="display: none;"
            ></iframe>
          </div>
          
          <script>
            (function() {
              const loading = document.getElementById('loading');
              const iframe = document.getElementById('transakInnerIframe');
              
              // Handle iframe load
              iframe.onload = function() {
                loading.style.display = 'none';
                iframe.style.display = 'block';
                
                // Notify parent window that iframe loaded
                window.parent.postMessage({
                  type: 'TRANSAK_IFRAME_LOADED'
                }, '*');
              };
              
              // Handle iframe errors
              iframe.onerror = function() {
                loading.innerHTML = '<div class="spinner"></div><p>Unable to load payment system</p>';
                
                // Notify parent window of error
                window.parent.postMessage({
                  type: 'TRANSAK_IFRAME_ERROR',
                  error: 'Failed to load Transak widget'
                }, '*');
              };
              
              // Listen for messages from the inner Transak iframe
              window.addEventListener('message', function(event) {
                // Forward Transak events to the parent window
                if (event.data && event.data.event_id) {
                  window.parent.postMessage({
                    type: 'TRANSAK_EVENT',
                    event_id: event.data.event_id,
                    data: event.data.data
                  }, '*');
                }
                
                // Handle New Relic errors gracefully
                if (event.data && event.data.error && 
                    (event.data.error.includes('newrelic') || 
                     event.data.error.includes('ChunkLoadError') ||
                     event.data.error.includes('ERR_BLOCKED_BY_CLIENT'))) {
                  console.warn('Third-party analytics blocked - this won\\'t affect functionality');
                  // Don't propagate these errors to parent
                  return;
                }
              });
              
              // Global error handler for New Relic issues
              window.addEventListener('error', function(event) {
                if (event.error && event.error.message && 
                    (event.error.message.includes('newrelic') || 
                     event.error.message.includes('ChunkLoadError'))) {
                  console.warn('Analytics script blocked - this is normal');
                  event.preventDefault();
                  return false;
                }
              });
            })();
          </script>
        </body>
      </html>
    `;

    return `data:text/html;charset=utf-8,${encodeURIComponent(outerIframeHTML)}`;
  };

  const handleIframeLoad = () => {
    // Initial load of outer iframe - inner iframe will send its own load message
    logger.info('Transak outer iframe loaded successfully');
  };

  const handleIframeError = () => {
    setError('iframe_load_error');
    setIsLoading(false);
    logger.error('Transak outer iframe failed to load');
  };

  // Handle messages from the double iframe setup
  useEffect(() => {
    const handleMessage = (event) => {
      // Handle messages from our outer iframe
      if (event.data && event.data.type === 'TRANSAK_IFRAME_LOADED') {
        setIsLoading(false);
        logger.info('Transak inner iframe loaded successfully');
      }
      
      if (event.data && event.data.type === 'TRANSAK_IFRAME_ERROR') {
        setError('transak_load_error');
        setIsLoading(false);
        logger.error('Transak inner iframe failed to load');
      }
      
      // Handle Transak events
      if (event.data && event.data.type === 'TRANSAK_EVENT') {
        logger.info('Transak event:', event.data.event_id, event.data.data);
        
        // Handle successful order
        if (event.data.event_id === 'TRANSAK_ORDER_SUCCESSFUL') {
          showNotification('Crypto purchase completed successfully!', 'success');
          // Optionally navigate back to AquaSwap after successful purchase
          setTimeout(() => {
            navigate('/aquaswap');
          }, 3000);
        }
      }
      
      // Suppress New Relic related errors (these are handled in the outer iframe)
      if (event.data && event.data.error && 
          (event.data.error.includes('newrelic') || 
           event.data.error.includes('ChunkLoadError') ||
           event.data.error.includes('ERR_BLOCKED_BY_CLIENT'))) {
        // These errors are already handled in the outer iframe
        return;
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate, showNotification]);

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

      {/* Improved notice about script blocking */}
      <div className="ad-blocker-notice">
        <p>
          <strong>Enhanced Security:</strong> Using Transak's recommended double-iframe method for better isolation and security. 
          Any console warnings about blocked scripts are normal and won't affect functionality.
        </p>
      </div>

      {/* Main content */}
      <div className="transak-content">
        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Loading secure payment system...</h3>
            <p>Initializing Transak's {isDevelopment ? 'staging' : 'production'} environment with enhanced security</p>
          </div>
        )}

        {error === 'domain_restriction' && renderDomainRestrictionError()}

        {error && error !== 'domain_restriction' && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>Unable to load payment system</h3>
            <p>{error === 'iframe_load_error' ? 'Failed to load the payment interface' : 'An error occurred while loading Transak'}</p>
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

        {/* Transak double iframe - Enhanced with better isolation */}
        {!error && (
          <div className={`transak-iframe-container ${isLoading ? 'hidden' : ''}`}>
            <iframe
              src={buildTransakDoubleIframeURL()}
              title="Transak Payment Widget"
              width="100%"
              height="700"
              frameBorder="0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              allow="camera;microphone;payment"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-downloads"
              referrerPolicy="strict-origin-when-cross-origin"
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
            Using enhanced double-iframe integration for maximum security and compatibility.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransakPage; 