const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { emitAquaPayPaymentReceived } = require('../socket');

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

    // Emit real-time notification to recipient
    emitAquaPayPaymentReceived({
      recipientId: user._id.toString(),
      payment: payment,
      stats: user.aquaPay.stats
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Solana RPC Proxy (avoids CORS/rate-limit issues from browser)
const SOLANA_RPCS = [
  'https://solana-rpc.publicnode.com',
  'https://solana-mainnet.rpc.extrnode.com', 
  'https://api.mainnet-beta.solana.com',
  'https://solana.blockdaemon.com/rpc/mainnet',
  'https://rpc.ankr.com/solana'
];

router.post('/solana-rpc', async (req, res) => {
  try {
    const { method, params } = req.body;
    
    // Only allow specific safe methods
    const allowedMethods = [
      'getLatestBlockhash', 
      'sendTransaction', 
      'confirmTransaction',
      'getSignatureStatuses',
      'getBalance',
      'getAccountInfo',
      'getTokenAccountsByOwner'
    ];
    
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ error: 'Method not allowed' });
    }

    let lastError = null;
    const axios = require('axios');
    
    // Try each RPC until one works
    for (let i = 0; i < SOLANA_RPCS.length; i++) {
      const rpcUrl = SOLANA_RPCS[i];
      try {
        const response = await axios.post(rpcUrl, {
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params: params || []
        }, {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000
        });
        
        // Check for RPC-level errors
        if (response.data?.error) {
          lastError = response.data.error.message || JSON.stringify(response.data.error);
          continue;
        }
        
        return res.json(response.data);
      } catch (rpcError) {
        lastError = rpcError.response?.data?.error?.message || rpcError.message;
        continue;
      }
    }
    
    // All RPCs failed
    console.error('All Solana RPCs failed. Last error:', lastError);
    res.status(503).json({ 
      error: 'Solana network temporarily unavailable. Please try again.',
      details: lastError 
    });
  } catch (error) {
    console.error('Solana RPC proxy error:', error);
    res.status(500).json({ error: 'RPC proxy failed', details: error.message });
  }
});

module.exports = router;
