import React, { useState } from 'react';
import Modal from './Modal';

const CreateAdModal = ({ onCreateAd, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    logo: '',
    url: '',
    contractAddress: ''
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

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
    // Allow any non-empty string that:
    // 1. Has no spaces
    // 2. Is between 20-70 characters
    // 3. Contains only valid characters (alphanumeric, with optional 0x prefix)
    return /^[0-9a-zA-Z]{20,70}$/.test(address) || 
           /^0x[0-9a-fA-F]{20,70}$/.test(address);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!previewUrl) {
      setError('Please enter a valid image URL');
      return;
    }

    if (!validateContractAddress(formData.contractAddress)) {
      setError('Please enter a valid contract address');
      return;
    }

    onCreateAd(formData);
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
        <h2 className="text-2xl font-bold mb-4">Create New Ad</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className={`px-4 py-2 rounded ${
                error 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Create Ad
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateAdModal; 