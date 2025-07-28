const crypto = require('crypto');
const axios = require('axios');

class NowPaymentsService {
  constructor() {
    this.apiKey = process.env.nowpayments_API_key;
    this.ipnSecret = process.env.nowpayments_ipn_secretkey;
    this.publicKey = process.env.nowpayments_Public_key;
    this.baseURL = 'https://api.nowpayments.io/v1';
    
    if (!this.apiKey || !this.ipnSecret) {
      console.warn('NOWPayments API credentials not configured');
    }
  }

  // Create a payment
  async createPayment({ priceAmount, priceCurrency = 'USD', payCurrency, orderId, orderDescription, ipnCallbackUrl, successUrl, cancelUrl }) {
    try {
      const response = await axios.post(`${this.baseURL}/payment`, {
        price_amount: priceAmount,
        price_currency: priceCurrency,
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: ipnCallbackUrl,
        success_url: successUrl,
        cancel_url: cancelUrl
      }, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('NOWPayments API Error:', error.response?.data || error.message);
      throw new Error('Failed to create payment');
    }
  }

  // Get available currencies
  async getAvailableCurrencies() {
    try {
      const response = await axios.get(`${this.baseURL}/currencies`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      return response.data.currencies;
    } catch (error) {
      console.error('NOWPayments currencies error:', error.response?.data || error.message);
      throw new Error('Failed to get currencies');
    }
  }

  // Get payment status
  async getPaymentStatus(paymentId) {
    try {
      const response = await axios.get(`${this.baseURL}/payment/${paymentId}`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('NOWPayments status error:', error.response?.data || error.message);
      throw new Error('Failed to get payment status');
    }
  }

  // Verify IPN signature
  verifyIPN(payload, signature) {
    try {
      const hmac = crypto.createHmac('sha512', this.ipnSecret);
      hmac.update(JSON.stringify(payload));
      const calculatedSignature = hmac.digest('hex');
      
      return calculatedSignature === signature;
    } catch (error) {
      console.error('IPN verification error:', error);
      return false;
    }
  }

  // Get estimated price for conversion
  async getEstimatedPrice(amount, fromCurrency = 'USD', toCurrency) {
    try {
      const response = await axios.get(`${this.baseURL}/estimate`, {
        params: {
          amount,
          currency_from: fromCurrency,
          currency_to: toCurrency
        },
        headers: {
          'x-api-key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('NOWPayments estimate error:', error.response?.data || error.message);
      throw new Error('Failed to get price estimate');
    }
  }
}

module.exports = new NowPaymentsService(); 