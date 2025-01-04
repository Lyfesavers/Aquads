import React, { useState } from 'react';
import Modal from './Modal';

const BUMP_OPTIONS = [
  { duration: '24 hours', price: 0.2, durationMs: 24 * 60 * 60 * 1000 },
  { duration: '3 days', price: 0.5, durationMs: 3 * 24 * 60 * 60 * 1000 },
  { duration: '7 days', price: 1, durationMs: 7 * 24 * 60 * 60 * 1000 }
];

const BumpStore = ({ ad, onClose, onSubmitPayment }) => {
  const [txSignature, setTxSignature] = useState('');
  const [selectedOption, setSelectedOption] = useState(BUMP_OPTIONS[0]);
  const merchantWallet = 'J8ewxZwntodH8sT8LAXN5j6sAsDhtCh8sQA6GwRuLTSv';

  if (!ad) {
    console.error('Ad prop is required for BumpStore');
    return null;
  }

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-lg mx-auto my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Bump Your Ad</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mb-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Select Bump Duration:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BUMP_OPTIONS.map((option) => (
                <button
                  key={option.duration}
                  onClick={() => setSelectedOption(option)}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    selectedOption === option
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className="text-white font-semibold text-sm sm:text-base">{option.duration}</div>
                  <div className="text-blue-400 text-sm sm:text-base">{option.price} SOL</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Payment Instructions:</h3>
            <ol className="list-decimal list-inside text-gray-300 space-y-2 text-sm sm:text-base">
              <li>Send {selectedOption.price} SOL to the following wallet address:</li>
              <div className="bg-gray-700 p-3 rounded mt-2 mb-4 break-all">
                <code className="text-blue-400 text-xs sm:text-sm">{merchantWallet}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(merchantWallet)}
                  className="ml-2 text-sm text-gray-400 hover:text-white focus:outline-none"
                >
                  Copy
                </button>
              </div>
              <li>After sending the payment, copy the transaction signature</li>
              <li>Paste the transaction signature below and submit</li>
              <li>Wait for admin approval of your bump request</li>
            </ol>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2 text-sm sm:text-base">
              Transaction Signature
            </label>
            <input
              type="text"
              value={txSignature}
              onChange={(e) => setTxSignature(e.target.value)}
              placeholder="Enter transaction signature"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              required
            />
          </div>

          {txSignature && (
            <a
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 text-sm"
            >
              View Transaction on Solscan
            </a>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 rounded text-sm sm:text-base"
            >
              Submit Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BumpStore; 