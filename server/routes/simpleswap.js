const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Rate limiting for SimpleSwap API proxy
const simpleswapLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many SimpleSwap API requests, please try again later.'
});

// SimpleSwap API base URL
const SIMPLESWAP_API_BASE = 'https://api.simpleswap.io';

// Get API key from environment
const getApiKey = () => {
  return process.env.SIMPLESWAP_API_KEY || '';
};

// Helper to make SimpleSwap API requests
const makeSimpleswapRequest = async (method, endpoint, params = {}, data = null) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('SimpleSwap API key not configured');
  }

  const config = {
    method,
    url: `${SIMPLESWAP_API_BASE}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    params: {
      ...params,
      api_key: apiKey,
    },
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('SimpleSwap API Error:', {
      endpoint,
      status: error.response?.status,
      message: error.response?.data || error.message,
    });
    throw error;
  }
};

// Get all currencies
router.get('/currencies', simpleswapLimiter, async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: 'SimpleSwap API key not configured. Please set SIMPLESWAP_API_KEY in backend environment variables.',
      });
    }

    // Try multiple endpoint formats
    const endpoints = [
      '/v3/get_all_currencies',
      '/v1/get_currencies',
      '/get_currencies',
      '/v3/currencies',
      '/v1/currencies',
    ];

    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        console.log(`[SimpleSwap] Trying endpoint: ${endpoint}`);
        const data = await makeSimpleswapRequest('GET', endpoint);
        if (data) {
          console.log(`[SimpleSwap] Successfully loaded currencies from ${endpoint}`);
          return res.json(data);
        }
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        const errorData = err.response?.data;
        
        console.log(`[SimpleSwap] Endpoint ${endpoint} failed:`, {
          status,
          message: errorData?.message || err.message,
        });
        
        if (status !== 404) {
          // If it's not a 404, return that error
          return res.status(status || 500).json({
            error: errorData?.message || err.message || 'SimpleSwap API error',
            endpoint,
          });
        }
        // If 404, try next endpoint
        continue;
      }
    }

    // If all endpoints return 404
    console.error('[SimpleSwap] All endpoints returned 404');
    res.status(404).json({
      error: 'SimpleSwap API endpoint not found. All endpoints returned 404. Please check the API documentation or contact SimpleSwap support.',
      lastError: lastError?.response?.data || lastError?.message,
    });
  } catch (error) {
    console.error('[SimpleSwap] Get currencies error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch currencies',
    });
  }
});

// Get exchange rate
router.get('/rate', simpleswapLimiter, async (req, res) => {
  try {
    const { from, to, amount, fixed } = req.query;
    
    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'Missing required parameters: from, to, amount' });
    }

    const endpoints = [
      '/v3/get_estimated',
      '/v1/get_estimated',
      '/get_estimated',
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await makeSimpleswapRequest('GET', endpoint, {
          currency_from: from,
          currency_to: to,
          amount: parseFloat(amount),
          fixed: fixed === 'true',
        });
        if (data) {
          return res.json(data);
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          return res.status(err.response?.status || 500).json({
            error: err.response?.data?.message || err.message || 'Failed to get exchange rate',
          });
        }
        continue;
      }
    }

    res.status(404).json({ error: 'Exchange rate endpoint not found' });
  } catch (error) {
    console.error('Get rate error:', error);
    res.status(500).json({ error: error.message || 'Failed to get exchange rate' });
  }
});

// Get minimum amount
router.get('/min-amount', simpleswapLimiter, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing required parameters: from, to' });
    }

    const endpoints = [
      '/v3/get_min',
      '/v1/get_min',
      '/get_min',
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await makeSimpleswapRequest('GET', endpoint, {
          currency_from: from,
          currency_to: to,
        });
        if (data) {
          return res.json(data);
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          return res.status(err.response?.status || 500).json({
            error: err.response?.data?.message || err.message || 'Failed to get minimum amount',
          });
        }
        continue;
      }
    }

    res.status(404).json({ error: 'Minimum amount endpoint not found' });
  } catch (error) {
    console.error('Get min amount error:', error);
    res.status(500).json({ error: error.message || 'Failed to get minimum amount' });
  }
});

// Create exchange
router.post('/exchange', simpleswapLimiter, async (req, res) => {
  try {
    const { currency_from, currency_to, address_to, amount, fixed, extra_id_to } = req.body;
    
    if (!currency_from || !currency_to || !address_to || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const endpoints = [
      '/v3/create_exchange',
      '/v1/create_exchange',
      '/create_exchange',
    ];

    const exchangeData = {
      currency_from,
      currency_to,
      address_to,
      amount: parseFloat(amount),
      fixed: fixed || false,
    };

    if (extra_id_to) {
      exchangeData.extra_id_to = extra_id_to;
    }

    for (const endpoint of endpoints) {
      try {
        const data = await makeSimpleswapRequest('POST', endpoint, {}, exchangeData);
        if (data) {
          return res.json(data);
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          return res.status(err.response?.status || 500).json({
            error: err.response?.data?.message || err.message || 'Failed to create exchange',
          });
        }
        continue;
      }
    }

    res.status(404).json({ error: 'Create exchange endpoint not found' });
  } catch (error) {
    console.error('Create exchange error:', error);
    res.status(500).json({ error: error.message || 'Failed to create exchange' });
  }
});

// Get exchange status
router.get('/exchange/:id', simpleswapLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    
    const endpoints = [
      `/v3/get_exchange/${id}`,
      `/v1/get_exchange/${id}`,
      `/get_exchange/${id}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await makeSimpleswapRequest('GET', endpoint);
        if (data) {
          return res.json(data);
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          return res.status(err.response?.status || 500).json({
            error: err.response?.data?.message || err.message || 'Failed to get exchange status',
          });
        }
        continue;
      }
    }

    res.status(404).json({ error: 'Exchange status endpoint not found' });
  } catch (error) {
    console.error('Get exchange status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get exchange status' });
  }
});

module.exports = router;

