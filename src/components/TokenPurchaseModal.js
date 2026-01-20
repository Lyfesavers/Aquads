import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TokenPurchaseModal = ({ isOpen, onClose, onPurchaseComplete, showNotification, currentUser }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [step, setStep] = useState(1); // 1: Package selection, 2: Payment

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
      fetchBalance();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user-tokens/packages`);
      setPackages(response.data);
      // Auto-select the popular package
      const popularPackage = response.data.find(pkg => pkg.popular);
      setSelectedPackage(popularPackage || response.data[0]);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const token = currentUser?.token;
      if (!token) {
        console.error('No authentication token found');
        if (showNotification) {
          showNotification('Please log in to view token balance', 'error');
        }
        return;
      }
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user-tokens/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCurrentBalance(response.data.tokens);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      alert('Please select a package first');
      return;
    }
    
    try {
      setPurchasing(true);
      const token = currentUser?.token;
      if (!token) {
        const message = 'Authentication error. Please log in again.';
        if (showNotification) {
          showNotification(message, 'error');
        } else {
          alert(message);
        }
        return;
      }
      
      // Create token purchase with aquapay-pending status
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/user-tokens/purchase`,
        {
          amount: selectedPackage.tokens,
          cost: selectedPackage.price, // Use the discounted package price, not token count
          paymentMethod: 'crypto',
          txSignature: 'aquapay-pending',
          paymentChain: 'AquaPay',
          chainSymbol: 'USDC',
          chainAddress: 'https://aquads.xyz/pay/aquads'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const newPurchase = response.data.purchase;
      const aquaPayUrl = `https://aquads.xyz/pay/aquads?amount=${selectedPackage.price}&tokenPurchaseId=${newPurchase._id}`;
      const newWindow = window.open(aquaPayUrl, '_blank');
      window.aquaPayPopup = newWindow;

      // No notification here - will show after successful payment
      
      // Reset form
      setStep(1);
      onClose();

    } catch (error) {
      console.error('Error creating purchase:', error);
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to submit purchase';
      if (showNotification) {
        showNotification(message, 'error');
      } else {
        alert(message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handlePayPalPurchase = async () => {
    if (!selectedPackage) {
      alert('Please select a package first');
      return;
    }
    
    try {
      setPurchasing(true);
      const token = currentUser?.token;
      if (!token) {
        const message = 'Authentication error. Please log in again.';
        if (showNotification) {
          showNotification(message, 'error');
        } else {
          alert(message);
        }
        return;
      }
      
      // Open PayPal payment link
      window.open('https://www.paypal.com/ncp/payment/NCKA498UEPL2E', '_blank');
      
      // Submit purchase for admin approval with PayPal method
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/user-tokens/purchase`,
        {
          amount: selectedPackage.tokens,
          cost: selectedPackage.price, // Use the discounted package price, not token count
          paymentMethod: 'paypal',
          txSignature: 'paypal', // Identifier to show it was a PayPal payment
          paymentChain: 'PayPal',
          chainSymbol: 'USD',
          chainAddress: 'https://www.paypal.com/ncp/payment/NCKA498UEPL2E'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const successMessage = 'PayPal payment initiated! Please complete the payment in the opened window. Your purchase will be verified by an admin and tokens will be added once approved.';
      if (showNotification) {
        showNotification(successMessage, 'success');
      } else {
        alert(successMessage);
      }
      
      // Reset form
      setStep(1);
      onClose();

    } catch (error) {
      console.error('Error creating PayPal purchase:', error);
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to submit PayPal purchase';
      if (showNotification) {
        showNotification(message, 'error');
      } else {
        alert(message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {step === 1 ? 'Purchase Tokens' : 'Payment Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Current Balance */}
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-blue-400 font-semibold">Current Balance</h3>
                  <p className="text-white text-2xl font-bold">{currentBalance} Tokens</p>
                </div>
                <div className="text-blue-400 text-3xl">🪙</div>
              </div>
            </div>

            {/* Token Info */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <h4 className="text-white font-semibold mb-2">💡 How it works:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• 1 Token = $1 USDC</li>
                <li>• 2 Tokens unlock 1 lead</li>
                <li>• Admin approval required</li>
                <li>• Tokens never expire</li>
              </ul>
            </div>

            {/* Package Selection */}
            <div className="space-y-3 mb-6">
              <h3 className="text-white font-semibold">Select Package:</h3>
              {packages.map((pkg) => (
                <div
                  key={pkg.tokens}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPackage?.tokens === pkg.tokens
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  } ${pkg.popular ? 'ring-2 ring-yellow-400/50' : ''}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="text-white font-semibold text-lg">
                        {pkg.tokens} Tokens
                      </span>
                      {pkg.popular && (
                        <span className="ml-2 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">${pkg.price}</div>
                      {pkg.discount > 0 && (
                        <div className="text-green-400 text-sm">
                          Save ${(pkg.tokens - pkg.price).toFixed(1)} ({pkg.discount}% off)
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    Unlock {Math.floor(pkg.tokens / 2)} leads
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Button */}
            <button
              onClick={() => setStep(2)}
              disabled={!selectedPackage}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Continue to Payment → ${selectedPackage?.price || 0}
            </button>
          </>
        ) : (
          <>
            {/* Payment Step */}
            <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-4 mb-6">
              <h4 className="text-yellow-400 font-semibold mb-2">💳 Payment Instructions:</h4>
              <div className="text-yellow-300 text-sm space-y-2">
                <div>
                  <strong>Crypto Payment (AquaPay):</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Click "Pay with Crypto" to open AquaPay payment page</li>
                    <li>• Complete payment of exactly ${selectedPackage?.price} USDC</li>
                    <li>• Your tokens will be automatically added once payment is confirmed</li>
                  </ul>
                </div>
                <div>
                  <strong>PayPal Payment:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Click "Pay with Card" to open PayPal payment link</li>
                    <li>• Complete payment of ${selectedPackage?.price} USD</li>
                    <li>• Admin will verify and approve your purchase</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Selected Package Summary */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-white font-semibold">{selectedPackage?.tokens} Tokens</span>
                  {selectedPackage?.popular && (
                    <span className="ml-2 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                      POPULAR
                    </span>
                  )}
                </div>
                <div className="text-white font-bold">${selectedPackage?.price}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Back Button */}
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                ← Back
              </button>
              
              {/* Payment Method Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {purchasing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </div>
                  ) : (
                    'Pay with Crypto'
                  )}
                </button>
                
                <button
                  onClick={handlePayPalPurchase}
                  disabled={purchasing}
                  className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {purchasing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    '💳 Pay with Card'
                  )}
                </button>
              </div>
            </div>

            <p className="text-gray-400 text-xs text-center mt-4">
              * Crypto payments are auto-approved. PayPal payments require admin verification.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default TokenPurchaseModal; 