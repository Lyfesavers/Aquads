const axios = require('axios');

/**
 * Socialplug API Service
 * Handles all interactions with Socialplug's API for Twitter Space Listeners
 * Documentation: https://docs.socialplug.io/
 */

const SOCIALPLUG_API_URL = process.env.SOCIALPLUG_API_URL || 'https://panel.socialplug.io/api/v2';
const SOCIALPLUG_API_KEY = process.env.SOCIALPLUG_API_KEY;

// Service ID for Twitter Spaces Listeners (from Socialplug)
const TWITTER_SPACES_LISTENERS_SERVICE_ID = 46;

// Pricing table based on Socialplug's actual pricing (in USDC)
// Format: { listeners: { duration: cost } }
const SOCIALPLUG_PRICING = {
  100: { 30: 11, 60: 15, 120: 21 },
  200: { 30: 22, 60: 30, 120: 42 },
  500: { 30: 57, 60: 78, 120: 110 },
  1000: { 30: 67, 60: 92, 120: 130 },
  2500: { 30: 143, 60: 195, 120: 275 },
  5000: { 30: 218, 60: 300, 120: 420 }
};

// TEST MODE: Override price for specific package (set price to 0 to disable)
const TEST_PRICE_OVERRIDE = {
  listeners: 100,
  duration: 30,
  price: 0 // USDC - Set to 0 to disable test mode (LIVE MODE ACTIVE)
};

// Markup: 30% OR $5 minimum, whichever is higher
const MINIMUM_PROFIT = 5;
const MARKUP_PERCENTAGE = 0.30;

/**
 * Calculate the selling price with markup
 * @param {number} socialplugCost - The cost from Socialplug
 * @returns {number} - The price to charge customers
 */
const calculateSellingPrice = (socialplugCost) => {
  const percentageMarkup = socialplugCost * (1 + MARKUP_PERCENTAGE);
  const minimumMarkup = socialplugCost + MINIMUM_PROFIT;
  return Math.ceil(Math.max(percentageMarkup, minimumMarkup));
};

/**
 * Get the Socialplug cost for a specific package
 * @param {number} listeners - Number of listeners (100, 200, 500, 1000, 2500, 5000)
 * @param {number} duration - Duration in minutes (30, 60, 120)
 * @returns {number|null} - Cost in USD or null if invalid
 */
const getSocialplugCost = (listeners, duration) => {
  const listenerPricing = SOCIALPLUG_PRICING[listeners];
  if (!listenerPricing) return null;
  return listenerPricing[duration] || null;
};

/**
 * Get the customer-facing price for a package
 * @param {number} listeners - Number of listeners
 * @param {number} duration - Duration in minutes
 * @returns {number|null} - Customer price in USDC
 */
const getCustomerPrice = (listeners, duration) => {
  // Check for test price override
  if (TEST_PRICE_OVERRIDE.price > 0 && 
      listeners === TEST_PRICE_OVERRIDE.listeners && 
      duration === TEST_PRICE_OVERRIDE.duration) {
    return TEST_PRICE_OVERRIDE.price;
  }
  
  const cost = getSocialplugCost(listeners, duration);
  if (cost === null) return null;
  return calculateSellingPrice(cost);
};

/**
 * Get all available packages with pricing
 * @returns {Array} - Array of package objects
 */
const getAllPackages = () => {
  const packages = [];
  const listenerOptions = [100, 200, 500, 1000, 2500, 5000];
  const durationOptions = [30, 60, 120];
  
  const durationLabels = {
    30: '30 Minutes',
    60: '1 Hour',
    120: '2 Hours'
  };
  
  const listenerDiscounts = {
    100: 5,
    200: 10,
    500: 15,
    1000: 20,
    2500: 25,
    5000: 30
  };

  for (const listeners of listenerOptions) {
    for (const duration of durationOptions) {
      const cost = getSocialplugCost(listeners, duration);
      const price = getCustomerPrice(listeners, duration);
      const profit = price - cost;
      
      packages.push({
        id: `space_${listeners}_${duration}`,
        listeners,
        duration,
        durationLabel: durationLabels[duration],
        cost, // Our cost from Socialplug
        price, // Customer price
        profit, // Our profit
        discount: listenerDiscounts[listeners]
      });
    }
  }
  
  return packages;
};

