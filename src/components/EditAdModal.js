import React, { useState } from 'react';
import Modal from './Modal';

const EditAdModal = ({ ad, onEditAd, onClose }) => {
  const [formData, setFormData] = useState({
    title: ad.title,
    logo: ad.logo,
    url: ad.url,
    blockchain: ad.blockchain || 'ethereum'
  });
  const [previewUrl, setPreviewUrl] = useState(ad.logo);
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
    onEditAd(ad.id, formData);
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
        <h2 className="text-2xl font-bold mb-4">Edit Ad</h2>
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
            <label className="block mb-1">Blockchain</label>
            <select
              name="blockchain"
              value={formData.blockchain}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ethereum">Ethereum</option>
              <option value="bsc">Binance Smart Chain</option>
              <option value="polygon">Polygon</option>
              <option value="solana">Solana</option>
              <option value="avalanche">Avalanche</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
              <option value="sui">Sui</option>
              <option value="near">NEAR</option>
              <option value="fantom">Fantom</option>
              <option value="tron">TRON</option>
              <option value="cronos">Cronos</option>
              <option value="celo">Celo</option>
              <option value="harmony">Harmony</option>
              <option value="moonbeam">Moonbeam</option>
              <option value="moonriver">Moonriver</option>
              <option value="cosmos">Cosmos</option>
              <option value="polkadot">Polkadot</option>
              <option value="hedera">Hedera</option>
              <option value="kadena">Kadena</option>
              <option value="stacks">Stacks</option>
              <option value="oasis">Oasis</option>
              <option value="zilliqa">Zilliqa</option>
              <option value="elrond">MultiversX (Elrond)</option>
              <option value="kava">Kava</option>
              <option value="injective">Injective</option>
              <option value="aptos">Aptos</option>
              <option value="algorand">Algorand</option>
              <option value="stellar">Stellar</option>
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
              className={`px-4 py-2 rounded ${
                error 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditAdModal; 