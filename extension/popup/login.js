// Login Screen Logic
console.log('🔐 Login screen loaded');

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
      console.log('✅ Login successful');
      // Redirect to main popup
      window.location.href = 'popup.html';
    } else {
      console.error('❌ Login failed:', result.error);
      showError(result.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  } catch (error) {
    console.error('❌ Login error:', error);
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

// Check if already logged in
(async () => {
  const isAuth = await AuthService.isAuthenticated();
  if (isAuth) {
    console.log('✅ Already logged in, redirecting...');
    window.location.href = 'popup.html';
  }
})();

