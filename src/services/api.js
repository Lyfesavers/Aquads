import io from 'socket.io-client';
import axios from 'axios';
import logger from '../utils/logger';

export const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://aquads.onrender.com/api'
  : 'http://localhost:5000/api';

export const socket = io('https://aquads.onrender.com', {
  auth: {
    token: (() => {
      const savedUser = localStorage.getItem('currentUser');
      const user = savedUser ? JSON.parse(savedUser) : null;
      return user?.token;
    })()
  },
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnection: true,
  timeout: 20000,
  autoConnect: true,
  reconnectionDelayMax: 5000,
  maxRetries: 10,
  pingTimeout: 30000,
  pingInterval: 25000
});

const getAuthHeader = () => {
  try {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) return {};
    
    const user = JSON.parse(savedUser);
    return user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
  } catch (error) {
    logger.error('Error getting auth header:', error);
    return {};
  }
};

// Fetch all ads
export const fetchAds = async () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const maxRetries = isMobile ? 3 : 1;
  const timeoutMs = isMobile ? 15000 : 10000; // Longer timeout for mobile
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {

      
      const startTime = Date.now();
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(`${API_URL}/ads`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the ads
      localStorage.setItem('cachedAds', JSON.stringify(data));
      return data;
      
    } catch (error) {
      
      // If this is the last attempt, or not a network error, don't retry
      if (attempt === maxRetries || (error.name !== 'TypeError' && error.name !== 'AbortError')) {
        logger.error('Error fetching ads:', error);
        
        // Return cached ads if available
        const cachedAds = localStorage.getItem('cachedAds');
        if (cachedAds) {
          return JSON.parse(cachedAds);
        } else {
          return [];
        }
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Create new ad
export const createAd = async (adData) => {
  const response = await fetch(`${API_URL}/ads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(adData),
  });
  if (!response.ok) throw new Error('Failed to create ad');
  const createdAd = await response.json();
  
  // Emit socket event for real-time updates
  socket.emit('adCreate', createdAd);
  
  return createdAd;
};

// Update ad
export const updateAd = async (id, adData) => {
  const response = await fetch(`${API_URL}/ads/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(adData),
  });
  if (!response.ok) throw new Error('Failed to update ad');
  const updatedAd = await response.json();
  
  // Emit socket event for real-time updates
  socket.emit('adUpdate', updatedAd);
  
  return updatedAd;
};

// Update ad position only (no auth required)
export const updateAdPosition = async (id, x, y) => {
  const response = await fetch(`${API_URL}/ads/${id}/position`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ x, y }),
  });
  if (!response.ok) throw new Error('Failed to update ad position');
  const updatedAd = await response.json();
  
  // Emit socket event for real-time position updates
  socket.emit('adUpdate', updatedAd);
  
  return updatedAd;
};

// Delete ad
export const deleteAd = async (id) => {
  const response = await fetch(`${API_URL}/ads/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete ad');
  }
  
  const result = await response.json();
  
  // Emit socket event for real-time deletion
  socket.emit('adDelete', id);
  
  return result;
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const userData = await response.json();
    
    // Store user data in a more robust way
    try {
      localStorage.setItem('currentUser', JSON.stringify(userData));
    } catch (storageError) {
      logger.error('Error storing user data in localStorage:', storageError);
    }
    
    // Update socket auth
    socket.auth = { token: userData.token };
    
    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    return userData;
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
};

// Update the verifyToken function to return user data and handle token parameter
export const verifyToken = async (token = null) => {
  try {
    // If token is not provided, try to get it from localStorage
    if (!token) {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) return null;
      
      const user = JSON.parse(savedUser);
      token = user.token;
    }
    
    // Use the token to verify
    const response = await fetch(`${API_URL}/verify-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    // If verifyToken returns user data from server, parse it
    const data = await response.json();
    
    // If the server returns user data, use it and ensure socket connection
    if (data && data.userId) {
      // Make sure socket is connected with current token
      socket.auth = { token: data.token || token };
      if (!socket.connected) {
        socket.connect();
      }
      
      // Store updated user data
      localStorage.setItem('currentUser', JSON.stringify(data));
      return data;
    }
    
    // Otherwise, get the user data from localStorage and ensure socket connection
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      // Make sure socket is connected with current token
      socket.auth = { token: userData.token };
      if (!socket.connected) {
        socket.connect();
      }
      return userData;
    }
    
    return null;
  } catch (error) {
    logger.error('Token verification error:', error);
    return null;
  }
};

