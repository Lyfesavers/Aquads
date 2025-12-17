// Login Screen Logic

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
      // Redirect to main popup
      window.location.href = 'popup.html';
    } else {
      showError(result.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  } catch (error) {
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
    const authUrl = 'https://aquads.xyz/extension-auth?source=extension';
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

    // Listen for messages from the popup
    const messageHandler = async (event) => {
      // Verify origin (only accept messages from your website)
      if (event.origin !== 'https://www.aquads.xyz' && event.origin !== 'https://aquads.xyz') {
        return;
      }

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

        showError(''); // Clear any errors
        // Redirect to main popup
        window.location.href = 'popup.html';
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        window.removeEventListener('message', messageHandler);
        popup.close();
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
      }
    }, 500);

  } catch (error) {
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
    window.location.href = 'popup.html';
  }
})();

