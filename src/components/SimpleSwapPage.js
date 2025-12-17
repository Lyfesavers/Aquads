import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import SimpleSwapWidget from './SimpleSwapWidget';
import './SimpleSwapPage.css';

const SimpleSwapPage = () => {
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

      {/* Custom Widget Container */}
      <div className="simpleswap-widget-wrapper">
        <SimpleSwapWidget />
      </div>
    </div>
  );
};

export default SimpleSwapPage;