// Register user
export const register = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('currentUser', JSON.stringify(data));
    
    // Update socket auth
    socket.auth = { token: data.token };
    socket.connect();

    return data;
  } catch (error) {
    logger.error('Registration error:', error);
    throw error;
  }
};

// Create bump request
export const createBumpRequest = async (bumpData) => {
  logger.log("Creating bump request with data:", bumpData);
  
  if (!bumpData.txSignature) {
    logger.error("Missing transaction signature in bump request");
    throw new Error("Transaction signature is required");
  }
  
  try {
    const response = await fetch(`${API_URL}/bumps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(bumpData),
    });
    
    logger.log("Bump request response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error("Bump request API error:", errorData);
      throw new Error(errorData.error || 'Failed to create bump request');
    }
    
    const data = await response.json();
    logger.log("Bump request created successfully:", data);
    return data;
  } catch (error) {
    logger.error("Error in createBumpRequest:", error);
    throw error;
  }
};

// Approve bump request
export const approveBumpRequest = async (adId, processedBy) => {
  const response = await fetch(`${API_URL}/bumps/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ adId, processedBy }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to approve bump request');
  }
  
  return response.json();
};

// Reject bump request
export const rejectBumpRequest = async (adId, processedBy, reason) => {
  const response = await fetch(`${API_URL}/bumps/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ adId, processedBy, reason }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reject bump request');
  }
  
  return response.json();
};

// Fetch pending bump requests
export const fetchBumpRequests = async (status = 'pending') => {
  const response = await fetch(`${API_URL}/bumps?status=${status}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch bump requests');
  }
  
  return response.json();
};

// Enhanced connection monitoring
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

socket.on('connect', () => {
  logger.log('Socket connected');
  reconnectAttempts = 0;
  
  // Refresh authentication on successful connection
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      socket.auth = { token: user.token };
      socket.connect();
    } catch (error) {
      logger.error('Socket auth error:', error);
    }
  }
});

socket.on('connect_error', async (error) => {
  logger.error('Socket connection error:', error);
  reconnectAttempts++;

  if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        // Verify token before attempting reconnection
        const isValid = await verifyToken();
        if (isValid) {
          socket.auth = { token: user.token };
          socket.connect();
        }
      } catch (err) {
        logger.error('Reconnection auth error:', err);
      }
    }
  }
});

socket.on('disconnect', (reason) => {
  logger.log('Socket disconnected:', reason);
  
  if (reason === 'io server disconnect' || reason === 'transport close') {
    // Server disconnected us, try to reconnect with auth
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      socket.auth = { token: user.token };
      setTimeout(() => {
        socket.connect();
      }, 1000); // Add slight delay before reconnecting
    }
  }
});

// Add heartbeat to keep connection alive
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping');
  }
}, 25000);

socket.on('pong', () => {
  logger.log('Server heartbeat received');
});

// Add periodic connection check
setInterval(async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    if (data.status !== 'ok') {
      logger.warn('Server connection issue detected');
    }
  } catch (error) {
    logger.error('Health check failed:', error);
  }
}, 30000); // Check every 30 seconds

// Add these review-related functions
export const submitReview = async (reviewData, token) => {
  try {
    const response = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reviewData),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit review');
    }

    const data = await response.json();
    // Emit socket event to update other clients
    socket.emit('newReview', data);
    return data;
  } catch (error) {
    logger.error('Error submitting review:', error);
    throw error;
  }
}; 

// Add a ping function to check server availability
export const pingServer = async () => {
  try {
    const response = await fetch(`${API_URL}/ads`);
    return response.ok;
  } catch (error) {
    logger.error('Server ping failed:', error);
    return false;
  }
}; 

