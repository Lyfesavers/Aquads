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
      message,
      bannerId, // Optional: for banner ad payments
      bumpId,   // Optional: for bump payments
      projectId, // Optional: for project listing payments (for admin reference)
      addonOrderId, // Optional: for addon order payments (for admin reference)
      tokenPurchaseId, // Optional: for token purchase payments
      hyperspaceOrderId // Optional: for HyperSpace Twitter Space listener orders
    } = req.body;

    if (!recipientSlug || !txHash || !chain || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find recipient - include email for notification
    let user = await User.findOne({ 'aquaPay.paymentSlug': recipientSlug.toLowerCase() })
      .select('username email aquaPay');
    if (!user) {
      user = await User.findOne({ username: { $regex: new RegExp(`^${recipientSlug}$`, 'i') } })
        .select('username email aquaPay');
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

    // Process auto-approval for various payment types (banner, bump, project, token purchase, hyperspace, etc.)
    // This is handled by a separate service to keep aquapay.js clean
    let approvedItem = null;
    if (bannerId || bumpId || projectId || tokenPurchaseId || hyperspaceOrderId) {
      const paymentAutoApproval = require('../services/paymentAutoApproval');
      approvedItem = await paymentAutoApproval.processPayment({
        bannerId,
        bumpId,
        projectId,
        tokenPurchaseId,
        hyperspaceOrderId,
        recipientSlug,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername
      });
    }

    // Emit real-time notification to recipient
    emitAquaPayPaymentReceived({
      recipientId: user._id.toString(),
      payment: payment,
      stats: user.aquaPay.stats
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      recipientEmail: user.email || null,
      recipientName: user.aquaPay.displayName || user.username,
      approvedItem // Return approved item info if any
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Solana RPC Proxy (avoids CORS/rate-limit issues from browser)
const SOLANA_RPCS_MAINNET = [
  'https://solana-rpc.publicnode.com',
  'https://solana-mainnet.rpc.extrnode.com', 
  'https://api.mainnet-beta.solana.com',
  'https://solana.blockdaemon.com/rpc/mainnet',
  'https://rpc.ankr.com/solana'
];

const SOLANA_RPCS_DEVNET = [
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet'
];

router.post('/solana-rpc', async (req, res) => {
  try {
    const { method, params, network } = req.body;
    
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

    // Use devnet RPCs if requested or if ESCROW_MODE is testnet
    const useDevnet = network === 'devnet' || (network === 'testnet');
    const rpcList = useDevnet ? SOLANA_RPCS_DEVNET : SOLANA_RPCS_MAINNET;

    let lastError = null;
    const axios = require('axios');
    
    // For devnet, retry the full list up to 3 times since rate limits are transient
    const maxRounds = useDevnet ? 3 : 1;
    
    for (let round = 0; round < maxRounds; round++) {
      if (round > 0) await new Promise(r => setTimeout(r, 1500 * round));
      
      for (let i = 0; i < rpcList.length; i++) {
        const rpcUrl = rpcList[i];
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
            timeout: useDevnet ? 25000 : 15000
          });
          
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
    }
    
    // All RPCs and retries failed
    console.error(`All Solana RPCs failed (${useDevnet ? 'devnet' : 'mainnet'}) after ${maxRounds} rounds. Last error:`, lastError);
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
