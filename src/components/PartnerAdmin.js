import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaTimes, FaExternalLinkAlt, FaSpinner, FaStore, FaUser, FaCalendar, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const PartnerAdmin = ({ currentUser }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
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


  useEffect(() => {
    fetchPartners();
  }, [statusFilter]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      
      if (statusFilter === 'pending') {
        endpoint = `${process.env.REACT_APP_API_URL}/api/users/admin/pending-partners`;
      } else {
        // For approved/rejected, we'll need to fetch all partners and filter
        endpoint = `${process.env.REACT_APP_API_URL}/api/users/admin/all-partners?status=${statusFilter}`;
      }
      
      const response = await fetch(endpoint, {
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

  const handleApprove = async (partnerId) => {
    setProcessing(prev => ({ ...prev, [partnerId]: 'approving' }));
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/admin/approve-partner/${partnerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve partner');
      }

        alert('Partner approved successfully!');
        fetchPartners(); // Refresh the list
    } catch (error) {
      console.error('Error approving partner:', error);
      alert(error.message);
    } finally {
      setProcessing(prev => ({ ...prev, [partnerId]: null }));
    }
  };

  const handleReject = async (partnerId) => {
    if (!confirm('Are you sure you want to reject this partner application?')) {
      return;
    }

    setProcessing(prev => ({ ...prev, [partnerId]: 'rejecting' }));
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/admin/reject-partner/${partnerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject partner');
      }

      alert('Partner rejected.');
      fetchPartners(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting partner:', error);
      alert(error.message);
    } finally {
      setProcessing(prev => ({ ...prev, [partnerId]: null }));
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

  const resetForm = () => {
    setFormData({
      storeName: '',
      storeDescription: '',
      storeLogo: '',
      storeWebsite: '',
      storeCategory: '',
      discountOffers: []
    });
  };

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Create a new user account for this partner store
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/admin/create-partner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Partner store created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchPartners(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create partner store');
      }
    } catch (error) {
      console.error('Error creating partner store:', error);
      alert('Failed to create partner store');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!partnerToDelete) return;

    setProcessing(prev => ({ ...prev, [partnerToDelete._id]: 'deleting' }));
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/admin/delete-partner/${partnerToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete partner');
      }

      alert('Partner store deleted successfully!');
      setShowDeleteConfirm(false);
      setPartnerToDelete(null);
      fetchPartners(); // Refresh the list
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert(error.message);
    } finally {
      setProcessing(prev => ({ ...prev, [partnerToDelete._id]: null }));
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
          <span>Partner Store Applications</span>
        </h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">
            {partners.length} {statusFilter} applications
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPlus />
            <span>Create Partner</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex space-x-1 bg-gray-700/30 rounded-lg p-1">
        {['pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-600/50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {partners.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-8 text-center"
        >
          <FaStore className="text-6xl text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Applications</h3>
          <p className="text-gray-400">
            {statusFilter === 'pending' 
              ? 'All partner store applications have been processed.'
              : `No ${statusFilter} partner applications found.`
            }
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {partners.map((partner, index) => (
            <motion.div
              key={partner._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gray-800 rounded-xl p-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Store Info */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {partner.partnerStore.storeName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <FaUser />
                          <span>{partner.username}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FaCalendar />
                          <span>Applied {new Date(partner.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                      {partner.partnerStore.storeCategory}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <img
                        src={partner.partnerStore.storeLogo}
                        alt={partner.partnerStore.storeName}
                        className="w-full h-32 object-contain rounded-lg bg-gray-700/30"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/300/128';
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-gray-400 text-sm">Website</div>
                        <a
                          href={partner.partnerStore.storeWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 text-sm"
                        >
                          <span>{partner.partnerStore.storeWebsite}</span>
                          <FaExternalLinkAlt size={10} />
                        </a>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Email</div>
                        <div className="text-white text-sm">{partner.email}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-400 text-sm mb-1">Description</div>
                    <div className="text-white text-sm">{partner.partnerStore.storeDescription}</div>
                  </div>

                  {/* Discount Offers */}
                  {partner.partnerStore.discountOffers?.length > 0 && (
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Discount Offers</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {partner.partnerStore.discountOffers.map((offer, offerIndex) => (
                          <div key={offerIndex} className="bg-gray-700/50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <div className="text-white text-sm font-medium">{offer.title}</div>
                              <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                                {offer.pointTier} pts
                              </div>
                            </div>
                            <div className="text-gray-300 text-xs mb-1">{offer.description}</div>
                            <div className="text-xs text-gray-400">
                              Code: <span className="font-mono bg-gray-800 px-1 rounded">{offer.discountCode}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
                    <div className="text-gray-300 text-sm font-medium mb-3">Actions</div>
                    
                    {statusFilter === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(partner._id)}
                          disabled={processing[partner._id]}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                        >
                          {processing[partner._id] === 'approving' ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaCheck />
                          )}
                          <span>
                            {processing[partner._id] === 'approving' ? 'Approving...' : 'Approve'}
                          </span>
                        </button>

                        <button
                          onClick={() => handleReject(partner._id)}
                          disabled={processing[partner._id]}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                        >
                          {processing[partner._id] === 'rejecting' ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaTimes />
                          )}
                          <span>
                            {processing[partner._id] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                          </span>
                        </button>
                      </>
                    )}

                    {statusFilter === 'approved' && (
                      <a
                        href="/partner-rewards"
                        target="_blank"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                      >
                        <FaExternalLinkAlt />
                        <span>View Live</span>
                      </a>
                    )}

                    <a
                      href={partner.partnerStore.storeWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                    >
                      <FaExternalLinkAlt />
                      <span>Visit Store</span>
                    </a>

                    <button
                      onClick={() => {
                        setPartnerToDelete(partner);
                        setShowDeleteConfirm(true);
                      }}
                      disabled={processing[partner._id]}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                    >
                      {processing[partner._id] === 'deleting' ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaTrash />
                      )}
                      <span>
                        {processing[partner._id] === 'deleting' ? 'Deleting...' : 'Delete Store'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Partner Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <FaPlus />
                <span>Create Partner Store</span>
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-6">
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
                    placeholder="Enter store name"
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
                <p className="text-gray-400 text-xs mt-1">
                  Recommended size: 400x200px (2:1 ratio) for best display
                </p>
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
                  placeholder="https://store.com"
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
                  placeholder="Describe the store and what it offers..."
                />
              </div>

              {/* Discount Offers */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white text-lg font-semibold">Discount Offers</h4>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                  <span>{saving ? 'Creating...' : 'Create Partner'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <FaTimes />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && partnerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <FaTrash className="text-red-400" />
                <span>Delete Partner Store</span>
              </h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPartnerToDelete(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete <strong>{partnerToDelete.partnerStore.storeName}</strong>? This action cannot be undone.
              </p>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm">
                  <strong>Warning:</strong> This will permanently remove the partner store and all associated data from the system.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDeletePartner}
                disabled={processing[partnerToDelete._id]}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                {processing[partnerToDelete._id] === 'deleting' ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaTrash />
                )}
                <span>
                  {processing[partnerToDelete._id] === 'deleting' ? 'Deleting...' : 'Delete Store'}
                </span>
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPartnerToDelete(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <FaTimes />
                <span>Cancel</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PartnerAdmin;