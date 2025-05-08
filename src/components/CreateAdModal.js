import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

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

const CreateAdModal = ({ onCreateAd, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    logo: '',
    url: '',
    contractAddress: '',
    blockchain: 'ethereum',
    txSignature: '',
    paymentChain: BLOCKCHAIN_OPTIONS[0].name,
    chainSymbol: BLOCKCHAIN_OPTIONS[0].symbol,
    chainAddress: BLOCKCHAIN_OPTIONS[0].address
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      return contentType.startsWith('image/') && 
        (contentType.includes('gif') || contentType.includes('png') || contentType.includes('jpeg') || contentType.includes('jpg'));
    } catch (error) {
      return false;
    }
  };

  const validateContractAddress = (address) => {
    // Sui format (0x...::module::TOKEN)
    const suiRegex = /^0x[0-9a-fA-F]+::[a-zA-Z0-9_]+::[A-Z0-9_]+$/;
    
    // Base58 format (for Solana)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    // Hex format with 0x prefix (for ETH, BSC etc)
    const hexRegex = /^0x[0-9a-fA-F]{40,64}$/;
    
    // General alphanumeric format for other chains
    const generalRegex = /^[0-9a-zA-Z]{15,70}$/;

    return suiRegex.test(address) || 
           base58Regex.test(address) || 
           hexRegex.test(address) || 
           generalRegex.test(address);
  };

  const handleLogoChange = async (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, logo: url }));
    
    if (url) {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setPreviewUrl(url);
        setError('');
      } else {
        setPreviewUrl('');
        setError('Please enter a valid image URL (GIF or PNG)');
      }
    } else {
      setPreviewUrl('');
      setError('');
    }
  };

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleInfoSubmit = (e) => {
    e.preventDefault();
    if (!previewUrl) {
      setError('Please enter a valid image URL');
      return;
    }

    if (!validateContractAddress(formData.contractAddress)) {
      setError('Please enter a valid contract address');
      return;
    }

    // Move to payment step
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.txSignature) {
      setError('Please enter the transaction signature');
      return;
    }

    onCreateAd({
      ...formData,
      paymentChain: selectedChain.name,
      chainSymbol: selectedChain.symbol,
      chainAddress: selectedChain.address
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'logo') {
      handleLogoChange(e);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-4">
          {step === 1 ? 'List New Project' : 'Payment for Listing'}
          <span className="text-sm text-gray-400 ml-3">Step {step} of 2</span>
        </h2>
        
        {step === 1 ? (
          <form onSubmit={handleInfoSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-1">Contract Address</label>
              <input
                type="text"
                name="contractAddress"
                value={formData.contractAddress}
                onChange={handleChange}
                placeholder="Enter contract address (0x...)"
                required
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-1">Blockchain</label>
              <select
                name="blockchain"
                value={formData.blockchain}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ethereum">Ethereum</option>
                <option value="solana">Solana</option>
                <option value="base">Base</option>
                <option value="sui">Sui</option>
                <option value="bitcoin">Bitcoin</option>
                <option value="binance">Binance</option>
                <option value="polygon">Polygon</option>
                <option value="avalanche">Avalanche</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="optimism">Optimism</option>
                <option value="flow">Flow</option>
                <option value="cardano">Cardano</option>
                <option value="ton">TON</option>
                <option value="tezos">Tezos</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">Logo URL (GIF or PNG)</label>
              <input
                type="url"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                placeholder="Enter image URL (GIF or PNG)"
                required
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              {previewUrl && (
                <div className="mt-2 p-2 bg-gray-700 rounded">
                  <p className="text-sm text-gray-300 mb-2">Preview:</p>
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-w-full h-32 object-contain mx-auto rounded"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block mb-1">Website URL</label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!!error}
                className={`flex items-center px-4 py-2 rounded ${
                  error 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                Next <FaArrowRight className="ml-2" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Listing Fee: $350 USDC</h3>
              <p className="text-sm text-gray-300">
                Your listing will be reviewed by our admins after payment confirmation. 
                Once approved, your project will appear in the bubbles.
              </p>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Select Network</h3>
              <div className="grid grid-cols-2 gap-4">
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
                      <span>$350 {chain.amount}</span>
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
                name="txSignature"
                value={formData.txSignature}
                onChange={handleChange}
                placeholder="Enter transaction signature"
                className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center px-4 py-2 rounded bg-gray-600 hover:bg-gray-700"
              >
                <FaArrowLeft className="mr-2" /> Back
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 rounded bg-blue-500 hover:bg-blue-600"
              >
                Submit Payment
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default CreateAdModal; 