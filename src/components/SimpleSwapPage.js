import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import './SimpleSwapPage.css';

const SimpleSwapPage = () => {
  // SimpleSwap Affiliate ID - required for widget tracking
  const affiliateId = process.env.REACT_APP_SIMPLESWAP_AFFILIATE_ID || 'dd5cfd7e-3dd4-4d7b-b017-f12c4291d28a';
  
  // SimpleSwap API Key - enables fiat-to-crypto features
  const apiKey = process.env.REACT_APP_SIMPLESWAP_API_KEY || '';
  
  // Build SimpleSwap widget URL
  let simpleswapWidgetUrl = `https://simpleswap.io/widget/${affiliateId}`;
  
  // Add API key as parameter if available
  if (apiKey) {
    simpleswapWidgetUrl += `?api_key=${encodeURIComponent(apiKey)}`;
  }

  // Close window on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        window.close();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="simpleswap-popup-container">
      {/* Header Bar */}
      <div className="simpleswap-header">
        <div className="simpleswap-header-content">
          <div className="simpleswap-title">
            <span className="simpleswap-icon">💱</span>
            <div>
              <h2>On/Off Ramp</h2>
              <p>Buy and sell crypto with fiat</p>
            </div>
          </div>
          <button 
            className="simpleswap-close-btn"
            onClick={() => window.close()}
            title="Close (ESC)"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Widget Container */}
      <div className="simpleswap-widget-wrapper">
        <iframe
          id="simpleswap-frame"
          name="SimpleSwap Widget"
          src={simpleswapWidgetUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          title="SimpleSwap Exchange Widget"
          className="simpleswap-iframe"
          allow="clipboard-read; clipboard-write; payment"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      </div>
    </div>
  );
};

export default SimpleSwapPage;

