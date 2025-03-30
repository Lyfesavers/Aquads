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
    
    // Clear the field and set focus guidance
    setFormData(prev => ({ 
      ...prev, 
      image: '' 
    }));
    setPreviewUrl('');
    // Show clear instructions instead of an error
    setError('✨ Upload your image on Postimages, then copy the "Direct link" URL and paste it here');
    
    // For browsers that support it, set up a listener for when our window gets focus back
    // This likely means the user has completed their task in the popup
    window.addEventListener('focus', function onFocus() {
      // Update guidance when the user comes back to our window
      setError('📋 Now paste the "Direct link" URL from Postimages into the field above');
      window.removeEventListener('focus', onFocus);
    }, { once: true });
  };

  // Keep the existing handleChange function
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If changing the image URL, update the preview and validate
    if (name === 'image' && value) {
      // If it looks like an image URL, try to validate it
      if (value.startsWith('http') && 
         (value.includes('.jpg') || value.includes('.jpeg') || 
          value.includes('.png') || value.includes('.gif'))) {
        
        // Check if the URL is valid
        validateImageUrl(value).then(isValid => {
          if (isValid) {
            setPreviewUrl(value);
            
            // Show success message
            if (error && error.includes('✨')) {
              setError('✅ Image URL successfully added!');
              // Clear the success message after 3 seconds
              setTimeout(() => setError(''), 3000);
            } else {
              setError('');
            }
          } else {
            setPreviewUrl('');
            setError('The URL does not point to a valid image. Please try again.');
          }
        });
      } else {
        // Let's be optimistic and set the preview anyway, the image tag's onError will handle invalid images
        setPreviewUrl(value);
      }
    } else if (name === 'image' && !value) {
      setPreviewUrl('');
    }
    
    // Clear error if it's not a special instruction
    if (!(name === 'image' && error && error.includes('✨'))) {
      setError('');
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[999999] overflow-y-auto p-4">
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
                  placeholder="Enter image URL or use upload button →"
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={openPostimagesUploader}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center whitespace-nowrap"
                >
                  Upload Image
                </button>
              </div>
              {error && error.includes('✨') ? (
                <div className="p-3 bg-blue-900/30 border border-blue-800 rounded-md mt-2 mb-2">
                  <h4 className="font-medium text-blue-300 mb-2">How to add your profile image:</h4>
                  <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1.5">
                    <li>Upload your image on the Postimages website that just opened</li>
                    <li>After upload, look for the <span className="font-mono bg-gray-800 px-1.5 py-0.5 rounded">Direct link</span> field</li>
                    <li>Click the <span className="font-mono bg-gray-800 px-1.5 py-0.5 rounded">Copy</span> button next to it</li>
                    <li>Come back to this window and paste the link in the field above</li>
                  </ol>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-2">
                  Click "Upload Image" to open Postimages.org. After uploading, copy the "Direct Link" and paste it here.
                </p>
              )}
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