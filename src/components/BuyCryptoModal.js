import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaCreditCard, FaExchangeAlt } from 'react-icons/fa';
import './BuyCryptoModal.css';

const BuyCryptoModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('moonpay'); // 'moonpay' or 'ramp'
  const moonpayUrl = 'https://buy.moonpay.com?colorCode=%237D00FF';
  const rampUrl = 'https://app.rampnetwork.com/exchange?defaultFlow=ONRAMP&enabledFlows=ONRAMP%2COFFRAMP%2CSWAP&hostApiKey=wn25y7nx6cyb4oqutc5obnnywwwt4gz36yw5fypw';
  const hasOpenedPopup = useRef({ moonpay: false, ramp: false });

  // Open provider popup when tab is selected
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const currentProvider = activeTab;
    const providerUrl = currentProvider === 'moonpay' ? moonpayUrl : rampUrl;
    const providerName = currentProvider === 'moonpay' ? 'MoonPay' : 'Ramp';

    // Skip if already opened for this provider
    if (hasOpenedPopup.current[currentProvider]) {
      return;
    }

    // Mark as opened immediately to prevent multiple popups
    hasOpenedPopup.current[currentProvider] = true;

    // Small delay to show modal first
    const popupTimer = setTimeout(() => {
      const width = 450;
      const height = 650;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        providerUrl,
        `${providerName}BuyCrypto`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        alert(`Please allow popups to buy crypto with ${providerName}`);
        hasOpenedPopup.current[currentProvider] = false; // Reset if failed to open
      }
    }, 300);

    return () => {
      clearTimeout(popupTimer);
    };
  }, [isOpen, activeTab, moonpayUrl, rampUrl]);

  // Reset popup refs when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasOpenedPopup.current = { moonpay: false, ramp: false };
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div 
      className="buy-crypto-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="buy-crypto-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1000000
        }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FaCreditCard className="modal-icon" />
            <div>
              <h2>On/Off Ramp</h2>
              <p>Buy and sell cryptocurrency with fiat currency</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'moonpay' ? 'active' : ''}`}
            onClick={() => setActiveTab('moonpay')}
          >
            <FaCreditCard /> MoonPay
          </button>
          <button
            className={`modal-tab ${activeTab === 'ramp' ? 'active' : ''}`}
            onClick={() => setActiveTab('ramp')}
          >
            <FaExchangeAlt /> Ramp
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {activeTab === 'moonpay' && (
            <div className="provider-loading">
              <div className="loading-spinner-large"></div>
              <h3>Opening MoonPay...</h3>
              <p>A secure window will open to complete your purchase</p>
              <div className="loading-features">
                <div className="feature-item">✓ Credit & Debit Cards</div>
                <div className="feature-item">✓ Bank Transfers</div>
                <div className="feature-item">✓ Apple Pay & Google Pay</div>
                <div className="feature-item">✓ Instant Delivery</div>
              </div>
              <p className="popup-note">If the window didn't open, please allow popups and try again</p>
            </div>
          )}
          
          {activeTab === 'ramp' && (
            <div className="provider-loading">
              <div className="loading-spinner-large"></div>
              <h3>Opening Ramp Network...</h3>
              <p>A secure window will open to buy, sell, or swap crypto</p>
              <div className="loading-features">
                <div className="feature-item">✓ Buy Crypto (On-Ramp)</div>
                <div className="feature-item">✓ Sell Crypto (Off-Ramp)</div>
                <div className="feature-item">✓ Swap Crypto</div>
                <div className="feature-item">✓ Multiple Payment Methods</div>
              </div>
              <p className="popup-note">If the window didn't open, please allow popups and try again</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use React Portal to render at document body level
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default BuyCryptoModal;

