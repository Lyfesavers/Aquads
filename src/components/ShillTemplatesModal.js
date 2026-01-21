import React, { useState, useEffect } from 'react';
import { FaTwitter, FaTelegram, FaCopy, FaCheck, FaExternalLinkAlt, FaArrowLeft, FaTimes } from 'react-icons/fa';
import './ShillTemplatesModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ShillTemplatesModal = ({ isOpen, onClose, tokenData, currentUser }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [copiedContract, setCopiedContract] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [fetchedTokenInfo, setFetchedTokenInfo] = useState(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [showPointsMessage, setShowPointsMessage] = useState(false);
  const [alreadyShilledToday, setAlreadyShilledToday] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPlatform(null);
      setCopiedContract(false);
      setIsClosing(false);
      setFetchedTokenInfo(null);
      setShowPointsMessage(false);
      setAlreadyShilledToday(false);
    }
  }, [isOpen]);

  // Fetch token info from DEXScreener if we don't have symbol
  useEffect(() => {
    const fetchTokenInfo = async () => {
      const pairAddr = tokenData?.pairAddress || tokenData?.address || '';
      const rawChain = tokenData?.chainId || tokenData?.blockchain || tokenData?.chain || 'ethereum';
      
      // Map chain names to DEXScreener format
      const chainMapping = {
        'ether': 'ethereum',
        'eth': 'ethereum',
        'sol': 'solana',
        'bnb': 'bsc',
        'avax': 'avalanche',
        'arb': 'arbitrum',
        'op': 'optimism',
        'ftm': 'fantom',
        'matic': 'polygon'
      };
      const chain = chainMapping[rawChain.toLowerCase()] || rawChain.toLowerCase();
      
      const hasSymbol = tokenData?.symbol && tokenData.symbol !== 'TOKEN' && tokenData.symbol !== tokenData.name;
      
      if (isOpen && pairAddr && !hasSymbol) {
        setIsLoadingToken(true);
        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddr}`);
          if (response.ok) {
            const data = await response.json();
            if (data.pair) {
              setFetchedTokenInfo({
                symbol: data.pair.baseToken?.symbol || '',
                name: data.pair.baseToken?.name || '',
                priceUsd: data.pair.priceUsd,
                priceChange24h: data.pair.priceChange?.h24,
                logo: data.pair.info?.imageUrl
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch token info:', error);
        } finally {
          setIsLoadingToken(false);
        }
      }
    };
    
    fetchTokenInfo();
  }, [isOpen, tokenData]);

  if (!isOpen) return null;

  // Extract token data - use fetched info if available, then fall back to props
  const tokenName = fetchedTokenInfo?.name || tokenData?.name || tokenData?.symbol || 'Token';
  // Get the actual ticker symbol - prioritize fetched data
  const tokenSymbol = (
    fetchedTokenInfo?.symbol ||
    tokenData?.symbol || 
    tokenData?.ticker || 
    tokenData?.name || 
    'TOKEN'
  ).toUpperCase().replace(/[^A-Z0-9]/g, ''); // Clean up symbol
  const pairAddress = tokenData?.pairAddress || tokenData?.address || '';
  const blockchain = tokenData?.chainId || tokenData?.blockchain || tokenData?.chain || 'ethereum';
  const tokenLogo = fetchedTokenInfo?.logo || tokenData?.logo || tokenData?.image || null;
  const priceUsd = (fetchedTokenInfo?.priceUsd || tokenData?.priceUsd) ? parseFloat(fetchedTokenInfo?.priceUsd || tokenData?.priceUsd).toFixed(6) : null;
  const priceChange = (fetchedTokenInfo?.priceChange24h || tokenData?.priceChange24h) ? parseFloat(fetchedTokenInfo?.priceChange24h || tokenData?.priceChange24h).toFixed(2) : null;

  // Generate URLs - Link back to AquaSwap to retain traffic & swap fees!
  // Use /share/aquaswap for proper social media meta tags (token image, price, etc.)
  const aquaSwapUrl = `https://aquads.xyz/share/aquaswap?token=${pairAddress}&blockchain=${blockchain}`;
  const dexScreenerUrl = `https://dexscreener.com/${blockchain}/${pairAddress}`; // Keep for footer utility

  // Tweet templates - using @_Aquads_ (official Twitter handle)
  const templates = [
    {
      id: 'discovery',
      emoji: '🔥',
      label: 'New Discovery',
      gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931a 100%)',
      text: `🔥 Just discovered $${tokenSymbol} on @_Aquads_!\n\nChart looking interesting 👀\n\n📊 ${aquaSwapUrl}\n\n#${tokenSymbol} #Aquads #Crypto #DeFi`,
      preview: `Just discovered $${tokenSymbol} on @_Aquads_! Chart looking interesting 👀`
    },
    {
      id: 'bullish',
      emoji: '🚀',
      label: 'Bullish Call',
      gradient: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
      text: `🚀 $${tokenSymbol} is one to watch!\n\n${priceChange ? `24h: ${priceChange > 0 ? '+' : ''}${priceChange}% 📈` : 'Community is paying attention 👀'}\n\nSwap: ${aquaSwapUrl}\n\n#${tokenSymbol} #Aquads #Altcoins`,
      preview: `$${tokenSymbol} is one to watch! ${priceChange ? `24h: ${priceChange > 0 ? '+' : ''}${priceChange}%` : 'Community watching'}`
    },
    {
      id: 'gem',
      emoji: '💎',
      label: 'Hidden Gem',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
      text: `💎 Hidden gem alert: $${tokenSymbol}\n\nFound this on @_Aquads_ - check it out!\n\n🔄 ${aquaSwapUrl}\n\n#${tokenSymbol} #Aquads #HiddenGem\n\nNFA DYOR 🔍`,
      preview: `Hidden gem alert: $${tokenSymbol} - Found on @_Aquads_, worth checking out!`
    },
    {
      id: 'simple',
      emoji: '👀',
      label: 'Quick Share',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      text: `$${tokenSymbol} 👀\n\n${priceUsd ? `Price: $${priceUsd}\n\n` : ''}${aquaSwapUrl}\n\n#${tokenSymbol} #Aquads`,
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
    
    // IMMEDIATELY open social platform - don't wait for API
    if (selectedPlatform === 'twitter') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(twitterUrl, 'twitter-share', 'width=550,height=420,scrollbars=yes');
    } else if (selectedPlatform === 'telegram') {
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(aquaSwapUrl)}&text=${encodeURIComponent(text)}`;
      window.open(telegramUrl, 'telegram-share', 'width=550,height=420,scrollbars=yes');
    }
    
    // Fire-and-forget: Award shill points in background (don't block UI)
    if (currentUser) {
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/api/points/shill-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.alreadyClaimed) {
            setAlreadyShilledToday(true);
          }
          setShowPointsMessage(true);
        })
        .catch(error => {
          console.error('Failed to award shill points:', error);
        });
    }
    
    // Close modal after brief delay
    setTimeout(() => {
      handleClose();
    }, currentUser ? 1200 : 0);
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
                Shill <span className="token-highlight">{isLoadingToken ? '...' : `$${tokenSymbol}`}</span>
                {isLoadingToken && <span className="shill-loading-spinner"></span>}
              </h2>
              <p className="shill-modal-subtitle">
                {isLoadingToken ? 'Fetching token data...' : 'Help spread the word!'}
              </p>
            </div>
          </div>
          {priceUsd && !isLoadingToken && (
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

        {/* Points Message Overlay */}
        {showPointsMessage && currentUser && (
          <div className="shill-points-overlay">
            <div className="shill-points-message">
              <span className="points-icon">{alreadyShilledToday ? '⏰' : '🎯'}</span>
              <span className={`points-text ${alreadyShilledToday ? 'already-claimed' : ''}`}>
                {alreadyShilledToday 
                  ? 'Shill again tomorrow for points!' 
                  : '5 points will be added after completion!'}
              </span>
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

