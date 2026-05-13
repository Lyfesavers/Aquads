import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaExchangeAlt, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import './BuyCryptoModal.css';

const MOONPAY_BRAND_QUERY = 'colorCode=%237D00FF';
const MOONPAY_BUY_URL = `https://buy.moonpay.com?${MOONPAY_BRAND_QUERY}`;
const MOONPAY_SELL_URL = `https://sell.moonpay.com?${MOONPAY_BRAND_QUERY}`;

const POPUP_FEATURES =
  'width=450,height=650,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes';

function openMoonPayPopup(url, windowName) {
  const left = (window.screen.width - 450) / 2;
  const top = (window.screen.height - 650) / 2;
  const features = `${POPUP_FEATURES},left=${left},top=${top}`;
  const popup = window.open(url, windowName, features);
  if (!popup) {
    alert('Please allow popups to continue with MoonPay');
  }
}

const BuyCryptoModal = ({ isOpen, onClose }) => {
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
        <div className="modal-header">
          <div className="modal-title">
            <FaExchangeAlt className="modal-icon" aria-hidden />
            <div>
              <h2>Buy & sell crypto</h2>
              <p>Fiat on-ramp and off-ramp via MoonPay</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="modal-content modal-content--ramp-choice">
          <div className="moonpay-ramp-grid">
            <button
              type="button"
              className="moonpay-ramp-card moonpay-ramp-card--buy"
              onClick={() => openMoonPayPopup(MOONPAY_BUY_URL, 'MoonPayBuyCrypto')}
            >
              <span className="moonpay-ramp-card__icon" aria-hidden>
                <FaArrowDown />
              </span>
              <span className="moonpay-ramp-card__title">Buy crypto</span>
              <span className="moonpay-ramp-card__desc">Pay with card, bank, Apple Pay, or Google Pay</span>
              <span className="moonpay-ramp-card__cta">Open MoonPay — buy</span>
            </button>

            <button
              type="button"
              className="moonpay-ramp-card moonpay-ramp-card--sell"
              onClick={() => openMoonPayPopup(MOONPAY_SELL_URL, 'MoonPaySellCrypto')}
            >
              <span className="moonpay-ramp-card__icon" aria-hidden>
                <FaArrowUp />
              </span>
              <span className="moonpay-ramp-card__title">Sell crypto</span>
              <span className="moonpay-ramp-card__desc">Convert crypto to fiat where supported</span>
              <span className="moonpay-ramp-card__cta">Open MoonPay — sell</span>
            </button>
          </div>

          <p className="popup-note">
            A secure window will open for the option you choose. Allow popups if nothing appears.
          </p>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default BuyCryptoModal;
