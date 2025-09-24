import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaStore, FaPlus, FaEdit, FaCheck, FaTimes, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';

const PartnerStoreManager = ({ currentUser }) => {
  const [partnerStore, setPartnerStore] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    storeLogo: '',
    storeWebsite: '',
    storeCategory: '',
    discountOffers: []
  });

  const categories = [
    'DeFi & Crypto', 'NFT & Gaming', 'Web3 Services', 'Crypto Hardware',
    'Food & Beverage', 'Clothing & Fashion', 'Books & Education', 'Technology & Software',
    'Health & Fitness', 'Travel & Tourism', 'Entertainment & Media', 'Home & Garden',
    'Business Services', 'Financial Services', 'Marketing & Design', 'Development & IT',
    'Electronics & Gadgets', 'Sports & Outdoors', 'Beauty & Personal Care', 'Automotive',
    'Subscriptions & SaaS', 'Gift Cards & Vouchers', 'Other'
  ];

  const pointTiers = [2000, 4000, 6000, 8000, 10000];

  useEffect(() => {
    fetchPartnerStore();
  }, []);

  const fetchPartnerStore = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData.partnerStore?.isPartner) {
          setPartnerStore(userData.partnerStore);
          setFormData({
            storeName: userData.partnerStore.storeName || '',
            storeDescription: userData.partnerStore.storeDescription || '',
            storeLogo: userData.partnerStore.storeLogo || '',
            storeWebsite: userData.partnerStore.storeWebsite || '',
            storeCategory: userData.partnerStore.storeCategory || '',
            discountOffers: userData.partnerStore.discountOffers || []
          });
        }
      }
    } catch (error) {
      console.error('Error fetching partner store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addOffer = () => {
    setFormData(prev => ({
      ...prev,
      discountOffers: [
        ...prev.discountOffers,
        {
          pointTier: 2000,
          title: '',
          description: '',
          discountCode: '',
          terms: 'Standard terms and conditions apply',
          isActive: true
        }
      ]
    }));
  };

  const updateOffer = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      discountOffers: prev.discountOffers.map((offer, i) => 
        i === index ? { ...offer, [field]: value } : offer
      )
    }));
  };

  const removeOffer = (index) => {
    setFormData(prev => ({
      ...prev,
      discountOffers: prev.discountOffers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/partner-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setPartnerStore(result.partnerStore);
        setIsEditing(false);
        alert('Partner store saved successfully! Awaiting admin approval.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save partner store');
      }
    } catch (error) {
      console.error('Error saving partner store:', error);
      alert('Failed to save partner store');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FaCheck className="text-green-400" />;
      case 'rejected': return <FaTimes className="text-red-400" />;
      case 'pending': return <FaSpinner className="text-yellow-400 animate-spin" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <FaSpinner className="animate-spin text-blue-400 text-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <FaStore />
          <span>My Partner Store</span>
        </h2>
        
        {partnerStore && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaEdit />
            <span>Edit Store</span>
          </button>
        )}
      </div>

      {partnerStore && !isEditing ? (
        // Display mode
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 space-y-6"
        >
          {/* Store Status */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(partnerStore.partnerStatus)}
              <div>
                <div className="text-white font-medium">Store Status</div>
                <div className={`text-sm ${getStatusColor(partnerStore.partnerStatus)}`}>
                  {partnerStore.partnerStatus.charAt(0).toUpperCase() + partnerStore.partnerStatus.slice(1)}
                </div>
              </div>
            </div>
            {partnerStore.partnerStatus === 'approved' && (
              <a
                href="/partner-rewards"
                target="_blank"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <FaExternalLinkAlt />
                <span>View Live</span>
              </a>
            )}
          </div>

          {/* Store Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <img
                src={partnerStore.storeLogo}
                alt={partnerStore.storeName}
                className="w-full h-48 object-cover rounded-lg mb-4"
                onError={(e) => {
                  e.target.src = '/api/placeholder/400/200';
                }}
              />
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-gray-400 text-sm">Store Name</div>
                <div className="text-white text-xl font-bold">{partnerStore.storeName}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Category</div>
                <div className="text-white">{partnerStore.storeCategory}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Website</div>
                <a
                  href={partnerStore.storeWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                >
                  <span>{partnerStore.storeWebsite}</span>
                  <FaExternalLinkAlt size={12} />
                </a>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Total Redemptions</div>
                <div className="text-white">{partnerStore.totalRedemptions || 0}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-2">Description</div>
            <div className="text-white">{partnerStore.storeDescription}</div>
          </div>

          {/* Discount Offers */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Discount Offers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partnerStore.discountOffers?.map((offer, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-white font-medium">{offer.title}</div>
                    <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      {offer.pointTier} pts
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm mb-2">{offer.description}</div>
                  <div className="text-xs text-gray-400">
                    Code: <span className="font-mono bg-gray-800 px-1 rounded">{offer.discountCode}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Redeemed: {offer.redemptionCount || 0} times
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        // Edit/Create mode
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-xl p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Store Name *
              </label>
              <input
                type="text"
                name="storeName"
                value={formData.storeName}
                onChange={handleInputChange}
                required
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter your store name"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Category *
              </label>
              <select
                name="storeCategory"
                value={formData.storeCategory}
                onChange={handleInputChange}
                required
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Store Logo URL *
            </label>
            <input
              type="url"
              name="storeLogo"
              value={formData.storeLogo}
              onChange={handleInputChange}
              required
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Website URL *
            </label>
            <input
              type="url"
              name="storeWebsite"
              value={formData.storeWebsite}
              onChange={handleInputChange}
              required
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="https://yourstore.com"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Store Description *
            </label>
            <textarea
              name="storeDescription"
              value={formData.storeDescription}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Describe your store and what you offer..."
            />
          </div>

          {/* Discount Offers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Discount Offers</h3>
              <button
                type="button"
                onClick={addOffer}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm transition-colors"
              >
                <FaPlus />
                <span>Add Offer</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.discountOffers.map((offer, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4 relative">
                  <button
                    type="button"
                    onClick={() => removeOffer(index)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                  >
                    <FaTimes />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1">
                        Point Tier
                      </label>
                      <select
                        value={offer.pointTier}
                        onChange={(e) => updateOffer(index, 'pointTier', parseInt(e.target.value))}
                        className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                      >
                        {pointTiers.map(tier => (
                          <option key={tier} value={tier}>{tier} points</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1">
                        Offer Title
                      </label>
                      <input
                        type="text"
                        value={offer.title}
                        onChange={(e) => updateOffer(index, 'title', e.target.value)}
                        className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                        placeholder="e.g., 10% Off"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1">
                        Discount Code
                      </label>
                      <input
                        type="text"
                        value={offer.discountCode}
                        onChange={(e) => updateOffer(index, 'discountCode', e.target.value)}
                        className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                        placeholder="DISCOUNT10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      value={offer.description}
                      onChange={(e) => updateOffer(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
                      placeholder="Describe this offer..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
              <span>{saving ? 'Saving...' : 'Save Store'}</span>
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <FaTimes />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </motion.form>
      )}

      {!partnerStore && !isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-8 text-center"
        >
          <FaStore className="text-6xl text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Create Your Partner Store</h3>
          <p className="text-gray-400 mb-6">
            Set up your partner store to offer discounts to Aquads users in exchange for their points.
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
          >
            <FaPlus />
            <span>Create Store</span>
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default PartnerStoreManager;
