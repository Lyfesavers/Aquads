import axios from 'axios';
import logger from '../utils/logger';

// Use backend proxy to avoid CORS issues and keep API key secure
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://aquads.onrender.com/api'
  : 'http://localhost:5000/api';

// Create axios instance for backend proxy
const simpleswapApi = axios.create({
  baseURL: `${API_URL}/simpleswap`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const simpleswapService = {
  /**
   * Get all available currencies
   * @returns {Promise<Array>} List of available currencies
   */
  async getCurrencies() {
    try {
      const response = await simpleswapApi.get('/currencies');
      return response.data;
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
      const response = await simpleswapApi.get('/rate', {
        params: {
          from,
          to,
          amount,
          fixed,
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
      // Note: This endpoint might not be available through proxy
      // Using currencies endpoint as alternative
      const currencies = await this.getCurrencies();
      return currencies;
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
      const response = await simpleswapApi.post('/exchange', exchangeData);
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
      const response = await simpleswapApi.get(`/exchange/${exchangeId}`);
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
      const response = await simpleswapApi.get('/min-amount', {
        params: {
          from,
          to,
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

