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
      
      alert('Banner ad created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating banner:', error);
      alert(error.message || 'Failed to create banner ad');
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
        <div className="border-b border-gray-700/50 pb-6 mb-6">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Create Banner Advertisement
            </h1>
            <p className="text-gray-400 text-lg">Get premium visibility across the entire platform</p>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full max-w-7xl mx-auto px-4">
            
            {/* Left Column - Benefits & Info */}
            <div className="order-2 lg:order-1 h-full overflow-y-auto pr-4">
              <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/50 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <FaRocket className="mr-3 text-blue-400" />
                  Premium Banner Advertising
                </h3>
                <p className="text-gray-300 mb-6">
                  Maximize your project's visibility with our premium banner placement system. Your banner will be displayed prominently across our entire platform, reaching thousands of engaged Web3 enthusiasts.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-blue-500 p-2 rounded-full flex-shrink-0">
                      <FaEye className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Maximum Visibility</h4>
                      <p className="text-gray-300 text-sm">
                        Your banner appears on every page of the platform, ensuring consistent exposure to all visitors and users.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-green-500 p-2 rounded-full flex-shrink-0">
                      <FaMousePointer className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">High CTR Position</h4>
                      <p className="text-gray-300 text-sm">
                        Premium top-of-page placement optimized for maximum click-through rates and engagement.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-purple-500 p-2 rounded-full flex-shrink-0">
                      <FaGlobe className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Platform-Wide Reach</h4>
                      <p className="text-gray-300 text-sm">
                        Reach users across all sections: Project Info, Game Hub, Freelancer Hub, Blog, and more.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-indigo-500 p-2 rounded-full flex-shrink-0">
                      <FaChartLine className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Targeted Audience</h4>
                      <p className="text-gray-300 text-sm">
                        Connect with Web3-native users actively seeking crypto projects, games, and blockchain services.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-cyan-500 p-2 rounded-full flex-shrink-0">
                      <FaClock className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Flexible Duration Options</h4>
                      <p className="text-gray-300 text-sm">
                        Choose from 24 hours, 3 days, or 7 days to match your campaign goals and budget.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-orange-500 p-2 rounded-full flex-shrink-0">
                      <FaBullhorn className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Brand Awareness</h4>
                      <p className="text-gray-300 text-sm">
                        Build recognition and trust with repeated exposure to our engaged community of crypto enthusiasts.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <FaStar className="text-yellow-400 text-xl mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-green-300 font-medium mb-2">
                        Why Choose Banner Ads?
                      </p>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>✓ Instant visibility across all platform pages</li>
                        <li>✓ Perfect for product launches and announcements</li>
                        <li>✓ Professional 1280x200px format</li>
                        <li>✓ Multi-chain payment support</li>
                        <li>✓ Automated approval and activation</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Specs Section */}
                <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <FaRocket className="mr-2 text-blue-400" />
                    Banner Specifications
                  </h4>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li><span className="text-blue-400 font-medium">Dimensions:</span> 1280px × 200px</li>
                    <li><span className="text-blue-400 font-medium">Format:</span> GIF, PNG, or JPG</li>
                    <li><span className="text-blue-400 font-medium">File Size:</span> Recommended under 5MB for optimal loading</li>
                    <li><span className="text-blue-400 font-medium">Animation:</span> Supported (GIF format)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="order-1 lg:order-2 h-full overflow-y-auto pl-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Duration Selection */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 text-white flex items-center">
                    <FaClock className="mr-2 text-purple-400" />
                    Select Duration
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {BANNER_OPTIONS.map((option) => (
                      <button
                        key={option.duration}
                        type="button"
                        onClick={() => setSelectedOption(option)}
                        className={`p-5 rounded-lg border-2 transition-all ${
                          selectedOption === option
                            ? 'border-blue-500 bg-blue-500/20 scale-105 shadow-lg shadow-blue-500/20'
                            : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="font-bold text-lg text-white">{option.duration}</div>
                        <div className="text-xl text-blue-400 font-bold mt-1">{option.price} USDC</div>
                        {selectedOption === option && (
                          <div className="mt-2 text-xs text-green-400">✓ Selected</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner Details */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 text-white flex items-center">
                    <FaBullhorn className="mr-2 text-blue-400" />
                    Banner Details
                  </h3>
                  
                  <div className="space-y-4">
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

                {/* Payment Options */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 text-white flex items-center">
                    <FaGlobe className="mr-2 text-green-400" />
                    Payment Chain
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {BLOCKCHAIN_OPTIONS.map((chain) => (
                      <button
                        key={chain.symbol}
                        type="button"
                        onClick={() => setSelectedChain(chain)}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center h-28 transition-all ${
                          selectedChain === chain
                            ? 'border-green-500 bg-green-500/20 scale-105 shadow-lg shadow-green-500/20'
                            : 'border-gray-600 hover:border-green-400 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="font-bold text-center text-white mb-1">{chain.name}</div>
                        <div className="text-sm text-gray-400 text-center">
                          {selectedOption.price} {chain.amount}
                        </div>
                        {selectedChain === chain && (
                          <div className="mt-2 text-xs text-green-400">✓ Selected</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Payment Address */}
                  <div className="mt-4 p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-sm font-medium text-gray-300">Send {selectedOption.price} USDC to:</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm break-all text-white bg-gray-800 p-2 rounded">
                          {selectedChain.address}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="p-3 hover:bg-gray-600 rounded-lg text-white transition-colors flex-shrink-0"
                        title="Copy address"
                      >
                        {copiedAddress ? (
                          <span className="flex items-center text-green-400">
                            <FaCheck className="mr-1" /> Copied
                          </span>
                        ) : (
                          <FaCopy />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transaction Signature */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Confirm Payment
                  </h3>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Transaction Signature/Hash
                    </label>
                    <input
                      type="text"
                      value={txSignature}
                      onChange={(e) => setTxSignature(e.target.value)}
                      required
                      placeholder="Paste your transaction signature here"
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      After sending payment, paste your transaction signature to verify the payment
                    </p>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
                  >
                    <FaRocket className="mr-2" />
                    Create Banner Ad
                  </button>
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