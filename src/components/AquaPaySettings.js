import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com';

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
    }
  });
  const [slugAvailable, setSlugAvailable] = useState(true);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [copied, setCopied] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = currentUser?.token;
      if (!token) {
        showNotification('Please log in to access AquaPay settings', 'error');
        return;
      }

      const response = await axios.get(`${API_URL}/api/aquapay/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching AquaPay settings:', error);
      showNotification('Failed to load AquaPay settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced slug availability check
  const checkSlugAvailability = useCallback(async (slug) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(true);
      return;
    }

    setCheckingSlug(true);
    try {
      const token = currentUser?.token;
      const response = await axios.get(`${API_URL}/api/aquapay/check-slug/${slug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSlugAvailable(response.data.available);
    } catch (error) {
      console.error('Error checking slug:', error);
    } finally {
      setCheckingSlug(false);
    }
  }, [currentUser?.token]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = currentUser?.token;
      if (!token) {
        showNotification('Please log in to save settings', 'error');
        return;
      }

      // Validate at least one wallet is set if enabling
      if (settings.isEnabled) {
        const hasWallet = Object.values(settings.wallets).some(w => w && w.trim());
        if (!hasWallet) {
          showNotification('Please add at least one wallet address before enabling AquaPay', 'error');
          setSaving(false);
          return;
        }
      }

      const response = await axios.put(
        `${API_URL}/api/aquapay/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showNotification('AquaPay settings saved successfully!', 'success');
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      const message = error.response?.data?.error || 'Failed to save settings';
      showNotification(message, 'error');
    } finally {
      setSaving(false);
    }
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
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-xl p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading AquaPay settings...</p>
        </div>
      </div>
    );
  }

  const paymentLink = `https://aquads.xyz/pay/${settings.paymentSlug || currentUser?.username}`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl w-full max-w-3xl my-8 shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                💸 AquaPay Settings
              </h2>
              <p className="text-blue-100 mt-1">Create your payment link and receive crypto payments</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Payment Link Preview */}
        {settings.isEnabled && (
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Your Payment Link</p>
                <p className="text-blue-400 font-mono">{paymentLink}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyPaymentLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  👁 Preview
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex">
            {[
              { id: 'general', label: '⚙️ General' },
              { id: 'wallets', label: '👛 Wallets' },
              { id: 'appearance', label: '🎨 Appearance' },
              { id: 'stats', label: '📊 Stats' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
                <div>
                  <h3 className="text-white font-semibold">Enable AquaPay</h3>
                  <p className="text-gray-400 text-sm">Make your payment page public</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => handleInputChange('isEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Payment Slug */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">Payment Link Slug</label>
                <div className="flex items-center">
                  <span className="bg-gray-800 text-gray-400 px-4 py-3 rounded-l-lg border border-r-0 border-gray-700">
                    aquads.xyz/pay/
                  </span>
                  <input
                    type="text"
                    value={settings.paymentSlug}
                    onChange={(e) => handleInputChange('paymentSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder={currentUser?.username || 'yourname'}
                    className={`flex-1 px-4 py-3 bg-gray-800 border ${
                      !slugAvailable ? 'border-red-500' : 'border-gray-700'
                    } rounded-r-lg text-white focus:outline-none focus:border-blue-500`}
                    maxLength={30}
                  />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {checkingSlug ? (
                    <span className="text-gray-400 text-sm">Checking availability...</span>
                  ) : !slugAvailable ? (
                    <span className="text-red-400 text-sm">❌ This link is already taken</span>
                  ) : settings.paymentSlug && (
                    <span className="text-green-400 text-sm">✓ Available</span>
                  )}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder={currentUser?.username || 'Your Name'}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  maxLength={50}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">Bio / Description</label>
                <textarea
                  value={settings.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell people what you do... (optional)"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                  maxLength={500}
                />
                <p className="text-gray-500 text-sm mt-1">{(settings.bio || '').length}/500</p>
              </div>
            </div>
          )}

          {/* Wallets Tab */}
          {activeTab === 'wallets' && (
            <div className="space-y-4">
              <p className="text-gray-400 mb-4">
                Add your wallet addresses for the chains you want to receive payments on.
                The EVM address works for Ethereum, Base, Polygon, Arbitrum, and BNB Chain.
              </p>

              {Object.entries(CHAINS).map(([chainId, chain]) => (
                <div key={chainId} className="p-4 bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
                    >
                      {chain.icon}
                    </span>
                    <div>
                      <h4 className="text-white font-medium">{chain.name}</h4>
                      <p className="text-gray-500 text-sm">{chain.symbol}</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settings.wallets[chainId] || ''}
                    onChange={(e) => handleWalletChange(chainId, e.target.value)}
                    placeholder={chain.placeholder}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                  {settings.wallets[chainId] && (
                    <p className="text-green-400 text-sm mt-2">✓ Wallet set</p>
                  )}
                </div>
              ))}

              {/* Preferred Chain */}
              <div className="mt-6">
                <label className="block text-gray-300 font-medium mb-2">Preferred Chain</label>
                <p className="text-gray-500 text-sm mb-3">This will be pre-selected for payers</p>
                <select
                  value={settings.preferredChain}
                  onChange={(e) => handleInputChange('preferredChain', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
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
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-3">Theme</label>
                <div className="grid grid-cols-2 gap-4">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => handleInputChange('theme', theme.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        settings.theme === theme.id
                          ? 'border-blue-500'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className={`${theme.bg} h-20 rounded-lg mb-2`}></div>
                      <p className="text-white font-medium">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl p-6 text-center">
                  <p className="text-4xl font-bold text-green-400">
                    ${settings.stats?.totalReceived?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-gray-400 mt-2">Total Received (USD)</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-6 text-center">
                  <p className="text-4xl font-bold text-blue-400">
                    {settings.stats?.totalTransactions || 0}
                  </p>
                  <p className="text-gray-400 mt-2">Total Transactions</p>
                </div>
              </div>

              {settings.stats?.lastPaymentAt && (
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-gray-400">Last Payment</p>
                  <p className="text-white">
                    {new Date(settings.stats.lastPaymentAt).toLocaleString()}
                  </p>
                </div>
              )}

              {!settings.stats?.totalTransactions && (
                <div className="text-center py-8">
                  <p className="text-6xl mb-4">💰</p>
                  <p className="text-gray-400">No payments received yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Share your payment link to start receiving crypto!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-6 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !slugAvailable}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⟳</span>
                Saving...
              </>
            ) : (
              <>
                💾 Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AquaPaySettings;