/**
 * Check Socialplug account balance
 * @returns {Promise<{success: boolean, balance?: number, error?: string}>}
 */
const checkBalance = async () => {
  if (!SOCIALPLUG_API_KEY) {
    return { success: false, error: 'Socialplug API key not configured' };
  }

  try {
    // Socialplug API uses form-urlencoded data
    const params = new URLSearchParams();
    params.append('key', SOCIALPLUG_API_KEY);
    params.append('action', 'balance');

    const response = await axios.post(SOCIALPLUG_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    if (response.data && response.data.balance !== undefined) {
      return { 
        success: true, 
        balance: parseFloat(response.data.balance),
        currency: response.data.currency || 'USD'
      };
    }
    
    // Handle error response
    if (response.data && response.data.error) {
      return { success: false, error: response.data.error };
    }
    
    return { success: false, error: 'Invalid response from Socialplug' };
  } catch (error) {
    console.error('Socialplug balance check error:', error.message);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};

/**
 * Get available services from Socialplug
 * @returns {Promise<{success: boolean, services?: Array, error?: string}>}
 */
const getServices = async () => {
  if (!SOCIALPLUG_API_KEY) {
    return { success: false, error: 'Socialplug API key not configured' };
  }

  try {
    const params = new URLSearchParams();
    params.append('key', SOCIALPLUG_API_KEY);
    params.append('action', 'services');

    const response = await axios.post(SOCIALPLUG_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    if (response.data && !response.data.error) {
      return { success: true, services: response.data };
    }
    
    if (response.data && response.data.error) {
      return { success: false, error: response.data.error };
    }
    
    return { success: false, error: 'Invalid response from Socialplug' };
  } catch (error) {
    console.error('Socialplug services fetch error:', error.message);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};

/**
 * Place an order on Socialplug for Twitter Space Listeners
 * @param {string} spaceUrl - The Twitter Space URL
 * @param {number} listeners - Number of listeners (100, 200, 500, 1000, 2500, 5000)
 * @param {number} duration - Duration in minutes (30, 60, 120)
 * @returns {Promise<{success: boolean, orderId?: string, error?: string}>}
 */
const placeOrder = async (spaceUrl, listeners, duration) => {
  if (!SOCIALPLUG_API_KEY) {
    return { success: false, error: 'Socialplug API key not configured' };
  }

  // Validate inputs
  const validListeners = [100, 200, 500, 1000, 2500, 5000];
  const validDurations = [30, 60, 120];
  
  if (!validListeners.includes(listeners)) {
    return { success: false, error: `Invalid listener count. Must be one of: ${validListeners.join(', ')}` };
  }
  
  if (!validDurations.includes(duration)) {
    return { success: false, error: `Invalid duration. Must be one of: ${validDurations.join(', ')} minutes` };
  }

  if (!spaceUrl || !spaceUrl.includes('twitter.com') && !spaceUrl.includes('x.com')) {
    return { success: false, error: 'Invalid Twitter Space URL' };
  }

  // Handle test orders - return mock success without calling Socialplug
  if (isTestOrder(listeners, duration)) {
    console.log('[Socialplug] Test order detected - returning mock success');
    return {
      success: true,
      orderId: `TEST-${Date.now()}`,
      charge: 0,
      startCount: 0,
      status: 'completed',
      isTest: true
    };
  }

  try {
    // Use form-urlencoded format for Socialplug API
    const params = new URLSearchParams();
    params.append('key', SOCIALPLUG_API_KEY);
    params.append('action', 'add');
    params.append('service', TWITTER_SPACES_LISTENERS_SERVICE_ID);
    params.append('link', spaceUrl);
    params.append('quantity', listeners); // Listener count as quantity
    
    // Add duration as a custom field if the API supports it
    // Some SMM panels use 'runs' or custom fields for duration
    params.append('runs', duration); // Duration in minutes

    console.log(`[Socialplug] Placing order - Service: ${TWITTER_SPACES_LISTENERS_SERVICE_ID}, Listeners: ${listeners}, Duration: ${duration}min, URL: ${spaceUrl}`);

    const response = await axios.post(SOCIALPLUG_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    });

    console.log('[Socialplug] Order response:', JSON.stringify(response.data));

    if (response.data && response.data.order) {
      return { 
        success: true, 
        orderId: response.data.order.toString(),
        charge: response.data.charge,
        startCount: response.data.start_count,
        status: response.data.status || 'pending'
      };
    }
    
    // Handle error response
    if (response.data && response.data.error) {
      return { success: false, error: response.data.error };
    }
    
    return { success: false, error: 'Invalid response from Socialplug' };
  } catch (error) {
    console.error('Socialplug order placement error:', error.message);
    if (error.response) {
      console.error('Socialplug error response:', error.response.data);
    }
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};

/**
 * Check order status on Socialplug
 * @param {string} orderId - The Socialplug order ID
 * @returns {Promise<{success: boolean, status?: string, error?: string}>}
 */
const checkOrderStatus = async (orderId) => {
  if (!SOCIALPLUG_API_KEY) {
    return { success: false, error: 'Socialplug API key not configured' };
  }

  try {
    const params = new URLSearchParams();
    params.append('key', SOCIALPLUG_API_KEY);
    params.append('action', 'status');
    params.append('order', orderId);

    const response = await axios.post(SOCIALPLUG_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    if (response.data && !response.data.error) {
      return { 
        success: true, 
        status: response.data.status,
        charge: response.data.charge,
        startCount: response.data.start_count,
        remains: response.data.remains,
        currency: response.data.currency
      };
    }
    
    if (response.data && response.data.error) {
      return { success: false, error: response.data.error };
    }
    
    return { success: false, error: 'Invalid response from Socialplug' };
  } catch (error) {
    console.error('Socialplug status check error:', error.message);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};

/**
 * Check if this is a test order (using test price override)
 */
const isTestOrder = (listeners, duration) => {
  return TEST_PRICE_OVERRIDE.price > 0 && 
         listeners === TEST_PRICE_OVERRIDE.listeners && 
         duration === TEST_PRICE_OVERRIDE.duration;
};

/**
 * Validate that we have sufficient balance for an order
 * @param {number} listeners - Number of listeners
 * @param {number} duration - Duration in minutes
 * @returns {Promise<{sufficient: boolean, balance?: number, required?: number, error?: string}>}
 */
const validateBalance = async (listeners, duration) => {
  // Skip balance check for test orders
  if (isTestOrder(listeners, duration)) {
    console.log('[Socialplug] Test order detected - skipping balance check');
    return { sufficient: true, balance: 999, required: 0, isTest: true };
  }

  const cost = getSocialplugCost(listeners, duration);
  if (cost === null) {
    return { sufficient: false, error: 'Invalid package selection' };
  }

  const balanceResult = await checkBalance();
  if (!balanceResult.success) {
    return { sufficient: false, error: balanceResult.error };
  }

  return {
    sufficient: balanceResult.balance >= cost,
    balance: balanceResult.balance,
    required: cost
  };
};

module.exports = {
  checkBalance,
  getServices,
  placeOrder,
  checkOrderStatus,
  getSocialplugCost,
  getCustomerPrice,
  getAllPackages,
  validateBalance,
  calculateSellingPrice,
  isTestOrder,
  SOCIALPLUG_PRICING,
  MINIMUM_PROFIT,
  MARKUP_PERCENTAGE,
  TEST_PRICE_OVERRIDE
};

