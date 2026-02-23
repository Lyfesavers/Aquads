import React, { useState } from 'react';
import { Alert } from 'react-bootstrap';
import { resetPassword } from '../services/api';

const ResetPasswordModal = ({ show, onHide, username, referralCode }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await resetPassword(username, referralCode, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onHide();
      }, 2000);
    } catch (error) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000000]">
      <div className="bg-gray-800 p-4 sm:p-8 rounded-lg w-full max-w-md relative mx-2 sm:mx-auto" onClick={(e) => e.stopPropagation()}>
        <div 
          onClick={onHide} 
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
        <h2 className="text-2xl font-bold mb-6 text-white">Reset Password</h2>
        
        {success ? (
          <Alert variant="success">
            Password reset successful! You can now log in with your new password.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}
            
            <div>
              <label className="block text-gray-300 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded mt-4"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordModal; 