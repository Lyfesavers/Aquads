import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaTimes, FaExternalLinkAlt, FaSpinner, FaStore, FaUser, FaCalendar } from 'react-icons/fa';

const PartnerAdmin = ({ currentUser }) => {
  const [pendingPartners, setPendingPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    fetchPendingPartners();
  }, []);

  const fetchPendingPartners = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/admin/pending-partners`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch pending partners');
      const data = await response.json();
      setPendingPartners(data);
    } catch (error) {
      console.error('Error fetching pending partners:', error);
      alert('Failed to fetch pending partners');
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
      fetchPendingPartners(); // Refresh the list
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
      fetchPendingPartners(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting partner:', error);
      alert(error.message);
    } finally {
      setProcessing(prev => ({ ...prev, [partnerId]: null }));
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
        <div className="text-sm text-gray-400">
          {pendingPartners.length} pending applications
        </div>
      </div>

      {pendingPartners.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-8 text-center"
        >
          <FaStore className="text-6xl text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Pending Applications</h3>
          <p className="text-gray-400">
            All partner store applications have been processed.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {pendingPartners.map((partner, index) => (
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
                        className="w-full h-32 object-cover rounded-lg"
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

                    <a
                      href={partner.partnerStore.storeWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                    >
                      <FaExternalLinkAlt />
                      <span>Visit Store</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnerAdmin;