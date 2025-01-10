import io from 'socket.io-client';

const API_URL = 'https://aquads.onrender.com/api';

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
  timeout: 20000
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
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: credentials.username.toLowerCase(),
        password: credentials.password
      })
    });

    // First check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server response was not JSON');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Validate the response data
    if (!data.username || !data.token) {
      throw new Error('Invalid response from server');
    }

    // Store complete user data
    const userData = {
      ...data,
      username: data.username,
      isAdmin: Boolean(data.isAdmin),
      token: data.token
    };

    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    // Update socket connection with new auth token
    socket.auth = { token: userData.token };
    socket.disconnect().connect();

    return userData;
  } catch (error) {
    console.error('Login error:', error);
    // Provide a user-friendly error message
    if (error.message.includes('JSON')) {
      throw new Error('Server error. Please try again later.');
    }
    throw error;
  }
};

// Add a function to verify token
export const verifyToken = async () => {
  const savedUser = localStorage.getItem('currentUser');
  if (!savedUser) return null;

  try {
    const user = JSON.parse(savedUser);
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });

    if (!response.ok) {
      localStorage.removeItem('currentUser');
      return null;
    }

    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    localStorage.removeItem('currentUser');
    return null;
  }
};

// Register user
export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error('Failed to register');
  return response.json();
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

// Add connection status monitoring
let isConnected = true;
socket.on('connect', () => {
  console.log('Socket connected');
  isConnected = true;
});

socket.on('connect_error', (error) => {
  console.warn('Socket connection error:', error);
  // Don't show notification for connection errors
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Don't show notification for server disconnects
    socket.connect();
  }
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

// Add this to handle reconnection with auth
socket.on('connect', () => {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    socket.emit('authenticate', { token: user.token });
  }
}); 