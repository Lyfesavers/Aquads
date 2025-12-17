// Login Screen Logic
// Use global dbg function (defined in auth.js) - no-op to keep console clean
if (typeof window.dbg === 'undefined') {
  window.dbg = () => {}; // No-op function as fallback
}
dbg('🔐 Login screen loaded');

const form = document.getElementById('login-form');
const identifierInput = document.getElementById('identifier');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const buttonText = document.getElementById('button-text');
const buttonLoader = document.getElementById('button-loader');
const errorMessage = document.getElementById('error-message');

// Hide error when typing
identifierInput.addEventListener('input', () => {
  errorMessage.style.display = 'none';
});

passwordInput.addEventListener('input', () => {
  errorMessage.style.display = 'none';
});

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;
  
  // Validation
  if (!identifier || !password) {
    showError('Please enter username/email and password');
    return;
  }
  
  // Show loading
  setLoading(true);
  
  try {
    const result = await AuthService.login(identifier, password);
    
    if (result.success) {
      dbg('✅ Login successful');
      // Redirect to main popup
      window.location.href = 'popup.html';
    } else {
      dbg('❌ Login failed:', result.error);
      showError(result.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  } catch (error) {
    dbg('❌ Login error:', error);
    showError('An unexpected error occurred. Please try again.');
    setLoading(false);
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  buttonText.style.display = isLoading ? 'none' : 'inline';
  buttonLoader.style.display = isLoading ? 'inline-block' : 'none';
}

// Google Sign-In setup - using popup method for Chrome extensions
function initializeGoogleSignIn() {
  const googleButton = document.getElementById('google-login-button');
  if (!googleButton) {
    return;
  }

  googleButton.addEventListener('click', () => {
    handleGoogleSignInClick();
  });
}

async function handleGoogleSignInClick() {
  try {
    setLoading(true);
    const googleButton = document.getElementById('google-login-button');
    if (googleButton) {
      googleButton.disabled = true;
    }

    // Open popup window to your website's extension auth page
    // Try both www and non-www versions - use the one that matches your actual domain
    const authUrl = 'https://aquads.xyz/extension-auth?source=extension';
    dbg('🔗 Opening popup to:', authUrl);
    
    const popup = window.open(
      authUrl,
      'GoogleSignIn',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      showError('Popup blocked! Please allow popups and try again.');
      setLoading(false);
      if (googleButton) {
        googleButton.disabled = false;
      }
      return;
    }

    dbg('✅ Popup opened successfully');

    // Listen for messages from the popup
    const messageHandler = async (event) => {
      // Verify origin (only accept messages from your website)
      if (event.origin !== 'https://www.aquads.xyz' && event.origin !== 'https://aquads.xyz') {
        dbg('⚠️ Ignoring message from untrusted origin:', event.origin);
        return;
      }

      dbg('📨 Received message from popup:', event.data.type);

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        window.removeEventListener('message', messageHandler);
        popup.close();

        const { token, refreshToken, user } = event.data.payload;

        // Store auth data in Chrome storage
        await chrome.storage.local.set({
          authToken: token,
          refreshToken: refreshToken,
          user: user,
          isLoggedIn: true,
          loginTimestamp: Date.now()
        });

        dbg('✅ Google login successful');
        showError(''); // Clear any errors
        // Redirect to main popup
        window.location.href = 'popup.html';
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        dbg('❌ Google login failed:', event.data.error);
        showError(event.data.error || 'Google login failed. Please try again.');
        setLoading(false);
        if (googleButton) {
          googleButton.disabled = false;
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Handle popup closed by user
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        setLoading(false);
        if (googleButton) {
          googleButton.disabled = false;
        }
        dbg('⚠️ Popup was closed by user');
      }
    }, 500);

    // Check if popup loaded successfully after a delay
    setTimeout(() => {
      try {
        // Try to access popup location (will throw if cross-origin or blocked)
        if (popup.location.href) {
          dbg('✅ Popup loaded:', popup.location.href);
        }
      } catch (e) {
        // This is expected for cross-origin, but we can check if popup exists
        if (popup && !popup.closed) {
          dbg('✅ Popup is open (cross-origin check)');
        } else {
          dbg('⚠️ Popup may have been blocked or closed');
        }
      }
    }, 2000);

  } catch (error) {
    dbg('❌ Error opening Google sign-in:', error);
    showError('An unexpected error occurred. Please try again.');
    setLoading(false);
    const googleButton = document.getElementById('google-login-button');
    if (googleButton) {
      googleButton.disabled = false;
    }
  }
}

// Initialize Google button on page load
initializeGoogleSignIn();

// Check if already logged in
(async () => {
  const isAuth = await AuthService.isAuthenticated();
  if (isAuth) {
    dbg('✅ Already logged in, redirecting...');
    window.location.href = 'popup.html';
  }
})();

