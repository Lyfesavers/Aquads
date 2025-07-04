import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck } from 'react-icons/fa';

const BLOCKCHAIN_OPTIONS = [
  {
    name: 'Solana',
    symbol: 'SOL',
    address: 'F4HuQfUx5zsuQpxca4KQfU6uZPYtRp3Y7HYVGsuHdYVf',
    amount: '1000 USDC'
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: '1000 USDC'
  },
  {
    name: 'Base',
    symbol: 'BASE',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: '1000 USDC'
  },
  {
    name: 'Sui',
    symbol: 'SUI',
    address: '0xdadea3003856d304535c3f1b6d5670ab07a8e71715c7644bf230dd3a4ba7d13a',
    amount: '1000 USDC'
  }
];

const PremiumPaymentModal = ({ onClose, onSubmit }) => {
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [paymentSignature, setPaymentSignature] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(selectedChain.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!paymentSignature.trim()) {
      alert('Please enter the payment signature');
      return;
    }
    onSubmit(paymentSignature);
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-white">Premium Service Upgrade</h2>
        <p className="text-gray-300 mb-6">
          Upgrade your service to premium status for enhanced visibility and features.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Blockchain
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {BLOCKCHAIN_OPTIONS.map((chain) => (
              <button
                key={chain.symbol}
                onClick={() => setSelectedChain(chain)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedChain.symbol === chain.symbol
                    ? 'bg-blue-500/20 border border-blue-500'
                    : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-600/50'
                }`}
              >
                <div className="font-medium text-white">{chain.name}</div>
                <div className="text-sm text-gray-400">{chain.amount}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Address
          </label>
          <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg">
            <code className="flex-1 text-sm text-gray-300 break-all">
              {selectedChain.address}
            </code>
            <button
              onClick={handleCopyAddress}
              className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {copied ? <FaCheck className="text-green-400" /> : <FaCopy className="text-gray-400" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Signature
            </label>
            <input
              type="text"
              value={paymentSignature}
              onChange={(e) => setPaymentSignature(e.target.value)}
              placeholder="Enter your payment signature"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Submit Payment
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default PremiumPaymentModal; 