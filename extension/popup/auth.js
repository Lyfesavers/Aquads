// AquaSwap Extension - Authentication Service
const API_URL = 'https://aquads.onrender.com/api';

class AuthService {
  /**
   * Login user with username/email and password
   */
  static async login(identifier, password) {
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password })
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle email verification requirement
        if (response.status === 403 && error.emailVerificationRequired) {
          throw new Error(error.message || 'Email verification required');
        }
        
        throw new Error(error.error || 'Login failed');
      }

      const userData = await response.json();
      
      // Store auth data in Chrome storage (same format as website localStorage)
      await chrome.storage.local.set({
        authToken: userData.token,
        refreshToken: userData.refreshToken, // Store refresh token for automatic token refresh
        user: {
          userId: userData.userId,
          username: userData.username,
          email: userData.email,
          isAdmin: userData.isAdmin,
          emailVerified: userData.emailVerified
        },
        isLoggedIn: true,
        loginTimestamp: Date.now()
      });

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Logout user
   */
  static async logout() {
    try {
      await chrome.storage.local.remove([
        'authToken',
        'refreshToken',
        'user',
        'isLoggedIn',
        'loginTimestamp'
      ]);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is logged in
   */
  static async isAuthenticated() {
    try {
      const result = await chrome.storage.local.get(['authToken', 'isLoggedIn']);
      return !!(result.authToken && result.isLoggedIn);
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  /**
   * Get current user data
   */
  static async getCurrentUser() {
    try {
      const result = await chrome.storage.local.get(['user', 'authToken']);
      if (result.user && result.authToken) {
        return result.user;
      }
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * This is called automatically when access token expires (401 errors)
   */
  static async refreshToken() {
    try {
      const result = await chrome.storage.local.get(['refreshToken']);
      
      if (!result.refreshToken) {
        console.warn('No refresh token available');
        return { success: false, error: 'No refresh token available' };
      }

      const response = await fetch(`${API_URL}/users/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: result.refreshToken })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Token refresh failed:', error);
        
        // If refresh token is invalid/expired, user needs to log in again
        if (response.status === 401) {
          await this.logout();
        }
        
        return { success: false, error: error.error || 'Token refresh failed' };
      }

      const data = await response.json();
      
      // Update stored tokens
      await chrome.storage.local.set({
        authToken: data.token,
        refreshToken: data.refreshToken, // Update refresh token (token rotation)
        loginTimestamp: Date.now()
      });

      console.log('✅ Token refreshed successfully');
      return { success: true, token: data.token, refreshToken: data.refreshToken };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthService;
}

