const express = require('express');
const router = express.Router();
const BumpRequest = require('../models/BumpRequest');
const Ad = require('../models/Ad');
const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const nowPaymentsService = require('../services/nowPaymentsService');
const crypto = require('crypto');

// Get all pending bump requests
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const bumpRequests = await BumpRequest.find(query).sort({ createdAt: -1 });
    res.json(bumpRequests);
  } catch (error) {
    console.error('Error fetching bump requests:', error);
    res.status(500).json({ error: 'Failed to fetch bump requests' });
  }
});

// Create a new bump request
router.post('/', async (req, res) => {
  try {
    const { adId, owner, txSignature, duration } = req.body;
    
    if (!adId || !owner || !txSignature || !duration) {
      return res.status(400).json({ error: 'Missing required fields: adId, owner, txSignature, or duration' });
    }

    // Check if there's already a pending bump request for this ad
    const existingRequest = await BumpRequest.findOne({ 
      adId, 
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'There is already a pending bump request for this ad' });
    }

    const bumpRequest = new BumpRequest({
      adId,
      owner,
      txSignature,
      duration,
      status: 'pending'
    });

    const savedRequest = await bumpRequest.save();
    res.status(201).json(savedRequest);
  } catch (error) {
    console.error('Error creating bump request:', error);
    res.status(500).json({ error: error.message || 'Failed to create bump request' });
  }
});

// Approve a bump request
router.post('/approve', async (req, res) => {
  try {
    const { adId, processedBy } = req.body;

    if (!adId || !processedBy) {
      return res.status(400).json({ error: 'Missing required fields: adId or processedBy' });
    }

    // Find and update the bump request
    const bumpRequest = await BumpRequest.findOne({ adId, status: 'pending' });

    if (!bumpRequest) {
      return res.status(404).json({ error: 'No pending bump request found for this ad' });
    }

    // Validate and convert duration
    const duration = parseInt(bumpRequest.duration);
    if (isNaN(duration) || (duration <= 0 && duration !== -1)) {
      return res.status(400).json({ error: 'Invalid duration value' });
    }

    // Update bump request status
    bumpRequest.status = 'approved';
    bumpRequest.processedAt = new Date();
    bumpRequest.processedBy = processedBy;
    await bumpRequest.save();

    const now = new Date();
    // Handle lifetime bumps (duration = -1) by setting expiresAt to null
    const expiresAt = duration === -1 ? null : new Date(now.getTime() + duration);

    // Update the ad
    const ad = await Ad.findOneAndUpdate(
      { id: adId },
      { 
        size: 100, // MAX_SIZE
        isBumped: true,
        status: 'approved',
        bumpedAt: now,
        bumpDuration: duration,
        bumpExpiresAt: expiresAt,
        lastBumpTx: bumpRequest.txSignature
      },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found. The bump request exists but the ad may have been deleted.' });
    }

    console.log('Updated Ad:', {
      id: ad.id,
      bumpDuration: ad.bumpDuration,
      bumpedAt: ad.bumpedAt?.toISOString(),
      bumpExpiresAt: ad.bumpExpiresAt?.toISOString()
    });

    // Record affiliate commission if applicable
    try {
      const adOwner = await User.findOne({ username: ad.owner });
      if (adOwner && adOwner.referredBy) {
        // Calculate USDC amount based on bump duration
        let adAmount;
        if (duration === 90 * 24 * 60 * 60 * 1000) { // 3 months
          adAmount = 99; // 99 USDC
        } else if (duration === 180 * 24 * 60 * 60 * 1000) { // 6 months
          adAmount = 150; // 150 USDC
        } else if (duration === 365 * 24 * 60 * 60 * 1000) { // 1 year (legacy)
          adAmount = 300; // 300 USDC
        } else if (duration === -1) { // Lifetime
          adAmount = 300; // 300 USDC
        }

        const commissionRate = await AffiliateEarning.calculateCommissionRate(adOwner.referredBy);
        const commissionEarned = AffiliateEarning.calculateCommission(adAmount, commissionRate);
        
        const earning = new AffiliateEarning({
          affiliateId: adOwner.referredBy,
          referredUserId: adOwner._id,
          adId: ad._id,
          adAmount,           // This will now be in USDC
          currency: 'USDC',   // Specify USDC currency
          commissionRate,
          commissionEarned
        });
        
        await earning.save();
      }
    } catch (commissionError) {
      console.error('Error recording affiliate commission:', commissionError);
    }

    res.json({ bumpRequest, ad });
  } catch (error) {
    console.error('Error approving bump request:', error);
    res.status(500).json({ error: error.message || 'Failed to approve bump request' });
  }
});

