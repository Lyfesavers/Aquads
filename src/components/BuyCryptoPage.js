import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCreditCard, FaExternalLinkAlt } from 'react-icons/fa';
import './BuyCryptoPage.css';

const BuyCryptoPage = ({ currentUser }) => {
  const [selectedProvider, setSelectedProvider] = useState('moonpay');

  // Provider configurations - these work without merchant verification
  const providers = {
    moonpay: {
      name: 'MoonPay',
      url: 'https://buy.moonpay.com/',
      description: 'Most popular, widest coverage',
      features: ['Credit/Debit Cards', 'Bank Transfers', 'Apple Pay', 'Google Pay'],
      countries: '160+ countries',
      fees: '~3.5-4.5%',
      color: '#7D00FF'
    },
    ramp: {
      name: 'Ramp Network',
      url: 'https://buy.ramp.network/',
      description: 'Lower fees, fast KYC',
      features: ['Credit/Debit Cards', 'Bank Transfers', 'Open Banking', 'Instant Verification'],
      countries: '150+ countries',
      fees: '~2.9%',
      color: '#00D395'
    },
    mercuryo: {
      name: 'Mercuryo',
      url: 'https://exchange.mercuryo.io/',
      description: 'Good rates, multiple payment methods',
      features: ['Credit/Debit Cards', 'SEPA', 'Faster Payments', 'Apple Pay'],
      countries: '180+ countries',
      fees: '~3.95%',
      color: '#00B8D9'
    }
  };

  const currentProvider = providers[selectedProvider];

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
            <h1>Buy Crypto with Fiat</h1>
            <p className="subtitle">Purchase cryptocurrency instantly with credit card, debit card, or bank transfer</p>
          </div>
        </div>
      </div>

      {/* Provider Selector */}
      <div className="provider-selector">
        <h2>Choose Your Payment Provider</h2>
        <p className="provider-subtitle">All providers are secure and trusted by millions worldwide</p>
        
        <div className="provider-grid">
          {Object.keys(providers).map((key) => {
            const provider = providers[key];
            return (
              <div 
                key={key}
                className={`provider-card ${selectedProvider === key ? 'active' : ''}`}
                onClick={() => setSelectedProvider(key)}
              >
                <div className="provider-header">
                  <h3>{provider.name}</h3>
                  <div className="provider-badge" style={{ backgroundColor: provider.color }}>
                    Best Choice
                  </div>
                </div>
                <p className="provider-description">{provider.description}</p>
                
                <div className="provider-details">
                  <div className="detail-item">
                    <span className="detail-label">Coverage:</span>
                    <span className="detail-value">{provider.countries}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Fees:</span>
                    <span className="detail-value">{provider.fees}</span>
                  </div>
                </div>

                <div className="provider-features">
                  {provider.features.map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="action-container">
        <a 
          href={currentProvider.url}
          target="_blank"
          rel="noopener noreferrer"
          className="buy-now-button"
          style={{ borderColor: currentProvider.color }}
        >
          <span>Buy Crypto with {currentProvider.name}</span>
          <FaExternalLinkAlt />
        </a>
        <p className="action-note">You'll be redirected to {currentProvider.name}'s secure platform</p>
      </div>
    </div>
  );
};

export default BuyCryptoPage;

