const axios = require('axios');

/**
 * Socialplug API Service
 * Handles all interactions with Socialplug's API for Twitter Space Listeners
 * Documentation: https://docs.socialplug.io/
 */

// CORRECT API URL per docs: https://docs.socialplug.io/
const SOCIALPLUG_API_URL = process.env.SOCIALPLUG_API_URL || 'https://api.socialplug.io/api/v1';
const SOCIALPLUG_API_KEY = process.env.SOCIALPLUG_API_KEY;

// Service ID for Twitter Spaces Listeners (needs to be found via /services endpoint)
// We'll fetch this dynamically or use the one from their service catalog
let TWITTER_SPACES_SERVICE_ID = null;

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

// TEST PRICING: Override customer price for specific package (set price to 0 to disable)
// Note: This only affects what the customer pays - Socialplug still gets the real order
const TEST_PRICE_OVERRIDE = {
  listeners: 100,
  duration: 30,
  price: 0.01 // USDC - Customer pays this, but real order goes to Socialplug
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
 * Endpoint: GET /balance
 * @returns {Promise<{success: boolean, balance?: number, error?: string}>}
 */
const checkBalance = async () => {
  if (!SOCIALPLUG_API_KEY) {
    return { success: false, error: 'Socialplug API key not configured' };
  }

  try {
    const response = await axios.get(`${SOCIALPLUG_API_URL}/balance`, {
      headers: {
        'Authorization': SOCIALPLUG_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('[Socialplug] Balance response:', JSON.stringify(response.data));

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
    if (error.response) {
      console.error('Socialplug error response:', error.response.data);
    }
    return { 
      success: false, 
      error: error.response?.data?.error || error.response?.data?.message || error.message 
    };
  }
};

/**
 * Get available services from Socialplug
 * Endpoint: GET /services
 * @returns {Promise<{success: boolean, services?: Array, error?: string}>}
 */
const getServices = async () => {
  if (!SOCIALPLUG_API_KEY) {
    return { success: false, error: 'Socialplug API key not configured' };
  }

  try {
    const response = await axios.get(`${SOCIALPLUG_API_URL}/services`, {
      headers: {
        'Authorization': SOCIALPLUG_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('[Socialplug] Services response received');

    if (response.data && !response.data.error) {
      // Per docs: response is { discount_percentage, services: [...] }
      const services = response.data.services || response.data || [];
      
      // Log ALL services with correct field names from docs
      console.log(`[Socialplug] Found ${services.length} services. Full list:`);
      services.forEach(s => {
        // Docs show: id, serviceName, platform, category
        console.log(`  - ID: "${s.id}", Name: "${s.serviceName}", Platform: ${s.platform}, Category: ${s.category}`);
      });
      
      // Look for Twitter Spaces Listeners service
      const spaceServices = services.filter(s => {
        const id = String(s.id || '').toLowerCase();
        const name = String(s.serviceName || '').toLowerCase();
        const platform = String(s.platform || '').toLowerCase();
        const category = String(s.category || '').toLowerCase();
        const searchText = `${id} ${name} ${platform} ${category}`;
        return searchText.includes('space') || 
               (searchText.includes('twitter') && searchText.includes('listener')) ||
               (searchText.includes('x') && searchText.includes('listener'));
      });
      
      if (spaceServices.length > 0) {
        console.log('[Socialplug] *** FOUND SPACE/LISTENER SERVICES: ***');
        spaceServices.forEach(s => {
          console.log(`  >>> ID: "${s.id}", Name: "${s.serviceName}", Min: ${s.minQuantity}, Max: ${s.maxQuantity}`);
        });
        
        // Use the first matching service
        TWITTER_SPACES_SERVICE_ID = spaceServices[0].id;
        console.log(`[Socialplug] Using service ID: ${TWITTER_SPACES_SERVICE_ID}`);
      } else {
        console.log('[Socialplug] *** NO TWITTER SPACES LISTENERS SERVICE FOUND ***');
      }
      
      return { success: true, services };
    }
    
    if (response.data && response.data.error) {
      return { success: false, error: response.data.error };
    }
    
    return { success: false, error: 'Invalid response from Socialplug' };
  } catch (error) {
    console.error('Socialplug services fetch error:', error.message);
    if (error.response) {
      console.error('Socialplug error response:', error.response.data);
    }
    return { 
      success: false, 
      error: error.response?.data?.error || error.response?.data?.message || error.message 
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

  // Log if this is a test-priced order (customer paid less, but real order placed)
  if (isTestPricedOrder(listeners, duration)) {
    console.log('[Socialplug] Test-priced order - placing REAL order on Socialplug');
  }

  try {
    // If we don't have the service ID yet, try to fetch services first
    if (!TWITTER_SPACES_SERVICE_ID) {
      console.log('[Socialplug] Service ID not cached, fetching services...');
      await getServices();
    }

    // Fallback service ID if not found
    const serviceId = TWITTER_SPACES_SERVICE_ID || 46;

    // Socialplug API uses POST for placing orders
    // Field names per validation error: service (string), targetUrl, quantity, runs
    const orderData = {
      service: String(serviceId),  // Must be string, not number
      targetUrl: spaceUrl,
      quantity: listeners,
      runs: duration  // Duration in minutes
    };

    console.log(`[Socialplug] Placing order - Service: ${serviceId}, Listeners: ${listeners}, Duration: ${duration}min, URL: ${spaceUrl}`);
    console.log('[Socialplug] Order payload:', JSON.stringify(orderData));

    const response = await axios.post(`${SOCIALPLUG_API_URL}/order`, orderData, {
      headers: {
        'Authorization': SOCIALPLUG_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('[Socialplug] Order response:', JSON.stringify(response.data));

    // Handle successful response - check various possible response formats
    if (response.data) {
      const orderId = response.data.order_id || response.data.orderId || response.data.order || response.data.id;
      
      if (orderId) {
        return { 
          success: true, 
          orderId: orderId.toString(),
          charge: response.data.charge || response.data.cost,
          startCount: response.data.start_count || response.data.startCount || 0,
          status: response.data.status || 'pending'
        };
      }
      
      // Handle error in response
      if (response.data.error || response.data.message) {
        return { success: false, error: response.data.error || response.data.message };
      }
    }
    
    return { success: false, error: 'Invalid response from Socialplug - no order ID returned' };
  } catch (error) {
    console.error('Socialplug order placement error:', error.message);
    if (error.response) {
      console.error('Socialplug error response:', JSON.stringify(error.response.data));
      console.error('Socialplug error status:', error.response.status);
    }
    return { 
      success: false, 
      error: error.response?.data?.error || error.response?.data?.message || error.message 
    };
  }
};

/**
 * Check order status on Socialplug
 * Endpoint: GET /order/{id}
 * @param {string} orderId - The Socialplug order ID
 * @returns {Promise<{success: boolean, status?: string, error?: string}>}
 */
const checkOrderStatus = async (orderId) => {
  if (!SOCIALPLUG_API_KEY) {
    return { success: false, error: 'Socialplug API key not configured' };
  }

  try {
    const response = await axios.get(`${SOCIALPLUG_API_URL}/order/${orderId}`, {
      headers: {
        'Authorization': SOCIALPLUG_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('[Socialplug] Status response:', JSON.stringify(response.data));

    if (response.data && !response.data.error) {
      return { 
        success: true, 
        status: response.data.status,
        charge: response.data.charge || response.data.cost,
        startCount: response.data.start_count || response.data.startCount,
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
    if (error.response) {
      console.error('Socialplug status error response:', error.response.data);
    }
    return { 
      success: false, 
      error: error.response?.data?.error || error.response?.data?.message || error.message 
    };
  }
};

/**
 * Check if this is a test-priced order (customer pays less, but real order still placed)
 */
const isTestPricedOrder = (listeners, duration) => {
  return TEST_PRICE_OVERRIDE.price > 0 && 
         listeners === TEST_PRICE_OVERRIDE.listeners && 
         duration === TEST_PRICE_OVERRIDE.duration;
};

// Alias for backwards compatibility
const isTestOrder = isTestPricedOrder;

/**
 * Validate that we have sufficient balance for an order
 * @param {number} listeners - Number of listeners
 * @param {number} duration - Duration in minutes
 * @returns {Promise<{sufficient: boolean, balance?: number, required?: number, error?: string}>}
 */
const validateBalance = async (listeners, duration) => {
  // Get actual Socialplug cost (regardless of customer test price)
  const cost = getSocialplugCost(listeners, duration);
  if (cost === null) {
    return { sufficient: false, error: 'Invalid package selection' };
  }

  if (isTestPricedOrder(listeners, duration)) {
    console.log('[Socialplug] Test-priced order - cost would be $' + cost);
  }

  // Try to check balance, but don't fail if the API doesn't support it
  // The order placement will fail if there's truly insufficient balance
  const balanceResult = await checkBalance();
  
  if (!balanceResult.success) {
    console.log('[Socialplug] Balance check failed, proceeding anyway - Socialplug will reject if insufficient:', balanceResult.error);
    // Return sufficient=true to proceed, let order placement handle the actual check
    return {
      sufficient: true,
      balance: null,
      required: cost,
      balanceCheckSkipped: true
    };
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
  isTestPricedOrder,
  SOCIALPLUG_PRICING,
  MINIMUM_PROFIT,
  MARKUP_PERCENTAGE,
  TEST_PRICE_OVERRIDE
};

