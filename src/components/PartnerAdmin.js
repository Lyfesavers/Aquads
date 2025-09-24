import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';

const PartnerAdmin = ({ currentUser }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, inactive

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/partners/admin/all?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch partners');
      const data = await response.json();
      setPartners(data);
    } catch (error) {
      console.error('Error fetching partners:', error);
      alert('Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartner = async (partnerData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/partners/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(partnerData)
      });

      if (!response.ok) throw new Error('Failed to create partner');
      
      await fetchPartners();
      setShowCreateModal(false);
      alert('Partner created successfully!');
    } catch (error) {
      console.error('Error creating partner:', error);
      alert('Failed to create partner');
    }
  };

  const handleUpdatePartner = async (partnerId, updates) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/partners/admin/${partnerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update partner');
      
      await fetchPartners();
      setEditingPartner(null);
      alert('Partner updated successfully!');
    } catch (error) {
      console.error('Error updating partner:', error);
      alert('Failed to update partner');
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/partners/admin/${partnerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete partner');
      
      await fetchPartners();
      alert('Partner deleted successfully!');
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('Failed to delete partner');
    }
  };

  const togglePartnerStatus = async (partner) => {
    await handleUpdatePartner(partner._id, { isActive: !partner.isActive });
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-red-400 text-center">Admin access required</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Partner Store Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <FaPlus />
          <span>Add Partner</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All Partners ({partners.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Active ({partners.filter(p => p.isActive).length})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'inactive' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Inactive ({partners.filter(p => !p.isActive).length})
        </button>
      </div>

      {/* Partners List */}
      {loading ? (
        <div className="text-white text-center py-8">Loading partners...</div>
      ) : partners.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No partners found</div>
      ) : (
        <div className="grid gap-6">
          {partners.map(partner => (
            <div key={partner._id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.src = '/api/placeholder/64/64';
                      }}
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-white">{partner.name}</h3>
                      <p className="text-gray-400">{partner.category}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          partner.isActive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {partner.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                          <FaExternalLinkAlt size={12} />
                          <span>Visit Website</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{partner.description}</p>
                  
                  {/* Offers */}
                  <div className="mb-4">
                    <h4 className="text-white font-medium mb-2">Discount Offers ({partner.discountOffers?.length || 0})</h4>
                    <div className="grid gap-2">
                      {partner.discountOffers?.map((offer, index) => (
                        <div key={index} className="bg-gray-700 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-white font-medium">{offer.title}</div>
                              <div className="text-gray-400 text-sm">{offer.description}</div>
                              <div className="text-blue-400 text-sm">Code: {offer.discountCode}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-blue-400 font-bold">{offer.pointTier} pts</div>
                              <div className="text-gray-400 text-sm">
                                {offer.currentRedemptions}/{offer.maxRedemptions || '∞'}
                              </div>
                              <div className={`text-xs ${
                                offer.isActive && new Date(offer.expiryDate) > new Date()
                                  ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {offer.isActive && new Date(offer.expiryDate) > new Date() ? 'Active' : 'Inactive'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="text-gray-400 text-sm">
                    Total Redemptions: {partner.totalRedemptions || 0} | 
                    Contact: {partner.contactEmail} | 
                    Created: {new Date(partner.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => togglePartnerStatus(partner)}
                    className={`p-2 rounded-lg transition-colors ${
                      partner.isActive
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    title={partner.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {partner.isActive ? <FaTimes /> : <FaCheck />}
                  </button>
                  <button
                    onClick={() => setEditingPartner(partner)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeletePartner(partner._id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPartner) && (
        <PartnerFormModal
          partner={editingPartner}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPartner(null);
          }}
          onSubmit={(data) => {
            if (editingPartner) {
              handleUpdatePartner(editingPartner._id, data);
            } else {
              handleCreatePartner(data);
            }
          }}
        />
      )}
    </div>
  );
};

// Partner Form Modal Component
const PartnerFormModal = ({ partner, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: partner?.name || '',
    description: partner?.description || '',
    logo: partner?.logo || '',
    website: partner?.website || '',
    category: partner?.category || 'Other',
    contactEmail: partner?.contactEmail || '',
    discountOffers: partner?.discountOffers || []
  });

  const categories = [
    // Crypto & Web3
    'DeFi & Crypto',
    'NFT & Gaming',
    'Web3 Services',
    'Crypto Hardware',
    
    // Essential Categories
    'Food & Beverage',
    'Clothing & Fashion',
    'Books & Education',
    'Technology & Software',
    
    // Lifestyle & Services
    'Health & Fitness',
    'Travel & Tourism',
    'Entertainment & Media',
    'Home & Garden',
    
    // Professional Services
    'Business Services',
    'Financial Services',
    'Marketing & Design',
    'Development & IT',
    
    // Retail
    'Electronics & Gadgets',
    'Sports & Outdoors',
    'Beauty & Personal Care',
    'Automotive',
    
    // Other
    'Subscriptions & SaaS',
    'Gift Cards & Vouchers',
    'Other'
  ];

  const pointTiers = [2000, 4000, 6000, 8000, 10000];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addOffer = () => {
    setFormData({
      ...formData,
      discountOffers: [
        ...formData.discountOffers,
        {
          pointTier: 2000,
          title: '',
          description: '',
          discountCode: '',
          terms: 'Standard terms and conditions apply',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
          usageType: 'multi-use',
          maxRedemptions: null,
          isActive: true
        }
      ]
    });
  };

  const updateOffer = (index, field, value) => {
    const updatedOffers = [...formData.discountOffers];
    updatedOffers[index] = { ...updatedOffers[index], [field]: value };
    setFormData({ ...formData, discountOffers: updatedOffers });
  };

  const removeOffer = (index) => {
    const updatedOffers = formData.discountOffers.filter((_, i) => i !== index);
    setFormData({ ...formData, discountOffers: updatedOffers });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-6">
            {partner ? 'Edit Partner' : 'Create New Partner'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2">Partner Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Description *</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2">Logo URL *</label>
                <input
                  type="url"
                  required
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Website URL *</label>
                <input
                  type="url"
                  required
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Contact Email *</label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Discount Offers */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-white">Discount Offers</h4>
                <button
                  type="button"
                  onClick={addOffer}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <FaPlus />
                  <span>Add Offer</span>
                </button>
              </div>

              {formData.discountOffers.map((offer, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-white font-medium">Offer #{index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeOffer(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Point Tier *</label>
                      <select
                        required
                        value={offer.pointTier}
                        onChange={(e) => updateOffer(index, 'pointTier', parseInt(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                      >
                        {pointTiers.map(tier => (
                          <option key={tier} value={tier}>{tier.toLocaleString()} points</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Discount Code *</label>
                      <input
                        type="text"
                        required
                        value={offer.discountCode}
                        onChange={(e) => updateOffer(index, 'discountCode', e.target.value.toUpperCase())}
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                        placeholder="AQUADS15"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-gray-300 mb-2">Offer Title *</label>
                    <input
                      type="text"
                      required
                      value={offer.title}
                      onChange={(e) => updateOffer(index, 'title', e.target.value)}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                      placeholder="15% off entire order"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-gray-300 mb-2">Description *</label>
                    <input
                      type="text"
                      required
                      value={offer.description}
                      onChange={(e) => updateOffer(index, 'description', e.target.value)}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                      placeholder="Valid on all menu items"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Expiry Date *</label>
                      <input
                        type="date"
                        required
                        value={offer.expiryDate}
                        onChange={(e) => updateOffer(index, 'expiryDate', e.target.value)}
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Usage Type *</label>
                      <select
                        required
                        value={offer.usageType}
                        onChange={(e) => updateOffer(index, 'usageType', e.target.value)}
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                      >
                        <option value="multi-use">Multi-use</option>
                        <option value="single-use">Single-use</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-gray-300 mb-2">Terms & Conditions</label>
                    <input
                      type="text"
                      value={offer.terms}
                      onChange={(e) => updateOffer(index, 'terms', e.target.value)}
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                      placeholder="Cannot combine with other offers"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-6 border-t border-gray-600">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
              >
                {partner ? 'Update Partner' : 'Create Partner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PartnerAdmin;
