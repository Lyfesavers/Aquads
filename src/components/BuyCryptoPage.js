import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCreditCard, FaShieldAlt, FaBolt, FaLock, FaExchangeAlt, FaInfoCircle } from 'react-icons/fa';
import './BuyCryptoPage.css';

const BuyCryptoPage = ({ currentUser }) => {
  const [selectedTab, setSelectedTab] = useState('buy'); // 'buy' or 'exchange'

  // ChangeNOW widget URLs - can add partner ID later
  const changeNowBuyUrl = 'https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=false&amount=100&amountFiat=100&from=usd&horizontal=false&lang=en&link_id=&locales=true&logo=false&primaryColor=00d4ff&to=eth&toTheMoon=true';
  
  const changeNowExchangeUrl = 'https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=false&amount=0.1&from=btc&horizontal=false&lang=en&link_id=&locales=true&logo=false&primaryColor=00d4ff&to=eth&toTheMoon=true';

  return (
    <div className="buy-crypto-page">
      {/* Header Section */}
      <div className="buy-crypto-header">
        <div className="header-background-glow"></div>
        <div className="header-content">
          <Link to="/aquaswap" className="back-button">
            <FaArrowLeft />
            <span>Back to AquaSwap</span>
          </Link>
          
          <div className="header-title">
            <div className="title-icon-wrapper">
              <FaCreditCard className="title-icon" />
              <div className="icon-glow"></div>
            </div>
            <h1>Buy & Exchange Crypto</h1>
            <p className="subtitle">Instant purchases with fiat or crypto-to-crypto swaps</p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="trust-badges">
        <div className="trust-badge">
          <FaShieldAlt className="badge-icon" />
          <div className="badge-text">
            <span className="badge-title">Secure</span>
            <span className="badge-desc">Bank-grade encryption</span>
          </div>
        </div>
        <div className="trust-badge">
          <FaBolt className="badge-icon" />
          <div className="badge-text">
            <span className="badge-title">Instant</span>
            <span className="badge-desc">Fast transactions</span>
          </div>
        </div>
        <div className="trust-badge">
          <FaLock className="badge-icon" />
          <div className="badge-text">
            <span className="badge-title">Non-Custodial</span>
            <span className="badge-desc">You control your keys</span>
          </div>
        </div>
        <div className="trust-badge">
          <FaExchangeAlt className="badge-icon" />
          <div className="badge-text">
            <span className="badge-title">Best Rates</span>
            <span className="badge-desc">Competitive pricing</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tab-switcher">
        <button 
          className={`tab-button ${selectedTab === 'buy' ? 'active' : ''}`}
          onClick={() => setSelectedTab('buy')}
        >
          <FaCreditCard />
          <span>Buy with Fiat</span>
        </button>
        <button 
          className={`tab-button ${selectedTab === 'exchange' ? 'active' : ''}`}
          onClick={() => setSelectedTab('exchange')}
        >
          <FaExchangeAlt />
          <span>Crypto Exchange</span>
        </button>
        <div className={`tab-indicator ${selectedTab === 'exchange' ? 'right' : ''}`}></div>
      </div>

      {/* Widget Container */}
      <div className="widget-container">
        <div className="widget-wrapper">
          {selectedTab === 'buy' ? (
            <iframe
              title="Buy Crypto with Fiat"
              src={changeNowBuyUrl}
              className="changenow-iframe"
              allow="camera"
            />
          ) : (
            <iframe
              title="Exchange Crypto"
              src={changeNowExchangeUrl}
              className="changenow-iframe"
              allow="camera"
            />
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="info-section">
        <div className="info-card">
          <FaInfoCircle className="info-icon" />
          <div className="info-content">
            <h3>How it works</h3>
            <ol>
              <li>Choose your payment method and amount</li>
              <li>Enter your wallet address</li>
              <li>Complete the secure payment</li>
              <li>Receive crypto instantly in your wallet</li>
            </ol>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h4>Payment Methods</h4>
            <p>Credit cards, debit cards, bank transfers, and more</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h4>Global Support</h4>
            <p>Available in 150+ countries worldwide</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h4>Instant Delivery</h4>
            <p>Receive your crypto within minutes</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h4>Secure & Private</h4>
            <p>Your data is protected with industry-leading security</p>
          </div>
        </div>
      </div>

      {/* Powered By Footer */}
      <div className="powered-by">
        <p>Powered by <a href="https://changenow.io" target="_blank" rel="noopener noreferrer">ChangeNOW</a></p>
      </div>
    </div>
  );
};

export default BuyCryptoPage;