// Reject a bump request
router.post('/reject', async (req, res) => {
  try {
    const { adId, processedBy, reason } = req.body;

    if (!adId || !processedBy) {
      return res.status(400).json({ error: 'Missing required fields: adId or processedBy' });
    }

    // Find and update the bump request
    const bumpRequest = await BumpRequest.findOneAndUpdate(
      { adId, status: 'pending' },
      { 
        status: 'rejected',
        processedAt: new Date(),
        processedBy,
        rejectionReason: reason || 'Rejected by admin'
      },
      { new: true }
    );

    if (!bumpRequest) {
      return res.status(404).json({ error: 'No pending bump request found for this ad' });
    }

    // Update the ad status
    const ad = await Ad.findOneAndUpdate(
      { id: adId },
      { 
        status: 'active',
        isBumped: false
      },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found. The bump request exists but the ad may have been deleted.' });
    }

    res.json({ bumpRequest, ad });
  } catch (error) {
    console.error('Error rejecting bump request:', error);
    res.status(500).json({ error: error.message || 'Failed to reject bump request' });
  }
});

// Create NOWPayments payment for bump
router.post('/nowpayments/create', async (req, res) => {
  try {
    const { adId, owner, duration, payCurrency } = req.body;
    
    if (!adId || !owner || !duration || !payCurrency) {
      return res.status(400).json({ error: 'Missing required fields: adId, owner, duration, or payCurrency' });
    }

    // Check if there's already a pending bump request for this ad
    const existingRequest = await BumpRequest.findOne({ 
      adId, 
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'There is already a pending bump request for this ad' });
    }

    // Calculate price based on duration
    let priceAmount;
    if (duration === 90 * 24 * 60 * 60 * 1000) { // 3 months
      priceAmount = 99;
    } else if (duration === 180 * 24 * 60 * 60 * 1000) { // 6 months
      priceAmount = 150;
    } else if (duration === -1) { // Lifetime
      priceAmount = 300;
    } else {
      return res.status(400).json({ error: 'Invalid duration specified' });
    }

    // Generate unique order ID
    const orderId = `bump_${adId}_${Date.now()}`;
    
    // Create NOWPayments payment
    const paymentData = await nowPaymentsService.createPayment({
      priceAmount,
      priceCurrency: 'USD',
      payCurrency,
      orderId,
      orderDescription: `Bump ad ${adId} for ${duration === -1 ? 'lifetime' : duration / (24 * 60 * 60 * 1000) + ' days'}`,
      ipnCallbackUrl: `${process.env.BASE_URL || 'https://your-domain.com'}/api/bumps/nowpayments/ipn`,
      successUrl: `${process.env.FRONTEND_URL || 'https://your-frontend.com'}/dashboard?payment=success`,
      cancelUrl: `${process.env.FRONTEND_URL || 'https://your-frontend.com'}/dashboard?payment=cancelled`
    });

    // Create bump request with NOWPayments data
    const bumpRequest = new BumpRequest({
      adId,
      owner,
      duration,
      status: 'pending',
      paymentMethod: 'nowpayments',
      nowPaymentsData: {
        paymentId: paymentData.payment_id,
        paymentStatus: paymentData.payment_status,
        payUrl: paymentData.pay_url,
        priceAmount: paymentData.price_amount,
        priceCurrency: paymentData.price_currency,
        payCurrency: paymentData.pay_currency,
        payAmount: paymentData.pay_amount,
        orderId: paymentData.order_id
      }
    });

    const savedRequest = await bumpRequest.save();
    
    res.status(201).json({
      bumpRequest: savedRequest,
      paymentUrl: paymentData.pay_url,
      paymentId: paymentData.payment_id
    });
  } catch (error) {
    console.error('Error creating NOWPayments bump request:', error);
    res.status(500).json({ error: error.message || 'Failed to create NOWPayments bump request' });
  }
});

