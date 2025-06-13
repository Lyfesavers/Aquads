import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaCreditCard, FaInfoCircle, FaExternalLinkAlt } from 'react-icons/fa';
import logger from '../utils/logger';
import './FiatPurchase.css';

// Transak configuration with production API
const TRANSAK_CONFIG = {
  apiKey: process.env.REACT_APP_TRANSAK_API_KEY || '', 
  environment: 'PRODUCTION', // Using production since user confirmed it's production
  themeColor: '00d4ff',
  hostURL: window.location.origin,
  widgetHeight: '625px',
  widgetWidth: '450px',
};

// Popular cryptocurrencies supported by Transak
const POPULAR_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'USDC', name: 'USD Coin', icon: '💵' },
  { symbol: 'USDT', name: 'Tether', icon: '🏦' },
  { symbol: 'BNB', name: 'BNB', icon: '🔥' },
  { symbol: 'MATIC', name: 'Polygon', icon: '🔮' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '🏔️' },
  { symbol: 'SOL', name: 'Solana', icon: '☀️' },
];

// Fiat currencies supported by Transak
const FIAT_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const FiatPurchase = ({ userWallet, showNotification }) => {
  const [selectedCrypto, setSelectedCrypto] = useState('ETH');
  const [selectedFiat, setSelectedFiat] = useState('USD');
  const [amount, setAmount] = useState('100');
  const [walletAddress, setWalletAddress] = useState(userWallet || '');
  const [isLoading, setIsLoading] = useState(false);
  const [transakSDK, setTransakSDK] = useState(null);

  useEffect(() => {
    if (userWallet) {
      setWalletAddress(userWallet);
    }
  }, [userWallet]);

  // Load Transak SDK dynamically
  useEffect(() => {
    const loadTransakSDK = async () => {
      try {
        // Check if SDK is already loaded
        if (window.transakSDK) {
          setTransakSDK(window.transakSDK);
          return;
        }

        // Load Transak SDK script
        const script = document.createElement('script');
        script.src = 'https://global.transak.com/sdk/v1.2/widget.js';
        script.async = true;
        script.onload = () => {
          if (window.transakSDK) {
            setTransakSDK(window.transakSDK);
          }
        };
        script.onerror = () => {
          logger.error('Failed to load Transak SDK');
          showNotification?.('Failed to load payment system. Please refresh and try again.', 'error');
        };
        document.head.appendChild(script);
      } catch (error) {
        logger.error('Error loading Transak SDK:', error);
        showNotification?.('Error loading payment system', 'error');
      }
    };

    loadTransakSDK();
  }, [showNotification]);

  // Initialize Transak widget
  const initializeTransak = () => {
    if (!transakSDK && !window.transakSDK) {
      showNotification?.('Payment system not loaded. Please try again.', 'error');
      return null;
    }

    const TransakSDK = transakSDK || window.transakSDK;

    const transakConfig = {
      apiKey: TRANSAK_CONFIG.apiKey,
      environment: TRANSAK_CONFIG.environment,
      defaultCryptoCurrency: selectedCrypto,
      defaultFiatCurrency: selectedFiat,
      defaultFiatAmount: amount,
      walletAddress: walletAddress,
      themeColor: TRANSAK_CONFIG.themeColor,
      hostURL: TRANSAK_CONFIG.hostURL,
      widgetHeight: TRANSAK_CONFIG.widgetHeight,
      widgetWidth: TRANSAK_CONFIG.widgetWidth,
      // Revenue sharing parameters
      partnerCustomerId: walletAddress, // Track your users for revenue sharing
      redirectURL: `${window.location.origin}/purchase-success`,
      // Hide certain UI elements for cleaner experience
      hideMenu: true,
      // Event handlers
      onTransactionSuccessful: (transactionData) => {
        logger.info('Transak transaction successful:', transactionData);
        showNotification?.('Purchase completed successfully!', 'success');
      },
      onTransactionFailed: (error) => {
        logger.error('Transak transaction failed:', error);
        showNotification?.('Transaction failed. Please try again.', 'error');
      },
      onTransactionCancelled: () => {
        logger.info('Transak transaction cancelled by user');
        showNotification?.('Transaction cancelled', 'info');
      }
    };

    return new TransakSDK(transakConfig);
  };

  const handlePurchase = async () => {
    if (!walletAddress.trim()) {
      showNotification?.('Please enter a wallet address', 'error');
      return;
    }

    if (!amount || parseFloat(amount) < 20) {
      showNotification?.('Minimum purchase amount is $20', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      // Log the purchase attempt for analytics
      logger.info('Fiat purchase initiated via Transak', {
        crypto: selectedCrypto,
        fiat: selectedFiat,
        amount: amount,
        wallet: walletAddress,
        environment: TRANSAK_CONFIG.environment
      });

      // Initialize and show Transak widget
      const transak = initializeTransak();
      
      if (transak) {
        transak.init();
        showNotification?.('Opening secure payment window...', 'success');
      } else {
        throw new Error('Failed to initialize Transak widget');
      }
      
    } catch (error) {
      logger.error('Error initiating Transak purchase:', error);
      showNotification?.('Failed to open payment window. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAmountSelect = (quickAmount) => {
    setAmount(quickAmount.toString());
  };

  return (
    <div className="fiat-purchase-container">
      {/* Header */}
      <div className="fiat-purchase-header">
        <div className="header-content">
          <FaCreditCard className="header-icon" />
          <h3>Buy Crypto with Card</h3>
          <p>Purchase crypto directly with your credit or debit card</p>
        </div>
      </div>

      {/* Purchase Form */}
      <div className="purchase-form">
        {/* Amount Input */}
        <div className="form-group">
          <label className="form-label">
            <span>Amount to Spend</span>
            <FaInfoCircle className="info-icon" title="Minimum $20 purchase" />
          </label>
          
          {/* Fiat Currency Selector */}
          <div className="currency-amount-group">
            <select 
              value={selectedFiat}
              onChange={(e) => setSelectedFiat(e.target.value)}
              className="currency-select"
            >
              {FIAT_CURRENCIES.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code}
                </option>
              ))}
            </select>
            
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              min="20"
              className="amount-input"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="quick-amounts">
            {[50, 100, 250, 500, 1000].map(quickAmount => (
              <button
                key={quickAmount}
                onClick={() => handleQuickAmountSelect(quickAmount)}
                className={`quick-amount-btn ${amount === quickAmount.toString() ? 'active' : ''}`}
              >
                ${quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Crypto Selection */}
        <div className="form-group">
          <label className="form-label">Cryptocurrency to Buy</label>
          <div className="crypto-grid">
            {POPULAR_CRYPTOS.map(crypto => (
              <button
                key={crypto.symbol}
                onClick={() => setSelectedCrypto(crypto.symbol)}
                className={`crypto-btn ${selectedCrypto === crypto.symbol ? 'active' : ''}`}
              >
                <span className="crypto-icon">{crypto.icon}</span>
                <div className="crypto-info">
                  <span className="crypto-symbol">{crypto.symbol}</span>
                  <span className="crypto-name">{crypto.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Wallet Address */}
        <div className="form-group">
          <label className="form-label">
            Receiving Wallet Address
            <FaInfoCircle className="info-icon" title="Address where you'll receive your crypto" />
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter your wallet address..."
            className="wallet-input"
          />
          {userWallet && (
            <button 
              onClick={() => setWalletAddress(userWallet)}
              className="use-connected-wallet-btn"
            >
              Use Connected Wallet
            </button>
          )}
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={isLoading || !walletAddress.trim() || !amount || !transakSDK}
          className="purchase-btn"
        >
          {isLoading ? (
            <div className="loading-spinner" />
          ) : (
            <>
              <FaShoppingCart />
              Buy {selectedCrypto} with {selectedFiat}
            </>
          )}
        </button>

        {/* Fee Information */}
        <div className="fee-info">
          <div className="fee-row">
            <span>Processing Fee:</span>
            <span>~0.99% - 5.5% (varies by payment method)</span>
          </div>
          <div className="fee-row">
            <span>Network Fee:</span>
            <span>Included in total</span>
          </div>
          <div className="fee-row">
            <span>Estimated Total:</span>
            <span>${(parseFloat(amount || 0) * 1.035).toFixed(2)} {selectedFiat}</span>
          </div>
          <p className="fee-note">
            <FaInfoCircle />
            Final fees determined at checkout. Revenue sharing automatically applied.
          </p>
        </div>

        {/* Features */}
        <div className="features-list">
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Credit & Debit Cards Accepted</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🏦</span>
            <span>Bank Transfers Available</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <span>KYC Compliant & Secure</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🌍</span>
            <span>160+ Countries Supported</span>
          </div>
        </div>

        {/* Powered By */}
        <div className="powered-by">
          <span>Powered by</span>
          <strong>Transak</strong>
          <FaExternalLinkAlt 
            onClick={() => window.open('https://transak.com', '_blank')}
            className="external-link"
          />
        </div>
      </div>
    </div>
  );
};

export default FiatPurchase; 