import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import emailService from '../services/emailService';
import { FaSpinner, FaCheck, FaTimes, FaImage, FaUpload } from 'react-icons/fa';
import { API_URL } from '../services/api';

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'image') {
      handleImageChange(e);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPEG, PNG, or GIF)');
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size should be less than 2MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      // Read the file as data URL
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          // The base64 string without the prefix
          const base64Image = reader.result.split(',')[1];
          
          // Upload to ImgBB
          const formData = new FormData();
          formData.append('image', base64Image);
          
          // You would normally keep this key in an environment variable
          // Using a demo key for illustration - replace with your own in production
          const imgbbApiKey = '2d9a2f0c346a051cca6bbcf647d2a865'; // Demo key
          
          const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
            method: 'POST',
            body: formData,
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Use the URL from ImgBB response
            const imageUrl = data.data.url;
            
            // Update form data with the image URL
            setFormData(prev => ({ ...prev, image: imageUrl }));
            setPreviewUrl(imageUrl);
            setIsUploading(false);
            setUploadError('');
          } else {
            throw new Error(data.error?.message || 'Upload failed');
          }
        } catch (error) {
          console.error('Error uploading to image host:', error);
          setUploadError('Failed to upload image. Please try again or enter image URL manually.');
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        setUploadError('Failed to read image file.');
        setIsUploading(false);
      };
      
      // Read the file as data URL
      reader.readAsDataURL(file);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 200);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Failed to upload image. Please try again or enter image URL manually.');
      setIsUploading(false);
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
              <label className="block text-gray-300 mb-2">Profile Image</label>
              <div className="space-y-3">
                {/* File Upload Option */}
                <div className="border border-gray-600 rounded p-3">
                  <label className="flex items-center justify-center p-4 cursor-pointer border-2 border-dashed border-gray-600 rounded hover:border-blue-500 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <div className="text-center">
                      <FaUpload className="mx-auto text-gray-400 text-xl mb-2" />
                      <span className="text-gray-300">
                        {isUploading ? `Uploading: ${uploadProgress}%` : 'Click to upload image'}
                      </span>
                    </div>
                  </label>
                  
                  {uploadError && (
                    <p className="text-red-500 text-sm mt-1">{uploadError}</p>
                  )}
                </div>
                
                <div className="flex items-center">
                  <div className="flex-grow h-px bg-gray-700"></div>
                  <span className="mx-2 text-gray-500 text-sm">OR</span>
                  <div className="flex-grow h-px bg-gray-700"></div>
                </div>
                
                {/* URL Input Option */}
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Enter Image URL</label>
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Image Preview */}
              {previewUrl && (
                <div className="mt-3 flex justify-center">
                  <div className="w-24 h-24 relative rounded-full overflow-hidden border-2 border-blue-500">
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setPreviewUrl('');
                        setError('Failed to load image');
                      }}
                    />
                  </div>
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