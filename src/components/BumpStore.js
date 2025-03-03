import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck } from 'react-icons/fa';

const BUMP_OPTIONS = [
  { duration: '24 hours', price: 5, durationMs: 24 * 60 * 60 * 1000 },
  { duration: '3 days', price: 15, durationMs: 3 * 24 * 60 * 60 * 1000 },
  { duration: '7 days', price: 35, durationMs: 7 * 24 * 60 * 60 * 1000 }
];

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
    address: '0xe99b659efbb9a713c494eff34cff9e614fdd8f7ca00530b62c747d5c088aa877',
    amount: 'USDC'
  }
];

const BumpStore = ({ ad, onClose, onSubmitPayment }) => {
  const [txSignature, setTxSignature] = useState('');
  const [selectedOption, setSelectedOption] = useState(BUMP_OPTIONS[0]);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!txSignature) {
      alert('Please enter the transaction signature');
      return;
    }
    if (!ad?.id) {
      alert('Invalid ad data');
      return;
    }
    onSubmitPayment(ad.id, txSignature, selectedOption.durationMs);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                onClick={handleCopyAddress}
                className="text-blue-400 hover:text-blue-300"
              >
                {copiedAddress ? <FaCheck /> : <FaCopy />}
              </button>
            </div>
          </div>

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