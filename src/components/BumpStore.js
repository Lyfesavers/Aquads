import React, { useState } from 'react';
import Modal from './Modal';

const BUMP_OPTIONS = [
  { duration: '24 hours', price: 0.5, durationMs: 24 * 60 * 60 * 1000 },
  { duration: '3 days', price: 1, durationMs: 3 * 24 * 60 * 60 * 1000 },
  { duration: '7 days', price: 2, durationMs: 7 * 24 * 60 * 60 * 1000 }
];

const BumpStore = ({ ad, onClose, onSubmitPayment }) => {
  const [txSignature, setTxSignature] = useState('');
  const [selectedOption, setSelectedOption] = useState(BUMP_OPTIONS[0]);
  const merchantWallets = {
    SOL: "J8ewxZwntodH8sT8LAXN5j6sAsDhtCh8sQA6GwRuLTSv",
    ETH: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    BNB: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2",
    USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
  };
  const [selectedWallet, setSelectedWallet] = useState('SOL');

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
            <h3 className="text-lg font-semibold text-white mb-4">Select Payment Method:</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.keys(merchantWallets).map((chain) => (
                <button
                  key={chain}
                  onClick={() => setSelectedWallet(chain)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedWallet === chain
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-blue-400'
                  }`}
                >
                  {chain}
                </button>
              ))}
            </div>
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">Selected Wallet Address:</p>
              <div className="flex items-center justify-between">
                <code className="text-blue-400 text-xs sm:text-sm break-all">
                  {merchantWallets[selectedWallet]}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(merchantWallets[selectedWallet])}
                  className="ml-2 text-sm text-gray-400 hover:text-white focus:outline-none"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Payment Instructions:</h3>
            <ol className="list-decimal list-inside text-gray-300 space-y-2 text-sm sm:text-base">
              <li>Send {selectedOption.price} SOL or Equivalent to the following wallet address:</li>
              <div className="bg-gray-700 p-3 rounded mt-2 mb-4 break-all">


                <code className="text-blue-400 text-xs sm:text-sm">{merchantWallets[selectedWallet]}</code>
                <button

                  onClick={() => navigator.clipboard.writeText(merchantWallets[selectedWallet])}
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