// Service endpoints
export const fetchServices = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add pagination parameters
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    // Add filter parameters
    if (params.category) queryParams.append('category', params.category);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.showPremiumOnly) queryParams.append('showPremiumOnly', params.showPremiumOnly);
    
    const url = `${API_URL}/services${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if data has the expected structure
    if (data && data.services) {
      // Return the services array from the response
      return data;
    } else if (Array.isArray(data)) {
      // If API returns just an array of services
      return { services: data };
    } else {
      // Handle unexpected data structure
      return { services: [] };
    }
  } catch (error) {
    logger.error('Error fetching services:', error);
    // Return empty services array on error
    return { services: [] };
  }
};

// Create service
export const createService = async (serviceData) => {
  logger.log('Creating service with data:', serviceData);
  try {
    const response = await fetch(`${API_URL}/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(serviceData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create service');
    }

    return response.json();
  } catch (error) {
    logger.error('Service creation error:', error);
    throw error;
  }
};

export const updateService = async (serviceId, serviceData) => {
  try {
    const formData = new FormData();
    
    if (serviceData.image) {
      formData.append('image', serviceData.image);
    }

    Object.keys(serviceData).forEach(key => {
      if (key !== 'image') {
        formData.append(key, serviceData[key]);
      }
    });

    const response = await axios.put(`${API_URL}/services/${serviceId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteService = async (serviceId) => {
  try {
    await axios.delete(`${API_URL}/services/${serviceId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  } catch (error) {
    throw error;
  }
};

export const getServicesByCategory = async (categoryId) => {
  try {
    const response = await axios.get(`${API_URL}/services/category/${categoryId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const searchServices = async (query) => {
  try {
    const response = await axios.get(`${API_URL}/services/search`, {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    logger.log('Updating profile with data:', profileData);
    
    // Get the current user data from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(`${API_URL}/users/profile`, profileData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.token}`
      }
    });

    logger.log('Profile update response:', response.data);

    if (response.data) {
      // Update stored user data with new information
      const updatedUser = {
        ...currentUser,
        ...response.data
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Update socket auth if token changed
      if (response.data.token) {
        socket.auth = { token: response.data.token };
        socket.connect();
      }
    }

    return response.data;
  } catch (error) {
    logger.error('Profile update error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// Request password reset
export const requestPasswordReset = async (username, referralCode) => {
  try {
    const response = await fetch(`${API_URL}/users/request-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, referralCode }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to request password reset');
    }

    return response.json();
  } catch (error) {
    logger.error('Password reset request error:', error);
    throw error;
  }
};

// Reset password
export const resetPassword = async (username, referralCode, newPassword) => {
  try {
    const response = await fetch(`${API_URL}/users/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, referralCode, newPassword }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to reset password');
    }

    return response.json();
  } catch (error) {
    logger.error('Password reset error:', error);
    throw error;
  }
};

// Add these job-related API functions
export const fetchJobs = async (includeExpired = false) => {
  logger.log('Fetching jobs...');
  try {
    // Check for auth token - this might be needed for some job listings
    const authHeader = getAuthHeader();
    
    const queryParams = includeExpired ? '?includeExpired=true' : '';
    const response = await fetch(`${API_URL}/jobs${queryParams}`, {
      headers: {
        ...authHeader
      }
    });
    
    logger.log('Jobs response:', response);
    
    if (!response.ok) {
      // If unauthorized and we have auth headers, try to refresh auth and retry once
      if (response.status === 401 && authHeader.Authorization) {
        logger.log('Authentication needed for jobs, attempting to refresh auth...');
        
        // Wait a moment for auth to potentially initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try reconnecting the socket in case that's the issue
        reconnectSocket();
        
        // Retry the request with fresh auth headers
        const retryResponse = await fetch(`${API_URL}/jobs${queryParams}`, {
          headers: {
            ...getAuthHeader() // Get fresh auth headers
          }
        });
        
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({}));
          throw new Error(error.message || 'Failed to fetch jobs after retry');
        }
        
        return retryResponse.json();
      }
      
      // For other errors, just throw the error
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch jobs');
    }
    
    return response.json();
  } catch (error) {
    logger.error('Error fetching jobs:', error);
    throw error;
  }
};

export const refreshJob = async (jobId, token) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/refresh`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to refresh job');
  }
  return response.json();
};

export const createJob = async (jobData) => {
  logger.log('Creating job:', jobData);
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(jobData)
  });
  logger.log('Create job response:', response);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create job');
  }
  return response.json();
};

export const updateJob = async (jobId, jobData, token) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(jobData)
  });
  if (!response.ok) throw new Error('Failed to update job');
  return response.json();
};

export const deleteJob = async (jobId, token) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to delete job');
  return response.json();
};

// Blog API functions
export const fetchBlogs = async () => {
  try {
    const response = await fetch(`${API_URL}/blogs`);
    if (!response.ok) throw new Error('Failed to fetch blogs');
    return await response.json();
  } catch (error) {
    logger.error('Error fetching blogs:', error);
    throw error;
  }
};

export const createBlog = async (blogData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(blogData)
    });
    if (!response.ok) throw new Error('Failed to create blog');
    return await response.json();
  } catch (error) {
    logger.error('Error creating blog:', error);
    throw error;
  }
};

export const updateBlog = async (blogId, blogData) => {
  try {
    // Get token using the same approach as in the working deleteBlog function
    const token = localStorage.getItem('token');
    
    // Make the request with just the standard headers
    const response = await fetch(`${API_URL}/blogs/${blogId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(blogData)
    });
    
    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to update blog: ${errorMsg}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error updating blog:', error);
    throw error;
  }
};

