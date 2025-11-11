// AquaSwap Extension - Popup Script
console.log('🌊 AquaSwap Extension loaded');

// Check authentication first
(async function checkAuth() {
  const isAuth = await AuthService.isAuthenticated();
  if (!isAuth) {
    console.log('❌ Not authenticated, redirecting to login...');
    window.location.href = 'login.html';
    return;
  }
  
  // Load and display username
  const user = await AuthService.getCurrentUser();
  if (user) {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = user.username;
    }
  }
  
  console.log('✅ User authenticated');
})();

// DOM Elements
const loading = document.getElementById('loading');
const mainContent = document.getElementById('main-content');
const errorScreen = document.getElementById('error-screen');
const iframe = document.getElementById('swap-iframe');
const retryBtn = document.getElementById('retry-btn');
const logoutBtn = document.getElementById('logout-btn');

// Configuration
const IFRAME_TIMEOUT = 10000; // 10 seconds
const AQUADS_URL = 'https://aquads.xyz/embed/aquaswap';

// Track if iframe has loaded
let iframeLoaded = false;
let loadTimeout = null;

/**
 * Initialize the extension
 */
function init() {
  console.log('Initializing AquaSwap extension...');
  
  // Set up iframe load timeout
  loadTimeout = setTimeout(() => {
    if (!iframeLoaded) {
      console.error('Iframe failed to load within timeout');
      showError();
    }
  }, IFRAME_TIMEOUT);

  // Listen for iframe load
  iframe.addEventListener('load', handleIframeLoad);
  iframe.addEventListener('error', handleIframeError);

  // Set up retry button
  if (retryBtn) {
    retryBtn.addEventListener('click', retryLoad);
  }

  // Load user preferences if any
  loadPreferences();

  // Track extension usage
  trackExtensionOpen();
}

/**
 * Handle successful iframe load
 */
function handleIframeLoad() {
  console.log('✅ Iframe loaded successfully');
  iframeLoaded = true;
  
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }

  // Hide loading, show main content
  setTimeout(() => {
    loading.style.display = 'none';
    mainContent.style.display = 'flex';
    errorScreen.style.display = 'none';
  }, 500); // Small delay for smooth transition
}

/**
 * Handle iframe load error
 */
function handleIframeError() {
  console.error('❌ Iframe failed to load');
  showError();
}

/**
 * Show error screen
 */
function showError() {
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }
  
  loading.style.display = 'none';
  mainContent.style.display = 'none';
  errorScreen.style.display = 'flex';
}

/**
 * Retry loading the iframe
 */
function retryLoad() {
  console.log('🔄 Retrying iframe load...');
  
  // Reset state
  iframeLoaded = false;
  loading.style.display = 'flex';
  errorScreen.style.display = 'none';
  
  // Reload iframe
  iframe.src = iframe.src;
  
  // Set new timeout
  loadTimeout = setTimeout(() => {
    if (!iframeLoaded) {
      showError();
    }
  }, IFRAME_TIMEOUT);
}

/**
 * Load user preferences from storage
 */
async function loadPreferences() {
  try {
    const result = await chrome.storage.local.get(['theme', 'lastUsed']);
    
    if (result.theme) {
      console.log('Theme preference:', result.theme);
      // Can pass theme to iframe via URL parameter if needed
      // iframe.src = `${AQUADS_URL}?theme=${result.theme}`;
    }
    
    if (result.lastUsed) {
      console.log('Last used:', new Date(result.lastUsed));
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

/**
 * Track extension usage for analytics
 */
async function trackExtensionOpen() {
  try {
    const now = Date.now();
    
    // Get current stats
    const result = await chrome.storage.local.get(['openCount', 'lastUsed', 'firstUsed']);
    
    const openCount = (result.openCount || 0) + 1;
    const firstUsed = result.firstUsed || now;
    
    // Save updated stats
    await chrome.storage.local.set({
      openCount,
      lastUsed: now,
      firstUsed
    });
    
    console.log(`Extension opened ${openCount} times`);
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

/**
 * Listen for messages from iframe (optional - for future features)
 */
window.addEventListener('message', (event) => {
  // Verify origin
  if (event.origin !== 'https://aquads.xyz') {
    return;
  }
  
  console.log('Message from iframe:', event.data);
  
  // Handle specific messages if needed
  if (event.data.type === 'swap-completed') {
    console.log('✅ Swap completed!');
    // Could show notification or update badge
  }
  
  if (event.data.type === 'wallet-connected') {
    console.log('👛 Wallet connected:', event.data.address);
  }
});

/**
 * Handle logout
 */
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
      await AuthService.logout();
      window.location.href = 'login.html';
    }
  });
}

/**
 * Handle extension unload
 */
window.addEventListener('beforeunload', () => {
  console.log('🌊 AquaSwap extension closing');
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { init, handleIframeLoad, showError };
}

