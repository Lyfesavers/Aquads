const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Supported chains configuration
const SUPPORTED_CHAINS = {
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    icon: '◎',
    explorerUrl: 'https://solscan.io/tx/',
    addressRegex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'Ξ',
    explorerUrl: 'https://etherscan.io/tx/',
    addressRegex: /^0x[a-fA-F0-9]{40}$/
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    icon: '🔵',
    explorerUrl: 'https://basescan.org/tx/',
    addressRegex: /^0x[a-fA-F0-9]{40}$/
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '⬡',
    explorerUrl: 'https://polygonscan.com/tx/',
    addressRegex: /^0x[a-fA-F0-9]{40}$/
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    icon: '🔷',
    explorerUrl: 'https://arbiscan.io/tx/',
    addressRegex: /^0x[a-fA-F0-9]{40}$/
  },
  bnb: {
    name: 'BNB Chain',
    symbol: 'BNB',
    icon: '🟡',
    explorerUrl: 'https://bscscan.com/tx/',
    addressRegex: /^0x[a-fA-F0-9]{40}$/
  },
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    explorerUrl: 'https://mempool.space/tx/',
    addressRegex: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/
  },
  tron: {
    name: 'TRON',
    symbol: 'TRX',
    icon: '🔺',
    explorerUrl: 'https://tronscan.org/#/transaction/',
    addressRegex: /^T[a-zA-Z0-9]{33}$/
  }
};

// Validate wallet address for a specific chain
const validateWalletAddress = (chain, address) => {
  if (!address) return true; // Empty is valid (not set)
  
  // For EVM chains (ethereum, base, polygon, arbitrum, bnb), use ethereum regex
  const chainConfig = SUPPORTED_CHAINS[chain];
  if (!chainConfig) return false;
  
  // EVM chains all share the same address format
  if (['ethereum', 'base', 'polygon', 'arbitrum', 'bnb'].includes(chain)) {
    return SUPPORTED_CHAINS.ethereum.addressRegex.test(address);
  }
  
  return chainConfig.addressRegex.test(address);
};

// Get supported chains info (public)
router.get('/chains', (req, res) => {
  res.json({
    success: true,
    chains: SUPPORTED_CHAINS
  });
});

// Get user's AquaPay settings (authenticated)
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username image aquaPay');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If AquaPay not initialized, return defaults
    if (!user.aquaPay) {
      return res.json({
        success: true,
        settings: {
          isEnabled: false,
          paymentSlug: user.username.toLowerCase(),
          displayName: user.username,
          bio: null,
          wallets: {
            solana: null,
            ethereum: null,
            bitcoin: null,
            tron: null
          },
          preferredChain: 'ethereum',
          acceptedTokens: ['USDC', 'USDT', 'ETH', 'SOL', 'BTC'],
          theme: 'default',
          stats: {
            totalReceived: 0,
            totalTransactions: 0,
            lastPaymentAt: null
          }
        }
      });
    }

    res.json({
      success: true,
      settings: {
        isEnabled: user.aquaPay.isEnabled,
        paymentSlug: user.aquaPay.paymentSlug || user.username.toLowerCase(),
        displayName: user.aquaPay.displayName || user.username,
        bio: user.aquaPay.bio,
        wallets: user.aquaPay.wallets || {},
        preferredChain: user.aquaPay.preferredChain || 'ethereum',
        acceptedTokens: user.aquaPay.acceptedTokens || ['USDC', 'USDT', 'ETH', 'SOL', 'BTC'],
        theme: user.aquaPay.theme || 'default',
        stats: user.aquaPay.stats || { totalReceived: 0, totalTransactions: 0, lastPaymentAt: null }
      }
    });
  } catch (error) {
    console.error('Error fetching AquaPay settings:', error);
    res.status(500).json({ error: 'Failed to fetch AquaPay settings' });
  }
});

