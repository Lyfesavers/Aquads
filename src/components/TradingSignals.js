import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TradingSignals.css';

// Signal strength levels
export const SIGNAL_TYPES = {
  STRONG_BUY: { label: 'STRONG BUY', color: '#10b981', icon: '🚀', confidence: '80-100%' },
  BUY: { label: 'BUY', color: '#22c55e', icon: '📈', confidence: '60-79%' },
  NEUTRAL: { label: 'HOLD', color: '#f59e0b', icon: '⏸️', confidence: 'Mixed signals' },
  SELL: { label: 'SELL', color: '#f97316', icon: '📉', confidence: '60-79%' },
  STRONG_SELL: { label: 'STRONG SELL', color: '#ef4444', icon: '🔻', confidence: '80-100%' }
};

const TradingSignals = ({ tokenAddress, chain, tokenSymbol, isVisible, onClose, buttonRef, onSignalUpdate }) => {
  const [signalData, setSignalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const panelRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Calculate trading signals from DEX Screener data
  const calculateSignals = useCallback((pairData) => {
    if (!pairData) return null;

    const indicators = {
      momentum: { score: 0, status: 'neutral', detail: '' },
      volume: { score: 0, status: 'neutral', detail: '' },
      buyers: { score: 0, status: 'neutral', detail: '' },
      liquidity: { score: 0, status: 'neutral', detail: '' },
      trend: { score: 0, status: 'neutral', detail: '' }
    };

    // 1. MOMENTUM ANALYSIS
    // Check if price is moving up across multiple timeframes
    const m5 = parseFloat(pairData.priceChange?.m5 || 0);
    const h1 = parseFloat(pairData.priceChange?.h1 || 0);
    const h6 = parseFloat(pairData.priceChange?.h6 || 0);
    const h24 = parseFloat(pairData.priceChange?.h24 || 0);

    // Momentum score: +1 for each positive timeframe, -1 for each negative
    let momentumScore = 0;
    if (m5 > 0) momentumScore++; else if (m5 < -2) momentumScore--;
    if (h1 > 0) momentumScore++; else if (h1 < -3) momentumScore--;
    if (h6 > 0) momentumScore++; else if (h6 < -5) momentumScore--;

    if (momentumScore >= 2) {
      indicators.momentum = { score: 1, status: 'bullish', detail: `+${m5.toFixed(1)}% (5m), +${h1.toFixed(1)}% (1h)` };
    } else if (momentumScore <= -2) {
      indicators.momentum = { score: -1, status: 'bearish', detail: `${m5.toFixed(1)}% (5m), ${h1.toFixed(1)}% (1h)` };
    } else {
      indicators.momentum = { score: 0, status: 'neutral', detail: `${m5.toFixed(1)}% (5m), ${h1.toFixed(1)}% (1h)` };
    }

    // 2. VOLUME ANALYSIS
    // Compare recent volume to 24h average
    const vol5m = parseFloat(pairData.volume?.m5 || 0);
    const vol1h = parseFloat(pairData.volume?.h1 || 0);
    const vol24h = parseFloat(pairData.volume?.h24 || 1);
    const avgHourlyVol = vol24h / 24;
    const volumeRatio = avgHourlyVol > 0 ? vol1h / avgHourlyVol : 0;

    if (volumeRatio >= 2) {
      indicators.volume = { score: 1, status: 'bullish', detail: `${volumeRatio.toFixed(1)}x spike` };
    } else if (volumeRatio >= 1.3) {
      indicators.volume = { score: 0.5, status: 'bullish', detail: `${volumeRatio.toFixed(1)}x above avg` };
    } else if (volumeRatio < 0.5) {
      indicators.volume = { score: -1, status: 'bearish', detail: `${volumeRatio.toFixed(1)}x (low)` };
    } else {
      indicators.volume = { score: 0, status: 'neutral', detail: `${volumeRatio.toFixed(1)}x normal` };
    }

    // 3. BUYER/SELLER RATIO
    // Analyze transaction counts
    const buys1h = parseInt(pairData.txns?.h1?.buys || 0);
    const sells1h = parseInt(pairData.txns?.h1?.sells || 0);
    const totalTxns = buys1h + sells1h;
    const buyRatio = totalTxns > 0 ? (buys1h / totalTxns) * 100 : 50;

    if (buyRatio >= 65) {
      indicators.buyers = { score: 1, status: 'bullish', detail: `${buyRatio.toFixed(0)}% buyers` };
    } else if (buyRatio >= 55) {
      indicators.buyers = { score: 0.5, status: 'bullish', detail: `${buyRatio.toFixed(0)}% buyers` };
    } else if (buyRatio <= 35) {
      indicators.buyers = { score: -1, status: 'bearish', detail: `${(100 - buyRatio).toFixed(0)}% sellers` };
    } else if (buyRatio <= 45) {
      indicators.buyers = { score: -0.5, status: 'bearish', detail: `${(100 - buyRatio).toFixed(0)}% sellers` };
    } else {
      indicators.buyers = { score: 0, status: 'neutral', detail: `${buyRatio.toFixed(0)}% buyers` };
    }

    // 4. LIQUIDITY HEALTH
    const liquidity = parseFloat(pairData.liquidity?.usd || 0);
    
    if (liquidity >= 100000) {
      indicators.liquidity = { score: 1, status: 'bullish', detail: `$${(liquidity / 1000).toFixed(0)}K (Strong)` };
    } else if (liquidity >= 30000) {
      indicators.liquidity = { score: 0.5, status: 'bullish', detail: `$${(liquidity / 1000).toFixed(0)}K (Good)` };
    } else if (liquidity >= 10000) {
      indicators.liquidity = { score: 0, status: 'neutral', detail: `$${(liquidity / 1000).toFixed(0)}K (OK)` };
    } else {
      indicators.liquidity = { score: -1, status: 'bearish', detail: `$${(liquidity / 1000).toFixed(1)}K (Low)` };
    }

    // 5. TREND ALIGNMENT
    // Check if short-term trend aligns with medium-term
    // Bullish: Rising across timeframes, not overextended
    // Bearish: Falling or severely overextended (likely to correct)
    
    const isOverextended = h24 > 100; // Up 100%+ in 24h is risky
    const shortTermUp = m5 > 0 && h1 > 0;
    const shortTermDown = m5 < 0 && h1 < 0;
    const mediumTermUp = h6 > 0;
    const mediumTermDown = h6 < 0;

    if (isOverextended) {
      indicators.trend = { score: -0.5, status: 'bearish', detail: `+${h24.toFixed(0)}% (24h) - Caution` };
    } else if (shortTermUp && mediumTermUp) {
      indicators.trend = { score: 1, status: 'bullish', detail: 'Aligned uptrend' };
    } else if (shortTermDown && mediumTermDown) {
      indicators.trend = { score: -1, status: 'bearish', detail: 'Aligned downtrend' };
    } else if (shortTermUp && !mediumTermUp) {
      indicators.trend = { score: 0.5, status: 'neutral', detail: 'Potential reversal up' };
    } else if (shortTermDown && !mediumTermDown) {
      indicators.trend = { score: -0.5, status: 'neutral', detail: 'Potential pullback' };
    } else {
      indicators.trend = { score: 0, status: 'neutral', detail: 'Consolidating' };
    }

    // CALCULATE OVERALL SIGNAL
    const totalScore = 
      indicators.momentum.score + 
      indicators.volume.score + 
      indicators.buyers.score + 
      indicators.liquidity.score + 
      indicators.trend.score;

    const maxScore = 5;
    const normalizedScore = totalScore / maxScore; // -1 to 1

    let signal;
    let confidence;
    
    if (normalizedScore >= 0.6) {
      signal = SIGNAL_TYPES.STRONG_BUY;
      confidence = Math.min(100, Math.round(60 + normalizedScore * 40));
    } else if (normalizedScore >= 0.3) {
      signal = SIGNAL_TYPES.BUY;
      confidence = Math.round(50 + normalizedScore * 30);
    } else if (normalizedScore <= -0.6) {
      signal = SIGNAL_TYPES.STRONG_SELL;
      confidence = Math.min(100, Math.round(60 + Math.abs(normalizedScore) * 40));
    } else if (normalizedScore <= -0.3) {
      signal = SIGNAL_TYPES.SELL;
      confidence = Math.round(50 + Math.abs(normalizedScore) * 30);
    } else {
      signal = SIGNAL_TYPES.NEUTRAL;
      confidence = Math.round(50 - Math.abs(normalizedScore) * 20);
    }

    // Calculate suggested entry, target, and stop loss
    const currentPrice = parseFloat(pairData.priceUsd || 0);
    const entryZone = {
      low: currentPrice * 0.98,
      high: currentPrice * 1.02
    };
    
    const targetPercent = signal === SIGNAL_TYPES.STRONG_BUY ? 25 : 
                          signal === SIGNAL_TYPES.BUY ? 15 : 
                          signal === SIGNAL_TYPES.SELL ? -10 : 
                          signal === SIGNAL_TYPES.STRONG_SELL ? -15 : 0;
    
    const stopLossPercent = signal.label.includes('BUY') ? -8 : 
                            signal.label.includes('SELL') ? 8 : 5;

    return {
      signal,
      confidence,
      indicators,
      price: currentPrice,
      entryZone,
      targetPercent,
      stopLossPercent,
      pairInfo: {
        name: pairData.baseToken?.name || tokenSymbol,
        symbol: pairData.baseToken?.symbol || tokenSymbol,
        dex: pairData.dexId,
        chain: pairData.chainId
      }
    };
  }, [tokenSymbol]);

  // Fetch data from DEX Screener API
  const fetchSignalData = useCallback(async () => {
    if (!tokenAddress || !chain) {
      setError('No token selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try pairs endpoint first (more reliable for specific pair)
      let response = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/${chain}/${tokenAddress}`
      );
      
      let data = await response.json();
      let pair = data.pair || data.pairs?.[0];

      // If no pair found, try tokens endpoint
      if (!pair) {
        response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
        );
        data = await response.json();
        
        // Get the pair with highest liquidity
        if (data.pairs && data.pairs.length > 0) {
          pair = data.pairs.sort((a, b) => 
            (parseFloat(b.liquidity?.usd) || 0) - (parseFloat(a.liquidity?.usd) || 0)
          )[0];
        }
      }

      if (pair) {
        const signals = calculateSignals(pair);
        setSignalData(signals);
        setLastUpdate(new Date());
        // Notify parent component of signal update
        if (onSignalUpdate) {
          onSignalUpdate(signals);
        }
      } else {
        setError('No trading data found for this token');
        // Notify parent that no signal is available
        if (onSignalUpdate) {
          onSignalUpdate(null);
        }
      }
    } catch (err) {
      console.error('Error fetching signal data:', err);
      setError('Failed to fetch trading data');
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, chain, calculateSignals]);

  // Fetch data when token changes (always, not just when visible)
  useEffect(() => {
    if (tokenAddress) {
      fetchSignalData();
      
      // Auto-refresh every 30 seconds
      refreshIntervalRef.current = setInterval(fetchSignalData, 30000);
    } else {
      // Clear signal when no token
      setSignalData(null);
      if (onSignalUpdate) {
        onSignalUpdate(null);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [tokenAddress, fetchSignalData, onSignalUpdate]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose, buttonRef]);

  // Always render the panel when visible, but fetch data regardless
  if (!isVisible) {
    // Component still mounted to fetch data, just not visible
    return null;
  }

  const formatPrice = (price) => {
    if (price < 0.00001) return price.toExponential(4);
    if (price < 0.01) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const getIndicatorIcon = (status) => {
    switch (status) {
      case 'bullish': return '✅';
      case 'bearish': return '❌';
      default: return '➖';
    }
  };

  return (
    <div className="trading-signals-panel" ref={panelRef}>
      <div className="signals-header">
        <div className="signals-title">
          <span className="signals-icon">🎯</span>
          <span>AQUADS SIGNAL ALGO</span>
        </div>
        <button className="signals-close" onClick={onClose}>×</button>
      </div>

      <div className="signals-content">
        {loading && !signalData ? (
          <div className="signals-loading">
            <div className="signals-spinner"></div>
            <span>Analyzing market data...</span>
          </div>
        ) : error ? (
          <div className="signals-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button className="retry-btn" onClick={fetchSignalData}>Retry</button>
          </div>
        ) : signalData ? (
          <>
            {/* Main Signal */}
            <div className="main-signal" style={{ '--signal-color': signalData.signal.color }}>
              <div className="signal-badge">
                <span className="signal-icon">{signalData.signal.icon}</span>
                <span className="signal-label">{signalData.signal.label}</span>
              </div>
              <div className="signal-confidence">
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill" 
                    style={{ 
                      width: `${signalData.confidence}%`,
                      background: signalData.signal.color 
                    }}
                  ></div>
                </div>
                <span className="confidence-value">{signalData.confidence}% confidence</span>
              </div>
            </div>

            {/* Indicators Breakdown */}
            <div className="indicators-section">
              <div className="indicator-row">
                <span className="indicator-icon">{getIndicatorIcon(signalData.indicators.momentum.status)}</span>
                <span className="indicator-name">Momentum</span>
                <span className={`indicator-value ${signalData.indicators.momentum.status}`}>
                  {signalData.indicators.momentum.detail}
                </span>
              </div>
              <div className="indicator-row">
                <span className="indicator-icon">{getIndicatorIcon(signalData.indicators.volume.status)}</span>
                <span className="indicator-name">Volume</span>
                <span className={`indicator-value ${signalData.indicators.volume.status}`}>
                  {signalData.indicators.volume.detail}
                </span>
              </div>
              <div className="indicator-row">
                <span className="indicator-icon">{getIndicatorIcon(signalData.indicators.buyers.status)}</span>
                <span className="indicator-name">Buyers</span>
                <span className={`indicator-value ${signalData.indicators.buyers.status}`}>
                  {signalData.indicators.buyers.detail}
                </span>
              </div>
              <div className="indicator-row">
                <span className="indicator-icon">{getIndicatorIcon(signalData.indicators.liquidity.status)}</span>
                <span className="indicator-name">Liquidity</span>
                <span className={`indicator-value ${signalData.indicators.liquidity.status}`}>
                  {signalData.indicators.liquidity.detail}
                </span>
              </div>
              <div className="indicator-row">
                <span className="indicator-icon">{getIndicatorIcon(signalData.indicators.trend.status)}</span>
                <span className="indicator-name">Trend</span>
                <span className={`indicator-value ${signalData.indicators.trend.status}`}>
                  {signalData.indicators.trend.detail}
                </span>
              </div>
            </div>

            {/* Trading Levels */}
            {signalData.signal.label !== 'HOLD' && (
              <div className="trading-levels">
                <div className="level-row">
                  <span className="level-label">Entry Zone</span>
                  <span className="level-value">
                    ${formatPrice(signalData.entryZone.low)} - ${formatPrice(signalData.entryZone.high)}
                  </span>
                </div>
                <div className="level-row">
                  <span className="level-label">Target</span>
                  <span className="level-value target">
                    {signalData.targetPercent > 0 ? '+' : ''}{signalData.targetPercent}%
                  </span>
                </div>
                <div className="level-row">
                  <span className="level-label">Stop Loss</span>
                  <span className="level-value stop">
                    {signalData.stopLossPercent}%
                  </span>
                </div>
              </div>
            )}

            {/* Update Info */}
            <div className="signals-footer">
              <span className="update-time">
                ⏱️ Updated {lastUpdate ? `${Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago` : 'just now'}
              </span>
              <button className="refresh-btn" onClick={fetchSignalData} disabled={loading}>
                {loading ? '⟳' : '🔄'} Refresh
              </button>
            </div>

            {/* Disclaimer */}
            <div className="signals-disclaimer">
              ⚠️ Not financial advice. Trading crypto involves significant risk. Always DYOR.
            </div>
          </>
        ) : (
          <div className="signals-empty">
            <span>Select a token to analyze</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingSignals;

