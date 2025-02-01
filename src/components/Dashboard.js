import React, { useState, useEffect } from 'react';
import { fetchBumpRequests, API_URL } from '../services/api';

const Dashboard = ({ ads, currentUser, onClose, onDeleteAd, onBumpAd, onEditAd, onRejectBump, onApproveBump }) => {
  const [bumpRequests, setBumpRequests] = useState([]);
  const [bannerAds, setBannerAds] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBumpRequest, setSelectedBumpRequest] = useState(null);

  // Fetch bump requests and banner ads when dashboard opens
  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchBumpRequests()
        .then(data => {
          console.log('Fetched bump requests:', data);
          setBumpRequests(data);
        })
        .catch(error => {
          console.error('Error fetching bump requests:', error);
        });

      // Fetch banner ads
      fetch(`${API_URL}/bannerAds`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      })
        .then(response => response.json())
        .then(data => {
          console.log('Fetched banner ads:', data);
          setBannerAds(data);
        })
        .catch(error => {
          console.error('Error fetching banner ads:', error);
        });
    }
  }, [currentUser]);

  const handleReject = (ad) => {
    setSelectedBumpRequest(ad);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (selectedBumpRequest) {
      onRejectBump(selectedBumpRequest.id, rejectReason);
      // Remove the bump request from local state
      setBumpRequests(prev => prev.filter(req => req.adId !== selectedBumpRequest.id));
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedBumpRequest(null);
    }
  };

  const handleApprove = (ad) => {
    onApproveBump(ad.id);
    // Remove the bump request from local state
    setBumpRequests(prev => prev.filter(req => req.adId !== ad.id));
  };

  // Add banner management functions
  const handleApproveBanner = async (bannerId) => {
    try {
      const response = await fetch(`${API_URL}/bannerAds/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          bannerId,
          processedBy: currentUser._id
        })
      });

      if (!response.ok) throw new Error('Failed to approve banner');

      // Update local state
      setBannerAds(prev => prev.map(banner => 
        banner._id === bannerId 
          ? { ...banner, status: 'active' }
          : banner
      ));
    } catch (error) {
      console.error('Error approving banner:', error);
    }
  };

  const handleRejectBanner = async (bannerId) => {
    try {
      const response = await fetch(`${API_URL}/bannerAds/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          bannerId,
          processedBy: currentUser._id
        })
      });

      if (!response.ok) throw new Error('Failed to reject banner');

      // Update local state
      setBannerAds(prev => prev.map(banner => 
        banner._id === bannerId 
          ? { ...banner, status: 'expired' }
          : banner
      ));
    } catch (error) {
      console.error('Error rejecting banner:', error);
    }
  };

  // Separate pending bump ads for admin
  const pendingBumpAds = currentUser?.isAdmin 
    ? bumpRequests.map(request => {
        const ad = ads.find(ad => ad.id === request.adId);
        return ad ? { ...ad, bumpRequest: request } : null;
      }).filter(Boolean)
    : [];
  const userAds = currentUser?.isAdmin ? ads : ads.filter(ad => ad.owner === currentUser?.username);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {currentUser?.isAdmin ? 'Admin Dashboard' : 'Your Ads'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Pending Bump Approvals (Admin Only) */}
        {currentUser?.isAdmin && (
          <>
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Pending Bump Approvals</h3>
              {pendingBumpAds.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No pending bump approvals.</p>
              ) : (
                <div className="space-y-4">
                  {pendingBumpAds.map(ad => (
                    <div
                      key={ad.id}
                      className="bg-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img
                            src={ad.logo}
                            alt={ad.title}
                            className="w-12 h-12 object-contain rounded"
                          />
                          <div>
                            <h4 className="text-white font-semibold">{ad.title}</h4>
                            <p className="text-gray-400 text-sm">Owner: {ad.owner}</p>
                            <p className="text-gray-400 text-sm">Requested: {new Date(ad.bumpRequest.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <a
                            href={`https://solscan.io/tx/${ad.bumpRequest.txSignature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm mb-2"
                          >
                            View Transaction
                          </a>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprove(ad)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(ad)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Banner Ad Management Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Banner Ad Management</h3>
              {bannerAds.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No banner ads found.</p>
              ) : (
                <div className="space-y-4">
                  {bannerAds.map(banner => (
                    <div key={banner._id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-white font-semibold">{banner.title}</h4>
                          <p className="text-gray-400 text-sm">Status: {banner.status}</p>
                          <p className="text-gray-400 text-sm">Created: {new Date(banner.createdAt).toLocaleString()}</p>
                          <a 
                            href={banner.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            {banner.url}
                          </a>
                        </div>
                        {banner.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveBanner(banner._id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectBanner(banner._id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <img 
                          src={banner.gif} 
                          alt={banner.title}
                          className="max-h-32 rounded object-contain bg-gray-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Reject Bump Request</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection (optional)"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows="3"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedBumpRequest(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User's Ads */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            {currentUser?.isAdmin ? 'All Ads' : 'Your Ads'}
          </h3>
          {userAds.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No ads found.</p>
          ) : (
            <div className="space-y-4">
              {userAds.map(ad => (
                <div
                  key={ad.id}
                  className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={ad.logo}
                      alt={ad.title}
                      className="w-12 h-12 object-contain rounded"
                    />
                    <div>
                      <h3 className="text-white font-semibold">{ad.title}</h3>
                      <p className="text-gray-400 text-sm">{ad.url}</p>
                      {ad.status === 'pending' && (
                        <p className="text-yellow-500 text-sm">Bump Pending</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!ad.status || ad.status !== 'pending' ? (
                      <button
                        onClick={() => onBumpAd(ad.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Bump
                      </button>
                    ) : (
                      <span className="text-yellow-500 px-3 py-1">
                        Bump Pending
                      </span>
                    )}
                    {currentUser?.isAdmin ? (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this ad?')) {
                            onDeleteAd(ad.id);
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => onEditAd(ad)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 