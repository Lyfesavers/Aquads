import React, { useState, useEffect, useRef } from 'react';
import TokenSparkline from './TokenSparkline';
import TokenRating from './TokenRating';
import { FaGlobe, FaTwitter, FaTelegram, FaDiscord, FaGithub, FaReddit, FaSearch, FaTimes } from 'react-icons/fa';
import { Helmet } from 'react-helmet';
import TokenDetails from './TokenDetails';
import TokenReviews from './TokenReviews';
import SocialMediaRaids from './SocialMediaRaids';
import FacebookRaids from './FacebookRaids';
import logger from '../utils/logger';
import { BACKEND_URL } from '../services/api';

/** Stable sort for token table — fixes duplicate/out-of-order # when using CoinGecko rank on a differently sorted list. */
const sortTokenList = (items, key, direction) => {
  if (!Array.isArray(items)) return [];
  const mult = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const tieBreak = () => {
      const ra = Number(a.marketCapRank);
      const rb = Number(b.marketCapRank);
      if (Number.isFinite(ra) && Number.isFinite(rb) && ra !== rb) {
        return ra < rb ? -1 : 1;
      }
      return String(a.id || '').localeCompare(String(b.id || ''));
    };

    let cmp = 0;
    if (key === 'name') {
      cmp = String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
    } else {
      const na = Number(a[key]);
      const nb = Number(b[key]);
      if (Number.isFinite(na) && Number.isFinite(nb)) {
        if (na !== nb) cmp = na < nb ? -1 : 1;
      } else {
        cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
      }
    }
    if (cmp !== 0) return cmp * mult;
    return tieBreak();
  });
};

const BACKEND_API = BACKEND_URL;

const DEX_OPTIONS = [
  {
    name: 'AquaSwap',
    icon: '💧',
    url: '/aquaswap',
    description: 'the ultimate cross-chain DEX for all your crypto needs',
    custom: true,
    featured: true
  }
];

const formatCurrency = (value) => {
  if (!value) return 'N/A';
  
  const trillion = 1e12;
  const billion = 1e9;
  const million = 1e6;
  
  if (value >= trillion) {
    return `$${(value / trillion).toFixed(2)}T`;
  } else if (value >= billion) {
    return `$${(value / billion).toFixed(2)}B`;
  } else if (value >= million) {
    return `$${(value / million).toFixed(2)}M`;
  } else {
    return `$${value.toLocaleString()}`;
  }
};

const formatFullCurrency = (value) => {
  if (!value) return 'N/A';
  return `$${Math.round(value).toLocaleString('en-US')}`;
};

/** Keeps sub-cent tokens readable instead of collapsing them all to "$0.00". */
const formatPrice = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  if (n === 0) return '$0.00';
  if (n >= 1) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (n >= 0.01) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
};

/** Full-bleed page shell so the table uses the entire viewport width on every breakpoint. */
const SHELL_CLASS = 'w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4';

/** Column count of the desktop table — the expanded details row must span all of them. */
const DESKTOP_COLUMN_COUNT = 9;

const TH_BASE =
  'px-3 lg:px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap select-none';
const TD_BASE = 'px-3 lg:px-4 py-3.5';

/**
 * Live market-sentiment badge that replaces the old inaccurate global sparklines.
 * The `signal` payload is computed server-side from CoinGecko's live 24h market-cap
 * change and our derived 24h volume change (see `buildMarketSignal` in server/routes/tokens.js).
 * Purely informational — the tooltip makes clear it's a sentiment indicator, not advice.
 */
