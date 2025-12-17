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
// Note: SimpleSwap might use different base URLs or endpoint structures
const SIMPLESWAP_API_BASE = 'https://api.simpleswap.io';
const SIMPLESWAP_PARTNERS_BASE = 'https://partners.simpleswap.io';

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

  // Try different authentication methods
  const authMethods = [
    // Method 1: API key in header only
    {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      params: { ...params },
    },
    // Method 2: API key as query parameter
    {
      headers: { 'Content-Type': 'application/json' },
      params: { ...params, api_key: apiKey },
    },
    // Method 3: API key in Authorization header
    {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      params: { ...params },
    },
    // Method 4: API key in both header and query
    {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      params: { ...params, api_key: apiKey },
    },
  ];

  for (const authMethod of authMethods) {
    try {
      const config = {
        method,
        url: `${SIMPLESWAP_API_BASE}${endpoint}`,
        headers: authMethod.headers,
        params: authMethod.params,
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      if (response.data) {
        return response.data;
      }
    } catch (error) {
      // If not 404, this auth method might be wrong but endpoint exists
      if (error.response?.status !== 404) {
        console.log(`[SimpleSwap] Endpoint exists but auth failed for ${endpoint}:`, error.response?.status);
        // Continue to try other auth methods
        continue;
      }
      // If 404, try next auth method
      continue;
    }
  }

  // If all auth methods fail, throw the last error
  throw new Error('All authentication methods failed');
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

    // Try endpoints in order of likelihood (v3 first for fiat support)
    const endpoints = [
      '/v3/get_all_currencies',
      '/v1/get_currencies',
      '/get_currencies',
      '/v3/currencies',
      '/v1/currencies',
      '/currencies',
    ];

    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        console.log(`[SimpleSwap] Trying endpoint: ${endpoint} with API key: ${apiKey.substring(0, 8)}...`);
        
        // Use the helper function which tries different auth methods
        const data = await makeSimpleswapRequest('GET', endpoint);
        
        if (data) {
          console.log(`[SimpleSwap] Successfully loaded currencies from ${endpoint}`);
          console.log(`[SimpleSwap] Response structure:`, {
            hasResult: !!data.result,
            resultType: typeof data.result,
            isArray: Array.isArray(data.result),
            resultKeys: data.result ? Object.keys(data.result).slice(0, 5) : [],
            traceId: data.traceId,
          });
          
          // Handle SimpleSwap API response format: { result: { "eth": {...}, "btc": {...} }, traceId: "..." }
          // The result is an object with currency tickers as keys
          let processedData = data;
          
          if (data.result && typeof data.result === 'object' && !Array.isArray(data.result)) {
            // Convert result object to array format for frontend
            const resultKeys = Object.keys(data.result);
            console.log(`[SimpleSwap] Converting ${resultKeys.length} currencies from result object`);
            
            processedData = resultKeys.map(ticker => {
              const currency = data.result[ticker];
              return {
                ticker: (currency.ticker || ticker).toLowerCase(),
                code: (currency.ticker || ticker).toUpperCase(),
                name: currency.name || currency.ticker || ticker,
                isFiat: currency.isFiat || false,
                network: currency.network || '',
                image: currency.image || '',
                hasExtraId: currency.hasExtraId || false,
                extraId: currency.extraId || '',
                precision: currency.precision || 8,
                isAvailableFloat: currency.isAvailableFloat || false,
                isAvailableFixed: currency.isAvailableFixed || false,
                warningsFrom: currency.warningsFrom || [],
                warningsTo: currency.warningsTo || [],
                validationAddress: currency.validationAddress || '',
                validationExtra: currency.validationExtra || '',
                addressExplorer: currency.addressExplorer || '',
                txExplorer: currency.txExplorer || '',
                confirmationsFrom: currency.confirmationsFrom || '',
              };
            });
            
            console.log(`[SimpleSwap] Processed ${processedData.length} currencies (${processedData.filter(c => c.isFiat).length} fiat, ${processedData.filter(c => !c.isFiat).length} crypto)`);
          } else if (Array.isArray(data.result)) {
            // If result is already an array
            processedData = data.result;
            console.log(`[SimpleSwap] Result is already an array with ${processedData.length} items`);
          } else if (Array.isArray(data)) {
            // If data is directly an array
            processedData = data;
            console.log(`[SimpleSwap] Data is directly an array with ${processedData.length} items`);
          }
          
          return res.json(processedData);
        }
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        const errorData = err.response?.data;
        
        console.log(`[SimpleSwap] Endpoint ${endpoint} failed:`, {
          status,
          message: errorData?.message || errorData?.error || err.message,
        });
        
        // If it's not a 404, this might be the right endpoint but wrong auth
        // Continue to try other endpoints
        if (status === 404) {
          continue;
        }
        // For non-404 errors, still try other endpoints in case it's an auth issue
        continue;
      }
    }

    // If all endpoints fail
    console.error('[SimpleSwap] All endpoints failed');
    res.status(500).json({
      error: 'Failed to fetch currencies from SimpleSwap API. Please verify your API key is correct and has fiat permissions enabled.',
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

// Test endpoint to verify API key and connectivity
router.get('/test', simpleswapLimiter, async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: 'SimpleSwap API key not configured',
        configured: false,
      });
    }

    // Try a simple endpoint to test connectivity
    const testEndpoints = [
      '/v3/get_all_currencies',
      '/v1/get_currencies',
    ];

    const results = [];
    for (const endpoint of testEndpoints) {
      try {
        const data = await makeSimpleswapRequest('GET', endpoint);
        results.push({
          endpoint,
          status: 'success',
          hasData: !!data,
          hasResult: !!data?.result,
          resultType: typeof data?.result,
          resultKeys: data?.result && typeof data.result === 'object' ? Object.keys(data.result).length : 0,
        });
      } catch (err) {
        results.push({
          endpoint,
          status: 'error',
          statusCode: err.response?.status,
          message: err.response?.data?.message || err.response?.data?.error || err.message,
        });
      }
    }

    return res.json({
      apiKeyConfigured: true,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      testResults: results,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;

