import axios from 'axios';

// Ensure API_URL ends with /api but doesn't have a trailing slash
const API_URL = (() => {
  const url = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com/api';
  // Remove trailing slash if present
  return url.endsWith('/') ? url.slice(0, -1) : url;
})();

// Debug the API URL
console.log('Invoice service API_URL:', API_URL);

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    }
  };
};

// Create a new invoice
const createInvoice = async (invoiceData) => {
  try {
    console.log(`Sending POST request to: ${API_URL}/invoices`);
    const response = await axios.post(
      `${API_URL}/invoices`, 
      invoiceData, 
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('Invoice creation error:', error);
    throw error.response ? error.response.data : new Error('Unable to create invoice');
  }
};

// Get all invoices for the current user
const getInvoices = async () => {
  try {
    console.log(`Sending GET request to: ${API_URL}/invoices`);
    const response = await axios.get(
      `${API_URL}/invoices`, 
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Unable to fetch invoices');
  }
};

// Get a specific invoice by ID
const getInvoiceById = async (invoiceId) => {
  try {
    console.log(`Sending GET request to: ${API_URL}/invoices/${invoiceId}`);
    const response = await axios.get(
      `${API_URL}/invoices/${invoiceId}`, 
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Unable to fetch invoice');
  }
};

// Get invoices for a specific booking
const getInvoicesByBookingId = async (bookingId) => {
  try {
    const endpoint = `${API_URL}/invoices/booking/${bookingId}`;
    console.log(`Sending GET request to: ${endpoint}`);
    const response = await axios.get(
      endpoint,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.log('Invoice API returned error:', error);
    throw error;
  }
};

// Update invoice status (paid/cancelled)
const updateInvoiceStatus = async (invoiceId, status) => {
  try {
    console.log(`Sending PUT request to: ${API_URL}/invoices/${invoiceId}/status`);
    const response = await axios.put(
      `${API_URL}/invoices/${invoiceId}/status`, 
      { status }, 
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Unable to update invoice status');
  }
};

export default {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoicesByBookingId,
  updateInvoiceStatus
}; 