import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import emailService from '../services/emailService';
import { FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';

const CreateAccountModal = ({ onCreateAccount, onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    image: '',
    referralCode: '',
    userType: 'freelancer'
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    // Check URL parameters first
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    
    // Then check sessionStorage for a pending referral code
    const pendingRefCode = sessionStorage.getItem('pendingReferralCode');
    
    // Use the ref code from URL or session storage
    if (refCode || pendingRefCode) {
      setFormData(prev => ({
        ...prev,
        referralCode: refCode || pendingRefCode
      }));
      
      // Clear from session storage after use
      if (pendingRefCode) {
        sessionStorage.removeItem('pendingReferralCode');
      }
    }
  }, []);

  // Validate password as user types
  useEffect(() => {
    const password = formData.password;
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[@$!%*?&]/.test(password)
    });
  }, [formData.password]);

  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      return contentType.startsWith('image/') && 
        (contentType.includes('gif') || contentType.includes('png') || contentType.includes('jpeg') || contentType.includes('jpg'));
    } catch (error) {
      return false;
    }
  };

  const handleImageChange = async (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, image: url }));
    
    if (url) {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setPreviewUrl(url);
        setError('');
      } else {
        setPreviewUrl('');
        setError('Please enter a valid image URL (JPEG, PNG, or GIF)');
      }
    } else {
      setPreviewUrl('');
      setError('');
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(value => value === true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }

    // Validate email format if provided
    if (formData.email && !validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password requirements
    if (!isPasswordValid()) {
      setError('Password does not meet all requirements');
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Set submitting state to show loading indicator
    setIsSubmitting(true);
    
    try {
      await onCreateAccount(formData);
      // Reset submitting state in case of success
      // (though the modal will likely close in this case)
      setIsSubmitting(false);
    } catch (error) {
      if (error.response?.status === 429) {
        setError('Too many signup attempts. Please try again in 24 hours.');
      } else {
        setError(error.message || 'Failed to create account. Please try again.');
      }
      setIsSubmitting(false);
      console.error('Signup error:', error);
    }
  };

  // Add this new function to handle the Postimages upload window
  const openPostimagesUploader = () => {
    // Open Postimages in a popup window
    const postimagesWindow = window.open(
      'https://postimages.org/',
      'postimagesWindow',
      'width=1000,height=800,menubar=no,toolbar=no,location=no'
    );
    
    // Display a helpful message to the user
    setFormData(prev => ({ 
      ...prev, 
      image: '' 
    }));
    setPreviewUrl('');
    setError('Please upload your image on Postimages. Copy the "Direct Link" URL when done.');
    
    // Set up an interval to check if the user has completed the upload
    const checkInterval = setInterval(() => {
      try {
        // If window is closed or redirected to a result page
        if (postimagesWindow.closed) {
          clearInterval(checkInterval);
          return;
        }
        
        // Check if we're on a result page (after upload)
        if (postimagesWindow.location.href.includes('postimages.org/') && 
            !postimagesWindow.location.href.includes('postimages.org/web')) {
          
          // Look for the direct link in the page
          const directLinks = postimagesWindow.document.querySelectorAll('input[id*="code_direct"]');
          
          if (directLinks && directLinks.length > 0) {
            // Get the direct link value
            const directLink = directLinks[0].value;
            
            if (directLink && directLink.startsWith('https://')) {
              // Set the image URL in our form
              setFormData(prev => ({ ...prev, image: directLink }));
              setPreviewUrl(directLink);
              setError('');
              
              // Close the popup after getting the URL
              setTimeout(() => {
                postimagesWindow.close();
                clearInterval(checkInterval);
              }, 500);
            }
          }
        }
      } catch (e) {
        // Cross-origin restrictions will prevent reading from the other domain
        // This is expected behavior, we'll rely on the user copying the URL manually
        console.log('Note: Cross-origin restriction detected, user will need to copy the URL manually');
      }
    }, 1000);
    
    // Set a timeout to clear the interval after 5 minutes (300000ms)
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 300000);
  };

  // Keep the existing handleChange function
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If changing the image URL, update the preview
    if (name === 'image' && value) {
      setPreviewUrl(value);
    }
    
    setError('');
  };

  // Password requirement item
  const PasswordRequirement = ({ met, text }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <FaCheck className="text-green-500" />
      ) : (
        <FaTimes className="text-red-500" />
      )}
      <span className={met ? "text-green-500" : "text-red-500"}>{text}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] overflow-y-auto p-4">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md relative my-8">
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold mb-6 text-white">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'freelancer' }))}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.userType === 'freelancer'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-blue-400'
                  }`}
                >
                  Freelancer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'project' }))}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.userType === 'project'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-blue-400'
                  }`}
                >
                  Project
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {formData.userType === 'freelancer' 
                  ? 'Select this if you want to offer services'
                  : 'Select this if you want to hire freelancers'}
              </p>
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter username"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email (Required)"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
                placeholder="Create a password"
                className={`w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 ${
                  formData.password && isPasswordValid() 
                    ? "focus:ring-green-500 border border-green-500" 
                    : "focus:ring-blue-500"
                }`}
              />
              
              {/* Password requirements checklist */}
              {(passwordFocused || formData.password) && (
                <div className="mt-2 p-3 bg-gray-700 rounded space-y-1">
                  <PasswordRequirement 
                    met={passwordValidation.minLength} 
                    text="At least 8 characters" 
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasUppercase} 
                    text="At least one uppercase letter" 
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasLowercase} 
                    text="At least one lowercase letter" 
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasNumber} 
                    text="At least one number" 
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasSpecial} 
                    text="At least one special character (@, $, !, %, *, ?, or &)" 
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm password"
                className={`w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 ${
                  formData.confirmPassword && formData.password === formData.confirmPassword
                    ? "focus:ring-green-500 border border-green-500" 
                    : "focus:ring-blue-500"
                }`}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
              )}
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Profile Image URL (optional)</label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="Enter image URL"
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={openPostimagesUploader}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                >
                  Upload Image
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                Click "Upload Image" to open Postimages.org. After uploading, find and copy the "Direct Link" if it's not automatically added here.
              </p>
              {previewUrl && (
                <div className="mt-2">
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    className="w-20 h-20 object-cover rounded"
                    onError={() => {
                      setPreviewUrl('');
                      setError('Failed to load image');
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Referral Code (optional)</label>
              <input
                type="text"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleChange}
                placeholder="Enter referral code"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAccountModal; 