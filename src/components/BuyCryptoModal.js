import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaCreditCard } from 'react-icons/fa';
import './BuyCryptoModal.css';

const BuyCryptoModal = ({ isOpen, onClose }) => {
  // Debug logging
  useEffect(() => {
    console.log('BuyCryptoModal rendered! isOpen:', isOpen);
    if (isOpen) {
      console.log('Modal should be visible now!');
    }
  }, [isOpen]);

  const moonpayUrl = 'https://buy.moonpay.com?colorCode=%237D00FF';

  // Open MoonPay in centered popup window automatically
  useEffect(() => {
    if (isOpen) {
      // Small delay to show modal first
      const timer = setTimeout(() => {
        const width = 450;
        const height = 650;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const popup = window.open(
          moonpayUrl,
          'MoonPayBuyCrypto',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          alert('Please allow popups to buy crypto with MoonPay');
        }
      }, 300);

      return () => clearTimeout(timer);
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
    console.log('Modal not open, returning null');
    return null;
  }

  console.log('Rendering modal overlay with Portal...');

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
              <h2>Buy Crypto</h2>
              <p>Purchase cryptocurrency with fiat currency</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* MoonPay Loading */}
        <div className="modal-content">
          <div className="moonpay-loading">
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

