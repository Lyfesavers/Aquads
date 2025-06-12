import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaCreditCard, FaInfoCircle, FaExternalLinkAlt } from 'react-icons/fa';
import logger from '../utils/logger';
import './FiatPurchase.css';

// MoonPay configuration with revenue sharing
const MOONPAY_CONFIG = {
  apiKey: process.env.REACT_APP_MOONPAY_API_KEY || 'pk_test_your_key_here', // Replace with your MoonPay partner key
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  variant: 'embedded',
  showWalletAddressForm: true,
  theme: 'dark',
  colorCode: '#00d4ff',
};

// Popular cryptocurrencies for quick selection
const POPULAR_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'USDC', name: 'USD Coin', icon: '💵' },
  { symbol: 'USDT', name: 'Tether', icon: '🏦' },
  { symbol: 'BNB', name: 'BNB', icon: '🔥' },
  { symbol: 'SOL', name: 'Solana', icon: '☀️' },
  { symbol: 'MATIC', name: 'Polygon', icon: '🔮' },
  { symbol: 'ADA', name: 'Cardano', icon: '♠️' },
];

// Fiat currencies
const FIAT_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const FiatPurchase = ({ userWallet, showNotification }) => {
  const [selectedCrypto, setSelectedCrypto] = useState('ETH');
  const [selectedFiat, setSelectedFiat] = useState('USD');
  const [amount, setAmount] = useState('100');
  const [walletAddress, setWalletAddress] = useState(userWallet || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showWidget, setShowWidget] = useState(false);

  useEffect(() => {
    if (userWallet) {
      setWalletAddress(userWallet);
    }
  }, [userWallet]);

  // Build MoonPay URL with revenue sharing
  const buildMoonPayUrl = () => {
    const baseUrl = MOONPAY_CONFIG.environment === 'production' 
      ? 'https://buy.moonpay.com'
      : 'https://buy-sandbox.moonpay.com';
    
    const params = new URLSearchParams({
      apiKey: MOONPAY_CONFIG.apiKey,
      currencyCode: selectedCrypto.toLowerCase(),
      baseCurrencyCode: selectedFiat.toLowerCase(),
      baseCurrencyAmount: amount,
      walletAddress: walletAddress,
      theme: MOONPAY_CONFIG.theme,
      colorCode: MOONPAY_CONFIG.colorCode.replace('#', ''),
      showWalletAddressForm: 'true',
      // Revenue sharing parameters
      externalCustomerId: walletAddress,
      redirectURL: `${window.location.origin}/purchase-success`,
    });

    return `${baseUrl}?${params.toString()}`;
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
      logger.info('Fiat purchase initiated', {
        crypto: selectedCrypto,
        fiat: selectedFiat,
        amount: amount,
        wallet: walletAddress
      });

      // Build MoonPay URL and open
      const moonPayUrl = buildMoonPayUrl();
      
      // Open in new tab
      window.open(moonPayUrl, '_blank', 'width=420,height=700,scrollbars=yes,resizable=yes');
      
      showNotification?.('Purchase window opened. Complete your transaction in the new tab.', 'success');
      setShowWidget(true);
      
    } catch (error) {
      logger.error('Error initiating fiat purchase:', error);
      showNotification?.('Failed to open purchase window. Please try again.', 'error');
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
          disabled={isLoading || !walletAddress.trim() || !amount}
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
            <span>~3.5% (handled by payment processor)</span>
          </div>
          <div className="fee-row">
            <span>Estimated Total:</span>
            <span>${(parseFloat(amount || 0) * 1.035).toFixed(2)} {selectedFiat}</span>
          </div>
          <p className="fee-note">
            <FaInfoCircle />
            Final fees and exchange rates determined at checkout. 
            Revenue sharing automatically applied.
          </p>
        </div>

        {/* Features */}
        <div className="features-list">
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Credit & Debit Cards Accepted</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <span>Bank-Level Security</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Instant Delivery</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🌍</span>
            <span>Global Coverage</span>
          </div>
        </div>

        {/* Powered By */}
        <div className="powered-by">
          <span>Powered by</span>
          <strong>MoonPay</strong>
          <FaExternalLinkAlt 
            onClick={() => window.open('https://moonpay.com', '_blank')}
            className="external-link"
          />
        </div>
      </div>
    </div>
  );
};

export default FiatPurchase; 