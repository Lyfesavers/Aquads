import React, { useEffect, useRef } from 'react';
import './BuyCryptoModal.css';

const BuyCryptoModal = ({ isOpen, onClose }) => {
  const popupRef = useRef(null);

  // Open SimpleSwap page in popup window when modal opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Calculate popup window dimensions (Chrome extension style)
    const width = 700;
    const height = 850;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // Open popup window with SimpleSwap page
    const popup = window.open(
      '/simpleswap',
      'SimpleSwapOnRamp',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      alert('Please allow popups to open the On/Off Ramp window');
      onClose();
      return;
    }

    popupRef.current = popup;

    // Monitor popup window and close modal when popup is closed
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        onClose();
      }
    }, 500);

    // Cleanup
    return () => {
      clearInterval(checkPopup);
      // Don't close popup on cleanup - let user close it manually
    };
  }, [isOpen, onClose]);

  // This modal now just shows a loading state briefly
  // The actual widget opens in a popup window
  if (!isOpen) {
    return null;
  }

  return (
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
          zIndex: 1000000,
          textAlign: 'center',
          padding: '3rem'
        }}
      >
        <div className="loading-spinner-large"></div>
        <h3 style={{ color: '#ffffff', marginTop: '1.5rem' }}>Opening On/Off Ramp...</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.5rem' }}>
          A secure window will open for your exchange
        </p>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginTop: '1rem' }}>
          If the window didn't open, please allow popups and try again
        </p>
      </div>
    </div>
  );
};

export default BuyCryptoModal;

