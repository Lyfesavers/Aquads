import React, { useEffect, useState } from 'react';
import { loginWithGoogle } from '../services/api';

const ExtensionAuth = () => {
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  useEffect(() => {
    // Check if this page was opened by the extension
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');

    console.log('ExtensionAuth loaded, source:', source, 'window.opener:', !!window.opener);

    if (source !== 'extension') {
      setError('Invalid access - this page is for extension authentication only');
      setStatus('error');
      return;
    }

    if (!window.opener) {
      setError('This page must be opened from the extension');
      setStatus('error');
      return;
    }

    // Wait for Google script to load
    const checkGoogleLoaded = setInterval(() => {
      if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.id) {
        clearInterval(checkGoogleLoaded);
        initializeGoogleSignIn();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkGoogleLoaded);
      if (typeof window.google === 'undefined' || !window.google.accounts) {
        setError('Google Sign-In failed to load. Please try again.');
        setStatus('error');
      }
    }, 10000);

    return () => clearInterval(checkGoogleLoaded);
  }, []);

  const initializeGoogleSignIn = () => {

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Client ID not configured');
      setStatus('error');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
      });

      // Prompt One Tap automatically
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Render button as fallback
          const container = document.getElementById('google-button-container');
          if (container) {
            window.google.accounts.id.renderButton(container, {
              theme: 'outline',
              size: 'large',
              width: 300,
              text: 'signin_with',
            });
          }
          setStatus('ready');
        } else {
          setStatus('ready');
        }
      });
    } catch (err) {
      console.error('Error initializing Google Sign-In:', err);
      setError('Failed to initialize Google Sign-In');
      setStatus('error');
    }
  };

  const handleGoogleSignIn = async (response) => {
    if (!response.credential) {
      setError('No credential received from Google');
      setStatus('error');
      return;
    }

    setStatus('signing-in');

    try {
      // Send ID token to backend
      const userData = await loginWithGoogle(response.credential);

      // Send success message back to extension
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'GOOGLE_AUTH_SUCCESS',
            payload: {
              token: userData.token,
              refreshToken: userData.refreshToken,
              user: {
                userId: userData.userId,
                username: userData.username,
                email: userData.email,
                image: userData.image,
                isAdmin: userData.isAdmin,
                emailVerified: userData.emailVerified,
                userType: userData.userType,
                cv: userData.cv,
              },
            },
          },
          '*' // Extension will validate the origin
        );
        setStatus('success');
        // Close window after a short delay
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        setError('Could not communicate with extension');
        setStatus('error');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error.message || 'Sign-in failed';
      setError(errorMessage);

      // Send error message back to extension
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'GOOGLE_AUTH_ERROR',
            error: errorMessage,
          },
          '*'
        );
      }
      setStatus('error');
    }
  };

  // Show loading immediately, even before React fully loads
  if (status === 'initializing' && !error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
        color: '#ffffff',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{
          background: 'rgba(31, 41, 55, 0.8)',
          padding: '40px',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ color: '#9ca3af' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
      color: '#ffffff',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: 'rgba(31, 41, 55, 0.8)',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      }}>
        <img 
          src="/logo512.png" 
          alt="Aquads" 
          style={{ width: '80px', height: '80px', marginBottom: '20px', borderRadius: '50%' }}
        />
        <h1 style={{ fontSize: '24px', marginBottom: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AquaSwap Extension
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '30px', fontSize: '14px' }}>
          Sign in with Google to continue
        </p>

        {status === 'initializing' && (
          <div style={{ color: '#9ca3af' }}>Initializing...</div>
        )}

        {status === 'ready' && (
          <div id="google-button-container" style={{ marginTop: '20px' }}></div>
        )}

        {status === 'signing-in' && (
          <div style={{ color: '#3b82f6', marginTop: '20px' }}>
            Signing in...
          </div>
        )}

        {status === 'success' && (
          <div style={{ color: '#10b981', marginTop: '20px' }}>
            ✓ Success! This window will close automatically.
          </div>
        )}

        {status === 'error' && error && (
          <div style={{ 
            marginTop: '20px', 
            padding: '12px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <p style={{ 
          marginTop: '30px', 
          fontSize: '11px', 
          color: '#6b7280',
          fontStyle: 'italic',
        }}>
          For existing accounts only
        </p>
      </div>
    </div>
  );
};

export default ExtensionAuth;