// Update AquaPay settings (authenticated)
router.put('/settings', auth, async (req, res) => {
  try {
    const {
      isEnabled,
      paymentSlug,
      displayName,
      bio,
      wallets,
      preferredChain,
      acceptedTokens,
      theme
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize aquaPay if it doesn't exist
    if (!user.aquaPay) {
      user.aquaPay = {
        isEnabled: false,
        paymentSlug: user.username.toLowerCase(),
        wallets: {},
        stats: { totalReceived: 0, totalTransactions: 0 },
        paymentHistory: [],
        createdAt: new Date()
      };
    }

    // Validate and update payment slug if provided
    if (paymentSlug !== undefined) {
      const normalizedSlug = paymentSlug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');
      
      if (normalizedSlug.length < 3) {
        return res.status(400).json({ error: 'Payment slug must be at least 3 characters' });
      }
      
      if (normalizedSlug.length > 30) {
        return res.status(400).json({ error: 'Payment slug must be 30 characters or less' });
      }

      // Check if slug is already taken (by another user)
      const existingUser = await User.findOne({
        'aquaPay.paymentSlug': normalizedSlug,
        _id: { $ne: req.user.userId }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'This payment link is already taken' });
      }

      user.aquaPay.paymentSlug = normalizedSlug;
    }

    // Validate wallet addresses if provided
    if (wallets) {
      const walletErrors = [];
      
      if (wallets.solana && !validateWalletAddress('solana', wallets.solana)) {
        walletErrors.push('Invalid Solana address');
      }
      if (wallets.ethereum && !validateWalletAddress('ethereum', wallets.ethereum)) {
        walletErrors.push('Invalid Ethereum address');
      }
      if (wallets.bitcoin && !validateWalletAddress('bitcoin', wallets.bitcoin)) {
        walletErrors.push('Invalid Bitcoin address');
      }
      if (wallets.tron && !validateWalletAddress('tron', wallets.tron)) {
        walletErrors.push('Invalid TRON address');
      }

      if (walletErrors.length > 0) {
        return res.status(400).json({ error: walletErrors.join(', ') });
      }

      user.aquaPay.wallets = {
        ...(user.aquaPay.wallets || {}),
        ...wallets
      };
    }

    // Update other fields
    if (isEnabled !== undefined) user.aquaPay.isEnabled = isEnabled;
    if (displayName !== undefined) user.aquaPay.displayName = displayName ? String(displayName).substring(0, 50) : null;
    if (bio !== undefined) user.aquaPay.bio = bio ? String(bio).substring(0, 500) : null;
    if (preferredChain !== undefined) user.aquaPay.preferredChain = preferredChain;
    if (acceptedTokens !== undefined) user.aquaPay.acceptedTokens = acceptedTokens;
    if (theme !== undefined) user.aquaPay.theme = theme;
    
    user.aquaPay.updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'AquaPay settings updated successfully',
      settings: {
        isEnabled: user.aquaPay.isEnabled,
        paymentSlug: user.aquaPay.paymentSlug,
        displayName: user.aquaPay.displayName,
        bio: user.aquaPay.bio,
        wallets: user.aquaPay.wallets,
        preferredChain: user.aquaPay.preferredChain,
        acceptedTokens: user.aquaPay.acceptedTokens,
        theme: user.aquaPay.theme,
        stats: user.aquaPay.stats
      }
    });
  } catch (error) {
    console.error('Error updating AquaPay settings:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to update AquaPay settings', details: error.message });
  }
});

// Check if payment slug is available (authenticated)
router.get('/check-slug/:slug', auth, async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    
    if (slug.length < 3) {
      return res.json({ available: false, reason: 'Slug must be at least 3 characters' });
    }

    const existingUser = await User.findOne({
      'aquaPay.paymentSlug': slug,
      _id: { $ne: req.user.userId }
    });

    res.json({
      available: !existingUser,
      reason: existingUser ? 'This payment link is already taken' : null
    });
  } catch (error) {
    console.error('Error checking slug availability:', error);
    res.status(500).json({ error: 'Failed to check slug availability' });
  }
});

