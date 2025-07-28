import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck, FaCreditCard, FaWallet } from 'react-icons/fa';
import logger from '../utils/logger';
import { createNowPaymentsBump, getNowPaymentsCurrencies } from '../services/api';

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

const PAYMENT_METHODS = [
  {
    id: 'crypto',
    name: 'Manual Crypto Payment',
    icon: FaWallet,
    description: 'Send USDC manually to our wallet addresses'
  },
  {
    id: 'nowpayments',
    name: 'NOWPayments',
    icon: FaCreditCard,
    description: 'Pay with 100+ cryptocurrencies automatically'
  }
];

const BumpStore = ({ ad, onClose, onSubmitPayment }) => {
  const [txSignature, setTxSignature] = useState('');
  const [selectedOption, setSelectedOption] = useState(BUMP_OPTIONS[0]);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('crypto');
  const [nowPaymentsCurrencies, setNowPaymentsCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const currencies = await getNowPaymentsCurrencies();
        setNowPaymentsCurrencies(currencies);
        if (currencies.length > 0) {
          setSelectedCurrency(currencies[0]);
        }
      } catch (error) {
        logger.error('Failed to fetch NOWPayments currencies:', error);
      }
    };

    if (paymentMethod === 'nowpayments') {
      fetchCurrencies();
    }
  }, [paymentMethod]);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (paymentMethod === 'crypto') {
        logger.log("Form submitted with signature:", txSignature);
        
        if (!txSignature || txSignature.trim() === '') {
          alert('Please enter the transaction signature');
          setLoading(false);
          return;
        }
        
        if (!ad?.id) {
          alert('Invalid ad data');
          setLoading(false);
          return;
        }
        
        // Call the parent component's callback with the transaction data
        onSubmitPayment(ad.id, txSignature, selectedOption.durationMs);
      } else if (paymentMethod === 'nowpayments') {
        if (!selectedCurrency) {
          alert('Please select a cryptocurrency');
          setLoading(false);
          return;
        }

        const bumpData = {
          adId: ad.id,
          owner: ad.owner, // Assuming ad has owner field, adjust if needed
          duration: selectedOption.durationMs,
          payCurrency: selectedCurrency
        };

        const response = await createNowPaymentsBump(bumpData);
        
        // Open payment URL in new tab
        if (response.paymentUrl) {
          window.open(response.paymentUrl, '_blank');
          onClose(); // Close the modal
          alert('NOWPayments checkout opened in a new tab. Complete your payment there. Your bump will be automatically processed once payment is confirmed.');
        }
      }
    } catch (error) {
      logger.error('Error processing payment:', error);
      alert(error.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyName = (currency) => {
    return currency.toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999] p-4">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-white">Bump Ad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="space-y-6 pb-4">
          {/* Duration Selection */}
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
                    <span>${option.price} USD</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
            <div className="grid gap-4">
              {PAYMENT_METHODS.map((method) => {
                const IconComponent = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-lg border ${
                      paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="text-blue-400" />
                      <div className="text-left">
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-gray-400">{method.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crypto Payment Method */}
          {paymentMethod === 'crypto' && (
            <>
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
            </>
          )}

          {/* NOWPayments Method */}
          {paymentMethod === 'nowpayments' && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Select Cryptocurrency</h3>
              {nowPaymentsCurrencies.length > 0 ? (
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {nowPaymentsCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {formatCurrencyName(currency)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-4 bg-gray-700 rounded-lg text-center text-gray-400">
                  Loading available cryptocurrencies...
                </div>
              )}
              <div className="mt-2 text-sm text-gray-400">
                You'll be redirected to NOWPayments to complete your payment securely.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg transition-colors ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {loading ? 'Processing...' : 
                paymentMethod === 'crypto' ? 'Submit Payment' : 'Pay with NOWPayments'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BumpStore; 