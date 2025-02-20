import React, { useState } from 'react';
import { Modal, Form, Alert } from 'react-bootstrap';
import { API_URL } from '../services/api';
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

const CreateBannerModal = ({ show, onHide, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    gif: '',
    url: '',
    duration: BANNER_OPTIONS[0].durationMs
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [txSignature, setTxSignature] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'gif') {
      validateGifUrl(value);
    }
  };

  const validateGifUrl = async (url) => {
    if (!url) {
      setPreviewUrl('');
      return;
    }

    if (!url.toLowerCase().endsWith('.gif')) {
      setError('URL must end with .gif');
      setPreviewUrl('');
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Invalid URL');
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image/gif')) {
        throw new Error('URL must point to a GIF image');
      }
      setPreviewUrl(url);
      setError('');
    } catch (err) {
      setError('Invalid GIF URL');
      setPreviewUrl('');
    }
  };

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.gif || !formData.url || !txSignature) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const selectedOption = BANNER_OPTIONS.find(opt => opt.durationMs === parseInt(formData.duration));
      
      const submitData = {
        title: formData.title.trim(),
        gif: formData.gif.trim(),
        url: formData.url.trim(),
        duration: parseInt(formData.duration),
        transactionSignature: txSignature.trim(),
        paymentChain: selectedChain.name,
        chainSymbol: selectedChain.symbol,
        chainAddress: selectedChain.address
      };

      delete submitData.owner;
      delete submitData.status;
      delete submitData.txSignature;
      delete submitData.price;

      console.log('Submitting banner ad data:', submitData);
      const response = await onSubmit(submitData);
      console.log('Banner ad response:', response);
      onHide();
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to create banner ad');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="banner-modal">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg">
        <Modal.Header className="border-b border-gray-700 bg-gray-800 rounded-t-lg">
          <Modal.Title className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Create Banner Advertisement
          </Modal.Title>
          <button
            onClick={onHide}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            ×
          </button>
        </Modal.Header>
        <Modal.Body className="bg-gray-900 p-6">
          <Form onSubmit={handleSubmit}>
            {error && (
              <Alert variant="danger" className="bg-red-500/10 border border-red-500/20 text-red-400 mb-4 rounded">
                {error}
              </Alert>
            )}
            
            <Form.Group className="mb-4">
              <Form.Label className="text-gray-300">Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter banner title"
                required
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="text-gray-300">GIF URL</Form.Label>
              <Form.Control
                type="url"
                name="gif"
                value={formData.gif}
                onChange={handleInputChange}
                placeholder="Enter GIF URL - H 300px x W 1920px"
                required
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />

            </Form.Group>

            {previewUrl && (
              <div className="mb-4 p-2 bg-gray-800/50 rounded-lg">
                <img 
                  src={previewUrl} 
                  alt="Banner Preview" 
                  className="w-full max-h-48 object-contain rounded"
                />
              </div>
            )}

            <Form.Group className="mb-4">
              <Form.Label className="text-gray-300">Website URL</Form.Label>
              <Form.Control
                type="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                placeholder="Enter website URL"
                required
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </Form.Group>

            <Form.Group className="mb-6">
              <Form.Label className="text-gray-300">Duration</Form.Label>
              <Form.Select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {BANNER_OPTIONS.map((option, index) => (
                  <option key={index} value={option.durationMs} className="bg-gray-800">
                    {option.duration} - {option.price} USDC
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-6">
              <Form.Label className="text-gray-300">Select Network</Form.Label>
              <div className="grid gap-4">
                {BLOCKCHAIN_OPTIONS.map((chain) => (
                  <button
                    type="button"
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
            </Form.Group>

            <Form.Group className="mb-6">
              <Form.Label className="text-gray-300">Payment Address</Form.Label>
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
            </Form.Group>

            <Form.Group className="mb-6">
              <Form.Label className="text-gray-300">Transaction Signature</Form.Label>
              <Form.Control
                type="text"
                value={txSignature}
                onChange={(e) => setTxSignature(e.target.value)}
                placeholder="Enter transaction signature"
                required
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </Form.Group>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                isLoading
                  ? 'bg-indigo-500/50 cursor-not-allowed'
                  : 'bg-indigo-500 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/50'
              }`}
            >
              {isLoading ? 'Creating...' : 'Create Banner Ad'}
            </button>
          </Form>
        </Modal.Body>
      </div>
    </Modal>
  );
};

export default CreateBannerModal; 