const MarketSignalBadge = ({ signal }) => {
  if (!signal || !signal.label) return null;

  const label = signal.label;
  const strength = signal.strength || 'neutral';

  const styles =
    label === 'Buy'
      ? {
          wrap: 'bg-green-500/10 border-green-500/40 text-green-300',
          dot: 'bg-green-400',
          arrow: '▲'
        }
      : label === 'Sell'
      ? {
          wrap: 'bg-red-500/10 border-red-500/40 text-red-300',
          dot: 'bg-red-400',
          arrow: '▼'
        }
      : {
          wrap: 'bg-gray-500/10 border-gray-500/40 text-gray-300',
          dot: 'bg-gray-400',
          arrow: '•'
        };

  const strengthLabel =
    strength === 'strong' ? 'Strong' : strength === 'moderate' ? 'Moderate' : '';

  const tooltip = `${strengthLabel ? strengthLabel + ' ' : ''}${label} signal${
    signal.reason ? ` — ${signal.reason}` : ''
  }. Sentiment indicator based on 24h market data. Not financial advice.`;

  return (
    <div
      className={`shrink-0 flex flex-col items-end gap-1 rounded-md border px-3 py-2 ${styles.wrap}`}
      title={tooltip}
    >
      <div className="flex items-center gap-1.5 text-sm font-semibold leading-none">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles.dot}`} />
        <span>{styles.arrow}</span>
        <span>{label}</span>
      </div>
      {strengthLabel && (
        <div className="text-[10px] uppercase tracking-wider opacity-80 leading-none">
          {strengthLabel}
        </div>
      )}
    </div>
  );
};

/**
 * Volume-side companion to the market signal. Uses only the derived 24h volume change
 * so users get a direct read on trading activity — Rising when volume is meaningfully
 * up, Falling when meaningfully down, Steady otherwise. Renders nothing until we have
 * ~24h of snapshots to compare against.
 */
const VolumeTrendBadge = ({ volumeChange }) => {
  if (typeof volumeChange !== 'number' || !Number.isFinite(volumeChange)) return null;

  const styles =
    volumeChange >= 10
      ? {
          wrap: 'bg-green-500/10 border-green-500/40 text-green-300',
          dot: 'bg-green-400',
          arrow: '▲',
          label: 'Rising'
        }
      : volumeChange <= -10
      ? {
          wrap: 'bg-red-500/10 border-red-500/40 text-red-300',
          dot: 'bg-red-400',
          arrow: '▼',
          label: 'Falling'
        }
      : {
          wrap: 'bg-gray-500/10 border-gray-500/40 text-gray-300',
          dot: 'bg-gray-400',
          arrow: '•',
          label: 'Steady'
        };

  const tooltip = `Volume ${styles.label.toLowerCase()} — 24h change ${
    volumeChange >= 0 ? '+' : ''
  }${volumeChange.toFixed(2)}% vs. 24h ago.`;

  return (
    <div
      className={`shrink-0 flex flex-col items-end gap-1 rounded-md border px-3 py-2 ${styles.wrap}`}
      title={tooltip}
    >
      <div className="flex items-center gap-1.5 text-sm font-semibold leading-none">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles.dot}`} />
        <span>{styles.arrow}</span>
        <span>{styles.label}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wider opacity-80 leading-none">
        24h volume
      </div>
    </div>
  );
};