export const deleteBlog = async (blogId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/blogs/${blogId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to delete blog');
    return await response.json();
  } catch (error) {
    logger.error('Error deleting blog:', error);
    throw error;
  }
};

// Game Hub API Functions

export const fetchGames = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.blockchain) queryParams.append('blockchain', filters.blockchain);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.sort) queryParams.append('sort', filters.sort);
    if (filters.status) queryParams.append('status', filters.status);
    
    const response = await fetch(`${API_URL}/games${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch games');
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error fetching games:', error);
    throw error;
  }
};

export const fetchGameById = async (gameId) => {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch game details');
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error fetching game details:', error);
    throw error;
  }
};

export const createGame = async (gameData) => {
  try {
    const response = await fetch(`${API_URL}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(gameData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create game listing');
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error creating game listing:', error);
    throw error;
  }
};

export const updateGame = async (gameId, gameData) => {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(gameData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update game listing');
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error updating game listing:', error);
    throw error;
  }
};

export const deleteGame = async (gameId) => {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader()
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete game listing');
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error deleting game listing:', error);
    throw error;
  }
};

export const voteForGame = async (gameId) => {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to vote for game');
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error voting for game:', error);
    throw error;
  }
};

export const checkGameVoteStatus = async (gameId) => {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}/voted`, {
      method: 'GET',
      headers: {
        ...getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to check vote status');
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error checking game vote status:', error);
    throw error;
  }
};

export const fetchGameCategories = async () => {
  try {
    const response = await fetch(`${API_URL}/games/categories`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch game categories');
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error fetching game categories:', error);
    throw error;
  }
};

// Add a function to reconnect to socket with current token
export const reconnectSocket = () => {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      // Update socket auth
      socket.auth = { token: user.token };
      
      // Check if socket is disconnected, and reconnect if needed
      if (!socket.connected) {
        socket.connect();
      }
    } catch (error) {
      logger.error('Socket reconnection error:', error);
    }
  }
};

// Fetch pending ad approvals (admin only)
export const fetchPendingAds = async () => {
  const response = await fetch(`${API_URL}/ads/pending`, {
    headers: getAuthHeader()
  });
  if (!response.ok) throw new Error('Failed to fetch pending ads');
  return await response.json();
};

// Approve an ad (admin only)
export const approveAd = async (adId) => {
  const response = await fetch(`${API_URL}/ads/${adId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });
  if (!response.ok) throw new Error('Failed to approve ad');
  return await response.json();
};

// Reject an ad (admin only)
export const rejectAd = async (adId, rejectionReason) => {
  const response = await fetch(`${API_URL}/ads/${adId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ rejectionReason })
  });
  if (!response.ok) throw new Error('Failed to reject ad');
  return await response.json();
};

// Simple connectivity test for mobile
export const testConnectivity = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_URL}/health`, {
      signal: controller.signal,
      method: 'GET'
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Verify user status (listing agent/affiliate)
export const verifyUserStatus = async (username) => {
  try {
    const response = await fetch(`${API_URL}/users/verify/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          username: username,
          isVerified: false,
          message: 'User not found in our verified database'
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error('User verification failed:', error);
    throw error;
  }
}; 