import React, { useState } from 'react';
import Modal from './Modal';
import { requestPasswordReset } from '../services/api';

const ForgotPasswordModal = ({ onClose }) => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await requestPasswordReset(username);
      setMessage('If this username exists, you will receive password reset instructions.');
    } catch (error) {
      setError(error.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500">{error}</p>}
          {message && <p className="text-green-500">{message}</p>}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal; 