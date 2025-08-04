import React, { useState } from 'react';
import { FaTag, FaCheck, FaTimes } from 'react-icons/fa';
import { API_URL } from '../services/api';

const DiscountCodeInput = ({ 
  onDiscountApplied, 
  onDiscountRemoved, 
  originalAmount, 
  applicableTo = 'listing',
  className = '' 
}) => {
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [error, setError] = useState('');

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setError('Please enter a discount code');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/discount-codes/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: discountCode.trim(),
          applicableTo,
          originalAmount
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAppliedDiscount(data);
        onDiscountApplied(data);
        setError('');
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        setError('Your session has expired. Please log in again.');
        setAppliedDiscount(null);
        onDiscountRemoved();
      } else {
        setError(data.error || 'Invalid discount code');
        setAppliedDiscount(null);
        onDiscountRemoved();
      }
    } catch (error) {
      setError('Failed to validate discount code');
      setAppliedDiscount(null);
      onDiscountRemoved();
    } finally {
      setIsValidating(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setError('');
    onDiscountRemoved();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateDiscountCode();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {!appliedDiscount ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Have a discount code?
          </label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaTag className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter discount code"
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isValidating}
              />
            </div>
            <button
              onClick={validateDiscountCode}
              disabled={isValidating || !discountCode.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isValidating ? 'Validating...' : 'Apply'}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>
      ) : (
        <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaCheck className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-medium">
                Discount Applied: {appliedDiscount.discountCode.code}
              </span>
            </div>
            <button
              onClick={removeDiscount}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-300">
            <div className="flex justify-between">
              <span>Original Amount:</span>
              <span>${originalAmount.toLocaleString()} USDC</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>Discount ({appliedDiscount.discountCode.discountType === 'percentage' ? `${appliedDiscount.discountCode.discountValue}%` : `$${appliedDiscount.discountCode.discountValue}`}):</span>
              <span>-${appliedDiscount.discountAmount.toLocaleString()} USDC</span>
            </div>
            <div className="flex justify-between font-semibold text-white border-t border-gray-600 pt-1 mt-1">
              <span>Final Amount:</span>
              <span>${appliedDiscount.finalAmount.toLocaleString()} USDC</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodeInput; 