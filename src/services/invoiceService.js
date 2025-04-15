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

const getAuthConfig = () => {
  // Try to get the token from currentUser object in localStorage
  let token;
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    token = currentUser?.token;
  } catch (error) {
    // Fallback to direct token retrieval if parsing fails
    token = localStorage.getItem('token');
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
    const config = getAuthConfig();
    
    // Copy the data to avoid modifying the original
    const processedData = { ...invoiceData };
    
    // Ensure required fields are present and valid
    if (!processedData.bookingId) {
      throw new Error('bookingId is required');
    }
    
    if (!processedData.dueDate) {
      throw new Error('dueDate is required');
    }
    
    if (!processedData.paymentLink) {
      throw new Error('paymentLink is required');
    }
    
    // Format the dueDate properly for MongoDB
    if (processedData.dueDate && typeof processedData.dueDate === 'string') {
      try {
        // If it's a date string like "2025-04-21", convert to ISO date format
        const [year, month, day] = processedData.dueDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        processedData.dueDate = date.toISOString();
      } catch (dateError) {
        // Keep the original format if parsing fails
      }
    }
    
    // Convert any numeric strings to numbers for MongoDB
    if (processedData.items) {
      processedData.items = processedData.items.map(item => ({
        ...item,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        amount: Number(item.amount || 0),
      }));
    }
    
    // Make sure we're not sending undefined or empty values
    Object.keys(processedData).forEach(key => {
      if (processedData[key] === undefined || processedData[key] === '') {
        delete processedData[key];
      }
    });
    
    const response = await axios.post(
      endpoint, 
      processedData, 
      config
    );
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      
      // Extract error details if available
      if (error.response.data) {
        if (error.response.data.error) {
          throw new Error(error.response.data.error);
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server. Please try again later.');
    }
    
    // If we get here, rethrow the original error or a generic one
    throw error.message ? new Error(error.message) : new Error('Unable to create invoice');
  }
};

// Get all invoices for the current user
const getInvoices = async () => {
  try {
    const endpoint = `${API_URL}/invoices`;
    const config = getAuthConfig();
    
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
    const config = getAuthConfig();
    
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
    const config = getAuthConfig();
    
    const response = await axios.get(
      endpoint,
      config
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update invoice status (paid/cancelled)
const updateInvoiceStatus = async (invoiceId, status) => {
  try {
    const endpoint = `${API_URL}/invoices/${invoiceId}/status`;
    const config = getAuthConfig();
    
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