import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCopy, FaCheck } from 'react-icons/fa';

const BLOCKCHAIN_OPTIONS = [
  {
    name: 'Solana',
    symbol: 'SOL',
    address: 'F4HuQfUx5zsuQpxca4KQfX6uZPYtRp3Y7HYVGsuHdYVf',
    amount: 'USDC'
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: 'USDC'
  },
  {
    name: 'Base',
    symbol: 'BASE',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: 'USDC'
  },
  {
    name: 'Sui',
    symbol: 'SUI',
    address: '0xdadea3003856d304535c3f1b6d5670ab07a8e71715c7644bf230dd3a4ba7d13a',
    amount: 'USDC'
  }
];

const TokenPurchaseModal = ({ isOpen, onClose, onPurchaseComplete, showNotification, currentUser }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [txSignature, setTxSignature] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState(false);
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

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !txSignature.trim()) {
      alert('Please enter the transaction signature');
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
      
      // Submit purchase for admin approval
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/user-tokens/purchase`,
        {
          amount: selectedPackage.tokens,
          paymentMethod: 'crypto',
          txSignature: txSignature.trim(),
          paymentChain: selectedChain.name,
          chainSymbol: selectedChain.symbol,
          chainAddress: selectedChain.address
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const successMessage = 'Purchase submitted successfully! Your payment will be verified by an admin and tokens will be added to your account once approved.';
      if (showNotification) {
        showNotification(successMessage, 'success');
      } else {
        alert(successMessage);
      }
      
      // Reset form
      setTxSignature('');
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
              <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Payment Instructions:</h4>
              <ul className="text-yellow-300 text-sm space-y-1">
                <li>• Send exactly ${selectedPackage?.price} USDC to the address below</li>
                <li>• Copy the transaction signature after payment</li>
                <li>• Admin will verify and approve your purchase</li>
                <li>• Tokens will be added to your account once approved</li>
              </ul>
            </div>

            {/* Selected Package Summary */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
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

            {/* Blockchain Selection */}
            <div className="space-y-3 mb-6">
              <h3 className="text-white font-semibold">Select Payment Network:</h3>
              <div className="grid grid-cols-2 gap-3">
                {BLOCKCHAIN_OPTIONS.map((chain) => (
                  <button
                    key={chain.symbol}
                    type="button"
                    onClick={() => setSelectedChain(chain)}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedChain === chain
                        ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                        : 'border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium text-white">{chain.name}</div>
                      <div className="text-sm text-gray-300">${selectedPackage?.price} {chain.amount}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Address */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-2">Payment Address:</h3>
              <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg">
                <input
                  type="text"
                  value={selectedChain.address}
                  readOnly
                  className="bg-transparent flex-1 outline-none text-sm font-mono text-white"
                />
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="text-blue-400 hover:text-blue-300 p-2 rounded"
                >
                  {copiedAddress ? <FaCheck /> : <FaCopy />}
                </button>
              </div>
            </div>

            {/* Transaction Signature Input */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Transaction Signature:
              </label>
              <input
                type="text"
                value={txSignature}
                onChange={(e) => setTxSignature(e.target.value)}
                placeholder="Enter transaction signature after payment"
                className="w-full p-4 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing || !txSignature.trim()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {purchasing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Purchase'
                )}
              </button>
            </div>

            <p className="text-gray-400 text-xs text-center mt-4">
              * Your payment will be manually verified by an admin
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default TokenPurchaseModal; 