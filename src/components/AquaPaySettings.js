import React, { useState, useEffect, useCallback } from 'react';
import { socket } from '../services/api';

// Chain configurations
const CHAINS = {
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    icon: '◎',
    color: '#9945FF',
    placeholder: 'Enter Solana wallet address...',
    example: 'GhJ7k...xyz'
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'Ξ',
    color: '#627EEA',
    placeholder: 'Enter EVM wallet address (works for ETH, Base, Polygon, etc.)...',
    example: '0x1234...abcd'
  },
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    color: '#F7931A',
    placeholder: 'Enter Bitcoin address...',
    example: 'bc1q...xyz'
  },
  tron: {
    name: 'TRON',
    symbol: 'TRX',
    icon: '🔺',
    color: '#FF0013',
    placeholder: 'Enter TRON address...',
    example: 'T1234...xyz'
  }
};

const THEMES = [
  { id: 'default', name: 'Default', bg: 'bg-gray-900', accent: 'blue' },
  { id: 'dark', name: 'Midnight', bg: 'bg-black', accent: 'purple' },
  { id: 'gradient', name: 'Gradient', bg: 'bg-gradient-to-br from-purple-900 to-blue-900', accent: 'cyan' },
  { id: 'neon', name: 'Neon', bg: 'bg-gray-950', accent: 'green' }
];

