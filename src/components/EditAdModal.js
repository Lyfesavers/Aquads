import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const EditAdModal = ({ ad, onEditAd, onClose }) => {
  const [formData, setFormData] = useState({
    title: ad.title,
    logo: ad.logo,
    url: ad.url,
    pairAddress: ad.pairAddress || ad.contractAddress || '',
    blockchain: ad.blockchain || 'ethereum'
  });
  const [previewUrl, setPreviewUrl] = useState(ad.logo);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Prevent body scroll when modal is open (same as original Modal component)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

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

  const validatePairAddress = (address) => {
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

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!previewUrl) {
      setError('Please enter a valid image URL');
      return;
    }
    if (!validatePairAddress(formData.pairAddress)) {
      setError('Please enter a valid pair address');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await onEditAd(ad.id, formData);
      showNotification('success', 'Ad updated successfully!');
      
      // Close the modal after a short delay to allow user to see the confirmation
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      showNotification('error', 'Failed to update ad. Please try again.');
      console.error('Error updating ad:', error);
    } finally {
      setIsSubmitting(false);
    }
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
    <>
      {/* Force high z-index with inline styles */}
      <style>{`
        .edit-ad-modal-overlay {
          z-index: 99999999 !important;
          position: fixed !important;
        }
      `}</style>
      <div 
        className="edit-ad-modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        style={{ zIndex: 99999999 }}
        onClick={onClose}
      >
        <div 
          className="bg-gray-800 rounded-lg p-3 sm:p-6 w-full max-w-md mx-auto my-4 sm:my-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end mb-2 sm:mb-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl focus:outline-none p-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto pb-2">
            <div className="text-white">
              <h2 className="text-2xl font-bold mb-4">Edit Ad</h2>
              
              {/* Notification */}
              {notification.show && (
                <div className={`p-3 rounded-lg mb-4 ${
                  notification.type === 'success' 
                    ? 'bg-green-500 bg-opacity-20 border border-green-500 text-green-400' 
                    : 'bg-red-500 bg-opacity-20 border border-red-500 text-red-400'
                }`}>
                  {notification.message}
                </div>
              )}
              
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
                  <label className="block mb-1">Pair Address</label>
                  <input
                    type="text"
                    name="pairAddress"
                    value={formData.pairAddress}
                    onChange={handleChange}
                    placeholder="Enter pair address (0x...)"
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
                    disabled={!!error || isSubmitting}
                    className={`px-4 py-2 rounded flex items-center gap-2 ${
                      error || isSubmitting
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isSubmitting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {isSubmitting ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditAdModal; 