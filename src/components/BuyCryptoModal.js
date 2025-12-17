import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaExchangeAlt } from 'react-icons/fa';
import './BuyCryptoModal.css';

const BuyCryptoModal = ({ isOpen, onClose }) => {
  // SimpleSwap affiliate ID - set this in your .env file as REACT_APP_SIMPLESWAP_AFFILIATE_ID
  const affiliateId = process.env.REACT_APP_SIMPLESWAP_AFFILIATE_ID || '';
  
  // SimpleSwap widget URL - you can customize colors and other params
  const simpleswapWidgetUrl = affiliateId 
    ? `https://simpleswap.io/widget/${affiliateId}?theme=dark`
    : 'https://simpleswap.io/widget?theme=dark';

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
            <FaExchangeAlt className="modal-icon" />
            <div>
              <h2>On/Off Ramp</h2>
              <p>Buy and sell crypto with fiat currency</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* SimpleSwap Widget */}
        <div className="modal-content">
          <div className="simpleswap-widget-container">
            <iframe
              src={simpleswapWidgetUrl}
              width="100%"
              height="600"
              frameBorder="0"
              title="SimpleSwap Exchange Widget"
              className="simpleswap-iframe"
              allow="clipboard-read; clipboard-write"
            />
          </div>
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