const AquaPaySettings = ({ currentUser, showNotification, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    isEnabled: false,
    paymentSlug: '',
    displayName: '',
    bio: '',
    wallets: {
      solana: '',
      ethereum: '',
      bitcoin: '',
      tron: ''
    },
    preferredChain: 'ethereum',
    acceptedTokens: ['USDC', 'USDT', 'ETH', 'SOL', 'BTC'],
    theme: 'default',
    stats: {
      totalReceived: 0,
      totalTransactions: 0
    },
    paymentHistory: []
  });

  // Explorer URLs for each chain
  const EXPLORER_URLS = {
    solana: 'https://solscan.io/tx/',
    ethereum: 'https://etherscan.io/tx/',
    base: 'https://basescan.org/tx/',
    polygon: 'https://polygonscan.com/tx/',
    arbitrum: 'https://arbiscan.io/tx/',
    bnb: 'https://bscscan.com/tx/',
    bitcoin: 'https://mempool.space/tx/',
    tron: 'https://tronscan.org/#/transaction/'
  };

  const getExplorerUrl = (chain, txHash) => {
    const baseUrl = EXPLORER_URLS[chain] || EXPLORER_URLS.ethereum;
    return `${baseUrl}${txHash}`;
  };

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  const [slugAvailable, setSlugAvailable] = useState(true);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [copied, setCopied] = useState(false);

  // Fetch settings on mount using socket
  useEffect(() => {
    if (!socket || !currentUser) {
      setLoading(false);
      return;
    }

    const userId = currentUser.userId || currentUser.id || currentUser._id;
    
    // Request settings via socket
    socket.emit('requestAquaPaySettings', { userId });

    // Listen for settings loaded
    const handleSettingsLoaded = (data) => {
      if (data.settings) {
        setSettings(data.settings);
      }
      setLoading(false);
    };

    // Listen for settings error
    const handleSettingsError = (data) => {
      console.error('AquaPay settings error:', data.error);
      showNotification(data.error || 'Failed to load AquaPay settings', 'error');
      setLoading(false);
      setSaving(false);
    };

    // Listen for settings updated (after save)
    const handleSettingsUpdated = (data) => {
      if (data.success && data.settings) {
        setSettings(data.settings);
        showNotification(data.message || 'AquaPay settings saved successfully!', 'success');
      }
      setSaving(false);
    };

    // Listen for slug check result
    const handleSlugCheckResult = (data) => {
      setSlugAvailable(data.available);
      setCheckingSlug(false);
    };

    // Listen for real-time payment received (updates stats)
    const handlePaymentReceived = (data) => {
      if (data.stats) {
        setSettings(prev => ({
          ...prev,
          stats: data.stats
        }));
        showNotification('💰 New payment received!', 'success');
      }
    };

    // Listen for stats updates
    const handleStatsUpdated = (data) => {
      if (data.userId === userId && data.stats) {
        setSettings(prev => ({
          ...prev,
          stats: data.stats
        }));
      }
    };

    socket.on('aquaPaySettingsLoaded', handleSettingsLoaded);
    socket.on('aquaPaySettingsError', handleSettingsError);
    socket.on('aquaPaySettingsUpdated', handleSettingsUpdated);
    socket.on('aquaPaySlugCheckResult', handleSlugCheckResult);
    socket.on('aquaPayPaymentReceived', handlePaymentReceived);
    socket.on('aquaPayStatsUpdated', handleStatsUpdated);

    return () => {
      socket.off('aquaPaySettingsLoaded', handleSettingsLoaded);
      socket.off('aquaPaySettingsError', handleSettingsError);
      socket.off('aquaPaySettingsUpdated', handleSettingsUpdated);
      socket.off('aquaPaySlugCheckResult', handleSlugCheckResult);
      socket.off('aquaPayPaymentReceived', handlePaymentReceived);
      socket.off('aquaPayStatsUpdated', handleStatsUpdated);
    };
  }, [socket, currentUser, showNotification]);

  // Debounced slug availability check using socket
  const checkSlugAvailability = useCallback((slug) => {
    if (!slug || slug.length < 3 || !socket || !currentUser) {
      setSlugAvailable(true);
      setCheckingSlug(false);
      return;
    }

    setCheckingSlug(true);
    const userId = currentUser.userId || currentUser.id || currentUser._id;
    socket.emit('checkAquaPaySlug', { userId, slug });
  }, [socket, currentUser]);

  // Handle slug change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (settings.paymentSlug) {
        checkSlugAvailability(settings.paymentSlug);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [settings.paymentSlug, checkSlugAvailability]);

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWalletChange = (chain, value) => {
    setSettings(prev => ({
      ...prev,
      wallets: {
        ...prev.wallets,
        [chain]: value
      }
    }));
  };

  const handleSave = () => {
    if (!socket || !currentUser) {
      showNotification('Please log in to save settings', 'error');
      return;
    }

    // Validate at least one wallet is set if enabling
    if (settings.isEnabled) {
      const hasWallet = Object.values(settings.wallets).some(w => w && w.trim());
      if (!hasWallet) {
        showNotification('Please add at least one wallet address before enabling AquaPay', 'error');
        return;
      }
    }

    setSaving(true);
    const userId = currentUser.userId || currentUser.id || currentUser._id;
    
    // Send update via socket
    socket.emit('updateAquaPaySettings', {
      userId,
      ...settings
    });
  };

  const copyPaymentLink = () => {
    const link = `https://aquads.xyz/pay/${settings.paymentSlug || currentUser?.username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showNotification('Payment link copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl p-6 sm:p-8 text-center">
          <div className="animate-spin w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-400 text-sm sm:text-base">Loading settings...</p>
        </div>
      </div>
    );
  }

  const paymentLink = `https://aquads.xyz/pay/${settings.paymentSlug || currentUser?.username}`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-xl sm:rounded-2xl w-full max-w-3xl my-2 sm:my-8 shadow-2xl border border-gray-800 max-h-[96vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                💸 AquaPay
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm mt-1 truncate">Receive crypto payments</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl sm:text-2xl p-1 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Payment Link Preview */}
        {settings.isEnabled && (
          <div className="bg-gray-800 p-3 sm:p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 mb-1">Your Payment Link</p>
                <p className="text-blue-400 font-mono text-xs sm:text-sm truncate">{paymentLink}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={copyPaymentLink}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm text-center"
                >
                  👁 Preview
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tabs - Scrollable on mobile */}
        <div className="border-b border-gray-800 flex-shrink-0 overflow-x-auto">
          <div className="flex min-w-max">
            {[
              { id: 'general', label: '⚙️', fullLabel: '⚙️ General' },
              { id: 'wallets', label: '👛', fullLabel: '👛 Wallets' },
              { id: 'appearance', label: '🎨', fullLabel: '🎨 Theme' },
              { id: 'stats', label: '📊', fullLabel: '📊 Stats' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="sm:hidden">{tab.label}</span>
                <span className="hidden sm:inline">{tab.fullLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-800 rounded-xl gap-4">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm sm:text-base">Enable AquaPay</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">Make your payment page public</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => handleInputChange('isEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 sm:w-14 sm:h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 sm:after:h-6 sm:after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Payment Slug */}
              <div>
                <label className="block text-gray-300 font-medium mb-2 text-sm sm:text-base">Payment Link Slug</label>
                <div className="flex flex-col sm:flex-row">
                  <span className="bg-gray-800 text-gray-400 px-3 py-2 sm:px-4 sm:py-3 rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none border border-b-0 sm:border-b sm:border-r-0 border-gray-700 text-xs sm:text-sm">
                    aquads.xyz/pay/
                  </span>
                  <input
                    type="text"
                    value={settings.paymentSlug}
                    onChange={(e) => handleInputChange('paymentSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder={currentUser?.username || 'yourname'}
                    className={`flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 border ${
                      !slugAvailable ? 'border-red-500' : 'border-gray-700'
                    } rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base`}
                    maxLength={30}
                  />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {checkingSlug ? (
                    <span className="text-gray-400 text-xs sm:text-sm">Checking...</span>
                  ) : !slugAvailable ? (
                    <span className="text-red-400 text-xs sm:text-sm">❌ Already taken</span>
                  ) : settings.paymentSlug && (
                    <span className="text-green-400 text-xs sm:text-sm">✓ Available</span>
                  )}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-gray-300 font-medium mb-2 text-sm sm:text-base">Display Name</label>
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder={currentUser?.username || 'Your Name'}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                  maxLength={50}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-gray-300 font-medium mb-2 text-sm sm:text-base">Bio / Description</label>
                <textarea
                  value={settings.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell people what you do... (optional)"
                  rows={2}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none text-sm sm:text-base"
                  maxLength={500}
                />
                <p className="text-gray-500 text-xs mt-1">{(settings.bio || '').length}/500</p>
              </div>
            </div>
          )}

          {/* Wallets Tab */}
          {activeTab === 'wallets' && (
            <div className="space-y-3 sm:space-y-4">
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                Add wallet addresses. EVM address works for ETH, Base, Polygon, Arbitrum & BNB.
              </p>

              {Object.entries(CHAINS).map(([chainId, chain]) => (
                <div key={chainId} className="p-3 sm:p-4 bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <span 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-xl flex-shrink-0"
                      style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
                    >
                      {chain.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white font-medium text-sm sm:text-base">{chain.name}</h4>
                      <p className="text-gray-500 text-xs">{chain.symbol}</p>
                    </div>
                    {settings.wallets[chainId] && (
                      <span className="text-green-400 text-xs flex-shrink-0">✓ Set</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.wallets[chainId] || ''}
                    onChange={(e) => handleWalletChange(chainId, e.target.value)}
                    placeholder={chain.example}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}

              {/* Preferred Chain */}
              <div className="mt-4 sm:mt-6">
                <label className="block text-gray-300 font-medium mb-1 sm:mb-2 text-sm sm:text-base">Preferred Chain</label>
                <p className="text-gray-500 text-xs mb-2 sm:mb-3">Pre-selected for payers</p>
                <select
                  value={settings.preferredChain}
                  onChange={(e) => handleInputChange('preferredChain', e.target.value)}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="base">Base</option>
                  <option value="polygon">Polygon</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="bnb">BNB Chain</option>
                  <option value="solana">Solana</option>
                  <option value="bitcoin">Bitcoin</option>
                  <option value="tron">TRON</option>
                </select>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-2 sm:mb-3 text-sm sm:text-base">Theme</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => handleInputChange('theme', theme.id)}
                      className={`p-2 sm:p-4 rounded-xl border-2 transition-all ${
                        settings.theme === theme.id
                          ? 'border-blue-500'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className={`${theme.bg} h-12 sm:h-20 rounded-lg mb-1 sm:mb-2`}></div>
                      <p className="text-white font-medium text-xs sm:text-sm">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="bg-gray-800 rounded-xl p-3 sm:p-6 text-center">
                  <p className="text-xl sm:text-4xl font-bold text-green-400">
                    ${settings.stats?.totalReceived?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-gray-400 mt-1 sm:mt-2 text-xs sm:text-sm">Total Received</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 sm:p-6 text-center">
                  <p className="text-xl sm:text-4xl font-bold text-blue-400">
                    {settings.stats?.totalTransactions || 0}
                  </p>
                  <p className="text-gray-400 mt-1 sm:mt-2 text-xs sm:text-sm">Transactions</p>
                </div>
              </div>

              {/* Payment History */}
              {settings.paymentHistory && settings.paymentHistory.length > 0 ? (
                <div className="bg-gray-800 rounded-xl p-3 sm:p-4">
                  <h4 className="text-white font-medium mb-3 text-sm sm:text-base">Payment History</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {settings.paymentHistory.map((payment, index) => (
                      <div 
                        key={payment.txHash || index} 
                        className="bg-gray-900 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-green-400 font-medium text-sm">
                              +{payment.amount} {payment.token}
                            </span>
                            {payment.amountUSD && (
                              <span className="text-gray-500 text-xs">
                                (${payment.amountUSD.toFixed(2)})
                              </span>
                            )}
                            <span className="text-gray-600 text-xs uppercase bg-gray-800 px-1.5 py-0.5 rounded">
                              {payment.chain}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>From: {formatAddress(payment.senderAddress)}</span>
                            <span>•</span>
                            <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                          </div>
                          {payment.message && (
                            <p className="text-gray-500 text-xs mt-1 italic truncate">"{payment.message}"</p>
                          )}
                        </div>
                        <a
                          href={getExplorerUrl(payment.chain, payment.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors flex-shrink-0"
                        >
                          View TX
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-4xl sm:text-6xl mb-3 sm:mb-4">💰</p>
                  <p className="text-gray-400 text-sm sm:text-base">No payments yet</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2">
                    Share your link to start receiving crypto!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-3 sm:p-6 flex justify-between items-center gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !slugAvailable}
            className="px-4 sm:px-8 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            {saving ? (
              <>
                <span className="animate-spin">⟳</span>
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                💾 <span className="hidden sm:inline">Save Settings</span><span className="sm:hidden">Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AquaPaySettings;

