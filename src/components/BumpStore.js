import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck } from 'react-icons/fa';
import logger from '../utils/logger';
import DiscountCodeInput from './DiscountCodeInput';

const BUMP_OPTIONS = [
  { duration: '3 months', price: 99, durationMs: 90 * 24 * 60 * 60 * 1000 },
  { duration: '6 months', price: 150, durationMs: 180 * 24 * 60 * 60 * 1000 },
  { duration: 'Lifetime', price: 300, durationMs: -1 }
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

const BumpStore = ({ ad, onClose, onSubmitPayment }) => {
  const [txSignature, setTxSignature] = useState('');
  const [selectedOption, setSelectedOption] = useState(BUMP_OPTIONS[0]);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(null);

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
            applicableTo="bump"
            className="mb-6"
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

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition-colors"
            >
              Submit Payment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BumpStore; 