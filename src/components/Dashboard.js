import React, { useState, useEffect } from 'react';
import { fetchBumpRequests, API_URL } from '../services/api';

const Dashboard = ({ ads, currentUser, onClose, onDeleteAd, onBumpAd, onEditAd, onRejectBump, onApproveBump }) => {
  const [bumpRequests, setBumpRequests] = useState([]);
  const [bannerAds, setBannerAds] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBumpRequest, setSelectedBumpRequest] = useState(null);
  const [selectedAd, setSelectedAd] = useState(null);
  const [showBumpStore, setShowBumpStore] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [affiliateInfo, setAffiliateInfo] = useState(null);
  const [pointsInfo, setPointsInfo] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(true);

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

  useEffect(() => {
    if (currentUser?.token) {
      fetchAffiliateInfo();
    }
  }, [currentUser]);

  const fetchAffiliateInfo = async () => {
    try {
      const [affiliateResponse, pointsResponse] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/users/affiliates`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/api/points/my-points`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        })
      ]);

      if (affiliateResponse.ok) {
        const data = await affiliateResponse.json();
        setAffiliateInfo(data);
      }

      if (pointsResponse.ok) {
        const data = await pointsResponse.json();
        setPointsInfo(data);
      }
    } catch (error) {
      console.error('Error fetching affiliate info:', error);
    } finally {
      setIsLoadingAffiliates(false);
    }
  };

  const handleRedeemPoints = async () => {
    try {
      setIsRedeeming(true);
      setRedeemError('');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/points/redeem`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem points');
      }

      // Refresh points info after redemption
      fetchAffiliateInfo();
      alert('Redemption request submitted successfully! Our team will process your request soon.');
    } catch (error) {
      setRedeemError(error.message);
    } finally {
      setIsRedeeming(false);
    }
  };

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
      // Log the current user object to see what fields are available
      console.log('Current user object:', currentUser);

      // Get the correct user ID field
      const userId = currentUser?.userId || currentUser?.id || currentUser?._id;
      
      if (!userId) {
        console.error('No user ID found in currentUser object:', currentUser);
        throw new Error('User ID not found');
      }

      const data = {
        _id: bannerId,
        processedBy: userId
      };
      
      console.log('Sending approval request:', data);

      const response = await fetch(`${API_URL}/bannerAds/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to approve banner');
      }

      // Refresh banner ads list
      const bannersResponse = await fetch(`${API_URL}/bannerAds`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const updatedBanners = await bannersResponse.json();
      setBannerAds(updatedBanners);
    } catch (error) {
      console.error('Error approving banner:', error);
    }
  };

  const handleRejectBanner = async (bannerId) => {
    try {
      // Log the current user object to see what fields are available
      console.log('Current user object:', currentUser);

      // Get the correct user ID field
      const userId = currentUser?.userId || currentUser?.id || currentUser?._id;
      
      if (!userId) {
        console.error('No user ID found in currentUser object:', currentUser);
        throw new Error('User ID not found');
      }

      const data = {
        _id: bannerId,
        processedBy: userId
      };
      
      console.log('Sending rejection request:', data);

      const response = await fetch(`${API_URL}/bannerAds/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to reject banner');
      }

      // Refresh banner ads list
      const bannersResponse = await fetch(`${API_URL}/bannerAds`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const updatedBanners = await bannersResponse.json();
      setBannerAds(updatedBanners);
    } catch (error) {
      console.error('Error rejecting banner:', error);
    }
  };

  // Add handleDeleteBanner function
  const handleDeleteBanner = async (bannerId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this banner ad?')) {
        return;
      }

      const response = await fetch(`${API_URL}/api/bannerAds/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Failed to delete banner');
      }

      // Update the local state to remove the deleted banner
      setBannerAds(prevBanners => prevBanners.filter(banner => banner._id !== bannerId));
      alert('Banner deleted successfully');

      // Refresh the banner list
      const bannersResponse = await fetch(`${API_URL}/bannerAds`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const updatedBanners = await bannersResponse.json();
      setBannerAds(updatedBanners);
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert(error.message || 'Failed to delete banner ad. Please try again.');
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
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 overflow-y-auto z-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Affiliate Section */}
          <div className="bg-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-400">Affiliate Program</h3>
            
            {/* Existing Affiliate Info */}
            {affiliateInfo && (
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-gray-300">Total Affiliates: 
                    <span className="text-blue-400 font-bold ml-2">
                      {isLoadingAffiliates ? '...' : affiliateInfo.affiliateCount}
                    </span>
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Share your referral code to earn more affiliates!
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-300">Your Referral Code:</p>
                  <p className="text-blue-400 font-mono font-bold">{currentUser?.username}</p>
                </div>
              </div>
            )}
            
            {/* Points Display */}
            {pointsInfo && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-white">Your Points</h4>
                    <p className="text-3xl font-bold text-blue-400">{pointsInfo.points}</p>
                  </div>
                  {pointsInfo.points >= 10000 && (
                    <button
                      onClick={handleRedeemPoints}
                      disabled={isRedeeming}
                      className={`px-4 py-2 rounded ${
                        isRedeeming 
                          ? 'bg-gray-500 cursor-not-allowed' 
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {isRedeeming ? 'Processing...' : 'Redeem $100 Gift Card'}
                    </button>
                  )}
                </div>
                {redeemError && (
                  <p className="text-red-500 text-sm mt-2">{redeemError}</p>
                )}
                
                {/* Points Rules */}
                <div className="text-sm text-gray-400 mt-4">
                  <h4 className="text-lg font-medium text-white mb-2">Points Earning Rules</h4>
                  <p>• Earn 100 points for each new affiliate</p>
                  <p>• Earn 200 points when your affiliates list a service or ad</p>
                  <p>• Redeem 10,000 points for a $100 gift card</p>
                </div>
                
                {/* Redemption History */}
                {pointsInfo.giftCardRedemptions?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium text-white mb-2">Redemption History</h4>
                    <div className="space-y-2">
                      {pointsInfo.giftCardRedemptions.map((redemption, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                          <span className="text-gray-300">${redemption.amount} Gift Card</span>
                          <span className={`px-2 py-1 rounded text-sm ${
                            redemption.status === 'approved' ? 'bg-green-500' :
                            redemption.status === 'rejected' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`}>
                            {redemption.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                        {/* Add delete button for expired banners */}
                        {currentUser?.isAdmin && banner.status === 'active' && (
                          <div className="mt-2">
                            <button
                              onClick={() => handleDeleteBanner(banner._id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                            >
                              Delete Banner
                            </button>
                          </div>
                        )}
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
    </div>
  );
};

export default Dashboard; 