import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck } from 'react-icons/fa';
import logger from '../utils/logger';
import DiscountCodeInput from './DiscountCodeInput';

const BUMP_OPTIONS = [
  { duration: 'Lifetime', price: 150, durationMs: -1 }
];

const BLOCKCHAIN_OPTIONS = [
  {
    name: 'Solana',
    symbol: 'SOL',
    address: 'F4HuQfUx5zsuQpxca4KQfU6uZPYtRp3Y7HYVGsuHdYVf',
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

const BumpStore = ({ ad, onClose, onSubmitPayment, currentUser }) => {
  const [txSignature, setTxSignature] = useState('');
  const [selectedOption, setSelectedOption] = useState(BUMP_OPTIONS[0]);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleDiscountApplied = (discountData) => {
    setAppliedDiscount(discountData);
  };

  const handleDiscountRemoved = () => {
    setAppliedDiscount(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    logger.log("Form submitted with signature:", txSignature);
    
    if (!txSignature || txSignature.trim() === '') {
      alert('Please enter the transaction signature');
      return;
    }
    
    if (!ad?.id) {
      alert('Invalid ad data');
      return;
    }
    
    // Call the parent component's callback with the transaction data
    onSubmitPayment(ad.id, txSignature, selectedOption.durationMs, appliedDiscount ? appliedDiscount.discountCode.code : null);
  };

  const handlePayPalPurchase = async () => {
    if (!ad?.id) {
      alert('Invalid ad data');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Open PayPal payment link
      window.open('https://www.paypal.com/ncp/payment/7RNMKRG49E7QS', '_blank');
      
      // Submit bump request for admin approval with PayPal method
      await onSubmitPayment(
        ad.id, 
        'paypal', // Identifier to show it was a PayPal payment
        selectedOption.durationMs, 
        appliedDiscount ? appliedDiscount.discountCode.code : null
      );
      
      // Parent component (handleBumpPurchase) handles showing notification and closing modal
      // But we can also close explicitly here for immediate feedback
      onClose();
    } catch (error) {
      logger.error('Error processing PayPal bump purchase:', error);
      alert(error.message || 'Failed to process bump purchase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999] p-4">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-white">Bump Ad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="space-y-6 pb-4">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select Duration</h3>
            <div className="grid gap-4">
              {BUMP_OPTIONS.map((option) => (
                <button
                  key={option.duration}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                  className={`p-4 rounded-lg border ${
                    selectedOption === option
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{option.duration}</span>
                    <span>{option.price} USDC</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select Network</h3>
            <div className="grid gap-4">
              {BLOCKCHAIN_OPTIONS.map((chain) => (
                <button
                  key={chain.symbol}
                  type="button"
                  onClick={() => setSelectedChain(chain)}
                  className={`p-4 rounded-lg border ${
                    selectedChain === chain
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{chain.name}</span>
                    <span>{chain.amount}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Address</h3>
            <div className="flex items-center gap-2 p-4 bg-gray-700 rounded-lg">
              <input
                type="text"
                value={selectedChain.address}
                readOnly
                className="bg-transparent flex-1 outline-none"
              />
              <button
                type="button"
                onClick={handleCopyAddress}
                className="text-blue-400 hover:text-blue-300"
              >
                {copiedAddress ? <FaCheck /> : <FaCopy />}
              </button>
            </div>
          </div>

          {/* Discount Code Input */}
          <DiscountCodeInput
            onDiscountApplied={handleDiscountApplied}
            onDiscountRemoved={handleDiscountRemoved}
            originalAmount={selectedOption.price}
            baseAmount={selectedOption.price}
            addonAmount={0}
            applicableTo="bump"
            className="mb-6"
            currentUser={currentUser}
          />

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transaction Signature
              </label>
              <input
                type="text"
                value={txSignature}
                onChange={(e) => setTxSignature(e.target.value)}
                placeholder="Enter transaction signature"
                className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Payment Method Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-sm sm:text-base"
              >
                <span className="mr-1.5 sm:mr-2">🔗</span>
                Pay with Crypto
              </button>
              
              <button
                type="button"
                onClick={handlePayPalPurchase}
                disabled={submitting}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-sm sm:text-base"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <span className="mr-1.5 sm:mr-2">💳</span>
                    Pay with Card
                  </>
                )}
              </button>
            </div>

            <p className="text-gray-400 text-xs text-center mt-3">
              * Your payment will be manually verified by an admin
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BumpStore; 