import React, { useState, useEffect } from 'react';
import { FaTwitter, FaTelegram, FaCopy, FaCheck, FaExternalLinkAlt, FaArrowLeft, FaTimes } from 'react-icons/fa';
import './ShillTemplatesModal.css';

const ShillTemplatesModal = ({ isOpen, onClose, tokenData }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [copiedContract, setCopiedContract] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPlatform(null);
      setCopiedContract(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract token data
  const tokenName = tokenData?.name || tokenData?.symbol || 'Token';
  const tokenSymbol = tokenData?.symbol?.toUpperCase() || tokenName?.toUpperCase() || 'TOKEN';
  const pairAddress = tokenData?.pairAddress || tokenData?.address || '';
  const blockchain = tokenData?.chainId || tokenData?.blockchain || tokenData?.chain || 'ethereum';
  const tokenLogo = tokenData?.logo || tokenData?.image || null;
  const priceUsd = tokenData?.priceUsd ? parseFloat(tokenData.priceUsd).toFixed(6) : null;
  const priceChange = tokenData?.priceChange24h ? parseFloat(tokenData.priceChange24h).toFixed(2) : null;

  // Generate URLs
  const dexScreenerUrl = `https://dexscreener.com/${blockchain}/${pairAddress}`;

  // Tweet templates
  const templates = [
    {
      id: 'discovery',
      emoji: '🔥',
      label: 'New Discovery',
      gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931a 100%)',
      text: `🔥 Just discovered $${tokenSymbol} on @AquadsApp!\n\nChart looking interesting 👀\n\n📊 ${dexScreenerUrl}\n\n#${tokenSymbol} #Crypto #DeFi`,
      preview: `Just discovered $${tokenSymbol} on @AquadsApp! Chart looking interesting 👀`
    },
    {
      id: 'bullish',
      emoji: '🚀',
      label: 'Bullish Call',
      gradient: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
      text: `🚀 $${tokenSymbol} is one to watch!\n\n${priceChange ? `24h: ${priceChange > 0 ? '+' : ''}${priceChange}% 📈` : 'Community is paying attention 👀'}\n\nChart: ${dexScreenerUrl}\n\n#${tokenSymbol} #Altcoins`,
      preview: `$${tokenSymbol} is one to watch! ${priceChange ? `24h: ${priceChange > 0 ? '+' : ''}${priceChange}%` : 'Community watching'}`
    },
    {
      id: 'gem',
      emoji: '💎',
      label: 'Hidden Gem',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
      text: `💎 Hidden gem alert: $${tokenSymbol}\n\nFound this on @AquadsApp - worth checking out!\n\nDYOR: ${dexScreenerUrl}\n\nNFA 🔍`,
      preview: `Hidden gem alert: $${tokenSymbol} - Found on @AquadsApp, worth checking out!`
    },
    {
      id: 'simple',
      emoji: '👀',
      label: 'Quick Share',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      text: `$${tokenSymbol} 👀\n\n${priceUsd ? `Price: $${priceUsd}` : ''}\n\n${dexScreenerUrl}`,
      preview: `$${tokenSymbol} 👀 ${priceUsd ? `- $${priceUsd}` : ''}`
    }
  ];

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleShare = (template) => {
    const text = template.text;
    
    if (selectedPlatform === 'twitter') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(twitterUrl, 'twitter-share', 'width=550,height=420,scrollbars=yes');
    } else if (selectedPlatform === 'telegram') {
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(dexScreenerUrl)}&text=${encodeURIComponent(text)}`;
      window.open(telegramUrl, 'telegram-share', 'width=550,height=420,scrollbars=yes');
    }
    
    handleClose();
  };

  const handleCopyContract = async () => {
    try {
      await navigator.clipboard.writeText(pairAddress);
      setCopiedContract(true);
      setTimeout(() => setCopiedContract(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className={`shill-modal-overlay ${isClosing ? 'closing' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`shill-modal ${isClosing ? 'closing' : ''}`}>
        {/* Close button */}
        <button className="shill-modal-close" onClick={handleClose}>
          <FaTimes />
        </button>

        {/* Header */}
        <div className="shill-modal-header">
          <div className="shill-token-info">
            {tokenLogo && (
              <div className="shill-token-logo-wrapper">
                <img src={tokenLogo} alt={tokenName} className="shill-token-logo" />
                <div className="shill-token-logo-glow"></div>
              </div>
            )}
            <div className="shill-token-details">
              <h2 className="shill-modal-title">
                Share <span className="token-highlight">${tokenSymbol}</span>
              </h2>
              <p className="shill-modal-subtitle">Help spread the word!</p>
            </div>
          </div>
          {priceUsd && (
            <div className="shill-price-badge">
              <span className="price-value">${priceUsd}</span>
              {priceChange && (
                <span className={`price-change ${parseFloat(priceChange) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(priceChange) >= 0 ? '+' : ''}{priceChange}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Platform Selection */}
        {!selectedPlatform ? (
          <div className="shill-platform-section">
            <h3 className="shill-section-title">
              <span className="section-number">1</span>
              Choose Platform
            </h3>
            <div className="shill-platform-grid">
              <button 
                className="shill-platform-btn twitter"
                onClick={() => setSelectedPlatform('twitter')}
              >
                <div className="platform-icon-wrapper">
                  <FaTwitter className="platform-icon" />
                </div>
                <span className="platform-name">Twitter / X</span>
                <div className="platform-arrow">→</div>
              </button>
              <button 
                className="shill-platform-btn telegram"
                onClick={() => setSelectedPlatform('telegram')}
              >
                <div className="platform-icon-wrapper">
                  <FaTelegram className="platform-icon" />
                </div>
                <span className="platform-name">Telegram</span>
                <div className="platform-arrow">→</div>
              </button>
            </div>
          </div>
        ) : (
          /* Template Selection */
          <div className="shill-templates-section">
            <div className="shill-section-header">
              <button 
                className="shill-back-btn"
                onClick={() => setSelectedPlatform(null)}
              >
                <FaArrowLeft /> Back
              </button>
              <h3 className="shill-section-title">
                <span className="section-number">2</span>
                Choose Message
              </h3>
              <div className="selected-platform-badge">
                {selectedPlatform === 'twitter' ? <FaTwitter /> : <FaTelegram />}
              </div>
            </div>

            <div className="shill-templates-list">
              {templates.map((template) => (
                <div 
                  key={template.id}
                  className="shill-template-card"
                  style={{ '--card-gradient': template.gradient }}
                >
                  <div className="template-card-header">
                    <span className="template-emoji">{template.emoji}</span>
                    <span className="template-label">{template.label}</span>
                  </div>
                  <p className="template-preview">{template.preview}</p>
                  <button 
                    className="template-share-btn"
                    onClick={() => handleShare(template)}
                  >
                    <span>Share This</span>
                    <FaExternalLinkAlt className="share-icon" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer with utilities */}
        <div className="shill-modal-footer">
          <div className="shill-utility-row">
            <button 
              className="shill-utility-btn contract-btn"
              onClick={handleCopyContract}
            >
              {copiedContract ? (
                <>
                  <FaCheck className="utility-icon success" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <FaCopy className="utility-icon" />
                  <span>Copy Contract</span>
                </>
              )}
            </button>
            <a 
              href={dexScreenerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shill-utility-btn dex-btn"
            >
              <FaExternalLinkAlt className="utility-icon" />
              <span>DEXScreener</span>
            </a>
          </div>
          <p className="shill-footer-note">
            Sharing helps grow the community 🚀
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShillTemplatesModal;

