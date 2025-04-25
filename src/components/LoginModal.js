import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import ForgotPasswordModal from './ForgotPasswordModal';

const LoginModal = ({ onClose, onLogin, onCreateAccount }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }

    onLogin(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[999999]">
        <div className="bg-gray-800 p-4 sm:p-8 rounded-lg w-full max-w-md relative mx-2 sm:mx-auto">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white p-3 z-10 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold mb-6 text-white">Login</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter username"
                className="w-full px-3 py-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
              />
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
                  onClick={() => setShowForgotPassword(true)}
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
        </div>
      </div>

      <ForgotPasswordModal
        show={showForgotPassword}
        onHide={() => setShowForgotPassword(false)}
      />
    </>
  );
}

export default LoginModal; 