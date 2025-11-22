// AquaSwap Extension - Authentication Service
const DEBUG_LOGS = false;
const dbg = (...args) => { if (DEBUG_LOGS) console.log(...args); };

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
      dbg('Login error:', error);
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
        'user',
        'isLoggedIn',
        'loginTimestamp'
      ]);
      return { success: true };
    } catch (error) {
      dbg('Logout error:', error);
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
      dbg('Auth check error:', error);
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
      dbg('Get user error:', error);
      return null;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthService;
}

