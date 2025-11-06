import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import ForgotPasswordModal from './ForgotPasswordModal';

const LoginModal = ({ onClose, onLogin, onCreateAccount }) => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.identifier || !formData.password) {
      setError('Username/Email and password are required');
      return;
    }

    onLogin(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleOpenForgotPassword = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowForgotPassword(true);
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[999999]">
        <div className="bg-gray-800 p-4 sm:p-8 rounded-lg w-full max-w-md relative mx-2 sm:mx-auto">
          <div 
            onClick={onClose} 
            className="text-white text-center select-none cursor-pointer" 
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '24px',
              height: '24px',
              lineHeight: '24px',
              fontSize: '18px',
              fontWeight: 'bold',
              zIndex: 10
            }}
            role="button"
            tabIndex={0}
            aria-label="Close"
          >
            ✕
          </div>
          <h2 className="text-2xl font-bold mb-6 text-white">Login</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Username or Email</label>
              <input
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                required
                placeholder="Enter username or email"
                className="w-full px-3 py-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-3 pr-10 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <div className="flex justify-between items-center pt-4">
              <div className="space-x-4">
                <button
                  type="button"
                  onClick={onCreateAccount}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Forgot Password?
                </button>
              </div>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
              >
                Login
              </button>
            </div>
          </form>
          <div className="mt-6 pt-4 border-t border-gray-700 text-center">
            <p className="text-gray-400 text-xs">
              Powered by <span className="text-blue-400 font-semibold">Aquads</span>
            </p>
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal
          show={showForgotPassword}
          onHide={handleCloseForgotPassword}
        />
      )}
    </>
  );
}

export default LoginModal; 