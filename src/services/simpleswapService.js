import axios from 'axios';
import logger from '../utils/logger';

// SimpleSwap API base URL - try v3 first, fallback to v1
const SIMPLESWAP_API_URL = 'https://api.simpleswap.io/v3';

// Get API key from environment
const getApiKey = () => {
  return process.env.REACT_APP_SIMPLESWAP_API_KEY || '';
};

// Create axios instance with API key
const simpleswapApi = axios.create({
  baseURL: SIMPLESWAP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add API key to all requests
simpleswapApi.interceptors.request.use((config) => {
  const apiKey = getApiKey();
  if (apiKey) {
    // SimpleSwap API typically uses api_key as query parameter
    config.params = {
      ...config.params,
      api_key: apiKey,
    };
    // Also try as header (some APIs accept both)
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});

const simpleswapService = {
  /**
   * Get all available currencies
   * @returns {Promise<Array>} List of available currencies
   */
  async getCurrencies() {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error('API key is not configured. Please add REACT_APP_SIMPLESWAP_API_KEY to your environment variables.');
      }

      // Try different API endpoint formats
      const endpoints = [
        { base: 'https://api.simpleswap.io/v3', path: '/get_all_currencies' },
        { base: 'https://api.simpleswap.io/v1', path: '/get_currencies' },
        { base: 'https://api.simpleswap.io', path: '/get_currencies' },
        { base: 'https://api.simpleswap.io/v3', path: '/currencies' },
        { base: 'https://api.simpleswap.io/v1', path: '/currencies' },
      ];
      
      // Try each endpoint format
      for (const { base, path } of endpoints) {
        try {
          const api = axios.create({
            baseURL: base,
            headers: { 'Content-Type': 'application/json' },
          });
          
          api.interceptors.request.use((config) => {
            config.params = { ...config.params, api_key: apiKey };
            config.headers['X-API-Key'] = apiKey;
            return config;
          });

          const response = await api.get(path);
          if (response.data && (Array.isArray(response.data) || typeof response.data === 'object')) {
            logger.log(`Successfully loaded currencies from ${base}${path}`);
            return response.data;
          }
        } catch (err) {
          // Log but continue to next endpoint
          if (err.response?.status !== 404) {
            logger.log(`Endpoint ${base}${path} returned: ${err.response?.status || err.message}`);
          }
          continue;
        }
      }
      
      throw new Error('All API endpoints returned 404. Please check your SimpleSwap dashboard for the correct API endpoint format.');
    } catch (error) {
      logger.error('SimpleSwap getCurrencies error:', error);
      throw error;
    }
  },

  /**
   * Get exchange rate for a currency pair
   * @param {string} from - Currency to send
   * @param {string} to - Currency to receive
   * @param {number} amount - Amount to exchange
   * @param {boolean} fixed - Use fixed rate (default: false)
   * @returns {Promise<Object>} Exchange rate information
   */
  async getExchangeRate(from, to, amount, fixed = false) {
    try {
      const response = await simpleswapApi.get('/get_estimated', {
        params: {
          currency_from: from,
          currency_to: to,
          amount: amount,
          fixed: fixed,
        },
      });
      return response.data;
    } catch (error) {
      logger.error('SimpleSwap getExchangeRate error:', error);
      throw error;
    }
  },

  /**
   * Get available exchange pairs
   * @param {boolean} fixed - Get fixed rate pairs (default: false)
   * @returns {Promise<Array>} List of available pairs
   */
  async getPairs(fixed = false) {
    try {
      const response = await simpleswapApi.get('/get_pairs', {
        params: {
          fixed: fixed,
        },
      });
      return response.data;
    } catch (error) {
      logger.error('SimpleSwap getPairs error:', error);
      throw error;
    }
  },

  /**
   * Create a new exchange
   * @param {Object} exchangeData - Exchange parameters
   * @param {string} exchangeData.currency_from - Currency to send
   * @param {string} exchangeData.currency_to - Currency to receive
   * @param {string} exchangeData.address_to - Recipient address
   * @param {number} exchangeData.amount - Amount to exchange
   * @param {boolean} exchangeData.fixed - Use fixed rate
   * @param {string} exchangeData.extra_id_to - Extra ID for destination (optional)
   * @returns {Promise<Object>} Created exchange information
   */
  async createExchange(exchangeData) {
    try {
      const response = await simpleswapApi.post('/create_exchange', exchangeData);
      return response.data;
    } catch (error) {
      logger.error('SimpleSwap createExchange error:', error);
      throw error;
    }
  },

  /**
   * Get exchange status
   * @param {string} exchangeId - Exchange ID
   * @returns {Promise<Object>} Exchange status information
   */
  async getExchangeStatus(exchangeId) {
    try {
      const response = await simpleswapApi.get(`/get_exchange/${exchangeId}`);
      return response.data;
    } catch (error) {
      logger.error('SimpleSwap getExchangeStatus error:', error);
      throw error;
    }
  },

  /**
   * Get minimum exchange amount
   * @param {string} from - Currency to send
   * @param {string} to - Currency to receive
   * @returns {Promise<Object>} Minimum amount information
   */
  async getMinAmount(from, to) {
    try {
      const response = await simpleswapApi.get('/get_min', {
        params: {
          currency_from: from,
          currency_to: to,
        },
      });
      return response.data;
    } catch (error) {
      logger.error('SimpleSwap getMinAmount error:', error);
      throw error;
    }
  },
};

export default simpleswapService;

