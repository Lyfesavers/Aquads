import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { requestPasswordReset } from '../services/api';
import ResetPasswordModal from './ResetPasswordModal';

const ForgotPasswordModal = ({ show, onHide }) => {
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await requestPasswordReset(username, referralCode);
      setShowResetModal(true);
    } catch (error) {
      setError(error.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetComplete = () => {
    setShowResetModal(false);
    onHide();
  };

  // If reset modal is shown, don't show this modal
  if (showResetModal) {
    return (
      <ResetPasswordModal
        show={showResetModal}
        onHide={handleResetComplete}
        username={username}
        referralCode={referralCode}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000000]">
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
        <h2 className="text-2xl font-bold mb-6 text-white">Forgot Password</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          
          <div>
            <label className="block text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              className="w-full px-3 py-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Your Secret Code</label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              required
              placeholder="Enter your secret code"
              className="w-full px-3 py-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-400 text-sm mt-1">
              This is the unique code generated when you created your account
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded mt-4"
          >
            {isLoading ? 'Processing...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal; 