// NOWPayments IPN webhook handler
router.post('/nowpayments/ipn', async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    const payload = req.body;

    console.log('Received NOWPayments IPN:', payload);

    // Verify IPN signature
    if (!nowPaymentsService.verifyIPN(payload, signature)) {
      console.error('Invalid IPN signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { payment_id, payment_status, order_id, pay_amount, pay_currency } = payload;

    // Find the bump request
    const bumpRequest = await BumpRequest.findOne({ 
      'nowPaymentsData.paymentId': payment_id 
    });

    if (!bumpRequest) {
      console.error('Bump request not found for payment ID:', payment_id);
      return res.status(404).json({ error: 'Bump request not found' });
    }

    // Update payment status
    bumpRequest.nowPaymentsData.paymentStatus = payment_status;
    if (pay_amount) {
      bumpRequest.nowPaymentsData.payAmount = pay_amount;
    }

    // If payment is finished (successful), approve the bump
    if (payment_status === 'finished') {
      bumpRequest.status = 'approved';
      bumpRequest.processedAt = new Date();
      bumpRequest.processedBy = 'nowpayments_auto';

      // Update the ad
      const duration = parseInt(bumpRequest.duration);
      const now = new Date();
      const expiresAt = duration === -1 ? null : new Date(now.getTime() + duration);

      const ad = await Ad.findOneAndUpdate(
        { id: bumpRequest.adId },
        { 
          size: 100, // MAX_SIZE
          isBumped: true,
          status: 'approved',
          bumpedAt: now,
          bumpDuration: duration,
          bumpExpiresAt: expiresAt,
          lastBumpTx: payment_id // Use payment ID as transaction reference
        },
        { new: true }
      );

      // Record affiliate commission if applicable
      try {
        const adOwner = await User.findOne({ username: ad.owner });
        if (adOwner && adOwner.referredBy) {
          let adAmount = bumpRequest.nowPaymentsData.priceAmount;

          const commissionRate = await AffiliateEarning.calculateCommissionRate(adOwner.referredBy);
          const commissionEarned = AffiliateEarning.calculateCommission(adAmount, commissionRate);
          
          const earning = new AffiliateEarning({
            affiliateId: adOwner.referredBy,
            referredUserId: adOwner._id,
            adId: ad._id,
            adAmount,
            currency: 'USD',
            commissionRate,
            commissionEarned
          });
          
          await earning.save();
        }
      } catch (commissionError) {
        console.error('Error recording affiliate commission:', commissionError);
      }

      console.log('Bump automatically approved via NOWPayments:', bumpRequest.adId);
    } else if (payment_status === 'failed' || payment_status === 'refunded') {
      bumpRequest.status = 'rejected';
      bumpRequest.processedAt = new Date();
      bumpRequest.processedBy = 'nowpayments_auto';
      bumpRequest.rejectionReason = `Payment ${payment_status}`;
    }

    await bumpRequest.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing NOWPayments IPN:', error);
    res.status(500).json({ error: 'Failed to process IPN' });
  }
});

// Get NOWPayments currencies
router.get('/nowpayments/currencies', async (req, res) => {
  try {
    const currencies = await nowPaymentsService.getAvailableCurrencies();
    
    // Filter to popular cryptocurrencies for better UX
    const popularCurrencies = ['btc', 'eth', 'ltc', 'bch', 'usdt', 'usdc', 'dai', 'doge', 'ada', 'dot', 'matic', 'sol', 'avax', 'trx'];
    const filteredCurrencies = currencies.filter(currency => 
      popularCurrencies.includes(currency.toLowerCase())
    );
    
    res.json(filteredCurrencies);
  } catch (error) {
    console.error('Error fetching NOWPayments currencies:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

module.exports = router; 