// Get public payment page data (PUBLIC - no auth required)
router.get('/page/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();

    // First try to find by payment slug
    let user = await User.findOne({ 'aquaPay.paymentSlug': slug })
      .select('username image aquaPay');

    // If not found by slug, try username
    if (!user) {
      user = await User.findOne({ username: { $regex: new RegExp(`^${slug}$`, 'i') } })
        .select('username image aquaPay');
    }

    if (!user) {
      return res.status(404).json({ error: 'Payment page not found' });
    }

    // Check if AquaPay is enabled
    if (!user.aquaPay?.isEnabled) {
      return res.status(404).json({ error: 'Payment page not found or not enabled' });
    }

    // Check if at least one wallet is set
    const hasWallet = user.aquaPay.wallets && (
      user.aquaPay.wallets.solana ||
      user.aquaPay.wallets.ethereum ||
      user.aquaPay.wallets.bitcoin ||
      user.aquaPay.wallets.tron
    );

    if (!hasWallet) {
      return res.status(404).json({ error: 'Payment page not configured' });
    }

    // Return public payment page data
    res.json({
      success: true,
      paymentPage: {
        username: user.username,
        displayName: user.aquaPay.displayName || user.username,
        bio: user.aquaPay.bio,
        image: user.image,
        wallets: user.aquaPay.wallets,
        preferredChain: user.aquaPay.preferredChain,
        acceptedTokens: user.aquaPay.acceptedTokens,
        theme: user.aquaPay.theme || 'default',
        stats: {
          totalTransactions: user.aquaPay.stats?.totalTransactions || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment page:', error);
    res.status(500).json({ error: 'Failed to fetch payment page' });
  }
});

// Record a payment (called after successful transaction)
router.post('/payment', async (req, res) => {
  try {
    const {
      recipientSlug,
      txHash,
      chain,
      token,
      amount,
      amountUSD,
      senderAddress,
      senderUsername,
      message
    } = req.body;

    if (!recipientSlug || !txHash || !chain || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find recipient
    let user = await User.findOne({ 'aquaPay.paymentSlug': recipientSlug.toLowerCase() });
    if (!user) {
      user = await User.findOne({ username: { $regex: new RegExp(`^${recipientSlug}$`, 'i') } });
    }

    if (!user || !user.aquaPay?.isEnabled) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Add payment to history
    const payment = {
      txHash,
      chain,
      token: token || 'UNKNOWN',
      amount: parseFloat(amount),
      amountUSD: amountUSD ? parseFloat(amountUSD) : null,
      senderAddress,
      senderUsername: senderUsername || null,
      message: message ? message.substring(0, 200) : null,
      createdAt: new Date()
    };

    // Initialize arrays/objects if needed
    if (!user.aquaPay.paymentHistory) {
      user.aquaPay.paymentHistory = [];
    }
    if (!user.aquaPay.stats) {
      user.aquaPay.stats = { totalReceived: 0, totalTransactions: 0 };
    }

    // Add to history (keep last 100)
    user.aquaPay.paymentHistory.unshift(payment);
    if (user.aquaPay.paymentHistory.length > 100) {
      user.aquaPay.paymentHistory = user.aquaPay.paymentHistory.slice(0, 100);
    }

    // Update stats
    user.aquaPay.stats.totalTransactions += 1;
    if (amountUSD) {
      user.aquaPay.stats.totalReceived += parseFloat(amountUSD);
    }
    user.aquaPay.stats.lastPaymentAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get payment history (authenticated - for recipient)
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('aquaPay.paymentHistory aquaPay.stats');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      history: user.aquaPay?.paymentHistory || [],
      stats: user.aquaPay?.stats || { totalReceived: 0, totalTransactions: 0, lastPaymentAt: null }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;

