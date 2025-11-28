import React, { useState, useEffect } from 'react';
import { FaTimes, FaCreditCard } from 'react-icons/fa';
import './BuyCryptoModal.css';

const BuyCryptoModal = ({ isOpen, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState('moonpay');

  // Debug logging
  useEffect(() => {
    console.log('BuyCryptoModal rendered! isOpen:', isOpen);
    if (isOpen) {
      console.log('Modal should be visible now!');
    }
  }, [isOpen]);

  // Provider configurations - embedded widgets
  const providers = {
    moonpay: {
      name: 'MoonPay',
      embedUrl: 'https://buy.moonpay.com?colorCode=%237D00FF',
      color: '#7D00FF'
    },
    mercuryo: {
      name: 'Mercuryo',
      embedUrl: 'https://exchange.mercuryo.io/?theme=dark&type=buy&currency=BTC&fiat_currency=USD&fiat_amount=100',
      color: '#00B8D9'
    }
  };

  const currentProvider = providers[selectedProvider];

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

  console.log('Rendering modal overlay...');

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

        {/* Provider Tabs */}
        <div className="modal-provider-tabs">
          <button 
            className={`provider-tab ${selectedProvider === 'moonpay' ? 'active' : ''}`}
            onClick={() => setSelectedProvider('moonpay')}
            style={{ '--provider-color': providers.moonpay.color }}
          >
            MoonPay
          </button>
          <button 
            className={`provider-tab ${selectedProvider === 'mercuryo' ? 'active' : ''}`}
            onClick={() => setSelectedProvider('mercuryo')}
            style={{ '--provider-color': providers.mercuryo.color }}
          >
            Mercuryo
          </button>
        </div>

        {/* Widget Content */}
        <div className="modal-content">
          <iframe
            title={`Buy Crypto with ${currentProvider.name}`}
            src={currentProvider.embedUrl}
            className="modal-iframe"
            allow="accelerometer; autoplay; camera; gyroscope; payment"
          />
        </div>
      </div>
    </div>
  );
};

export default BuyCryptoModal;

