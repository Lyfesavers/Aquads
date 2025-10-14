import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck, FaCrown, FaCheckCircle, FaStar, FaHeadset, FaAd, FaShieldAlt, FaSearch, FaBolt, FaCreditCard } from 'react-icons/fa';

const BLOCKCHAIN_OPTIONS = [
  {
    name: 'Solana',
    symbol: 'SOL',
    address: 'F4HuQfUx5zsuQpxca4KQfU6uZPYtRp3Y7HYVGsuHdYVf',
    amount: '1000 USDC',
    icon: '◎'
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: '1000 USDC',
    icon: 'Ξ'
  },
  {
    name: 'Base',
    symbol: 'BASE',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: '1000 USDC',
    icon: '🔵'
  },
  {
    name: 'Sui',
    symbol: 'SUI',
    address: '0xdadea3003856d304535c3f1b6d5670ab07a8e71715c7644bf230dd3a4ba7d13a',
    amount: '1000 USDC',
    icon: '~'
  }
];

const PREMIUM_BENEFITS = [
  {
    icon: FaShieldAlt,
    title: 'KYC/KYB Verified',
    description: 'Get verified status badge to build trust with clients',
    color: 'text-blue-400'
  },
  {
    icon: FaSearch,
    title: 'Top of Search Results',
    description: 'Your service appears first in marketplace searches',
    color: 'text-green-400'
  },
  {
    icon: FaBolt,
    title: 'Early Access',
    description: 'First to get discounts and new platform features',
    color: 'text-yellow-400'
  },
  {
    icon: FaHeadset,
    title: 'VIP Customer Service',
    description: 'Priority support with dedicated assistance',
    color: 'text-purple-400'
  },
  {
    icon: FaAd,
    title: '$50 Ad Credit',
    description: 'Free advertising credit to promote your service',
    color: 'text-pink-400'
  },
  {
    icon: FaStar,
    title: 'Premium Badge',
    description: 'Stand out with an exclusive premium badge',
    color: 'text-orange-400'
  }
];

