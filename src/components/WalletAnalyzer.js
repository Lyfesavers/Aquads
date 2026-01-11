import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './WalletAnalyzer.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com/api';

// Chain configurations with colors and explorers
const SUPPORTED_CHAINS = {
  ethereum: { name: 'Ethereum', symbol: 'ETH', color: '#627EEA', explorer: 'https://etherscan.io', icon: '⟠' },
  solana: { name: 'Solana', symbol: 'SOL', color: '#14F195', explorer: 'https://solscan.io', icon: '◎' },
  bsc: { name: 'BNB Chain', symbol: 'BNB', color: '#F3BA2F', explorer: 'https://bscscan.com', icon: '⬡' },
  polygon: { name: 'Polygon', symbol: 'MATIC', color: '#8247E5', explorer: 'https://polygonscan.com', icon: '⬢' },
  arbitrum: { name: 'Arbitrum', symbol: 'ARB', color: '#28A0F0', explorer: 'https://arbiscan.io', icon: '🔷' },
  base: { name: 'Base', symbol: 'ETH', color: '#0052FF', explorer: 'https://basescan.org', icon: '🔵' },
  avalanche: { name: 'Avalanche', symbol: 'AVAX', color: '#E84142', explorer: 'https://snowtrace.io', icon: '🔺' },
  optimism: { name: 'Optimism', symbol: 'OP', color: '#FF0420', explorer: 'https://optimistic.etherscan.io', icon: '🔴' },
  fantom: { name: 'Fantom', symbol: 'FTM', color: '#1969FF', explorer: 'https://ftmscan.com', icon: '👻' },
  cronos: { name: 'Cronos', symbol: 'CRO', color: '#002D74', explorer: 'https://cronoscan.com', icon: '🌙' },
};

// Wallet type classifications
const WALLET_TYPES = {
  WHALE: { label: 'Whale', icon: '🐋', color: '#00d4ff', description: 'Large holder with significant market impact' },
  SMART_MONEY: { label: 'Smart Money', icon: '🧠', color: '#10b981', description: 'Consistently profitable trader' },
  DIAMOND_HANDS: { label: 'Diamond Hands', icon: '💎', color: '#a855f7', description: 'Long-term holder through volatility' },
  PAPER_HANDS: { label: 'Paper Hands', icon: '📄', color: '#f59e0b', description: 'Quick to sell on small dips' },
  JEET: { label: 'Jeet', icon: '🏃', color: '#ef4444', description: 'Sells shortly after buying' },
  BOT: { label: 'Bot', icon: '🤖', color: '#6366f1', description: 'Automated trading detected' },
  ACCUMULATOR: { label: 'Accumulator', icon: '📈', color: '#22c55e', description: 'Consistently buying and holding' },
  DISTRIBUTOR: { label: 'Distributor', icon: '📉', color: '#f97316', description: 'Gradually selling holdings' },
  NEW_WALLET: { label: 'New Wallet', icon: '🆕', color: '#64748b', description: 'Recently created, limited history' },
};

