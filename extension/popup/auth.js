// AquaSwap Extension - Authentication Service
const API_URL = 'https://aquads.onrender.com/api';

// Cache for Google Client ID (fetched from backend)
let cachedGoogleClientId = null;

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
      return null;
    }
  }

  /**
   * Login with Google using ID token
   */
  static async loginWithGoogle(idToken) {
    try {
      const response = await fetch(`${API_URL}/users/login/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle account not found (user needs to create account first)
        if (response.status === 400 || response.status === 404) {
          throw new Error(error.message || 'Please create an account first on aquads.xyz');
        }
        
        // Handle email verification requirement
        if (response.status === 403 && error.emailVerificationRequired) {
          throw new Error(error.message || 'Email verification required');
        }
        
        throw new Error(error.error || 'Google login failed');
      }

      const userData = await response.json();
      
      // Store auth data in Chrome storage (same format as website localStorage)
      await chrome.storage.local.set({
        authToken: userData.token,
        refreshToken: userData.refreshToken,
        user: {
          userId: userData.userId,
          username: userData.username,
          email: userData.email,
          image: userData.image,
          isAdmin: userData.isAdmin,
          emailVerified: userData.emailVerified,
          userType: userData.userType,
          cv: userData.cv
        },
        isLoggedIn: true,
        loginTimestamp: Date.now()
      });

      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Google Client ID from backend (cached after first fetch)
   */
  static async getGoogleClientId() {
    // Return cached value if available
    if (cachedGoogleClientId) {
      return cachedGoogleClientId;
    }

    try {
      const response = await fetch(`${API_URL}/users/google-client-id`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.clientId) {
        cachedGoogleClientId = data.clientId;
        return data.clientId;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthService;
}