const PremiumPaymentModal = ({ onClose, onSubmit }) => {
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [paymentSignature, setPaymentSignature] = useState('');
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('crypto'); // 'crypto' or 'paypal'

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(selectedChain.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayPalPayment = () => {
    // Open PayPal payment link
    window.open('https://www.paypal.com/ncp/payment/LYECY49SXB3E6', '_blank');
    
    // Submit with PayPal identifier
    onSubmit('paypal');
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
    <Modal onClose={onClose} fullScreen={true}>
      <div className="min-h-full w-full flex items-center justify-center py-8 px-4">
        <div className="max-w-6xl w-full mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-4 md:mb-6 shadow-2xl shadow-yellow-500/50 animate-pulse">
              <FaCrown className="text-white text-4xl md:text-5xl" />
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4">
              Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Premium</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Unlock exclusive features and maximize your service visibility
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            {/* Left Column - Benefits */}
            <div className="space-y-4 md:space-y-6">
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50 shadow-2xl">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6 flex items-center gap-3">
                  <FaStar className="text-yellow-400" />
                  Premium Benefits
                </h2>
                <div className="space-y-4 md:space-y-5">
                  {PREMIUM_BENEFITS.map((benefit, index) => (
                    <div 
                      key={index}
                      className="flex gap-4 items-start p-3 md:p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 border border-gray-700/30 hover:border-gray-600/50 group"
                    >
                      <div className={`${benefit.color} text-2xl md:text-3xl mt-1 group-hover:scale-110 transition-transform duration-300`}>
                        <benefit.icon />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-base md:text-lg mb-1">{benefit.title}</h3>
                        <p className="text-sm md:text-base text-gray-400">{benefit.description}</p>
                      </div>
                      <FaCheckCircle className="text-green-400 text-lg md:text-xl mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border-2 border-yellow-500/30 shadow-2xl">
                <div className="text-center">
                  <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">
                    1000 <span className="text-yellow-400">USDC</span>
                  </div>
                  <p className="text-gray-300 text-base md:text-lg">One-time payment • Lifetime access</p>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Form */}
            <div className="space-y-4 md:space-y-6">
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50 shadow-2xl">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Payment Details</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-base md:text-lg font-semibold text-gray-200 mb-3 md:mb-4">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('crypto')}
                        className={`p-4 md:p-5 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                          paymentMethod === 'crypto'
                            ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/30 border-2 border-blue-400 shadow-lg shadow-blue-500/30'
                            : 'bg-gray-700/50 border-2 border-gray-600 hover:bg-gray-600/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-2">₿</div>
                          <div className="font-bold text-white text-base md:text-lg">Crypto Payment</div>
                          <div className="text-xs md:text-sm text-gray-300 mt-1">Pay with USDC</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('paypal')}
                        className={`p-4 md:p-5 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                          paymentMethod === 'paypal'
                            ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-400 shadow-lg shadow-yellow-500/30'
                            : 'bg-gray-700/50 border-2 border-gray-600 hover:bg-gray-600/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-center">
                          <FaCreditCard className="text-3xl mx-auto mb-2" />
                          <div className="font-bold text-white text-base md:text-lg">Card Payment</div>
                          <div className="text-xs md:text-sm text-gray-300 mt-1">Pay with Card/PayPal</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Blockchain Selection - Only show for crypto */}
                  {paymentMethod === 'crypto' && (
                  <div>
                    <label className="block text-base md:text-lg font-semibold text-gray-200 mb-3 md:mb-4">
                      Select Blockchain
                    </label>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {BLOCKCHAIN_OPTIONS.map((chain) => (
                        <button
                          key={chain.symbol}
                          type="button"
                          onClick={() => setSelectedChain(chain)}
                          className={`p-4 md:p-5 rounded-xl text-left transition-all duration-300 transform hover:scale-105 ${
                            selectedChain.symbol === chain.symbol
                              ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/30 border-2 border-blue-400 shadow-lg shadow-blue-500/30'
                              : 'bg-gray-700/50 border-2 border-gray-600 hover:bg-gray-600/50 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 md:gap-3 mb-2">
                            <span className="text-2xl md:text-3xl">{chain.icon}</span>
                            <div className="font-bold text-white text-base md:text-lg">{chain.name}</div>
                          </div>
                          <div className="text-sm md:text-base text-gray-300">{chain.amount}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Payment Address - Only show for crypto */}
                  {paymentMethod === 'crypto' && (
                  <div>
                    <label className="block text-base md:text-lg font-semibold text-gray-200 mb-3 md:mb-4">
                      Payment Address
                    </label>
                    <div className="relative">
                      <div className="flex items-center gap-3 p-4 md:p-5 bg-gray-900/80 border-2 border-gray-700 rounded-xl hover:border-gray-600 transition-colors group">
                        <code className="flex-1 text-xs md:text-sm text-gray-300 break-all font-mono leading-relaxed">
                          {selectedChain.address}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          className="shrink-0 p-3 md:p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-all duration-300 border border-blue-500/50 hover:border-blue-400 group"
                          title="Copy address"
                        >
                          {copied ? (
                            <FaCheck className="text-green-400 text-lg md:text-xl" />
                          ) : (
                            <FaCopy className="text-blue-400 text-lg md:text-xl group-hover:scale-110 transition-transform" />
                          )}
                        </button>
                      </div>
                      {copied && (
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                          Copied!
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Payment Signature - Only show for crypto */}
                  {paymentMethod === 'crypto' && (
                  <div>
                    <label className="block text-base md:text-lg font-semibold text-gray-200 mb-3 md:mb-4">
                      Payment Signature / Transaction Hash
                    </label>
                    <input
                      type="text"
                      value={paymentSignature}
                      onChange={(e) => setPaymentSignature(e.target.value)}
                      placeholder="Enter your payment signature or transaction hash"
                      className="w-full p-4 md:p-5 bg-gray-900/80 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 text-sm md:text-base"
                      required
                    />
                    <p className="mt-2 text-xs md:text-sm text-gray-400">
                      After sending payment, paste your transaction signature here
                    </p>
                  </div>
                  )}

                  {/* PayPal Instructions - Only show for PayPal */}
                  {paymentMethod === 'paypal' && (
                  <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-5 md:p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <FaCreditCard className="text-yellow-400 text-2xl md:text-3xl mt-1 shrink-0" />
                      <div>
                        <h3 className="font-bold text-white mb-2 text-base md:text-lg">Card/PayPal Payment Instructions</h3>
                        <ol className="text-sm md:text-base text-gray-300 space-y-2 list-decimal list-inside">
                          <li>Click the "Pay with Card/PayPal" button below</li>
                          <li>Complete the payment of $1000 USD in the opened window</li>
                          <li>Your premium status will be activated within 24 hours after verification</li>
                        </ol>
                      </div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-3 md:p-4 border border-yellow-500/20">
                      <p className="text-xs md:text-sm text-yellow-200 flex items-center gap-2">
                        <FaCheckCircle className="shrink-0" />
                        <span>Secure payment processed through PayPal</span>
                      </p>
                    </div>
                  </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all duration-300 font-semibold text-base md:text-lg border-2 border-gray-600 hover:border-gray-500"
                    >
                      Cancel
                    </button>
                    
                    {paymentMethod === 'crypto' ? (
                      <button
                        type="submit"
                        className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-xl hover:from-blue-500 hover:to-blue-700 transition-all duration-300 font-bold text-base md:text-lg shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-105 flex items-center justify-center gap-2 md:gap-3"
                      >
                        <FaCrown />
                        Pay with Crypto
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePayPalPayment}
                        className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300 font-bold text-base md:text-lg shadow-xl shadow-yellow-500/30 hover:shadow-yellow-500/50 transform hover:scale-105 flex items-center justify-center gap-2 md:gap-3"
                      >
                        <FaCreditCard />
                        Pay with Card/PayPal
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Additional Info */}
              <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-blue-500/30">
                <div className="flex gap-3 items-start">
                  <FaCheckCircle className="text-blue-400 text-xl md:text-2xl mt-1 shrink-0" />
                  <div>
                    <h3 className="font-bold text-white mb-2 text-base md:text-lg">Instant Activation</h3>
                    <p className="text-sm md:text-base text-gray-300">
                      Your premium status will be activated within 24 hours after payment verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PremiumPaymentModal; 