const WalletAnalyzer = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [walletData, setWalletData] = useState(null);
  const [error, setError] = useState(null);
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const scanLineRef = useRef(null);
  const particlesRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('walletAnalyzerRecent');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Save to recent searches
  const saveToRecent = useCallback((address, chain) => {
    const newSearch = { address, chain, timestamp: Date.now() };
    const updated = [newSearch, ...recentSearches.filter(s => s.address !== address)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('walletAnalyzerRecent', JSON.stringify(updated));
  }, [recentSearches]);

  // Validate wallet address format
  const isValidAddress = (address) => {
    if (selectedChain === 'solana') {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Mock analysis function (replace with real API calls)
  const analyzeWallet = async () => {
    if (!walletAddress || !isValidAddress(walletAddress)) {
      setError('Please enter a valid wallet address');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setAnalysisProgress(0);
    setWalletData(null);

    const stages = [
      { progress: 10, stage: 'Connecting to blockchain...' },
      { progress: 25, stage: 'Fetching wallet balances...' },
      { progress: 40, stage: 'Analyzing transaction history...' },
      { progress: 55, stage: 'Calculating PnL metrics...' },
      { progress: 70, stage: 'Detecting trading patterns...' },
      { progress: 85, stage: 'Running bot detection algorithms...' },
      { progress: 95, stage: 'Generating wallet DNA profile...' },
      { progress: 100, stage: 'Analysis complete!' },
    ];

    // Progress animation while fetching real data
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        const currentStage = stages.find(s => s.progress > prev) || stages[stages.length - 1];
        setAnalysisStage(currentStage.stage);
        return Math.min(prev + 5, 90); // Cap at 90% until real data arrives
      });
    }, 300);

    try {
      // Fetch real data from API
      const response = await fetch(`${API_URL}/wallet-analyzer/${walletAddress}?chain=${selectedChain}`);
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if it's a rate limit error
        if (response.status === 429 || errorData.rateLimited) {
          setError('⏳ API rate limit reached. Please try again in a few minutes.');
          setIsAnalyzing(false);
          return;
        }
        
        throw new Error(errorData.message || errorData.error || 'Failed to analyze wallet');
      }

      const realData = await response.json();
      
      setAnalysisProgress(100);
      setAnalysisStage('Analysis complete!');
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setWalletData(realData);
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      saveToRecent(walletAddress, selectedChain);
      
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze wallet. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getScoreColor = (score, inverse = false) => {
    const adjustedScore = inverse ? 100 - score : score;
    if (adjustedScore >= 70) return '#10b981';
    if (adjustedScore >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score, type) => {
    if (type === 'jeet') {
      if (score < 25) return 'Diamond Hands 💎';
      if (score < 50) return 'Patient';
      if (score < 75) return 'Paper Hands';
      return 'Jeet 🏃';
    }
    if (type === 'bot') {
      if (score < 20) return 'Human';
      if (score < 50) return 'Likely Human';
      if (score < 80) return 'Bot Suspected';
      return 'Likely Bot 🤖';
    }
    if (type === 'winRate') {
      if (score >= 70) return 'Elite Trader';
      if (score >= 55) return 'Profitable';
      if (score >= 45) return 'Average';
      return 'Struggling';
    }
    return '';
  };

  return (
    <div className="wallet-analyzer-page">
      {/* Animated Background */}
      <div className="wa-background">
        <div className="wa-grid"></div>
        <div className="wa-glow wa-glow-1"></div>
        <div className="wa-glow wa-glow-2"></div>
        <div className="wa-glow wa-glow-3"></div>
        <div className="wa-particles" ref={particlesRef}>
          {Array.from({ length: 50 }, (_, i) => (
            <div key={i} className="wa-particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 20}s`,
            }}></div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="wa-header">
        <div className="wa-header-left">
          <img 
            src="/Aquadsnewlogo.png" 
            alt="Aquads" 
            className="wa-logo"
            onClick={() => navigate('/home')}
          />
        </div>
        <div className="wa-header-center">
          <div className="wa-title-container">
            <div className="wa-title-icon">🔬</div>
            <div className="wa-title-text">
              <h1>Wallet Analyzer</h1>
              <p>Deep Intelligence • Multi-Chain</p>
            </div>
          </div>
        </div>
        <div className="wa-header-right">
          <button className="wa-back-btn" onClick={() => navigate('/swap')}>
            ← Back to Swap
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="wa-main">
        {/* Search Section */}
        <section className="wa-search-section">
          <div className="wa-search-container">
            <div className="wa-search-glow"></div>
            <div className="wa-search-inner">
              <h2 className="wa-search-title">
                <span className="wa-title-gradient">Analyze Any Wallet</span>
                <span className="wa-title-sub">Whale • Jeet • Bot Detection</span>
              </h2>
              
              <div className="wa-search-row">
                {/* Chain Selector */}
                <div className="wa-chain-selector">
                  <button 
                    className="wa-chain-btn"
                    onClick={() => setShowChainDropdown(!showChainDropdown)}
                    style={{ borderColor: SUPPORTED_CHAINS[selectedChain].color }}
                  >
                    <span className="wa-chain-icon">{SUPPORTED_CHAINS[selectedChain].icon}</span>
                    <span className="wa-chain-name">{SUPPORTED_CHAINS[selectedChain].name}</span>
                    <span className="wa-chain-arrow">▼</span>
                  </button>
                  
                  {showChainDropdown && (
                    <div className="wa-chain-dropdown">
                      {Object.entries(SUPPORTED_CHAINS).map(([key, chain]) => (
                        <button
                          key={key}
                          className={`wa-chain-option ${selectedChain === key ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedChain(key);
                            setShowChainDropdown(false);
                          }}
                          style={{ '--chain-color': chain.color }}
                        >
                          <span className="wa-chain-icon">{chain.icon}</span>
                          <span>{chain.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Address Input */}
                <div className="wa-input-container">
                  <input
                    type="text"
                    className="wa-address-input"
                    placeholder={selectedChain === 'solana' ? 'Enter Solana address...' : 'Enter wallet address (0x...)'}
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && analyzeWallet()}
                  />
                  <div className="wa-input-glow"></div>
                </div>

                {/* Analyze Button */}
                <button 
                  className={`wa-analyze-btn ${isAnalyzing ? 'analyzing' : ''}`}
                  onClick={analyzeWallet}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="wa-btn-spinner"></span>
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <span className="wa-btn-icon">🔍</span>
                      <span>Analyze</span>
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="wa-error">
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && !analysisComplete && !isAnalyzing && (
                <div className="wa-recent-searches">
                  <span className="wa-recent-label">Recent:</span>
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      className="wa-recent-item"
                      onClick={() => {
                        setWalletAddress(search.address);
                        setSelectedChain(search.chain);
                      }}
                    >
                      <span className="wa-recent-chain">{SUPPORTED_CHAINS[search.chain]?.icon}</span>
                      <span>{formatAddress(search.address)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <section className="wa-progress-section">
            <div className="wa-progress-container">
              <div className="wa-scan-animation">
                <div className="wa-scan-target">
                  <div className="wa-scan-ring wa-scan-ring-1"></div>
                  <div className="wa-scan-ring wa-scan-ring-2"></div>
                  <div className="wa-scan-ring wa-scan-ring-3"></div>
                  <div className="wa-scan-core">
                    <span>🔬</span>
                  </div>
                  <div className="wa-scan-line" ref={scanLineRef}></div>
                </div>
              </div>
              <div className="wa-progress-info">
                <div className="wa-progress-stage">{analysisStage}</div>
                <div className="wa-progress-bar">
                  <div 
                    className="wa-progress-fill"
                    style={{ width: `${analysisProgress}%` }}
                  ></div>
                </div>
                <div className="wa-progress-percent">{analysisProgress}%</div>
              </div>
            </div>
          </section>
        )}

        {/* Results Section */}
        {analysisComplete && walletData && (
          <section className="wa-results-section">
            {/* Wallet DNA Card */}
            <div className="wa-dna-card">
              <div className="wa-dna-header">
                <div className="wa-dna-badge" style={{ backgroundColor: WALLET_TYPES[walletData.primaryType].color }}>
                  <span className="wa-dna-badge-icon">{WALLET_TYPES[walletData.primaryType].icon}</span>
                  <span className="wa-dna-badge-label">{WALLET_TYPES[walletData.primaryType].label}</span>
                </div>
                <div className="wa-dna-address">
                  <span className="wa-address-full">{formatAddress(walletData.address)}</span>
                  <a 
                    href={`${SUPPORTED_CHAINS[walletData.chain].explorer}/address/${walletData.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wa-explorer-link"
                  >
                    🔗 View on Explorer
                  </a>
                </div>
                <div className="wa-dna-chain">
                  <span className="wa-chain-badge" style={{ backgroundColor: SUPPORTED_CHAINS[walletData.chain].color }}>
                    {SUPPORTED_CHAINS[walletData.chain].icon} {SUPPORTED_CHAINS[walletData.chain].name}
                  </span>
                </div>
              </div>

              <div className="wa-dna-description">
                {WALLET_TYPES[walletData.primaryType].description}
              </div>

              {/* Key Metrics Grid */}
              <div className="wa-metrics-grid">
                <div className="wa-metric-card wa-metric-value">
                  <div className="wa-metric-icon">💰</div>
                  <div className="wa-metric-content">
                    <div className="wa-metric-label">Total Value</div>
                    <div className="wa-metric-value-text">${formatNumber(walletData.totalValue)}</div>
                  </div>
                  {walletData.isWhale && <div className="wa-whale-badge">🐋 Whale</div>}
                </div>

                <div className="wa-metric-card wa-metric-pnl">
                  <div className="wa-metric-icon">{walletData.metrics.totalPnL >= 0 ? '📈' : '📉'}</div>
                  <div className="wa-metric-content">
                    <div className="wa-metric-label">Total PnL</div>
                    <div className={`wa-metric-value-text ${walletData.metrics.totalPnL >= 0 ? 'positive' : 'negative'}`}>
                      {walletData.metrics.totalPnL >= 0 ? '+' : ''}{formatNumber(walletData.metrics.totalPnL)}
                    </div>
                  </div>
                </div>

                <div className="wa-metric-card wa-metric-trades">
                  <div className="wa-metric-icon">🔄</div>
                  <div className="wa-metric-content">
                    <div className="wa-metric-label">Total Trades</div>
                    <div className="wa-metric-value-text">{walletData.metrics.totalTrades}</div>
                  </div>
                </div>

                <div className="wa-metric-card wa-metric-age">
                  <div className="wa-metric-icon">📅</div>
                  <div className="wa-metric-content">
                    <div className="wa-metric-label">Wallet Age</div>
                    <div className="wa-metric-value-text">{walletData.walletAge} days</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Scores */}
            <div className="wa-scores-row">
              {/* Jeet Score */}
              <div className="wa-score-card">
                <div className="wa-score-header">
                  <span className="wa-score-title">🏃 Jeet Score</span>
                  <span className="wa-score-info" title="Measures how quickly wallet sells after buying. Lower is better.">ℹ️</span>
                </div>
                <div className="wa-score-gauge">
                  <svg viewBox="0 0 120 120" className="wa-gauge-svg">
                    <circle cx="60" cy="60" r="54" className="wa-gauge-bg" />
                    <circle 
                      cx="60" cy="60" r="54" 
                      className="wa-gauge-fill"
                      style={{ 
                        strokeDasharray: `${(walletData.metrics.jeetScore / 100) * 339} 339`,
                        stroke: getScoreColor(walletData.metrics.jeetScore, true)
                      }}
                    />
                  </svg>
                  <div className="wa-gauge-value">
                    <span className="wa-gauge-number">{walletData.metrics.jeetScore}</span>
                    <span className="wa-gauge-label">/100</span>
                  </div>
                </div>
                <div className="wa-score-verdict" style={{ color: getScoreColor(walletData.metrics.jeetScore, true) }}>
                  {getScoreLabel(walletData.metrics.jeetScore, 'jeet')}
                </div>
                <div className="wa-score-detail">
                  Avg hold: {walletData.metrics.avgHoldTime} days
                </div>
              </div>

              {/* Bot Probability */}
              <div className="wa-score-card">
                <div className="wa-score-header">
                  <span className="wa-score-title">🤖 Bot Probability</span>
                  <span className="wa-score-info" title="Likelihood of automated trading. Lower is more human-like.">ℹ️</span>
                </div>
                <div className="wa-score-gauge">
                  <svg viewBox="0 0 120 120" className="wa-gauge-svg">
                    <circle cx="60" cy="60" r="54" className="wa-gauge-bg" />
                    <circle 
                      cx="60" cy="60" r="54" 
                      className="wa-gauge-fill"
                      style={{ 
                        strokeDasharray: `${(walletData.metrics.botProbability / 100) * 339} 339`,
                        stroke: getScoreColor(walletData.metrics.botProbability, true)
                      }}
                    />
                  </svg>
                  <div className="wa-gauge-value">
                    <span className="wa-gauge-number">{walletData.metrics.botProbability}</span>
                    <span className="wa-gauge-label">%</span>
                  </div>
                </div>
                <div className="wa-score-verdict" style={{ color: getScoreColor(walletData.metrics.botProbability, true) }}>
                  {getScoreLabel(walletData.metrics.botProbability, 'bot')}
                </div>
                <div className="wa-score-detail">
                  Active {walletData.metrics.activeDays} of {walletData.walletAge} days
                </div>
              </div>

              {/* Win Rate */}
              <div className="wa-score-card">
                <div className="wa-score-header">
                  <span className="wa-score-title">🎯 Win Rate</span>
                  <span className="wa-score-info" title="Percentage of profitable trades. Higher is better.">ℹ️</span>
                </div>
                <div className="wa-score-gauge">
                  <svg viewBox="0 0 120 120" className="wa-gauge-svg">
                    <circle cx="60" cy="60" r="54" className="wa-gauge-bg" />
                    <circle 
                      cx="60" cy="60" r="54" 
                      className="wa-gauge-fill"
                      style={{ 
                        strokeDasharray: `${(walletData.metrics.winRate / 100) * 339} 339`,
                        stroke: getScoreColor(walletData.metrics.winRate)
                      }}
                    />
                  </svg>
                  <div className="wa-gauge-value">
                    <span className="wa-gauge-number">{walletData.metrics.winRate}</span>
                    <span className="wa-gauge-label">%</span>
                  </div>
                </div>
                <div className="wa-score-verdict" style={{ color: getScoreColor(walletData.metrics.winRate) }}>
                  {getScoreLabel(walletData.metrics.winRate, 'winRate')}
                </div>
                <div className="wa-score-detail">
                  {walletData.metrics.uniqueTokensTraded} tokens traded
                </div>
              </div>
            </div>

            {/* Holdings & Transactions */}
            <div className="wa-data-row">
              {/* Holdings */}
              <div className="wa-holdings-card">
                <h3 className="wa-card-title">
                  <span>💼</span> Token Holdings
                </h3>
                <div className="wa-holdings-list">
                  {walletData.holdings.map((token, idx) => (
                    <div key={idx} className="wa-holding-item">
                      <div className="wa-holding-info">
                        <span className="wa-holding-symbol">{token.symbol}</span>
                        <span className="wa-holding-name">{token.name}</span>
                      </div>
                      <div className="wa-holding-balance">
                        {typeof token.balance === 'number' ? formatNumber(token.balance) : token.balance}
                      </div>
                      <div className="wa-holding-value">${formatNumber(token.value)}</div>
                      <div className={`wa-holding-change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
                        {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="wa-transactions-card">
                <h3 className="wa-card-title">
                  <span>📜</span> Recent Activity
                </h3>
                <div className="wa-transactions-list">
                  {walletData.recentTransactions.map((tx, idx) => (
                    <div key={idx} className={`wa-tx-item ${tx.type}`}>
                      <div className="wa-tx-type">
                        <span className={`wa-tx-badge ${tx.type}`}>
                          {tx.type === 'buy' ? '🟢 BUY' : '🔴 SELL'}
                        </span>
                      </div>
                      <div className="wa-tx-details">
                        <span className="wa-tx-token">{tx.token}</span>
                        <span className="wa-tx-amount">${formatNumber(tx.value)}</span>
                      </div>
                      <div className="wa-tx-meta">
                        <span className="wa-tx-time">{formatTimeAgo(tx.timestamp)}</span>
                        <a 
                          href={`${SUPPORTED_CHAINS[walletData.chain].explorer}/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-tx-link"
                        >
                          🔗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk & Positive Factors */}
            <div className="wa-factors-row">
              {walletData.riskFactors.length > 0 && (
                <div className="wa-factors-card wa-risk-factors">
                  <h3 className="wa-card-title">
                    <span>⚠️</span> Risk Factors
                  </h3>
                  <div className="wa-factors-list">
                    {walletData.riskFactors.map((factor, idx) => (
                      <div key={idx} className="wa-factor-item risk">
                        <span className="wa-factor-icon">🔴</span>
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {walletData.positiveFactors.length > 0 && (
                <div className="wa-factors-card wa-positive-factors">
                  <h3 className="wa-card-title">
                    <span>✅</span> Positive Signals
                  </h3>
                  <div className="wa-factors-list">
                    {walletData.positiveFactors.map((factor, idx) => (
                      <div key={idx} className="wa-factor-item positive">
                        <span className="wa-factor-icon">🟢</span>
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="wa-disclaimer">
              <div className="wa-disclaimer-icon">ℹ️</div>
              <div className="wa-disclaimer-text">
                <strong>Data Transparency:</strong> All balance and transaction data is sourced directly from the blockchain and is 100% verifiable. 
                Classifications (Whale, Jeet, Bot) are algorithmic interpretations based on on-chain patterns. 
                Past performance does not guarantee future results. Always DYOR.
              </div>
            </div>

            {/* New Analysis Button */}
            <div className="wa-new-analysis">
              <button 
                className="wa-new-btn"
                onClick={() => {
                  setWalletAddress('');
                  setAnalysisComplete(false);
                  setWalletData(null);
                }}
              >
                🔍 Analyze Another Wallet
              </button>
            </div>
          </section>
        )}

        {/* Feature Cards (when no analysis) */}
        {!isAnalyzing && !analysisComplete && (
          <section className="wa-features-section">
            <div className="wa-features-grid">
              <div className="wa-feature-card">
                <div className="wa-feature-icon">🐋</div>
                <h3>Whale Detection</h3>
                <p>Identify wallets holding massive positions that can move markets</p>
              </div>
              <div className="wa-feature-card">
                <div className="wa-feature-icon">🏃</div>
                <h3>Jeet Analysis</h3>
                <p>Measure paper hands vs diamond hands with our proprietary Jeet Score</p>
              </div>
              <div className="wa-feature-card">
                <div className="wa-feature-icon">🤖</div>
                <h3>Bot Detection</h3>
                <p>Advanced algorithms to identify automated trading patterns</p>
              </div>
              <div className="wa-feature-card">
                <div className="wa-feature-icon">📊</div>
                <h3>PnL Tracking</h3>
                <p>Calculate profit & loss across all trades with verified data</p>
              </div>
              <div className="wa-feature-card">
                <div className="wa-feature-icon">🔗</div>
                <h3>Multi-Chain</h3>
                <p>Support for 10+ chains including Ethereum, Solana, BSC & more</p>
              </div>
              <div className="wa-feature-card">
                <div className="wa-feature-icon">✅</div>
                <h3>100% On-Chain</h3>
                <p>Every data point is verifiable directly on the blockchain</p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="wa-footer">
        <p>Powered by <span className="wa-footer-brand">AquaSwap</span> • Multi-Chain BEX</p>
      </footer>
    </div>
  );
};

export default WalletAnalyzer;