const TokenList = ({
  currentUser,
  showNotification,
  tokens = [],
  globalStats = null,
  tokensLoading = false,
  tokensError = null,
  tokensSocketConnected = false,
  onTokenDetailsOpenChange,
}) => {
  const [filteredTokens, setFilteredTokens] = useState(() =>
    sortTokenList(Array.isArray(tokens) ? tokens : [], 'marketCapRank', 'asc')
  );
  const [selectedToken, setSelectedToken] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'marketCapRank', direction: 'asc' });
  const [showDexFrame, setShowDexFrame] = useState(true);
  const [selectedDex, setSelectedDex] = useState(null);
  const [viewMode, setViewMode] = useState('tokens');
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sortConfigRef = useRef({ key: 'marketCapRank', direction: 'asc' });
  sortConfigRef.current = sortConfig;

  // Get tokens to display (paginated)
  const displayedTokens = filteredTokens.slice(0, displayCount);
  const hasMoreTokens = displayCount < filteredTokens.length;

  // Load more handler
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Simulate a small delay for better UX
    setTimeout(() => {
      setDisplayCount(prev => prev + 20);
      setIsLoadingMore(false);
    }, 300);
  };



  // Sorting (desktop column headers)
  const handleColumnSort = (key) => {
    let direction;
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'desc' ? 'asc' : 'desc';
    } else {
      direction = key === 'marketCapRank' || key === 'name' ? 'asc' : 'desc';
    }
    setSortConfig({ key, direction });
    setDisplayCount(20);
    setFilteredTokens((prev) => sortTokenList(prev, key, direction));
  };

  const handleSearch = async (searchTerm) => {
    try {
      setIsSearchLoading(true);
    setSearchTerm(searchTerm);
    setDisplayCount(20); // Reset pagination when searching
    
      if (!searchTerm.trim()) {
        const cfg = sortConfigRef.current;
        setFilteredTokens(sortTokenList(tokens, cfg.key, cfg.direction));
        setIsSearchLoading(false);
      return;
    }

      const response = await fetch(`${BACKEND_API}/api/tokens?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        const cfg = sortConfigRef.current;
        setFilteredTokens(sortTokenList(data, cfg.key, cfg.direction));
      } else {
        // Fallback to client-side filtering
        const filtered = tokens.filter(token => 
          token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          token.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const cfg = sortConfigRef.current;
        setFilteredTokens(sortTokenList(filtered, cfg.key, cfg.direction));
      }
    } catch (error) {
      logger.error('Search error:', error);
      // Fallback to client-side filtering
      const filtered = tokens.filter(token => 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const cfg = sortConfigRef.current;
      setFilteredTokens(sortTokenList(filtered, cfg.key, cfg.direction));
    } finally {
      setIsSearchLoading(false);
    }
  };

  // Keep table rows in sync when parent token list updates (socket / background refresh).
  useEffect(() => {
    if (searchTerm.trim()) return;
    const cfg = sortConfigRef.current;
    setFilteredTokens(sortTokenList(tokens, cfg.key, cfg.direction));
  }, [tokens, searchTerm]);

  useEffect(() => {
    onTokenDetailsOpenChange?.(showDetails);
  }, [showDetails, onTokenDetailsOpenChange]);

  // DEX integration
  const handleDexClick = (dex) => {
    setSelectedDex(dex);
    setShowDexFrame(true);
    
    // Special handling for AquaSwap
    if (dex.custom) {
      // For the new AquaSwap page, redirect directly
      if (dex.url === '/aquaswap') {
        window.location.href = dex.url;
        return;
      }
    }
  };

  const handleCloseReviews = () => {
    setShowReviews(false);
    setSelectedToken(null);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
  };



  const handleTokenClick = async (token) => {
    try {
      setSelectedToken(token);
      setShowDetails(true);
    } catch (error) {
      logger.error('Error handling token click:', error);
      showNotification('Failed to load token details', 'error');
    }
  };

  const handleReviewClick = (e, token) => {
    e.stopPropagation();
    setSelectedToken(token);
    setShowReviews(true);
  };



  const sortArrow = (key) =>
    sortConfig.key === key ? (
      <span className="ml-1 text-blue-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
    ) : null;

  const thTone = (key) =>
    sortConfig.key === key ? 'text-blue-300' : 'text-gray-400 hover:text-white';

  // Render loading state
  if (tokensLoading && tokens.length === 0) {
    return (
      <div className={SHELL_CLASS}>
        <div className="rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-xl p-6">
          <div className="flex flex-col justify-center items-center h-64 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
            <div className="text-gray-300 text-sm">Loading tokens…</div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (tokensError && tokens.length === 0) {
    return (
      <div className={SHELL_CLASS}>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] backdrop-blur-xl p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-red-300 text-sm">Error: {tokensError}</div>
          </div>
        </div>
      </div>
    );
  }

  // Rest of your component code...
  return (
    <div className={SHELL_CLASS}>
      <Helmet>
        <title>List your token free | Aquads bubble map — launch stack</title>
        <meta
          name="description"
          content="List your new crypto project free on the Aquads bubble map—your storefront after launch. Community votes, bumps, BexTools trending, and tools to grow in your first 30 days."
        />
        <link rel="canonical" href="https://www.aquads.xyz/home" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aquads.xyz/home" />
        <meta property="og:title" content="List your token free | Aquads launch stack" />
        <meta
          property="og:description"
          content="Your project storefront after launch—free bubble listing, community growth, hire help, and AquaPay on one platform."
        />
        <meta property="og:image" content="https://www.aquads.xyz/metalogo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="List your token free | Aquads launch stack" />
        <meta
          name="twitter:description"
          content="Your project storefront after launch—free bubble listing, community growth, hire help, and AquaPay on one platform."
        />
        <meta name="twitter:image" content="https://www.aquads.xyz/metalogo.png" />
      </Helmet>

      <div className="mb-4 rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-xl shadow-lg shadow-black/20 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
          <div className="flex-1 min-w-0">
            {viewMode === 'tokens' ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-0 sm:max-w-md">
                  <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search tokens..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-800/70 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/40 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => handleSearch('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      <FaTimes className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {/* Connection status indicator */}
                <div className="flex items-center gap-2 shrink-0 rounded-full border border-white/10 bg-gray-800/50 px-3 py-1.5 text-xs">
                  <span className="relative flex h-2 w-2">
                    {tokensSocketConnected && (
                      <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 animate-ping" />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${
                        tokensSocketConnected ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    />
                  </span>
                  <span className="text-gray-300 whitespace-nowrap">
                    {tokensSocketConnected ? 'Live updates' : 'Fallback mode'}
                  </span>
                </div>
              </div>
            ) : viewMode === 'facebook-raids' ? (
              <h2 className="text-xl font-semibold text-white">Facebook Raids</h2>
            ) : (
              <h2 className="text-xl font-semibold text-white">Social Media Raids</h2>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-gray-800/60 p-1">
              <button
                onClick={() => setViewMode('tokens')}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  viewMode === 'tokens'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Tokens
              </button>
              <button
                onClick={() => setViewMode('raids')}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  viewMode === 'raids'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Twitter Raids
              </button>
              <button
                onClick={() => setViewMode('facebook-raids')}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  viewMode === 'facebook-raids'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Facebook Raids
              </button>
            </div>

            {viewMode === 'tokens' && (
              <div className="flex items-center gap-2">
                <select
                  value={sortConfig.key}
                  onChange={(e) => {
                    const k = e.target.value;
                    const dir = sortConfig.direction;
                    setSortConfig({ key: k, direction: dir });
                    setDisplayCount(20);
                    setFilteredTokens((prev) => sortTokenList(prev, k, dir));
                  }}
                  className="rounded-xl border border-white/10 bg-gray-800/60 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="marketCapRank">Rank</option>
                  <option value="name">Name</option>
                  <option value="marketCap">Market Cap</option>
                  <option value="currentPrice">Price</option>
                  <option value="priceChangePercentage24h">24h Change</option>
                  <option value="totalVolume">Volume</option>
                  <option value="fullyDilutedValuation">FDV</option>
                </select>

                <button
                  onClick={() => {
                    const newOrder = sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfig({ key: sortConfig.key, direction: newOrder });
                    setDisplayCount(20);
                    setFilteredTokens((prev) => sortTokenList(prev, sortConfig.key, newOrder));
                  }}
                  aria-label={`Sort ${sortConfig.direction === 'asc' ? 'descending' : 'ascending'}`}
                  className="rounded-xl border border-white/10 bg-gray-800/60 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden">
        {viewMode === 'tokens' ? (
          <>
            {/* Global market stats */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Global Market Cap
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl xl:text-3xl font-bold text-white tabular-nums truncate">
                      {globalStats ? formatFullCurrency(globalStats.totalMarketCap) : '—'}
                    </div>
                    {globalStats && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm font-medium ${
                          globalStats.marketCapChangePercentage24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {globalStats.marketCapChangePercentage24h >= 0 ? '▲' : '▼'}{' '}
                          {Math.abs(globalStats.marketCapChangePercentage24h).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">past 24h</span>
                      </div>
                    )}
                  </div>
                  {globalStats?.marketSignal && (
                    <MarketSignalBadge signal={globalStats.marketSignal} />
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Global 24h Trading Volume
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl xl:text-3xl font-bold text-white tabular-nums truncate">
                      {globalStats ? formatFullCurrency(globalStats.totalVolume24h) : '—'}
                    </div>
                    {globalStats && typeof globalStats.volumeChangePercentage24h === 'number' && Number.isFinite(globalStats.volumeChangePercentage24h) && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm font-medium ${
                          globalStats.volumeChangePercentage24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {globalStats.volumeChangePercentage24h >= 0 ? '▲' : '▼'}{' '}
                          {Math.abs(globalStats.volumeChangePercentage24h).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">past 24h</span>
                      </div>
                    )}
                  </div>
                  <VolumeTrendBadge volumeChange={globalStats?.volumeChangePercentage24h} />
                </div>
              </div>
            </div>

            {/* Token list header */}
            <div className="px-3 sm:px-4 lg:px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
                  <h2 className="text-base md:text-lg font-semibold text-white tracking-tight">
                    Token List
                  </h2>
                </div>
                <span className="text-xs sm:text-sm text-gray-500 tabular-nums">
                  Showing <span className="text-gray-300 font-medium">{displayedTokens.length}</span> of{' '}
                  <span className="text-gray-300 font-medium">{filteredTokens.length}</span> tokens
                </span>
              </div>
            </div>

            {/* Token list table */}
            {filteredTokens.length > 0 ? (
              <>
                {/* Desktop/Tablet Table View (hidden on mobile) */}
                <div className="w-full hidden md:block overflow-x-auto">
                  <table className="w-full table-fixed min-w-[820px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th
                          className={`${TH_BASE} w-[56px] text-left cursor-pointer ${thTone('marketCapRank')}`}
                          onClick={() => handleColumnSort('marketCapRank')}
                        >
                          #{sortArrow('marketCapRank')}
                        </th>
                        <th
                          className={`${TH_BASE} w-[20%] text-left cursor-pointer ${thTone('name')}`}
                          onClick={() => handleColumnSort('name')}
                        >
                          Token{sortArrow('name')}
                        </th>
                        <th
                          className={`${TH_BASE} w-[12%] text-right cursor-pointer ${thTone('currentPrice')}`}
                          onClick={() => handleColumnSort('currentPrice')}
                        >
                          Price{sortArrow('currentPrice')}
                        </th>
                        <th
                          className={`${TH_BASE} w-[10%] text-right cursor-pointer ${thTone('priceChangePercentage24h')}`}
                          onClick={() => handleColumnSort('priceChangePercentage24h')}
                        >
                          24h %{sortArrow('priceChangePercentage24h')}
                        </th>
                        <th
                          className={`${TH_BASE} w-[13%] text-right cursor-pointer ${thTone('marketCap')}`}
                          onClick={() => handleColumnSort('marketCap')}
                        >
                          Market Cap{sortArrow('marketCap')}
                        </th>
                        <th
                          className={`${TH_BASE} w-[13%] text-right cursor-pointer ${thTone('totalVolume')}`}
                          onClick={() => handleColumnSort('totalVolume')}
                        >
                          Volume 24h{sortArrow('totalVolume')}
                        </th>
                        <th
                          scope="col"
                          className={`${TH_BASE} hidden xl:table-cell w-[11%] text-right cursor-pointer ${thTone('fullyDilutedValuation')}`}
                          onClick={() => handleColumnSort('fullyDilutedValuation')}
                        >
                          FDV{sortArrow('fullyDilutedValuation')}
                        </th>
                        <th scope="col" className={`${TH_BASE} hidden lg:table-cell w-[130px] text-center text-gray-400`}>
                          Last 7d
                        </th>
                        <th scope="col" className={`${TH_BASE} w-[15%] text-right text-gray-400`}>
                          Rating
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {displayedTokens.map((token, index) => {
                        const isOpen = Boolean(selectedToken && showDetails && selectedToken.id === token.id);
                        const change = Number(token.priceChangePercentage24h) || 0;
                        const isUp = change >= 0;

                        return (
                          <React.Fragment key={token.id}>
                            <tr
                              className={`group cursor-pointer transition-colors ${
                                isOpen ? 'bg-blue-500/[0.08]' : 'hover:bg-white/[0.04]'
                              }`}
                              onClick={() => handleTokenClick(token)}
                            >
                              <td className={`${TD_BASE} text-sm text-gray-500 tabular-nums`}>
                                {token.marketCapRank || index + 1}
                              </td>
                              <td className={TD_BASE}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={token.image}
                                    alt={token.name}
                                    className="h-8 w-8 rounded-full flex-shrink-0 bg-gray-800 ring-1 ring-white/10"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/placeholder.png';
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                                      {token.name}
                                    </div>
                                    <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 truncate">
                                      {token.symbol}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className={`${TD_BASE} text-right text-sm font-medium text-white tabular-nums`}>
                                {formatPrice(token.currentPrice)}
                              </td>
                              <td className={`${TD_BASE} text-right`}>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${
                                    isUp
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-rose-500/10 text-rose-400'
                                  }`}
                                >
                                  <span className="text-[8px] leading-none">{isUp ? '▲' : '▼'}</span>
                                  {Math.abs(change).toFixed(2)}%
                                </span>
                              </td>
                              <td className={`${TD_BASE} text-right text-sm text-gray-300 tabular-nums`}>
                                {formatCurrency(token.marketCap)}
                              </td>
                              <td className={`${TD_BASE} text-right text-sm text-gray-300 tabular-nums`}>
                                {formatCurrency(token.totalVolume)}
                              </td>
                              <td className={`${TD_BASE} hidden xl:table-cell text-right text-sm text-gray-400 tabular-nums`}>
                                {formatCurrency(token.fullyDilutedValuation)}
                              </td>
                              <td
                                className={`${TD_BASE} hidden lg:table-cell text-center`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex justify-center">
                                  <TokenSparkline prices={token.sparklineIn7d} width={110} height={30} />
                                </div>
                              </td>
                              <td className={`${TD_BASE} text-right`}>
                                <div className="flex items-center justify-end gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-2 py-1 text-xs font-semibold text-white tabular-nums">
                                    <span className="text-amber-400">★</span>
                                    <TokenRating symbol={token.symbol} />
                                  </span>
                                  <button
                                    onClick={(e) => handleReviewClick(e, token)}
                                    className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 transition-colors"
                                  >
                                    Reviews
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isOpen && (
                              <TokenDetails
                                token={selectedToken}
                                showReviews={showReviews}
                                onClose={handleCloseDetails}
                                currentUser={currentUser}
                                showNotification={showNotification}
                                showDexFrame={showDexFrame}
                                selectedDex={selectedDex}
                                onDexClick={handleDexClick}
                                setShowDexFrame={setShowDexFrame}
                                isMobile={false}
                                colSpan={DESKTOP_COLUMN_COUNT}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (visible only on mobile) */}
                <div className="w-full md:hidden space-y-2.5 p-3 sm:p-4">
                  {displayedTokens.map((token, index) => {
                    const isOpen = Boolean(selectedToken && showDetails && selectedToken.id === token.id);
                    const change = Number(token.priceChangePercentage24h) || 0;
                    const isUp = change >= 0;

                    return (
                      <React.Fragment key={token.id}>
                        <div
                          className={`rounded-xl border p-3.5 cursor-pointer transition-colors ${
                            isOpen
                              ? 'border-blue-500/40 bg-blue-500/[0.08]'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                          }`}
                          onClick={() => handleTokenClick(token)}
                        >
                          {/* Token Header */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md bg-white/[0.06] text-[11px] font-semibold text-gray-400 tabular-nums">
                                {token.marketCapRank || index + 1}
                              </span>
                              <img
                                src={token.image}
                                alt={token.name}
                                className="h-8 w-8 rounded-full flex-shrink-0 bg-gray-800 ring-1 ring-white/10"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/placeholder.png';
                                }}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white truncate">{token.name}</div>
                                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 truncate">
                                  {token.symbol}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <TokenSparkline prices={token.sparklineIn7d} width={64} height={24} />
                              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-1.5 py-1 text-[11px] font-semibold text-white tabular-nums">
                                <span className="text-amber-400">★</span>
                                <TokenRating symbol={token.symbol} />
                              </span>
                            </div>
                          </div>

                          {/* Token Data Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Price</div>
                              <div className="text-sm text-white font-semibold tabular-nums truncate">
                                {formatPrice(token.currentPrice)}
                              </div>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                              <div className="text-[10px] text-gray-500 uppercase tracking-wider">24h %</div>
                              <div className={`text-sm font-semibold tabular-nums ${
                                isUp ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                              </div>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Market Cap</div>
                              <div className="text-sm text-white tabular-nums truncate">
                                {formatCurrency(token.marketCap)}
                              </div>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Volume 24h</div>
                              <div className="text-sm text-white tabular-nums truncate">
                                {formatCurrency(token.totalVolume)}
                              </div>
                            </div>
                          </div>

                          {/* Reviews Button */}
                          <div className="mt-3 pt-3 border-t border-white/[0.06]">
                            <button
                              onClick={(e) => handleReviewClick(e, token)}
                              className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 transition-colors"
                            >
                              View Reviews
                            </button>
                          </div>
                        </div>
                        {isOpen && (
                          <TokenDetails
                            token={selectedToken}
                            showReviews={showReviews}
                            onClose={handleCloseDetails}
                            currentUser={currentUser}
                            showNotification={showNotification}
                            showDexFrame={showDexFrame}
                            selectedDex={selectedDex}
                            onDexClick={handleDexClick}
                            setShowDexFrame={setShowDexFrame}
                            isMobile={true}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {hasMoreTokens && (
                  <div className="p-3 sm:p-4 lg:p-5 border-t border-white/10">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:shadow-blue-500/25"
                    >
                      {isLoadingMore ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <span>Load More Tokens</span>
                          <span className="text-sm opacity-75">({filteredTokens.length - displayCount} remaining)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : filteredTokens.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
                {isSearchLoading ? (
                  <>
                    <div className="h-7 w-7 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
                    <div className="text-sm text-gray-400">Loading tokens…</div>
                  </>
                ) : (
                  <>
                    <FaSearch className="h-6 w-6 text-gray-600" />
                    <div className="text-sm font-medium text-gray-300">No tokens found</div>
                    <div className="text-xs text-gray-500">Try a different name or symbol.</div>
                  </>
                )}
              </div>
            ) : null}
          </>
        ) : viewMode === 'facebook-raids' ? (
          <FacebookRaids
            currentUser={currentUser}
            showNotification={showNotification}
          />
        ) : (
          <SocialMediaRaids 
            currentUser={currentUser}
            showNotification={showNotification}
          />
        )}

        {showReviews && selectedToken && (
          <TokenReviews
            token={selectedToken}
            onClose={handleCloseReviews}
            currentUser={currentUser}
            showNotification={showNotification}
          />
        )}

        {tokensLoading && viewMode === 'tokens' ? (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
            Loading tokens...
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(TokenList); 