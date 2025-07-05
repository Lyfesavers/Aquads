import React, { useState } from 'react';
import Modal from './Modal';
import { FaSpinner, FaEnvelope } from 'react-icons/fa';
import emailService from '../services/emailService';
import logger from '../utils/logger';

const EmailVerificationModal = ({ email, onVerificationComplete, onClose }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          verificationCode: verificationCode.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Success - update user data if new token is provided
      if (data.token) {
        const updatedUser = {
          userId: data.userId,
          username: data.username,
          email: data.email,
          image: data.image,
          isAdmin: data.isAdmin,
          emailVerified: data.emailVerified,
          token: data.token
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
      
      onVerificationComplete(data.message);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsResending(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      // Send email using EmailJS
      if (data.verificationCode) {
        logger.log('Resending verification email...');
        try {
          await emailService.sendVerificationEmail(
            email,
            'User', // We don't have username here, could be improved
            data.verificationCode
          );
          logger.log('Verification email resent successfully');
          alert('Verification code resent successfully! Please check your email.');
        } catch (emailError) {
          logger.error('Failed to resend verification email:', emailError);
          alert('New code generated but failed to send email. Please contact support.');
        }
      } else {
        alert('Verification code resent successfully!');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md mx-auto border border-gray-700">
        <div className="text-center mb-6">
          <FaEnvelope className="mx-auto h-12 w-12 text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
          <p className="text-gray-300 text-sm">
            We've sent a 6-digit verification code to<br />
            <span className="text-blue-400 font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000000"
              maxLength="6"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-lg border border-red-500/30">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || verificationCode.length !== 6}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium disabled:text-gray-500"
            >
              {isResending ? 'Resending...' : 'Resend Code'}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-xs text-center">
            <strong>Important:</strong> You must verify your email to receive affiliate points and bonuses.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default EmailVerificationModal; 