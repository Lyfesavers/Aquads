import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck } from 'react-icons/fa';

const BANNER_OPTIONS = [
  { duration: '24 hours', price: 40, durationMs: 24 * 60 * 60 * 1000 },
  { duration: '3 days', price: 80, durationMs: 3 * 24 * 60 * 60 * 1000 },
  { duration: '7 days', price: 160, durationMs: 7 * 24 * 60 * 60 * 1000 }
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

const CreateBannerModal = ({ onClose, onSubmit }) => {
  const [selectedOption, setSelectedOption] = useState(BANNER_OPTIONS[0]);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [txSignature, setTxSignature] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [bannerData, setBannerData] = useState({
    title: '',
    gif: '',
    url: ''
  });

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!txSignature) {
      alert('Please enter the transaction signature');
      return;
    }

    try {
      onSubmit({
        ...bannerData,
        txSignature,
        paymentChain: selectedChain.name,
        chainSymbol: selectedChain.symbol,
        chainAddress: selectedChain.address,
        duration: selectedOption.durationMs
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <Modal onClose={handleClose}>
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Banner Ad</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Duration Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BANNER_OPTIONS.map((option) => (
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
                  <div className="font-medium">{option.duration}</div>
                  <div className="text-sm text-gray-400">{option.price} USDC</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Banner Title</label>
            <input
              type="text"
              value={bannerData.title}
              onChange={(e) => setBannerData({...bannerData, title: e.target.value})}
              required
              placeholder="Enter your banner title"
              className="w-full p-3 bg-gray-700 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Banner GIF URL</label>
            <input
              type="url"
              value={bannerData.gif}
              onChange={(e) => setBannerData({...bannerData, gif: e.target.value})}
              required
              placeholder="Enter the URL of your banner GIF"
              className="w-full p-3 bg-gray-700 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Website URL</label>
            <input
              type="url"
              value={bannerData.url}
              onChange={(e) => setBannerData({...bannerData, url: e.target.value})}
              required
              placeholder="Enter your website URL"
              className="w-full p-3 bg-gray-700 rounded"
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Payment Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                  <div className="font-medium">{chain.name}</div>
                  <div className="text-sm text-gray-400">{selectedOption.price} {chain.amount}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 sm:p-4 bg-gray-700 rounded-lg overflow-x-auto">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-400">Send payment to:</div>
              <div className="font-mono text-sm truncate">{selectedChain.address}</div>
            </div>
            <button
              type="button"
              onClick={handleCopyAddress}
              className="p-2 hover:text-blue-400"
            >
              {copiedAddress ? <FaCheck /> : <FaCopy />}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Transaction Signature</label>
            <input
              type="text"
              value={txSignature}
              onChange={(e) => setTxSignature(e.target.value)}
              required
              placeholder="Enter your transaction signature"
              className="w-full p-3 bg-gray-700 rounded"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
            >
              Create Banner
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateBannerModal; 