import React, { useState, useEffect } from 'react';
import { fetchBumpRequests, API_URL } from '../services/api';
import BookingManagement from './BookingManagement';
import ServiceReviews from './ServiceReviews';
import JobList from './JobList';
import BookingConversation from './BookingConversation';
import BumpStore from './BumpStore';

const Dashboard = ({ ads, currentUser, onClose, onDeleteAd, onBumpAd, onEditAd, onRejectBump, onApproveBump, initialBookingId }) => {
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
  const [pendingRedemptions, setPendingRedemptions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('analytics');
  const [showReviews, setShowReviews] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [affiliateEarnings, setAffiliateEarnings] = useState(null);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [premiumRequests, setPremiumRequests] = useState([]);
  const [userJobs, setUserJobs] = useState([]);
  const [vipUsername, setVipUsername] = useState('');
  const [activeBookingConversation, setActiveBookingConversation] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [selectedAdForBump, setSelectedAdForBump] = useState(null);
  const [showBumpStoreModal, setShowBumpStoreModal] = useState(false);
  const [pendingTwitterRaids, setPendingTwitterRaids] = useState([]);
  const [loadingTwitterRaids, setLoadingTwitterRaids] = useState(false);
  const [twitterRaidRejectionReason, setTwitterRaidRejectionReason] = useState('');
  const [showTwitterRaidRejectModal, setShowTwitterRaidRejectModal] = useState(false);
  const [selectedTwitterRaid, setSelectedTwitterRaid] = useState(null);

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
      fetchBannerAds();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.token) {
      fetchAffiliateInfo();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetch(`${process.env.REACT_APP_API_URL}/api/points/redemptions/pending`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      })
        .then(response => {
          if (!response.ok) {
            if (response.status === 403) {
              throw new Error('Not authorized to view redemptions');
            }
            throw new Error('Failed to fetch redemptions');
          }
          return response.json();
        })
        .then(data => {
          console.log('Fetched pending redemptions:', data);
          // Ensure we always set an array
          setPendingRedemptions(Array.isArray(data) ? data : []);
        })
        .catch(error => {
          console.error('Error fetching pending redemptions:', error);
          setPendingRedemptions([]); // Set empty array on error
        });
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.token) {
      // Fetch affiliate earnings summary
      fetch(`${process.env.REACT_APP_API_URL}/api/affiliates/summary`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      })
        .then(response => response.json())
        .then(data => {
          setEarningsSummary(data);
        })
        .catch(error => {
          console.error('Error fetching earnings summary:', error);
        });

      // Fetch detailed earnings
      fetch(`${process.env.REACT_APP_API_URL}/api/affiliates/earnings`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      })
        .then(response => response.json())
        .then(data => {
          setAffiliateEarnings(data);
        })
        .catch(error => {
          console.error('Error fetching affiliate earnings:', error);
        });
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ... existing fetch calls ...

        // Fetch premium requests if user is admin
        if (currentUser?.isAdmin) {
          const response = await fetch(`${API_URL}/services/premium-requests`, {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setPremiumRequests(data);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, [currentUser]);

  useEffect(() => {
    const fetchUserJobs = async () => {
      try {
        const response = await fetch(`${API_URL}/jobs?owner=${currentUser.userId}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });
        if (response.ok) {
          const jobs = await response.json();
          setUserJobs(jobs);
        }
      } catch (error) {
        console.error('Error fetching user jobs:', error);
      }
    };

    if (currentUser?.userId) {
      fetchUserJobs();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchPendingTwitterRaids();
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

  const fetchBannerAds = async () => {
    try {
      const response = await fetch(`${API_URL}/bannerAds`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch banner ads');
      const data = await response.json();
      setBannerAds(data);
    } catch (error) {
      console.error('Error fetching banner ads:', error);
    }
  };

  const handleApproveBanner = async (bannerId) => {
    try {
      const response = await fetch(`${API_URL}/bannerAds/${bannerId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to approve banner');
      fetchBannerAds();
    } catch (error) {
      console.error('Error approving banner:', error);
    }
  };

  const handleRejectBanner = async (bannerId, reason) => {
    try {
      const response = await fetch(`${API_URL}/bannerAds/${bannerId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error('Failed to reject banner');
      fetchBannerAds();
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

  const handleProcessRedemption = async (userId, status) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/points/redemptions/${userId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to process redemption');
      }

      // Remove the processed redemption from the list
      setPendingRedemptions(prev => 
        prev.filter(user => user._id !== userId)
      );
    } catch (error) {
      console.error('Error processing redemption:', error);
      alert('Failed to process redemption');
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bookings/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleBookingStatusUpdate = async (bookingId, status) => {
    try {
      const token = JSON.parse(localStorage.getItem('currentUser'))?.token;
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update booking status');
      }

      const updatedBooking = await response.json();
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking._id === updatedBooking._id ? updatedBooking : booking
        )
      );
      
      return updatedBooking;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  };

  const handleShowReviews = (service) => {
    setSelectedService(service);
    setShowReviews(true);
  };

  const handleCloseReviews = () => {
    setShowReviews(false);
    setSelectedService(null);
  };

  const renderAffiliateEarnings = () => {
    if (!earningsSummary) return null;

    return (
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h3 className="text-xl font-semibold mb-4">Affiliate Earnings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <p className="text-gray-400">Total Ad Revenue</p>
            <p className="text-2xl font-bold">{earningsSummary.totalAdRevenue.toFixed(2)} USDC</p>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <p className="text-gray-400">Total Earned</p>
            <p className="text-2xl font-bold">{earningsSummary.totalEarned.toFixed(2)} USDC</p>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <p className="text-gray-400">Pending Amount</p>
            <p className="text-2xl font-bold">{earningsSummary.pendingAmount.toFixed(2)} USDC</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-gray-400">Current Commission Rate: {(earningsSummary.currentRate * 100).toFixed(0)}%</p>
          {earningsSummary.nextTier && (
            <div className="mt-2">
              <p className="text-gray-400">
                Next Tier: {(earningsSummary.nextTier.rate * 100).toFixed(0)}% at {earningsSummary.nextTier.amountNeeded.toLocaleString()} USDC
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min((earningsSummary.totalAdRevenue / earningsSummary.nextTier.amountNeeded) * 100, 100)}%`
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {earningsSummary.totalAdRevenue.toLocaleString()} / {earningsSummary.nextTier.amountNeeded.toLocaleString()} USDC
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleApprovePremium = async (serviceId) => {
    try {
      const response = await fetch(`${API_URL}/services/${serviceId}/premium-approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to approve premium status');

      setPremiumRequests(prev => prev.filter(req => req._id !== serviceId));
      showNotification('Premium status approved successfully');
    } catch (error) {
      console.error('Error approving premium status:', error);
      showNotification('Failed to approve premium status', 'error');
    }
  };

  const handleEditJob = async (jobData) => {
    try {
      const response = await fetch(`${API_URL}/jobs/${jobData._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(jobData)
      });

      if (response.ok) {
        const updatedJob = await response.json();
        setUserJobs(prev => prev.map(job => 
          job._id === updatedJob._id ? updatedJob : job
        ));
        showNotification('Job updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      showNotification('Failed to update job', 'error');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (response.ok) {
        setUserJobs(prev => prev.filter(job => job._id !== jobId));
        showNotification('Job deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      showNotification('Failed to delete job', 'error');
    }
  };

  const handleVipAffiliateToggle = async (username) => {
    try {
      // Add authorization header to the first request
      const response = await fetch(`${API_URL}/users/by-username/${username}`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        alert('User not found or unauthorized');
        return;
      }

      const user = await response.json();
      
      if (!user._id) {
        alert('User not found');
        return;
      }

      const toggleResponse = await fetch(`${API_URL}/affiliates/vip/${user._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!toggleResponse.ok) {
        throw new Error('Failed to update VIP status');
      }

      const result = await toggleResponse.json();
      alert(result.message);
      setVipUsername('');
    } catch (error) {
      console.error('Error managing VIP affiliate:', error);
      alert('Failed to update VIP status: ' + error.message);
    }
  };

  const handleOpenConversation = (booking) => {
    setActiveBookingConversation(booking);
  };

  const handleCloseConversation = () => {
    setActiveBookingConversation(null);
  };

  // Add a notification helper
  const showNotification = (message, type = 'info') => {
    // If there's a parent notification handler, use it
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      // Fallback to a simple alert
      console.log(`${type}: ${message}`);
      alert(message);
    }
  };

  // Effect to handle initialBookingId prop when component mounts
  useEffect(() => {
    const loadInitialBooking = async () => {
      if (initialBookingId && currentUser) {
        console.log('Dashboard received initialBookingId:', initialBookingId);
        
        // First try to find the booking in already loaded bookings
        if (bookings && bookings.length > 0) {
          const bookingToOpen = bookings.find(b => b._id === initialBookingId);
          if (bookingToOpen) {
            console.log('Found booking in existing bookings:', bookingToOpen);
            setActiveBookingConversation(bookingToOpen);
            setActiveTab('bookings');
            return;
          }
        }
        
        // If not found or not loaded yet, fetch the specific booking
        try {
          console.log('Fetching specific booking:', initialBookingId);
          const response = await fetch(`${API_URL}/bookings/${initialBookingId}`, {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          });
          
          if (response.ok) {
            const bookingData = await response.json();
            console.log('Fetched booking data:', bookingData);
            setActiveBookingConversation(bookingData);
            setActiveTab('bookings');
          } else {
            console.error('Failed to fetch specific booking:', response.status);
          }
        } catch (error) {
          console.error('Error fetching specific booking:', error);
        }
      }
    };
    
    loadInitialBooking();
  }, [initialBookingId, currentUser, bookings, API_URL]);

  // New function to handle the bump button click
  const handleBumpClick = (adId) => {
    setSelectedAdForBump(ads.find(ad => ad.id === adId));
    setShowBumpStoreModal(true);
  };
  
  // New function to handle bump submission from BumpStore
  const handleSubmitBump = (adId, txSignature, duration) => {
    onBumpAd(adId, txSignature, duration); 
    setShowBumpStoreModal(false);
    setSelectedAdForBump(null);
  };
  
  // New function to close the bump store
  const handleCloseBumpStore = () => {
    setShowBumpStoreModal(false);
    setSelectedAdForBump(null);
  };

  // Add this function to fetch pending Twitter raids
  const fetchPendingTwitterRaids = async () => {
    setLoadingTwitterRaids(true);
    try {
      const response = await fetch(`${API_URL}/twitter-raids`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Twitter raids');
      }
      
      const raids = await response.json();
      // Filter to only get the paid raids with pending payment status
      const pendingRaids = raids.filter(raid => raid.isPaid && raid.paymentStatus === 'pending');
      setPendingTwitterRaids(pendingRaids);
    } catch (error) {
      console.error('Error fetching pending Twitter raids:', error);
    } finally {
      setLoadingTwitterRaids(false);
    }
  };

  // Add these functions to handle Twitter raid approvals and rejections
  const handleApproveTwitterRaid = async (raidId) => {
    try {
      const response = await fetch(`${API_URL}/twitter-raids/${raidId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve Twitter raid');
      }
      
      // Refresh the list of pending raids
      fetchPendingTwitterRaids();
      alert('Twitter raid approved successfully!');
    } catch (error) {
      console.error('Error approving Twitter raid:', error);
      alert('Error approving Twitter raid: ' + error.message);
    }
  };

  const handleRejectTwitterRaidClick = (raid) => {
    setSelectedTwitterRaid(raid);
    setTwitterRaidRejectionReason('');
    setShowTwitterRaidRejectModal(true);
  };

  const handleRejectTwitterRaid = async () => {
    try {
      if (!selectedTwitterRaid) return;
      
      const response = await fetch(`${API_URL}/twitter-raids/${selectedTwitterRaid._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ rejectionReason: twitterRaidRejectionReason })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject Twitter raid');
      }
      
      // Refresh the list of pending raids
      fetchPendingTwitterRaids();
      setShowTwitterRaidRejectModal(false);
      alert('Twitter raid rejected successfully!');
    } catch (error) {
      console.error('Error rejecting Twitter raid:', error);
      alert('Error rejecting Twitter raid: ' + error.message);
    }
  };

  // Add a new function to render the Twitter Raids tab content
  const renderTwitterRaidsTab = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Twitter Raids Pending Approval</h3>
        
        {loadingTwitterRaids ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading pending Twitter raids...</p>
          </div>
        ) : pendingTwitterRaids.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No pending Twitter raids to approve.</p>
        ) : (
          <div className="space-y-4">
            {pendingTwitterRaids.map(raid => (
              <div key={raid._id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h4 className="font-medium text-white">{raid.title}</h4>
                    <p className="text-sm text-gray-400">
                      Created by: {raid.createdBy?.username || "Unknown"}
                    </p>
                    <p className="text-sm text-gray-400">
                      Created at: {new Date(raid.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-400">Transaction ID: </span>
                      <span className="text-blue-400 font-mono">{raid.txSignature}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-400">Payment Chain: </span>
                      <span className="text-green-400">{raid.paymentChain || "Unknown"}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Tweet URL: <a href={raid.tweetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{raid.tweetUrl}</a>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveTwitterRaid(raid._id)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectTwitterRaidClick(raid)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Modal for rejecting Twitter raids */}
        {showTwitterRaidRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Reject Twitter Raid</h3>
              <p className="mb-4 text-gray-300">
                Are you sure you want to reject this Twitter raid? This action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Rejection Reason:
                </label>
                <textarea
                  value={twitterRaidRejectionReason}
                  onChange={(e) => setTwitterRaidRejectionReason(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white"
                  rows="3"
                  placeholder="Enter reason for rejection (optional)"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowTwitterRaidRejectModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectTwitterRaid}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Reject Raid
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-[999999] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg z-10 p-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <button 
            onClick={onClose}
            className="bg-red-500/80 hover:bg-red-600/80 px-4 py-2 rounded shadow-lg"
          >
            Close
          </button>
        </div>
      </div>

      {/* Content - reuse existing dashboard content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex border-b border-gray-700 mb-6 sticky top-0 bg-gray-800 z-10">
          <button
            className={`px-4 py-2 ${activeTab === 'ads' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('ads')}
          >
            Ads
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'bookings' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('bookings')}
          >
            Bookings
          </button>
          {currentUser.isAdmin && (
            <button
              className={`px-4 py-2 ${activeTab === 'admin' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin
            </button>
          )}
          {currentUser.isAdmin && (
            <button
              className={`px-4 py-2 ${activeTab === 'premium' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('premium')}
            >
              Premium Requests
            </button>
          )}
          {currentUser.isAdmin && (
            <button
              className={`px-4 py-2 ${activeTab === 'twitterRaids' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('twitterRaids')}
            >
              Twitter Raids
            </button>
          )}
        </div>

        <div className="overflow-y-auto">
          {activeTab === 'ads' && (
            <div className="space-y-6">
              {renderAffiliateEarnings()}

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
                      <p 
                        className="text-blue-400 font-mono font-bold cursor-pointer hover:underline"
                        onClick={() => {
                          const referralUrl = `${window.location.origin}/?ref=${currentUser?.username}`;
                          navigator.clipboard.writeText(referralUrl).then(() => {
                            showNotification('Referral link copied to clipboard!', 'success');
                          }).catch(err => {
                            console.error('Failed to copy:', err);
                            showNotification('Failed to copy referral link', 'error');
                          });
                        }}
                        title="Click to copy referral link"
                      >
                        {currentUser?.username}
                      </p>
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
                      <p>• Earn 50 points for completing social media raids</p>
                      <p>• Earn 100 points for each new affiliate</p>
                      <p>• Earn 200 points for each game vote in the gamehub</p>
                      <p>• Earn 200 points when your affiliates list a freelancer service or bubble ad</p>
                      <p>• Earn 500 points when your affiliates write a review</p>
                      <p>• Earn 1000 points when you sing up with a referral link</p>
                      <p>• Redeem 10,000 points for a $100 gift card(Canadian Dollars)</p>
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
                    {bannerAds.filter(banner => banner.status !== 'rejected').map(banner => (
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
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (reason) handleRejectBanner(banner._id, reason);
                                }}
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

                  {/* Add this section after the Banner Ad Management section */}
                  {currentUser?.isAdmin && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-white mb-4">Pending Gift Card Redemptions</h3>
                      {!Array.isArray(pendingRedemptions) ? (
                        <p className="text-gray-400 text-center py-4">Error loading redemptions. Please try again.</p>
                      ) : pendingRedemptions.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No pending gift card redemptions.</p>
                      ) : (
                        <div className="space-y-4">
                          {pendingRedemptions.map(user => (
                            <div key={user._id} className="bg-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-white font-semibold">{user.username}</h4>
                                  {Array.isArray(user.giftCardRedemptions) && user.giftCardRedemptions.map((redemption, index) => (
                                    redemption.status === 'pending' && (
                                      <div key={index} className="text-gray-400 text-sm">
                                        <p>Amount: ${redemption.amount}</p>
                                        <p>Requested: {new Date(redemption.requestedAt).toLocaleString()}</p>
                                      </div>
                                    )
                                  ))}
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleProcessRedemption(user._id, 'approved')}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleProcessRedemption(user._id, 'rejected')}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Reject Modal */}
              {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999]">
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
                              onClick={() => handleBumpClick(ad.id)}
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
          )}

          {activeTab === 'bookings' && (
            activeBookingConversation ? (
              <BookingConversation 
                booking={activeBookingConversation} 
                currentUser={currentUser} 
                onClose={handleCloseConversation}
                showNotification={showNotification}
              />
            ) : (
              <BookingManagement
                bookings={bookings}
                currentUser={currentUser}
                onStatusUpdate={handleBookingStatusUpdate}
                showNotification={(message, type) => {
                  console.log(message); // Temporary fallback
                  alert(message);
                }}
                onShowReviews={handleShowReviews}
                onOpenConversation={handleOpenConversation}
              />
            )
          )}

          {activeTab === 'admin' && currentUser.isAdmin && (
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
                {bannerAds.filter(banner => banner.status !== 'rejected').map(banner => (
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
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) handleRejectBanner(banner._id, reason);
                            }}
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

              {/* Add this section after the Banner Ad Management section */}
              {currentUser?.isAdmin && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Pending Gift Card Redemptions</h3>
                  {!Array.isArray(pendingRedemptions) ? (
                    <p className="text-gray-400 text-center py-4">Error loading redemptions. Please try again.</p>
                  ) : pendingRedemptions.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No pending gift card redemptions.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingRedemptions.map(user => (
                        <div key={user._id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-semibold">{user.username}</h4>
                              {Array.isArray(user.giftCardRedemptions) && user.giftCardRedemptions.map((redemption, index) => (
                                redemption.status === 'pending' && (
                                  <div key={index} className="text-gray-400 text-sm">
                                    <p>Amount: ${redemption.amount}</p>
                                    <p>Requested: {new Date(redemption.requestedAt).toLocaleString()}</p>
                                  </div>
                                )
                              ))}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleProcessRedemption(user._id, 'approved')}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleProcessRedemption(user._id, 'rejected')}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'premium' && currentUser?.isAdmin && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Premium Service Requests</h3>
              {premiumRequests.length === 0 ? (
                <p className="text-gray-400">No pending premium requests</p>
              ) : (
                premiumRequests.map(request => (
                  <div key={request._id} className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{request.title}</h4>
                        <p className="text-sm text-gray-400">
                          Seller: {request.seller?.username}
                        </p>
                        <p className="text-sm text-gray-400">
                          Payment ID: {request.premiumPaymentId}
                        </p>
                        <p className="text-sm text-gray-400">
                          Requested: {new Date(request.premiumRequestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprovePremium(request._id)}
                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Add the Twitter Raids tab content */}
          {activeTab === 'twitterRaids' && currentUser?.isAdmin && renderTwitterRaidsTab()}

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">My Job Postings</h3>
            <JobList
              jobs={userJobs}
              currentUser={currentUser}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
            />
          </div>

          {currentUser?.isAdmin && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <h3 className="text-xl font-semibold mb-4">Manage VIP Affiliates</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vipUsername}
                  onChange={(e) => setVipUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-gray-700 px-3 py-2 rounded"
                />
                <button
                  onClick={() => handleVipAffiliateToggle(vipUsername)}
                  className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
                >
                  Toggle VIP Status
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReviews && selectedService && (
        <ServiceReviews
          service={selectedService}
          onClose={handleCloseReviews}
          currentUser={currentUser}
          showNotification={(message, type) => {
            console.log(message); // Temporary fallback
            alert(message);
          }}
        />
      )}

      {selectedAdForBump && showBumpStoreModal && (
        <BumpStore
          ad={selectedAdForBump}
          onSubmitPayment={handleSubmitBump}
          onClose={handleCloseBumpStore}
        />
      )}
    </div>
  );
};

export default Dashboard; 