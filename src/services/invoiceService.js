import axios from 'axios';

// Ensure API_URL ends with /api but doesn't have a trailing slash
const API_URL = (() => {
  // Start with the base URL (environment variable or default)
  let baseUrl = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com';
  
  // Remove trailing slash if present
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  // Ensure /api is in the path
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }
  
  return baseUrl;
})();

// Debug the API URL
console.log('Invoice service API_URL:', API_URL);

const getAuthConfig = () => {
  // Try to get the token from currentUser object in localStorage
  let token;
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    token = currentUser?.token;
    console.log('Using auth token from currentUser');
  } catch (error) {
    // Fallback to direct token retrieval if parsing fails
    token = localStorage.getItem('token');
    console.log('Using auth token from direct token storage');
  }
  
  // If no token is found, log a warning
  if (!token) {
    console.warn('No auth token found for invoice API request');
  }
  
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
    const endpoint = `${API_URL}/invoices`;
    console.log(`Sending POST request to: ${endpoint}`);
    const config = getAuthConfig();
    console.log('Auth headers:', config.headers.Authorization ? 'Bearer token present' : 'No Bearer token');
    
    const response = await axios.post(
      endpoint, 
      invoiceData, 
      config
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
    const endpoint = `${API_URL}/invoices`;
    console.log(`Sending GET request to: ${endpoint}`);
    const config = getAuthConfig();
    console.log('Auth headers:', config.headers.Authorization ? 'Bearer token present' : 'No Bearer token');
    
    const response = await axios.get(
      endpoint, 
      config
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Unable to fetch invoices');
  }
};

// Get a specific invoice by ID
const getInvoiceById = async (invoiceId) => {
  try {
    const endpoint = `${API_URL}/invoices/${invoiceId}`;
    console.log(`Sending GET request to: ${endpoint}`);
    const config = getAuthConfig();
    console.log('Auth headers:', config.headers.Authorization ? 'Bearer token present' : 'No Bearer token');
    
    const response = await axios.get(
      endpoint, 
      config
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
    const config = getAuthConfig();
    console.log('Auth headers:', config.headers.Authorization ? 'Bearer token present' : 'No Bearer token');
    
    const response = await axios.get(
      endpoint,
      config
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
    const endpoint = `${API_URL}/invoices/${invoiceId}/status`;
    console.log(`Sending PUT request to: ${endpoint}`);
    const config = getAuthConfig();
    console.log('Auth headers:', config.headers.Authorization ? 'Bearer token present' : 'No Bearer token');
    
    const response = await axios.put(
      endpoint, 
      { status }, 
      config
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