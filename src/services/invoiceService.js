import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
    const response = await axios.post(
      `${API_URL}/invoices`, 
      invoiceData, 
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Unable to create invoice');
  }
};

// Get all invoices for the current user
const getInvoices = async () => {
  try {
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
    const response = await axios.get(
      `${API_URL}/invoices/booking/${bookingId}`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Unable to fetch booking invoices');
  }
};

// Update invoice status (paid/cancelled)
const updateInvoiceStatus = async (invoiceId, status) => {
  try {
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