const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { emitAquaPayPaymentReceived } = require('../socket');
const { getSolanaRpcList } = require('../config/rpc');
const { verifyAquaPayPayment } = require('../services/paymentVerification');
const {
  findExistingPaymentByTxHash,
  resolveCheckoutPaymentExpectation,
  getRecipientWalletForChain
} = require('../services/aquaPayPayment');
const { amountsClose } = require('../services/paymentVerification');

// Get public payment page data (PUBLIC - no auth required)
router.get('/page/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();

    let user = await User.findOne({ 'aquaPay.paymentSlug': slug })
      .select('username image aquaPay')
      .lean();

    if (!user) {
      const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      user = await User.findOne({ username: { $regex: new RegExp(`^${escaped}$`, 'i') } })
        .select('username image aquaPay')
        .lean();
    }

    if (!user) {
      return res.status(404).json({ error: 'Payment page not found' });
    }

    if (!user.aquaPay?.isEnabled) {
      return res.status(404).json({ error: 'Payment page not found or not enabled' });
    }

    const hasWallet = user.aquaPay.wallets && (
      user.aquaPay.wallets.solana ||
      user.aquaPay.wallets.ethereum ||
      user.aquaPay.wallets.bitcoin ||
      user.aquaPay.wallets.tron
    );

    if (!hasWallet) {
      return res.status(404).json({ error: 'Payment page not configured' });
    }

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

// Record a payment (after successful on-chain transaction)
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
      bannerId,
      projectId,
      addonOrderId,
      tokenPurchaseId,
      hyperspaceOrderId,
      linkBioAdId,
      voteBoostId,
      projectAgentTopupId
    } = req.body;

    if (req.body.bumpId) {
      return res.status(400).json({
        error:
          'Paid bumps are no longer available. Bubbles bump automatically at 100+ bullish votes (organic votes and vote boosts both count).'
      });
    }

    if (!recipientSlug || !txHash || !chain || amount == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedTxHash = String(txHash).trim();
    if (normalizedTxHash.length < 8) {
      return res.status(400).json({ error: 'Invalid transaction hash' });
    }

    const existing = await findExistingPaymentByTxHash(normalizedTxHash);
    if (existing?.duplicate) {
      return res.json({
        success: true,
        message: 'Payment already recorded',
        alreadyRecorded: true,
        recipientEmail: existing.user?.email || null,
        recipientName: existing.user?.aquaPay?.displayName || existing.user?.username || null,
        approvedItem: null
      });
    }

    let user = await User.findOne({ 'aquaPay.paymentSlug': recipientSlug.toLowerCase() })
      .select('username email aquaPay');
    if (!user) {
      const escaped = recipientSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      user = await User.findOne({ username: { $regex: new RegExp(`^${escaped}$`, 'i') } })
        .select('username email aquaPay');
    }

    if (!user || !user.aquaPay?.isEnabled) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const expectation = await resolveCheckoutPaymentExpectation(req.body, user);
    if (expectation.error) {
      return res.status(400).json({ error: expectation.error });
    }

    const recipientAddress =
      expectation.recipientAddress || getRecipientWalletForChain(user.aquaPay, chain);

    if (!recipientAddress) {
      return res.status(400).json({ error: 'Recipient wallet not configured for this network' });
    }

    const expectedAmount = expectation.expectedAmount ?? parseFloat(amount);
    const tolerance = expectation.amountTolerance ?? 0.05;
    const paymentAmount = parseFloat(amount);

    if (!amountsClose(paymentAmount, expectedAmount, tolerance)) {
      return res.status(400).json({
        error: `Payment amount must be ${expectedAmount}. Received ${paymentAmount}.`
      });
    }

    const hasCheckoutContext = Boolean(
      bannerId ||
        projectId ||
        addonOrderId ||
        tokenPurchaseId ||
        hyperspaceOrderId ||
        linkBioAdId ||
        voteBoostId ||
        projectAgentTopupId
    );

    const verification = await verifyAquaPayPayment({
      txHash: normalizedTxHash,
      chain,
      token,
      amount: expectedAmount,
      recipientAddress,
      requireFee: expectation.requireFee !== false
    });

    if (!verification.verified) {
      if (verification.manual && !hasCheckoutContext) {
        return res.status(400).json({
          error:
            verification.reason ||
            'This network requires manual payment confirmation. Contact the recipient with your transaction ID.'
        });
      }
      return res.status(400).json({
        error: verification.reason || 'Payment could not be verified on chain'
      });
    }

    const payment = {
      txHash: normalizedTxHash,
      chain,
      token: token || 'UNKNOWN',
      amount: paymentAmount,
      amountUSD: amountUSD ? parseFloat(amountUSD) : null,
      senderAddress,
      senderUsername: senderUsername || null,
      message: message ? message.substring(0, 200) : null,
      createdAt: new Date()
    };

    if (!user.aquaPay.paymentHistory) {
      user.aquaPay.paymentHistory = [];
    }
    if (!user.aquaPay.stats) {
      user.aquaPay.stats = { totalReceived: 0, totalTransactions: 0 };
    }

    user.aquaPay.paymentHistory.unshift(payment);
    if (user.aquaPay.paymentHistory.length > 100) {
      user.aquaPay.paymentHistory = user.aquaPay.paymentHistory.slice(0, 100);
    }

    user.aquaPay.stats.totalTransactions += 1;
    if (amountUSD) {
      user.aquaPay.stats.totalReceived += parseFloat(amountUSD);
    }
    user.aquaPay.stats.lastPaymentAt = new Date();

    await user.save();

    let approvedItem = null;
    if (
      bannerId ||
      projectId ||
      addonOrderId ||
      tokenPurchaseId ||
      hyperspaceOrderId ||
      linkBioAdId ||
      voteBoostId ||
      projectAgentTopupId
    ) {
      const paymentAutoApproval = require('../services/paymentAutoApproval');
      approvedItem = await paymentAutoApproval.processPayment({
        bannerId,
        projectId,
        addonOrderId,
        tokenPurchaseId,
        hyperspaceOrderId,
        linkBioAdId,
        voteBoostId,
        projectAgentTopupId,
        recipientSlug,
        amount: paymentAmount,
        txHash: normalizedTxHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify: true
      });
    }

    emitAquaPayPaymentReceived({
      recipientId: user._id.toString(),
      payment,
      stats: user.aquaPay.stats
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      recorded: true,
      recipientEmail: user.email || null,
      recipientName: user.aquaPay.displayName || user.username,
      approvedItem
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Solana RPC Proxy (avoids CORS/rate-limit issues from browser)
router.post('/solana-rpc', async (req, res) => {
  try {
    const { method, params, network } = req.body;

    const allowedMethods = [
      'getLatestBlockhash',
      'sendTransaction',
      'confirmTransaction',
      'getSignatureStatuses',
      'getBalance',
      'getAccountInfo',
      'getMultipleAccounts',
      'getTokenAccountsByOwner'
    ];

    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ error: 'Method not allowed' });
    }

    const useDevnet = network === 'devnet' || network === 'testnet';
    const rpcList = getSolanaRpcList(useDevnet);

    let lastError = null;
    const axios = require('axios');
    const maxRounds = useDevnet ? 3 : 1;

    for (let round = 0; round < maxRounds; round++) {
      if (round > 0) await new Promise((r) => setTimeout(r, 1500 * round));

      for (let i = 0; i < rpcList.length; i++) {
        const rpcUrl = rpcList[i];
        try {
          const response = await axios.post(
            rpcUrl,
            {
              jsonrpc: '2.0',
              id: Date.now(),
              method,
              params: params || []
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              timeout: useDevnet ? 25000 : 15000
            }
          );

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

    console.error(
      `All Solana RPCs failed (${useDevnet ? 'devnet' : 'mainnet'}) after ${maxRounds} rounds. Last error:`,
      lastError
    );
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
