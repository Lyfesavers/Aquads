import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck, FaBullhorn, FaChartLine, FaEye, FaMousePointer, FaRocket, FaGlobe, FaClock, FaStar } from 'react-icons/fa';

const BANNER_OPTIONS = [
  { duration: '24 hours', price: 40, durationMs: 24 * 60 * 60 * 1000 },
  { duration: '3 days', price: 80, durationMs: 3 * 24 * 60 * 60 * 1000 },
  { duration: '7 days', price: 160, durationMs: 7 * 24 * 60 * 60 * 1000 }
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
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!txSignature) {
      alert('Please enter the transaction signature');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        ...bannerData,
        txSignature,
        paymentChain: selectedChain.name,
        chainSymbol: selectedChain.symbol,
        chainAddress: selectedChain.address,
        duration: selectedOption.durationMs,
        paymentMethod: 'crypto'
      });
      
      alert('Banner ad created successfully! It will be reviewed by an admin for approval.');
      onClose();
    } catch (error) {
      console.error('Error creating banner:', error);
      alert(error.message || 'Failed to create banner ad');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayPalPurchase = async () => {
    // Validate banner data before proceeding
    if (!bannerData.title || !bannerData.gif || !bannerData.url) {
      alert('Please fill in all banner details (Title, Image URL, and Website URL)');
      return;
    }

    try {
      setSubmitting(true);
      
      // Open PayPal payment link
      window.open('https://www.paypal.com/ncp/payment/CCJGW2D9SM3XA', '_blank');
      
      // Submit banner for admin approval with PayPal method
      await onSubmit({
        ...bannerData,
        txSignature: 'paypal', // Identifier to show it was a PayPal payment
        paymentMethod: 'paypal',
        paymentChain: 'PayPal',
        chainSymbol: 'USD',
        chainAddress: 'https://www.paypal.com/ncp/payment/CCJGW2D9SM3XA',
        duration: selectedOption.durationMs
      });

      alert('PayPal payment initiated! Please complete the payment in the opened window. Your banner ad will be verified by an admin and activated once approved.');
      onClose();
    } catch (error) {
      console.error('Error creating PayPal banner:', error);
      alert(error.message || 'Failed to create banner ad');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const validateGifUrl = async (url) => {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      return contentType.startsWith('image/');
    } catch (error) {
      return false;
    }
  };

  const handleGifChange = async (e) => {
    const url = e.target.value;
    setBannerData(prev => ({ ...prev, gif: url }));
    
    if (url) {
      const isValid = await validateGifUrl(url);
      if (isValid) {
        setPreviewUrl(url);
        setError('');
      } else {
        setPreviewUrl('');
        setError('Please enter a valid image URL');
      }
    } else {
      setPreviewUrl('');
      setError('');
    }
  };

  return (
    <Modal fullScreen onClose={handleClose}>
      <div className="text-white h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700/50 pb-4 sm:pb-6 mb-4 sm:mb-6">
          <div className="max-w-7xl mx-auto px-3 sm:px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Create Banner Ad
            </h1>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg">Premium visibility across the platform</p>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto px-3 sm:px-4 pb-6">
            
            {/* Left Column - Benefits & Info */}
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 flex items-center">
                  <FaRocket className="mr-2 sm:mr-3 text-blue-400 text-lg sm:text-xl" />
                  Premium Banner Advertising
                </h3>
                <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6">
                  Maximize your project's visibility with our premium banner placement system. Your banner will be displayed prominently across our entire platform, reaching thousands of engaged Web3 enthusiasts.
                </p>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-blue-500 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                      <FaEye className="text-white text-base sm:text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-0.5 sm:mb-1 text-sm sm:text-base">Maximum Visibility</h4>
                      <p className="text-gray-300 text-xs sm:text-sm">
                        Your banner appears on every page of the platform.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-green-500 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                      <FaMousePointer className="text-white text-base sm:text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-0.5 sm:mb-1 text-sm sm:text-base">High CTR Position</h4>
                      <p className="text-gray-300 text-xs sm:text-sm">
                        Premium top-of-page placement optimized for clicks.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-purple-500 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                      <FaGlobe className="text-white text-base sm:text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-0.5 sm:mb-1 text-sm sm:text-base">Platform-Wide Reach</h4>
                      <p className="text-gray-300 text-xs sm:text-sm">
                        Reach users across all sections of the platform.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-indigo-500 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                      <FaChartLine className="text-white text-base sm:text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-0.5 sm:mb-1 text-sm sm:text-base">Targeted Audience</h4>
                      <p className="text-gray-300 text-xs sm:text-sm">
                        Connect with Web3-native crypto enthusiasts.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-cyan-500 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                      <FaClock className="text-white text-base sm:text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-0.5 sm:mb-1 text-sm sm:text-base">Flexible Duration</h4>
                      <p className="text-gray-300 text-xs sm:text-sm">
                        Choose 24 hours, 3 days, or 7 days duration.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-orange-500 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                      <FaBullhorn className="text-white text-base sm:text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-0.5 sm:mb-1 text-sm sm:text-base">Brand Awareness</h4>
                      <p className="text-gray-300 text-xs sm:text-sm">
                        Build trust with repeated exposure to our community.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/50 rounded-lg">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <FaStar className="text-yellow-400 text-base sm:text-xl mt-0.5 sm:mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-green-300 font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">
                        Why Choose Banner Ads?
                      </p>
                      <ul className="text-gray-300 text-xs sm:text-sm space-y-0.5 sm:space-y-1">
                        <li>✓ Instant visibility across all pages</li>
                        <li>✓ Perfect for launches</li>
                        <li>✓ Professional 1280x200px format</li>
                        <li>✓ Multi-chain payment support</li>
                        <li>✓ Fast approval process</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Specs Section */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-white mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                    <FaRocket className="mr-2 text-blue-400 text-sm sm:text-base" />
                    Banner Specifications
                  </h4>
                  <ul className="text-gray-300 text-xs sm:text-sm space-y-1 sm:space-y-2">
                    <li><span className="text-blue-400 font-medium">Dimensions:</span> 1280×200px</li>
                    <li><span className="text-blue-400 font-medium">Format:</span> GIF, PNG, JPG</li>
                    <li><span className="text-blue-400 font-medium">Size:</span> Under 5MB recommended</li>
                    <li><span className="text-blue-400 font-medium">Animation:</span> Supported</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="order-1 lg:order-2">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                
                {/* Duration Selection */}
                <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white flex items-center">
                    <FaClock className="mr-2 text-purple-400 text-base sm:text-lg" />
                    Select Duration
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {BANNER_OPTIONS.map((option) => (
                <button
                  key={option.duration}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                        className={`p-2 sm:p-4 rounded-lg border-2 transition-all ${
                    selectedOption === option
                            ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                            : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="font-bold text-xs sm:text-base md:text-lg text-white">{option.duration}</div>
                        <div className="text-sm sm:text-lg md:text-xl text-blue-400 font-bold mt-0.5 sm:mt-1">${option.price}</div>
                        {selectedOption === option && (
                          <div className="mt-1 text-[10px] sm:text-xs text-green-400">✓</div>
                        )}
                </button>
              ))}
            </div>
          </div>

                {/* Banner Details */}
                <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white flex items-center">
                    <FaBullhorn className="mr-2 text-blue-400 text-base sm:text-lg" />
                    Banner Details
                  </h3>
                  
                  <div className="space-y-3 sm:space-y-4">
          <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Banner Title
                      </label>
            <input
              type="text"
              value={bannerData.title}
              onChange={(e) => setBannerData({...bannerData, title: e.target.value})}
              required
              placeholder="Enter your banner title"
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Banner Image URL <span className="text-blue-400">(1280×200px)</span>
            </label>
            <input
              type="text"
              name="gif"
              value={bannerData.gif}
              onChange={handleGifChange}
                        className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-gray-400"
                        placeholder="https://example.com/banner.gif"
              required
            />
                      <p className="mt-1 text-xs text-gray-400">
                        Supports GIF, PNG, or JPG format
                      </p>
            {error && (
                        <p className="mt-2 text-sm text-red-400 flex items-center">
                          <span className="mr-2">⚠</span> {error}
                        </p>
            )}
            {previewUrl && (
                        <div className="mt-4 border-2 border-green-500/50 rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Banner preview"
                            className="w-full h-auto"
                  onError={() => {
                    setPreviewUrl('');
                    setError('Failed to load image');
                  }}
                />
                          <div className="bg-green-900/30 px-3 py-2 text-xs text-green-300">
                            ✓ Preview loaded successfully
                          </div>
              </div>
            )}
          </div>

          <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Website/Landing Page URL
                      </label>
            <input
              type="url"
              value={bannerData.url}
              onChange={(e) => setBannerData({...bannerData, url: e.target.value})}
              required
                        placeholder="https://yourproject.com"
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-3 sm:p-4 md:p-6">
                  <h4 className="text-yellow-400 font-semibold mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                    <span className="text-base sm:text-xl mr-1.5 sm:mr-2">💳</span>
                    Payment Options:
                  </h4>
                  <div className="text-yellow-300 text-xs sm:text-sm space-y-2 sm:space-y-3">
                    <div>
                      <strong>Crypto Payment:</strong>
                      <ul className="ml-3 sm:ml-4 mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1 text-yellow-200">
                        <li>• Send ${selectedOption.price} USDC</li>
                        <li>• Copy transaction signature</li>
                        <li>• Click "Pay with Crypto"</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Card/PayPal:</strong>
                      <ul className="ml-3 sm:ml-4 mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1 text-yellow-200">
                        <li>• Click "Pay with Card"</li>
                        <li>• Complete ${selectedOption.price} USD payment</li>
                        <li>• Auto-submits for approval</li>
                      </ul>
                    </div>
                    <div className="border-t border-yellow-500/30 pt-1.5 sm:pt-2 mt-1.5 sm:mt-2">
                      <li>• Admin will verify payment</li>
                      <li>• Banner activates after approval</li>
                    </div>
                  </div>
          </div>

                {/* Payment Options */}
                <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white flex items-center">
                    <FaGlobe className="mr-2 text-green-400 text-base sm:text-lg" />
                    Crypto Payment Chain
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {BLOCKCHAIN_OPTIONS.map((chain) => (
                <button
                  key={chain.symbol}
                  type="button"
                  onClick={() => setSelectedChain(chain)}
                        className={`p-2 sm:p-3 rounded-lg border-2 flex flex-col items-center justify-center h-20 sm:h-24 transition-all ${
                    selectedChain === chain
                            ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20'
                            : 'border-gray-600 hover:border-green-400 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="font-bold text-center text-white text-xs sm:text-sm mb-0.5 sm:mb-1">{chain.name}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400 text-center">
                          ${selectedOption.price}
                  </div>
                        {selectedChain === chain && (
                          <div className="mt-1 text-[10px] sm:text-xs text-green-400">✓</div>
                        )}
                </button>
              ))}
          </div>

                  {/* Payment Address */}
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-300">Send ${selectedOption.price} USDC to:</div>
                    </div>
                    <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] sm:text-xs break-all text-white bg-gray-800 p-2 rounded">
                          {selectedChain.address}
                        </div>
            </div>
            <button
              type="button"
              onClick={handleCopyAddress}
                        className="p-2 sm:p-3 hover:bg-gray-600 rounded-lg text-white transition-colors flex-shrink-0"
                        title="Copy address"
                      >
                        {copiedAddress ? (
                          <span className="flex items-center text-green-400 text-xs">
                            <FaCheck className="text-xs sm:text-sm" />
                          </span>
                        ) : (
                          <FaCopy className="text-xs sm:text-sm" />
                        )}
            </button>
                    </div>
                  </div>
          </div>

                {/* Transaction Signature - Only for Crypto Payment */}
                <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">
                    Crypto Confirmation
                  </h3>
          <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2 text-gray-300">
                      Transaction Signature <span className="text-gray-500 text-[10px] sm:text-xs">(Crypto only)</span>
                    </label>
            <input
              type="text"
              value={txSignature}
              onChange={(e) => setTxSignature(e.target.value)}
                      placeholder="Paste transaction signature (for crypto)"
                      className="w-full p-2 sm:p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-xs sm:text-sm"
            />
                    <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-400">
                      After sending crypto, paste tx signature here
                    </p>
                  </div>
          </div>

                {/* Submit Buttons */}
                <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-gray-700">
                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  
                  {/* Payment Method Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={submitting || !txSignature.trim()}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-sm sm:text-base"
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </div>
                      ) : (
                        <>
                          <FaRocket className="mr-1.5 sm:mr-2 text-sm sm:text-base" />
                          Pay with Crypto
                        </>
                      )}
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

                  <p className="text-gray-400 text-[10px] sm:text-xs text-center">
                    * Your payment will be manually verified by an admin
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateBannerModal; 