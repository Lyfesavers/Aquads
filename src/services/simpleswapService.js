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
      const endpoints = [
        '/get_all_currencies',  // v3 format
        '/get_currencies',       // v1 format
        '/currencies',           // alternative format
      ];
      
      // Try each endpoint format
      for (const endpoint of endpoints) {
        try {
          const response = await simpleswapApi.get(endpoint);
          if (response.data) {
            return response.data;
          }
        } catch (err) {
          // Try next endpoint
          continue;
        }
      }
      
      // If all fail, try direct API call without version in path
      const directApi = axios.create({
        baseURL: 'https://api.simpleswap.io',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (apiKey) {
        directApi.interceptors.request.use((config) => {
          config.params = { ...config.params, api_key: apiKey };
          config.headers['X-API-Key'] = apiKey;
          return config;
        });
      }
      
      const response = await directApi.get('/get_currencies');
      return response.data;
    } catch (error) {
      logger.error('SimpleSwap getCurrencies error:', error);
      // Return a helpful error message
      throw new Error(`Failed to load currencies: ${error.response?.status || error.message}. Please check your API key and endpoint configuration.`);
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

