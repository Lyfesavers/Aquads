import io from 'socket.io-client';
import axios from 'axios';

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
    console.error('Error getting auth header:', error);
    return {};
  }
};

// Fetch all ads
export const fetchAds = async () => {
  try {
    const response = await fetch(`${API_URL}/ads`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Cache the ads
    localStorage.setItem('cachedAds', JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching ads:', error);
    // Return cached ads if available
    const cachedAds = localStorage.getItem('cachedAds');
    return cachedAds ? JSON.parse(cachedAds) : [];
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
  return response.json();
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
  return response.json();
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
  return response.json();
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
  return response.json();
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
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    // Update socket auth
    socket.auth = { token: userData.token };
    socket.connect();

    return userData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Add a function to verify token
export const verifyToken = async () => {
  try {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) return false;

    const user = JSON.parse(savedUser);
    const response = await fetch(`${API_URL}/verify-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    return true;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
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
    console.error('Registration error:', error);
    throw error;
  }
};

// Create bump request
export const createBumpRequest = async (bumpData) => {
  const response = await fetch(`${API_URL}/bumps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(bumpData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create bump request');
  }
  
  return response.json();
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
  console.log('Socket connected');
  reconnectAttempts = 0;
  
  // Refresh authentication on successful connection
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      socket.auth = { token: user.token };
      socket.connect();
    } catch (error) {
      console.error('Socket auth error:', error);
    }
  }
});

socket.on('connect_error', async (error) => {
  console.error('Socket connection error:', error);
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
        console.error('Reconnection auth error:', err);
      }
    }
  }
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  
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
  console.log('Server heartbeat received');
});

// Add periodic connection check
setInterval(async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    if (data.status !== 'ok') {
      console.warn('Server connection issue detected');
    }
  } catch (error) {
    console.error('Health check failed:', error);
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
    console.error('Error submitting review:', error);
    throw error;
  }
}; 

// Add a ping function to check server availability
export const pingServer = async () => {
  try {
    const response = await fetch(`${API_URL}/ads`);
    return response.ok;
  } catch (error) {
    console.error('Server ping failed:', error);
    return false;
  }
}; 

// Service endpoints
export const fetchServices = async () => {
  try {
    const response = await fetch(`${API_URL}/services`);
    if (!response.ok) {
      throw new Error('Failed to fetch services');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

// Create service
export const createService = async (serviceData) => {
  console.log('Creating service with data:', serviceData);
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
    console.error('Service creation error:', error);
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
    console.log('Updating profile with data:', profileData);
    
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

    console.log('Profile update response:', response.data);

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
    console.error('Profile update error:', error.response?.data || error.message);
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
    console.error('Password reset request error:', error);
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
    console.error('Password reset error:', error);
    throw error;
  }
};

// Add these job-related API functions
export const fetchJobs = async () => {
  console.log('Fetching jobs...');
  const response = await fetch(`${API_URL}/jobs`, {
    headers: {
      ...getAuthHeader()
    }
  });
  console.log('Jobs response:', response);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch jobs');
  }
  return response.json();
};

export const createJob = async (jobData) => {
  console.log('Creating job:', jobData);
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(jobData)
  });
  console.log('Create job response:', response);
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
    console.error('Error fetching blogs:', error);
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
    console.error('Error creating blog:', error);
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
    console.error('Error updating blog:', error);
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
    console.error('Error deleting blog:', error);
    throw error;
  }
}; 