import React, { useState, useEffect } from 'react';
import { fetchBumpRequests, API_URL, fetchPendingAds, approveAd, rejectAd, fetchPendingServices, approveService, rejectService } from '../services/api';
import BookingManagement from './BookingManagement';
import ServiceReviews from './ServiceReviews';
import JobList from './JobList';
import BookingConversation from './BookingConversation';
import BumpStore from './BumpStore';
import EasterEggAnimation from './EasterEggAnimation';
import CreateJobModal from './CreateJobModal';
import TokenBalance from './TokenBalance';
import TokenPurchaseModal from './TokenPurchaseModal';
import AdminDiscountCodes from './AdminDiscountCodes';
import PartnerAdmin from './PartnerAdmin';
import PartnerStoreManager from './PartnerStoreManager';
import MembershipManager from './MembershipManager';
import { socket } from '../services/api';
import logger from '../utils/logger';
import QRCode from 'qrcode';
import { FaQrcode, FaCopy, FaCheck, FaSpinner } from 'react-icons/fa';
import QRCodeCustomizerModal from './QRCodeCustomizerModal';

const Dashboard = ({ ads, currentUser, onClose, onDeleteAd, onBumpAd, onEditAd, onRejectBump, onApproveBump, initialBookingId, initialActiveTab }) => {
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
  const [lastSocketPointsUpdate, setLastSocketPointsUpdate] = useState(null);
  const [membershipInfo, setMembershipInfo] = useState(null);

  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');

  const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(true);
  const [isLoadingMembership, setIsLoadingMembership] = useState(true);
  const [pendingRedemptions, setPendingRedemptions] = useState([]);

  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState(initialActiveTab || 'ads');
  const [showReviews, setShowReviews] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedViewOnly, setSelectedViewOnly] = useState(false);
  const [affiliateEarnings, setAffiliateEarnings] = useState(null);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [premiumRequests, setPremiumRequests] = useState([]);
  const [userJobs, setUserJobs] = useState([]);
  const [vipUsername, setVipUsername] = useState('');
  const [freeRaidUsername, setFreeRaidUsername] = useState('');
  const [suspensionUsername, setSuspensionUsername] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');

  // Use global socket connection for real-time updates
  const [activeBookingConversation, setActiveBookingConversation] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [selectedAdForBump, setSelectedAdForBump] = useState(null);
  const [showBumpStoreModal, setShowBumpStoreModal] = useState(false);
  const [pendingTwitterRaids, setPendingTwitterRaids] = useState([]);
  const [loadingTwitterRaids, setLoadingTwitterRaids] = useState(false);
  const [pendingFacebookRaids, setPendingFacebookRaids] = useState([]);
  const [loadingFacebookRaids, setLoadingFacebookRaids] = useState(false);
  const [twitterRaidRejectionReason, setTwitterRaidRejectionReason] = useState('');
  const [showTwitterRaidRejectModal, setShowTwitterRaidRejectModal] = useState(false);
  const [selectedTwitterRaid, setSelectedTwitterRaid] = useState(null);
  const [selectedFacebookRaid, setSelectedFacebookRaid] = useState(null);
  const [facebookRaidRejectionReason, setFacebookRaidRejectionReason] = useState('');
  const [showFacebookRaidRejectModal, setShowFacebookRaidRejectModal] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [hasShownEasterEgg, setHasShownEasterEgg] = useState(false);
  const [pendingListings, setPendingListings] = useState([]);
  const [showRejectListingModal, setShowRejectListingModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingRejectionReason, setListingRejectionReason] = useState('');
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [approvingListingId, setApprovingListingId] = useState(null);
  const [isRejectingListing, setIsRejectingListing] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [activeAdminSection, setActiveAdminSection] = useState('bumps');
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
  const [pendingTokenPurchases, setPendingTokenPurchases] = useState([]);
  // Service approval states
  const [pendingServices, setPendingServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [showRejectServiceModal, setShowRejectServiceModal] = useState(false);
  const [selectedServiceForRejection, setSelectedServiceForRejection] = useState(null);
  const [serviceRejectionReason, setServiceRejectionReason] = useState('');
  // Referral QR code states
  const [showReferralQRModal, setShowReferralQRModal] = useState(false);
  const [referralLinkCopied, setReferralLinkCopied] = useState(false);
  // Banner edit states
  const [showBannerEditModal, setShowBannerEditModal] = useState(false);
  const [selectedBannerForEdit, setSelectedBannerForEdit] = useState(null);
  const [bannerEditData, setBannerEditData] = useState({
    title: '',
    url: '',
    gif: ''
  });
  const [approvingBannerId, setApprovingBannerId] = useState(null);
  const [rejectingBannerId, setRejectingBannerId] = useState(null);
  // Affiliate management states
  const [affiliateSearchQuery, setAffiliateSearchQuery] = useState('');
  const [affiliateSearchResults, setAffiliateSearchResults] = useState([]);
  const [selectedUserAffiliates, setSelectedUserAffiliates] = useState(null);
  const [topAffiliates, setTopAffiliates] = useState([]);
  const [suspiciousUsers, setSuspiciousUsers] = useState([]);
  const [loadingAffiliateData, setLoadingAffiliateData] = useState(false);
  // User affiliate analytics states
  const [affiliateAnalytics, setAffiliateAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  // Add refresh timestamps
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  
  // Free raid eligibility state
  const [freeRaidEligibility, setFreeRaidEligibility] = useState(null);
  
  // Loading state for main dashboard tab - Start false for immediate display (Optimistic UI)
  const [isLoadingMainTab, setIsLoadingMainTab] = useState(false);

  // Open QR code customizer modal
  const generateReferralQRCode = () => {
    setShowReferralQRModal(true);
  };

  // Update activeTab when initialActiveTab changes
  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);
  
  // OPTIMISTIC UI: Removed blocking useEffect - Dashboard now shows immediately
  // Individual sections show loading skeletons while their data loads
  // This provides instant UI feedback instead of blocking the entire tab

  // Fetch banner ads when dashboard opens
  useEffect(() => {
    if (currentUser?.isAdmin) {
      // Fetch banner ads
      fetchBannerAds();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.token && socket) {
      // Request affiliate info via socket instead of API call
      socket.emit('requestAffiliateInfo', {
        userId: currentUser.userId || currentUser.id || currentUser._id
      });
      
      // Request membership info via socket instead of API call
      socket.emit('requestMembershipInfo', {
        userId: currentUser.userId || currentUser.id || currentUser._id
      });
    }
  }, [currentUser, socket]);

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
          // Ensure we always set an array
          setPendingRedemptions(Array.isArray(data) ? data : []);
        })
        .catch(error => {
          setPendingRedemptions([]); // Set empty array on error
        });


    }
  }, [currentUser]);

  // Request initial bookings data via socket (like raids system)
  useEffect(() => {
    if (currentUser && socket) {
      // Request bookings data via socket instead of API call
      socket.emit('requestUserBookings', {
        userId: currentUser.userId
      });
    }
  }, [currentUser, socket]);

  // Socket listener for real-time booking updates and initial data
  useEffect(() => {
    if (socket && currentUser) {
      // Join user's room for direct updates
      socket.emit('userOnline', {
        userId: currentUser.userId,
        username: currentUser.username
      });

      const handleBookingUpdate = (data) => {
        if (data.type === 'created') {
          // Add new booking to the list
          setBookings(prevBookings => [data.booking, ...prevBookings]);
        } else {
          // Update existing booking
          setBookings(prevBookings => 
            prevBookings.map(booking => 
              booking._id === data.booking._id ? data.booking : booking
            )
          );
        }
      };

      const handleUserBookingsLoaded = (data) => {
        // Set initial bookings data from socket
        setBookings(data.bookings);
      };

      const handleUserBookingsError = (error) => {
        console.error('Error loading bookings via socket:', error);
        // Fallback to empty array on error
        setBookings([]);
      };

      // Listen for socket events
      socket.on('bookingUpdated', handleBookingUpdate);
      socket.on('userBookingsLoaded', handleUserBookingsLoaded);
      socket.on('userBookingsError', handleUserBookingsError);

      return () => {
        socket.off('bookingUpdated', handleBookingUpdate);
        socket.off('userBookingsLoaded', handleUserBookingsLoaded);
        socket.off('userBookingsError', handleUserBookingsError);
      };
    }
  }, [socket, currentUser]);


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
        // Error fetching dashboard data
      }
    };

    fetchData();
  }, [currentUser]);

  useEffect(() => {
    const fetchUserJobs = async () => {
      try {
        const response = await fetch(`${API_URL}/jobs?owner=${currentUser.userId}&includeExpired=true`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Handle both old and new response format
          setUserJobs(data.jobs || data);
        }
      } catch (error) {
        // Error fetching user jobs
      }
    };

    if (currentUser?.userId) {
      fetchUserJobs();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.isAdmin && socket) {
      // Request pending completions via socket instead of API call
      socket.emit('requestPendingCompletions', {
        isAdmin: currentUser.isAdmin,
        userId: currentUser.userId || currentUser.id
      });
      
      // Request pending bump requests via socket instead of API call
      socket.emit('requestPendingBumpRequests', {
        isAdmin: currentUser.isAdmin,
        userId: currentUser.userId || currentUser.id
      });
      
      // Request pending ads via socket instead of API call
      socket.emit('requestPendingAds', {
        isAdmin: currentUser.isAdmin,
        userId: currentUser.userId || currentUser.id
      });
      
      fetchPendingFacebookRaids();
    }
  }, [currentUser, socket]);

  // Add Socket.io listeners for affiliate data (ALL USERS)
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleAffiliateInfoLoaded = (data) => {
      setAffiliateInfo(data.affiliateInfo);
      setPointsInfo(data.pointsInfo);
      setAffiliateEarnings(data.detailedEarnings);
      setEarningsSummary(data.earningsSummary);
      setFreeRaidEligibility(data.freeRaidEligibility);
      setIsLoadingAffiliates(false);
    };

    const handleAffiliateInfoError = (error) => {
      setIsLoadingAffiliates(false);
      setIsLoadingMainTab(false); // Stop main tab loading even if affiliate data fails
    };

    // Handle affiliate earning updates
    const handleAffiliateEarningUpdate = (data) => {
      // Update points directly from socket data for real-time updates
      if (currentUser?.userId === data.affiliateId || currentUser?.id === data.affiliateId) {
        // Update points directly from socket data
        if (data.newTotalPoints !== undefined) {
          setPointsInfo(prev => {
            if (prev) {
              // Update existing pointsInfo
              return {
                ...prev,
                points: data.newTotalPoints
              };
            } else {
              // Create new pointsInfo if it doesn't exist
              return {
                points: data.newTotalPoints,
                pointsHistory: [],
                giftCardRedemptions: [],
                powerUps: {}
              };
            }
          });
          setLastSocketPointsUpdate(Date.now());
        }
        
        // For non-points data updates, we could emit a socket event to refresh affiliate info
        // But for now, we'll rely on the existing socket-based affiliate info loading
      }
    };

    socket.on('affiliateInfoLoaded', handleAffiliateInfoLoaded);
    socket.on('affiliateInfoError', handleAffiliateInfoError);
    socket.on('affiliateEarningUpdate', handleAffiliateEarningUpdate);

    return () => {
      socket.off('affiliateInfoLoaded', handleAffiliateInfoLoaded);
      socket.off('affiliateInfoError', handleAffiliateInfoError);
      socket.off('affiliateEarningUpdate', handleAffiliateEarningUpdate);
    };
  }, [socket, currentUser]);

  // Socket listeners for membership data
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleMembershipInfoLoaded = (data) => {
      setMembershipInfo(data.membership);
      setIsLoadingMembership(false);
    };

    const handleMembershipInfoError = (error) => {
      console.error('Error loading membership info via socket:', error);
      setIsLoadingMembership(false);
    };

    const handleMembershipUpdate = (data) => {
      // Update membership data in real-time
      if (currentUser?.userId === data.userId || currentUser?.id === data.userId) {
        setMembershipInfo(data.membership);
        // Also update points if they changed due to membership action
        if (data.pointsRemaining !== undefined) {
          setPointsInfo(prev => prev ? { ...prev, points: data.pointsRemaining } : null);
        }
      }
    };

    const handleMembershipActionResponse = (data) => {
      // Handle responses from membership actions (subscribe/cancel)
      if (currentUser?.userId === data.userId || currentUser?.id === data.userId) {
        setMembershipInfo(data.membership);
        if (data.pointsRemaining !== undefined) {
          setPointsInfo(prev => prev ? { ...prev, points: data.pointsRemaining } : null);
        }
        // You could add a toast notification here if you have a notification system
        console.log('Membership action completed:', data.message);
      }
    };

    const handleMembershipActionError = (data) => {
      // Handle errors from membership actions
      if (currentUser?.userId === data.userId || currentUser?.id === data.userId) {
        // You could add a toast notification here if you have a notification system
        console.error('Membership action error:', data.error);
      }
    };

    socket.on('membershipInfoLoaded', handleMembershipInfoLoaded);
    socket.on('membershipInfoError', handleMembershipInfoError);
    socket.on('membershipUpdated', handleMembershipUpdate);
    socket.on('membershipActionResponse', handleMembershipActionResponse);
    socket.on('membershipActionError', handleMembershipActionError);

    return () => {
      socket.off('membershipInfoLoaded', handleMembershipInfoLoaded);
      socket.off('membershipInfoError', handleMembershipInfoError);
      socket.off('membershipUpdated', handleMembershipUpdate);
      socket.off('membershipActionResponse', handleMembershipActionResponse);
      socket.off('membershipActionError', handleMembershipActionError);
    };
  }, [socket, currentUser]);

  // Socket listeners for bump request updates
  useEffect(() => {
    if (!socket || !currentUser?.isAdmin) return;

    const handleBumpRequestUpdate = (data) => {
      const { type, bumpRequest } = data;
      
      if (type === 'create') {
        // Add new bump request to the list
        setBumpRequests(prevRequests => {
          // Check if it already exists to avoid duplicates
          const exists = prevRequests.some(req => req._id === bumpRequest._id);
          if (!exists) {
            return [bumpRequest, ...prevRequests];
          }
          return prevRequests;
        });
      } else if (type === 'approve' || type === 'reject') {
        // Remove processed bump request from the list
        setBumpRequests(prevRequests => 
          prevRequests.filter(req => req._id !== bumpRequest._id)
        );
      }
    };

    socket.on('bumpRequestUpdated', handleBumpRequestUpdate);

    return () => {
      socket.off('bumpRequestUpdated', handleBumpRequestUpdate);
    };
  }, [socket, currentUser]);

  // Add Socket.io listeners for admin-only features
  useEffect(() => {
    if (!socket || !currentUser?.isAdmin) return;

    const handleTwitterRaidApproved = (data) => {
      // Remove the approved completion from the pending list
      setPendingTwitterRaids(prev => 
        prev.filter(completion => 
          completion.completionId.toString() !== data.completionId.toString()
        )
      );
    };

    const handleTwitterRaidRejected = (data) => {
      // Remove the rejected completion from the pending list
      setPendingTwitterRaids(prev => 
        prev.filter(completion => 
          completion.completionId.toString() !== data.completionId.toString()
        )
      );
    };

    const handleNewTwitterRaidCompletion = (data) => {
      // Add the new completion to the pending list immediately
      setPendingTwitterRaids(prev => [...prev, data]);
    };

    const handlePendingCompletionsLoaded = (data) => {
      setPendingTwitterRaids(data.pendingCompletions);
      setLoadingTwitterRaids(false);
    };

    const handlePendingCompletionsError = (error) => {
      setLoadingTwitterRaids(false);
    };

    const handlePendingBumpRequestsLoaded = (data) => {
      setBumpRequests(data.bumpRequests);
    };

    const handlePendingBumpRequestsError = (error) => {
      console.error('Error loading initial bump requests via socket:', error);
    };

    // Service approval socket handlers
    const handleServiceApproved = (data) => {
      // Remove the approved service from the pending list
      setPendingServices(prev => 
        prev.filter(service => service._id.toString() !== data.serviceId.toString())
      );
    };

    const handleServiceRejected = (data) => {
      // Remove the rejected service from the pending list
      setPendingServices(prev => 
        prev.filter(service => service._id.toString() !== data.serviceId.toString())
      );
    };

    const handleNewServicePending = (data) => {
      // Add the new pending service to the list immediately
      setPendingServices(prev => [...prev, data]);
    };

    const handlePendingServicesLoaded = (data) => {
      setPendingServices(data.pendingServices);
      setIsLoadingServices(false);
    };

    const handlePendingServicesError = (error) => {
      console.error('Error loading initial services via socket:', error);
      setIsLoadingServices(false);
    };

    // Bubble listing (ad) approval socket handlers
    const handlePendingAdApproved = (data) => {
      // Remove the approved ad from the pending list
      setPendingListings(prev => 
        prev.filter(listing => listing.id.toString() !== data.adId.toString())
      );
    };

    const handlePendingAdRejected = (data) => {
      // Remove the rejected ad from the pending list
      setPendingListings(prev => 
        prev.filter(listing => listing.id.toString() !== data.adId.toString())
      );
    };

    const handleNewPendingAd = (data) => {
      // Add the new pending ad to the list immediately
      setPendingListings(prev => [...prev, data.ad]);
    };

    const handlePendingAdsLoaded = (data) => {
      setPendingListings(data.pendingAds);
      setIsLoadingListings(false);
    };

    const handlePendingAdsError = (error) => {
      console.error('Error loading initial pending ads via socket:', error);
      setIsLoadingListings(false);
    };

    // Token purchase socket handlers
    const handleTokenPurchaseApproved = (data) => {
      // Remove the approved token purchase from the pending list
      setPendingTokenPurchases(prev => 
        prev.filter(purchase => purchase._id.toString() !== data.purchaseId.toString())
      );
    };

    const handleTokenPurchaseRejected = (data) => {
      // Remove the rejected token purchase from the pending list
      setPendingTokenPurchases(prev => 
        prev.filter(purchase => purchase._id.toString() !== data.purchaseId.toString())
      );
    };

    const handleNewTokenPurchasePending = (data) => {
      // Add the new pending token purchase to the list immediately
      setPendingTokenPurchases(prev => [...prev, data]);
    };

    const handlePendingTokenPurchasesLoaded = (data) => {
      setPendingTokenPurchases(data.pendingTokenPurchases);
    };

    const handlePendingTokenPurchasesError = (error) => {
      console.error('Error loading initial token purchases via socket:', error);
    };

    socket.on('twitterRaidCompletionApproved', handleTwitterRaidApproved);
    socket.on('twitterRaidCompletionRejected', handleTwitterRaidRejected);
    socket.on('newTwitterRaidCompletion', handleNewTwitterRaidCompletion);
    socket.on('pendingCompletionsLoaded', handlePendingCompletionsLoaded);
    socket.on('pendingCompletionsError', handlePendingCompletionsError);
    socket.on('pendingBumpRequestsLoaded', handlePendingBumpRequestsLoaded);
    socket.on('pendingBumpRequestsError', handlePendingBumpRequestsError);
    
    // Service approval socket listeners
    socket.on('serviceApproved', handleServiceApproved);
    socket.on('serviceRejected', handleServiceRejected);
    socket.on('newServicePending', handleNewServicePending);
    socket.on('pendingServicesLoaded', handlePendingServicesLoaded);
    socket.on('pendingServicesError', handlePendingServicesError);

    // Bubble listing (ad) approval socket listeners
    socket.on('pendingAdApproved', handlePendingAdApproved);
    socket.on('pendingAdRejected', handlePendingAdRejected);
    socket.on('newPendingAd', handleNewPendingAd);
    socket.on('pendingAdsLoaded', handlePendingAdsLoaded);
    socket.on('pendingAdsError', handlePendingAdsError);

    // Token purchase socket listeners
    socket.on('tokenPurchaseApproved', handleTokenPurchaseApproved);
    socket.on('tokenPurchaseRejected', handleTokenPurchaseRejected);
    socket.on('newTokenPurchasePending', handleNewTokenPurchasePending);
    socket.on('pendingTokenPurchasesLoaded', handlePendingTokenPurchasesLoaded);
    socket.on('pendingTokenPurchasesError', handlePendingTokenPurchasesError);

    return () => {
      socket.off('twitterRaidCompletionApproved', handleTwitterRaidApproved);
      socket.off('twitterRaidCompletionRejected', handleTwitterRaidRejected);
      socket.off('newTwitterRaidCompletion', handleNewTwitterRaidCompletion);
      socket.off('pendingCompletionsLoaded', handlePendingCompletionsLoaded);
      socket.off('pendingCompletionsError', handlePendingCompletionsError);
      socket.off('pendingBumpRequestsLoaded', handlePendingBumpRequestsLoaded);
      socket.off('pendingBumpRequestsError', handlePendingBumpRequestsError);
      
      // Service approval socket cleanup
      socket.off('serviceApproved', handleServiceApproved);
      socket.off('serviceRejected', handleServiceRejected);
      socket.off('newServicePending', handleNewServicePending);
      socket.off('pendingServicesLoaded', handlePendingServicesLoaded);
      socket.off('pendingServicesError', handlePendingServicesError);

      // Bubble listing (ad) approval socket cleanup
      socket.off('pendingAdApproved', handlePendingAdApproved);
      socket.off('pendingAdRejected', handlePendingAdRejected);
      socket.off('newPendingAd', handleNewPendingAd);
      socket.off('pendingAdsLoaded', handlePendingAdsLoaded);
      socket.off('pendingAdsError', handlePendingAdsError);

      // Token purchase socket cleanup
      socket.off('tokenPurchaseApproved', handleTokenPurchaseApproved);
      socket.off('tokenPurchaseRejected', handleTokenPurchaseRejected);
      socket.off('newTokenPurchasePending', handleNewTokenPurchasePending);
      socket.off('pendingTokenPurchasesLoaded', handlePendingTokenPurchasesLoaded);
      socket.off('pendingTokenPurchasesError', handlePendingTokenPurchasesError);
    };
  }, [socket, currentUser]);

  useEffect(() => {
    if (currentUser?.isAdmin && activeTab === 'admin') {
      requestPendingAdsViaSocket();
      // Request token purchases via socket instead of API call
      if (socket) {
        socket.emit('requestPendingTokenPurchases', {
          userId: currentUser.userId,
          isAdmin: currentUser.isAdmin
        });
      }
      requestPendingServicesViaSocket();
    }
  }, [currentUser, activeTab, socket]);

  useEffect(() => {
    if (currentUser?.isAdmin && activeTab === 'facebookRaids') {
      fetchPendingFacebookRaids();
    }
  }, [currentUser, activeTab]);




  const fetchAffiliateAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/affiliates/analytics`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAffiliateAnalytics(data);
      } else {
        showNotification('Failed to fetch affiliate analytics', 'error');
      }
    } catch (error) {
      showNotification('Error fetching affiliate analytics', 'error');
    } finally {
      setLoadingAnalytics(false);
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

      // Refresh points info after redemption via socket
      socket.emit('requestAffiliateInfo', {
        userId: currentUser.userId || currentUser.id || currentUser._id
      });
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

  const confirmReject = async () => {
    if (selectedBumpRequest) {
      try {
        const response = await fetch(`${API_URL}/bumps/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ 
            adId: selectedBumpRequest.id, 
            processedBy: currentUser.userId,
            reason: rejectReason 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to reject bump request');
        }
        
        const result = await response.json();
        
        // Socket event will automatically update the bump requests list
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedBumpRequest(null);
        
        alert(result.message || 'Bump request rejected successfully!');
      } catch (error) {
        alert('Error rejecting bump request: ' + error.message);
      }
    }
  };

  const handleApprove = async (ad) => {
    try {
      const response = await fetch(`${API_URL}/bumps/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ 
          adId: ad.id, 
          processedBy: currentUser.userId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve bump request');
      }
      
      const result = await response.json();
      
      // Socket event will automatically update the bump requests list
      alert(result.message || 'Bump request approved successfully!');
    } catch (error) {
      alert('Error approving bump request: ' + error.message);
    }
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
      // Error fetching banner ads
    }
  };

  const handleApproveBanner = async (bannerId) => {
    setApprovingBannerId(bannerId);
    try {
      const response = await fetch(`${API_URL}/bannerAds/${bannerId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to approve banner');
      
      showNotification('Banner approved successfully!', 'success');
      await fetchBannerAds();
    } catch (error) {
      showNotification('Failed to approve banner', 'error');
      console.error('Error approving banner:', error);
    } finally {
      setApprovingBannerId(null);
    }
  };

  const handleRejectBanner = async (bannerId, reason) => {
    setRejectingBannerId(bannerId);
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
      
      showNotification('Banner rejected successfully', 'success');
      await fetchBannerAds();
    } catch (error) {
      showNotification('Failed to reject banner', 'error');
      console.error('Error rejecting banner:', error);
    } finally {
      setRejectingBannerId(null);
    }
  };

  // Add handleDeleteBanner function
  const handleDeleteBanner = async (bannerId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this banner ad?')) {
        return;
      }

      const response = await fetch(`${API_URL}/bannerAds/${bannerId}`, {
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
      alert(error.message || 'Failed to delete banner ad. Please try again.');
    }
  };

  const handleEditBanner = (banner) => {
    setSelectedBannerForEdit(banner);
    setBannerEditData({
      title: banner.title,
      url: banner.url,
      gif: banner.gif
    });
    setShowBannerEditModal(true);
  };

  const handleSaveBannerEdit = async () => {
    if (!selectedBannerForEdit) return;

    try {
      const response = await fetch(`${API_URL}/bannerAds/${selectedBannerForEdit._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(bannerEditData)
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Failed to update banner');
      }

      const updatedBanner = await response.json();
      
      // Update the local state
      setBannerAds(prevBanners => 
        prevBanners.map(banner => 
          banner._id === selectedBannerForEdit._id ? updatedBanner : banner
        )
      );

      setShowBannerEditModal(false);
      setSelectedBannerForEdit(null);
      setBannerEditData({ title: '', url: '', gif: '' });
      alert('Banner updated successfully');
    } catch (error) {
      alert(error.message || 'Failed to update banner ad. Please try again.');
    }
  };

  // Separate pending bump ads for admin
  const pendingBumpAds = currentUser?.isAdmin 
    ? bumpRequests.map(request => {
        const ad = ads.find(ad => ad.id === request.adId);
        return ad ? { ...ad, bumpRequest: request } : null;
      }).filter(Boolean)
    : [];

  const userAds = ads.filter(ad => ad.owner === currentUser?.username);

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
      alert('Failed to process redemption');
    }
  };



  // Keep fetchBookings for manual refresh only (not automatic loading)
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
      // Error fetching bookings
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
      throw error;
    }
  };

  const handleShowReviews = (service, booking = null, viewOnly = false) => {
    if (!service || !service._id) {
      return;
    }

    setSelectedService(service);
    setSelectedBooking(booking);
    setSelectedViewOnly(viewOnly);
    setShowReviews(true);
  };

  const handleCloseReviews = () => {
    setShowReviews(false);
    setSelectedService(null);
    setSelectedBooking(null);
    setSelectedViewOnly(false);
  };

  const renderAffiliateEarnings = () => {
    // Show skeleton loader while data is loading
    if (!earningsSummary) {
      return (
        <div className="bg-gray-800 p-6 rounded-lg mb-6 animate-pulse">
          <div className="h-6 bg-gray-600 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
              <div className="h-8 bg-gray-600 rounded w-24"></div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
              <div className="h-8 bg-gray-600 rounded w-24"></div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
              <div className="h-8 bg-gray-600 rounded w-24"></div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-4 bg-gray-600 rounded w-64"></div>
          </div>
        </div>
      );
    }

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
          <div className="flex items-center">
            <p className="text-gray-400">Current Commission Rate: {(earningsSummary.currentRate * 100).toFixed(0)}%</p>
            
            {earningsSummary.isVipAffiliate && (
              <div className="ml-3 bg-yellow-500 text-black font-bold text-xs px-2 py-1 rounded-full flex items-center">
                <span className="mr-1">VIP</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.953a1.5 1.5 0 001.421 1.033h4.171c.949 0 1.341 1.154.577 1.715l-3.38 2.458a1.5 1.5 0 00-.54 1.659l1.286 3.953c.3.921-.755 1.688-1.54 1.118l-3.38-2.458a1.5 1.5 0 00-1.76 0l-3.38 2.458c-.784.57-1.838-.197-1.539-1.118l1.285-3.953a1.5 1.5 0 00-.54-1.659l-3.38-2.458c-.764-.56-.372-1.715.577-1.715h4.171a1.5 1.5 0 001.421-1.033l1.286-3.953z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          {earningsSummary.isVipAffiliate && (
            <p className="text-sm text-yellow-400 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              VIP affiliates receive a premium 30% commission rate on all referrals
            </p>
          )}
          
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
      showNotification('Failed to approve premium status', 'error');
    }
  };

  const handleRejectPremium = async (serviceId) => {
    const reason = prompt('Enter rejection reason (optional):');
    
    try {
      const response = await fetch(`${API_URL}/services/${serviceId}/premium-reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) throw new Error('Failed to reject premium status');

      setPremiumRequests(prev => prev.filter(req => req._id !== serviceId));
      showNotification('Premium request rejected successfully');
    } catch (error) {
      showNotification('Failed to reject premium status', 'error');
    }
  };

  const handleUpdateJob = async (jobData) => {
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
      showNotification('Failed to update job', 'error');
    }
  };

  const handleEditJob = (job) => {
    setJobToEdit(job);
  };

  const handleRefreshJob = async (jobId) => {
    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (response.ok) {
        const refreshedJob = await response.json();
        // Update the job in the local state
        setUserJobs(prev => prev.map(job => 
          job._id === refreshedJob._id ? refreshedJob : job
        ));
        showNotification('Job refreshed successfully and moved to top of listing', 'success');
      }
    } catch (error) {
      showNotification('Failed to refresh job', 'error');
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
      alert('Failed to update VIP status: ' + error.message);
    }
  };

  const handleFreeRaidProjectToggle = async (username) => {
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

      const toggleResponse = await fetch(`${API_URL}/affiliates/free-raid-project/${user._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!toggleResponse.ok) {
        throw new Error('Failed to update free raid project status');
      }

      const result = await toggleResponse.json();
      alert(result.message);
      setFreeRaidUsername('');
    } catch (error) {
      alert('Failed to update free raid project status: ' + error.message);
    }
  };

  const handleSuspendUser = async (username, reason) => {
    try {
      if (!username) {
        alert('Please enter a username');
        return;
      }

      // Get user by username
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

      // Suspend/unsuspend the user
      const suspendResponse = await fetch(`${API_URL}/admin/suspend-user/${user._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || 'No reason provided' })
      });

      if (!suspendResponse.ok) {
        const errorData = await suspendResponse.json();
        throw new Error(errorData.error || 'Failed to update suspension status');
      }

      const result = await suspendResponse.json();
      alert(result.message);
      setSuspensionUsername('');
      setSuspensionReason('');
    } catch (error) {
      alert('Failed to update suspension status: ' + error.message);
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
      alert(message);
    }
  };

  const handleTokenPurchaseComplete = () => {
    // Socket updates will handle real-time booking updates
    // No need to fetch bookings manually
  };

  const fetchPendingTokenPurchases = async () => {
    if (!currentUser?.isAdmin) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user-tokens/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingTokenPurchases(data);
      } else {
        // Failed to fetch pending token purchases
      }
    } catch (error) {
      // Error fetching pending token purchases
    }
  };

  const handleApproveTokenPurchase = async (purchaseId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user-tokens/purchase/${purchaseId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        showNotification('Token purchase approved successfully', 'success');
        // No need to refetch - socket will update the list automatically
      } else {
        const error = await response.json();
        showNotification(error.error || error.message || 'Failed to approve token purchase', 'error');
      }
    } catch (error) {
      showNotification('Error approving token purchase', 'error');
    }
  };

  // Affiliate management functions
  const handleSyncAffiliateCounts = async () => {
    setLoadingAffiliateData(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/sync-affiliate-counts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.discrepanciesFound > 0) {
          showNotification(`Fixed ${data.discrepanciesFound} affiliate count discrepancies`, 'success');
        } else {
          showNotification('All affiliate counts are already in sync', 'info');
        }
      } else {
        showNotification('Failed to sync affiliate counts', 'error');
      }
    } catch (error) {
      showNotification('Error syncing affiliate counts', 'error');
    }
    setLoadingAffiliateData(false);
  };

  const handleAffiliateSearch = async () => {
    if (!affiliateSearchQuery.trim()) return;
    
    setLoadingAffiliateData(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/search-users?query=${encodeURIComponent(affiliateSearchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAffiliateSearchResults(data.users);
      } else {
        showNotification('Failed to search users', 'error');
      }
    } catch (error) {
      showNotification('Error searching users', 'error');
    }
    setLoadingAffiliateData(false);
  };

  const fetchUserAffiliates = async (userId) => {
    setLoadingAffiliateData(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/user/${userId}/affiliates`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedUserAffiliates(data);
        setLastRefreshTime(new Date());
      } else {
        showNotification('Failed to fetch affiliate details', 'error');
      }
    } catch (error) {
      showNotification('Error fetching affiliate details', 'error');
    }
    setLoadingAffiliateData(false);
  };

  const fetchTopAffiliates = async () => {
    setLoadingAffiliateData(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/top-affiliates?limit=20`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTopAffiliates(data.topAffiliates);
        setLastRefreshTime(new Date());
      } else {
        showNotification('Failed to fetch top affiliates', 'error');
      }
    } catch (error) {
      showNotification('Error fetching top affiliates', 'error');
    }
    setLoadingAffiliateData(false);
  };

  const fetchSuspiciousUsers = async () => {
    setLoadingAffiliateData(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/suspicious-users?minAffiliates=10`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuspiciousUsers(data.suspiciousUsers);
        setLastRefreshTime(new Date());
      } else {
        showNotification('Failed to fetch suspicious users', 'error');
      }
    } catch (error) {
      showNotification('Error fetching suspicious users', 'error');
    }
    setLoadingAffiliateData(false);
  };

  const handleRejectTokenPurchase = async (purchaseId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user-tokens/purchase/${purchaseId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ rejectionReason: reason })
      });
      
      if (response.ok) {
        showNotification('Token purchase rejected', 'success');
        // No need to refetch - socket will update the list automatically
      } else {
        const error = await response.json();
        showNotification(error.error || error.message || 'Failed to reject token purchase', 'error');
      }
    } catch (error) {
      showNotification('Error rejecting token purchase', 'error');
    }
  };

  // Effect to handle initialBookingId prop when component mounts
  useEffect(() => {
    const loadInitialBooking = async () => {
      if (initialBookingId && currentUser) {
        
        // First try to find the booking in already loaded bookings
        if (bookings && bookings.length > 0) {
          const bookingToOpen = bookings.find(b => b._id === initialBookingId);
          if (bookingToOpen) {
            setActiveBookingConversation(bookingToOpen);
            setActiveTab('bookings');
            return;
          }
        }
        
        // If not found or not loaded yet, fetch the specific booking
        try {
          const response = await fetch(`${API_URL}/bookings/${initialBookingId}`, {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          });
          
          if (response.ok) {
            const bookingData = await response.json();
            setActiveBookingConversation(bookingData);
            setActiveTab('bookings');
          } else {
            // Failed to fetch specific booking
          }
        } catch (error) {
          // Error fetching specific booking
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


  // Add these functions to handle Twitter raid completion approvals and rejections
  const handleApproveTwitterRaid = async (completion) => {
    try {
      const response = await fetch(`${API_URL}/twitter-raids/${completion.raidId}/completions/${completion.completionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve completion');
      }
      
      const result = await response.json();
      alert(result.message || 'Completion approved successfully!');
    } catch (error) {
      alert('Error approving completion: ' + error.message);
    }
  };

  const handleRejectTwitterRaidClick = (completion) => {
    setSelectedTwitterRaid(completion);
    setTwitterRaidRejectionReason('');
    setShowTwitterRaidRejectModal(true);
  };

  const handleRejectTwitterRaid = async () => {
    try {
      if (!selectedTwitterRaid) return;
      
      const response = await fetch(`${API_URL}/twitter-raids/${selectedTwitterRaid.raidId}/completions/${selectedTwitterRaid.completionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ rejectionReason: twitterRaidRejectionReason })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject completion');
      }
      
      const result = await response.json();
      setShowTwitterRaidRejectModal(false);
      alert(result.message || 'Completion rejected successfully!');
    } catch (error) {
      alert('Error rejecting completion: ' + error.message);
    }
  };

  // Add Facebook raid functions
  const fetchPendingFacebookRaids = async () => {
    setLoadingFacebookRaids(true);
    try {
      const response = await fetch(`${API_URL}/facebook-raids/completions/pending`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending Facebook raid completions');
      }
      
      const data = await response.json();
      setPendingFacebookRaids(data.pendingCompletions || []);
    } catch (error) {
      setPendingFacebookRaids([]);
    } finally {
      setLoadingFacebookRaids(false);
    }
  };

  const handleApproveFacebookRaid = async (completion) => {
    try {
      const response = await fetch(`${API_URL}/facebook-raids/${completion.raidId}/approve/${completion.completionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve Facebook raid completion');
      }
      
      const result = await response.json();
      
      // Refresh the list of pending completions
      fetchPendingFacebookRaids();
      alert(result.message || 'Facebook raid completion approved successfully!');
    } catch (error) {
      alert('Error approving Facebook raid completion: ' + error.message);
    }
  };

  const handleRejectFacebookRaidClick = (completion) => {
    setSelectedFacebookRaid(completion);
    setFacebookRaidRejectionReason('');
    setShowFacebookRaidRejectModal(true);
  };

  const handleRejectFacebookRaid = async () => {
    try {
      if (!selectedFacebookRaid) return;
      
      const response = await fetch(`${API_URL}/facebook-raids/${selectedFacebookRaid.raidId}/reject/${selectedFacebookRaid.completionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ rejectionReason: facebookRaidRejectionReason })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject Facebook raid completion');
      }
      
      const result = await response.json();
      
      // Refresh the list of pending completions
      fetchPendingFacebookRaids();
      setShowFacebookRaidRejectModal(false);
      alert(result.message || 'Facebook raid completion rejected successfully!');
    } catch (error) {
      alert('Error rejecting Facebook raid completion: ' + error.message);
    }
  };

  // Add a new function to render the Twitter Raids tab content
  const renderTwitterRaidsTab = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Twitter Raid Completions Pending Approval</h3>
        
        {loadingTwitterRaids ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading pending completions...</p>
          </div>
        ) : pendingTwitterRaids.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No pending completions to approve.</p>
        ) : (
          <div className="space-y-4">
            {pendingTwitterRaids.map(completion => {
              // Trust score display logic
              const getTrustColor = (trustLevel) => {
                switch(trustLevel) {
                  case 'high': return 'text-green-400';
                  case 'medium': return 'text-yellow-400';
                  case 'low': return 'text-red-400';
                  default: return 'text-gray-400';
                }
              };

              const getTrustIcon = (trustLevel) => {
                switch(trustLevel) {
                  case 'high': return '🟢';
                  case 'medium': return '🟡';
                  case 'low': return '🔴';
                  default: return '⚪';
                }
              };

              const getTrustText = (trustScore) => {
                if (trustScore.totalCompletions === 0) {
                  return 'New User';
                }
                return `${Math.round(trustScore.approvalRate)}% Trust (${trustScore.approvedCompletions}/${trustScore.totalCompletions})`;
              };

              return (
              <div key={`${completion.raidId}-${completion.completionId}`} className="bg-gray-800 p-4 rounded-lg">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">{completion.raidTitle}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTrustIcon(completion.trustScore.trustLevel)}</span>
                        <span className={`text-sm font-medium ${getTrustColor(completion.trustScore.trustLevel)}`}>
                          {getTrustText(completion.trustScore)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="text-gray-400">User: </span>
                          <span className="text-white font-medium">{completion.user?.username || "Unknown"}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Twitter Username: </span>
                          <span className="text-blue-400 font-medium">@{completion.twitterUsername}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Points: </span>
                          <span className="text-green-400 font-medium">{completion.pointsAmount}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Completed: </span>
                          <span className="text-gray-300">{new Date(completion.completedAt).toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="text-gray-400">Verification: </span>
                          <span className={`${completion.iframeVerified ? 'text-green-400' : 'text-yellow-400'} font-medium`}>
                            {completion.iframeVerified ? 'Iframe Verified' : 'Manual'}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Method: </span>
                          <span className="text-gray-300">{completion.verificationMethod}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">IP: </span>
                          <span className="text-gray-300 font-mono text-xs">{completion.ipAddress}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-400">
                        Tweet URL: <a href={completion.raidTweetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {completion.raidTweetUrl}
                        </a>
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Check if <span className="text-blue-400 font-medium">@{completion.twitterUsername}</span> actually liked, retweeted, and commented on this tweet.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApproveTwitterRaid(completion)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                    >
                      ✓ Approve ({completion.pointsAmount} pts)
                    </button>
                    <button
                      onClick={() => handleRejectTwitterRaidClick(completion)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium"
                    >
                      ✗ Reject
                    </button>
                    <a
                      href={completion.raidTweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium text-center"
                    >
                      🔗 View Tweet
                    </a>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
        
        {/* Modal for rejecting Twitter raids */}
        {showTwitterRaidRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Reject Completion</h3>
              <p className="mb-4 text-gray-300">
                Are you sure you want to reject this completion? The user will not receive points and this action cannot be undone.
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
                  placeholder="Enter reason for rejection (e.g., 'Twitter username did not interact with the tweet')"
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
                  Reject Completion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add a new function to render the Facebook Raids tab content
  const renderFacebookRaidsTab = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Facebook Raid Completions Pending Approval</h3>
        
        {loadingFacebookRaids ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading pending Facebook raid completions...</p>
          </div>
        ) : pendingFacebookRaids.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No pending Facebook raid completions to review.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingFacebookRaids.map(completion => {
              return (
              <div key={`${completion.raidId}-${completion.completionId}`} className="bg-gray-800 p-4 rounded-lg">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">{completion.raidTitle}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="text-gray-400">User: </span>
                          <span className="text-white font-medium">{completion.username || "Unknown"}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Facebook Username: </span>
                          <span className="text-blue-400 font-medium">@{completion.facebookUsername}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Points: </span>
                          <span className="text-green-400 font-medium">{completion.raidPoints}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Completed: </span>
                          <span className="text-gray-300">{new Date(completion.completedAt).toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="text-gray-400">IP: </span>
                          <span className="text-gray-300 font-mono text-xs">{completion.ipAddress}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-400">
                        Facebook Post URL: <a href={completion.raidPostUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {completion.raidPostUrl}
                        </a>
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Check if <span className="text-blue-400 font-medium">@{completion.facebookUsername}</span> actually liked, shared, and commented on this Facebook post.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApproveFacebookRaid(completion)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                    >
                      ✓ Approve ({completion.raidPoints} pts)
                    </button>
                    <button
                      onClick={() => handleRejectFacebookRaidClick(completion)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium"
                    >
                      ✗ Reject
                    </button>
                    <a
                      href={completion.raidPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium text-center"
                    >
                      🔗 View Facebook Post
                    </a>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
        
        {/* Modal for rejecting Facebook raids */}
        {showFacebookRaidRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Reject Facebook Raid Completion</h3>
              <p className="mb-4 text-gray-300">
                Are you sure you want to reject this Facebook raid completion? The user will not receive points and this action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Rejection Reason:
                </label>
                <textarea
                  value={facebookRaidRejectionReason}
                  onChange={(e) => setFacebookRaidRejectionReason(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white"
                  rows="3"
                  placeholder="Enter reason for rejection (e.g., 'Facebook username did not interact with the post')"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowFacebookRaidRejectModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectFacebookRaid}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Reject Completion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add this effect to handle showing the easter egg animation
  useEffect(() => {
    // Check if we've shown this animation before by looking in localStorage
    const hasShownAffiliateAnimation = localStorage.getItem(`affiliateAnimation_${currentUser?.userId}`);
    
    // Only show the animation if:
    // 1. Points data has been loaded
    // 2. User has 3000 or more points
    // 3. We haven't shown the animation ever before (not in localStorage)
    if (pointsInfo && pointsInfo.points >= 3000 && !hasShownAffiliateAnimation && currentUser?.userId) {
      setShowEasterEgg(true);
      setHasShownEasterEgg(true);
      
      // Save to localStorage so it never shows again for this user
      localStorage.setItem(`affiliateAnimation_${currentUser.userId}`, 'true');
    }
  }, [pointsInfo, currentUser?.userId]);

  const handleCloseEasterEgg = () => {
    setShowEasterEgg(false);
  };

  // Add these new functions to handle listing approvals
  const requestPendingAdsViaSocket = () => {
    if (!socket || !currentUser?.isAdmin) return;
    setIsLoadingListings(true);
    socket.emit('requestPendingAds', {
      userId: currentUser.userId || currentUser.id,
      isAdmin: currentUser.isAdmin
    });
  };

  const fetchPendingBubbleListings = async () => {
    if (!currentUser?.isAdmin) return;
    try {
      setIsLoadingListings(true);
      const data = await fetchPendingAds();
      setPendingListings(data);
    } catch (error) {
      showNotification('Failed to fetch pending bubble listings', 'error');
    } finally {
      setIsLoadingListings(false);
    }
  };

  const handleApproveListing = async (listingId) => {
    try {
      setApprovingListingId(listingId);
      await approveAd(listingId);
      showNotification('Listing approved successfully', 'success');
      // No need to refresh - socket will handle real-time update
    } catch (error) {
      showNotification('Failed to approve listing', 'error');
    } finally {
      setApprovingListingId(null);
    }
  };

  const openRejectModal = (listing) => {
    setSelectedListing(listing);
    setShowRejectListingModal(true);
  };

  const handleRejectListing = async () => {
    if (!selectedListing) return;
    
    try {
      setIsRejectingListing(true);
      await rejectAd(selectedListing.id, listingRejectionReason);
      showNotification('Listing rejected successfully', 'success');
      setShowRejectListingModal(false);
      setSelectedListing(null);
      setListingRejectionReason('');
      // No need to refresh - socket will handle real-time update
    } catch (error) {
      showNotification('Failed to reject listing', 'error');
    } finally {
      setIsRejectingListing(false);
    }
  };

  // Service approval functions
  const requestPendingServicesViaSocket = () => {
    if (!socket || !currentUser?.isAdmin) return;
    setIsLoadingServices(true);
    socket.emit('requestPendingServices', {
      userId: currentUser.userId || currentUser.id,
      isAdmin: currentUser.isAdmin
    });
  };

  const fetchPendingServicesData = async () => {
    if (!currentUser?.isAdmin) return;
    try {
      setIsLoadingServices(true);
      const data = await fetchPendingServices();
      setPendingServices(data);
    } catch (error) {
      showNotification('Failed to fetch pending services', 'error');
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleApproveService = async (serviceId) => {
    try {
      await approveService(serviceId);
      showNotification('Service approved successfully', 'success');
      // No need to refresh - socket will handle real-time update
    } catch (error) {
      showNotification('Failed to approve service', 'error');
    }
  };

  const openServiceRejectModal = (service) => {
    setSelectedServiceForRejection(service);
    setShowRejectServiceModal(true);
  };

  const handleRejectService = async () => {
    if (!selectedServiceForRejection) return;
    
    try {
      await rejectService(selectedServiceForRejection._id, serviceRejectionReason);
      showNotification('Service rejected successfully', 'success');
      setShowRejectServiceModal(false);
      setSelectedServiceForRejection(null);
      setServiceRejectionReason('');
      // No need to refresh - socket will handle real-time update
    } catch (error) {
      showNotification('Failed to reject service', 'error');
    }
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
        <div className="relative border-b border-gray-700 mb-6 sticky top-0 bg-gray-800 z-10">
          {/* Mobile scrollable tabs container */}
          <div className="flex overflow-x-auto scrollbar-hide scroll-smooth md:overflow-x-visible">
            {/* Fade indicators for mobile - show on mobile only */}
            <div className="md:hidden absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-800 to-transparent z-10 pointer-events-none"></div>
            <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-800 to-transparent z-10 pointer-events-none"></div>
            
            <button
              className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'ads' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('ads')}
            >
              Main
            </button>
            <button
              className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'bookings' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('bookings')}
            >
              Bookings
            </button>
            <button
              className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'affiliateAnalytics' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => {
                setActiveTab('affiliateAnalytics');
                if (!affiliateAnalytics) {
                  fetchAffiliateAnalytics();
                }
              }}
            >
              Affiliate Analytics
            </button>
            {currentUser.isAdmin && (
              <button
                className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'admin' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin
              </button>
            )}

            {currentUser.isAdmin && (
              <button
                className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'twitterRaids' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('twitterRaids')}
              >
                Twitter Raids
              </button>
            )}

            {currentUser.isAdmin && (
              <button
                className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'facebookRaids' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('facebookRaids')}
              >
                Facebook Raids
              </button>
            )}
            
            {currentUser.userType === 'project' && (
              <button
                className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'partnerStore' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('partnerStore')}
              >
                🎁 My Partner Store
              </button>
            )}

            <button
              className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'membership' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
              onClick={() => setActiveTab('membership')}
            >
              👑 My Membership
            </button>

            {currentUser.isAdmin && (
              <button
                className={`flex-shrink-0 px-4 py-2 whitespace-nowrap ${activeTab === 'partnerAdmin' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('partnerAdmin')}
              >
                🎯 Partner Stores
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto">
          {activeTab === 'ads' && (
            <div className="space-y-6">
              {isLoadingMainTab ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-400 text-lg">Loading dashboard...</p>
                  <p className="text-gray-500 text-sm mt-2">Preparing your data</p>
                </div>
              ) : (
                <>
                  {renderAffiliateEarnings()}

              {/* Affiliate Section */}
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <h3 className="text-xl font-semibold text-blue-400">Affiliate Program</h3>
                  {earningsSummary?.isVipAffiliate && (
                    <div className="ml-3 bg-yellow-500 text-black font-bold text-xs px-2 py-1 rounded-full flex items-center">
                      <span className="mr-1">VIP</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.953a1.5 1.5 0 001.421 1.033h4.171c.949 0 1.341 1.154.577 1.715l-3.38 2.458a1.5 1.5 0 00-.54 1.659l1.286 3.953c.3.921-.755 1.688-1.54 1.118l-3.38-2.458a1.5 1.5 0 00-1.76 0l-3.38 2.458c-.784.57-1.838-.197-1.539-1.118l1.285-3.953a1.5 1.5 0 00-.54-1.659l-3.38-2.458c-.764-.56-.372-1.715.577-1.715h4.171a1.5 1.5 0 001.421-1.033l1.286-3.953z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Loading Skeleton for Affiliate Info */}
                {!affiliateInfo ? (
                  <div className="flex items-center justify-between mb-6 animate-pulse">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-600 rounded w-48 mb-2"></div>
                      <div className="h-4 bg-gray-600 rounded w-64"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-5 bg-gray-600 rounded w-32 mb-2"></div>
                      <div className="h-8 bg-gray-600 rounded w-40"></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-gray-300">Total Affiliates: 
                        <span className="text-blue-400 font-bold ml-2">
                          {isLoadingAffiliates ? '...' : affiliateInfo.affiliateCount}
                        </span>
                        {affiliateInfo.syncStatus && affiliateInfo.syncStatus === 'fixed' && (
                          <span className="text-yellow-400 text-sm ml-2 font-medium">
                            (auto-fixed)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Share your referral code to earn more affiliates!
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300 mb-2">Your Referral Code:</p>
                      <div className="flex items-center justify-end gap-2">
                        <p 
                          className="text-blue-400 font-mono font-bold cursor-pointer hover:underline"
                          onClick={() => {
                            const referralUrl = `${window.location.origin}/?ref=${currentUser?.username}`;
                            navigator.clipboard.writeText(referralUrl).then(() => {
                              setReferralLinkCopied(true);
                              showNotification('Referral link copied to clipboard!', 'success');
                              setTimeout(() => setReferralLinkCopied(false), 2000);
                            }).catch(err => {
                              showNotification('Failed to copy referral link', 'error');
                            });
                          }}
                          title="Click to copy referral link"
                        >
                          {currentUser?.username}
                        </p>
                        
                        {/* Copy Icon */}
                        <button
                          onClick={() => {
                            const referralUrl = `${window.location.origin}/?ref=${currentUser?.username}`;
                            navigator.clipboard.writeText(referralUrl).then(() => {
                              setReferralLinkCopied(true);
                              showNotification('Referral link copied to clipboard!', 'success');
                              setTimeout(() => setReferralLinkCopied(false), 2000);
                            }).catch(err => {
                              showNotification('Failed to copy referral link', 'error');
                            });
                          }}
                          className="p-2 hover:bg-gray-600 rounded transition-colors"
                          title="Copy referral link"
                        >
                          {referralLinkCopied ? (
                            <FaCheck className="text-green-400 text-sm" />
                          ) : (
                            <FaCopy className="text-gray-400 hover:text-blue-400 text-sm" />
                          )}
                        </button>
                        
                        {/* QR Code Icon */}
                        <button
                          onClick={generateReferralQRCode}
                          className="p-2 hover:bg-gray-600 rounded transition-colors"
                          title="Generate QR code"
                        >
                          <FaQrcode className="text-gray-400 hover:text-blue-400 text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                
                {/* Points Display */}
                {!pointsInfo ? (
                  <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      <div>
                        <div className="h-5 bg-gray-600 rounded w-32 mb-2"></div>
                        <div className="h-8 bg-gray-600 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-600 rounded w-full"></div>
                      <div className="h-4 bg-gray-600 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-600 rounded w-4/6"></div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-white">Your Points</h4>
                        <p className="text-3xl font-bold text-blue-400">{pointsInfo.points}</p>
                      </div>
                      <div className="flex space-x-2">

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
                            {isRedeeming ? 'Processing...' : 'Redeem $100 CAD'}
                          </button>
                        )}
                      </div>
                    </div>
                    {redeemError && (
                      <p className="text-red-500 text-sm mt-2">{redeemError}</p>
                    )}

                    
                    {/* Points Rules */}
                    <div className="text-sm text-gray-400 mt-4">
                      <h4 className="text-lg font-medium text-white mb-2">Points Earning Rules</h4>
                      <p>• Earn 5 points for every swap completed on AquaSwap</p>
                      <p>• Earn 20 points for voting on a project bubble</p>
                      <p>• Earn 50 points for completing social media raids</p>
                      <p>• Earn 100 points for hosting X spaces for 1 hour minimum and speaking about Aquads and its features (must be recorded)</p>
                      <p>• Earn 20 points for each new affiliate</p>
                      <p>• Earn 50 points for each game vote in the gamehub</p>
                      <p>• Earn 20 points when your affiliates list a freelancer service or bubble ad</p>
                      <p>• Earn 20 points when you leave a review in the freelancer hub</p>
                      <p>• Earn 1000 points when you sign up with a referral link</p>

                      <p>• Redeem 10,000 points for $100 Canadian Dollars</p>
                    </div>
                    
                    {/* Redemption History */}
                    {(pointsInfo.giftCardRedemptions?.length > 0) && (
                      <div className="mt-4">
                        <h4 className="text-lg font-medium text-white mb-2">Redemption History</h4>
                        <div className="space-y-2">
                          {pointsInfo.giftCardRedemptions?.map((redemption, index) => (
                            <div key={`gift-${index}`} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                              <span className="text-gray-300">${redemption.amount} Canadian Dollars</span>
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

                {/* Free Raid Display */}
                {freeRaidEligibility && freeRaidEligibility.eligible && (
                  <div className="bg-purple-800/20 border border-purple-500/30 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-white">Free Raid Posts</h4>
                        <p className="text-3xl font-bold text-purple-400">
                          {freeRaidEligibility.raidsRemaining}/2
                        </p>
                        <p className="text-sm text-purple-300">
                          Daily free raids remaining
                        </p>
                      </div>
                      <div className="text-purple-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>





              {/* User's Ads */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Your Ads
                </h3>
                {userAds.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No ads found.</p>
                ) : (
                  <div className="space-y-4">
                    {userAds.map(ad => {
                      const totalVotes = (ad.bullishVotes || 0) + (ad.bearishVotes || 0);
                      const bullishPercentage = totalVotes > 0 ? Math.round(((ad.bullishVotes || 0) / totalVotes) * 100) : 0;
                      const bearishPercentage = totalVotes > 0 ? Math.round(((ad.bearishVotes || 0) / totalVotes) * 100) : 0;
                      
                      return (
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
                          
                          {/* Vote Counts Display */}
                          <div className="flex items-center space-x-6 mr-4">
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">Community Votes</div>
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1">
                                  <span className="text-green-400 font-bold">👍</span>
                                  <span className="text-green-400 font-semibold">{ad.bullishVotes || 0}</span>
                                  <span className="text-green-400 text-sm">({bullishPercentage}%)</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-red-400 font-bold">👎</span>
                                  <span className="text-red-400 font-semibold">{ad.bearishVotes || 0}</span>
                                  <span className="text-red-400 text-sm">({bearishPercentage}%)</span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Total: {totalVotes}</div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {!ad.status || ad.status !== 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleBumpClick(ad.id)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                                >
                                  Bump
                                </button>
                                <a
                                  href="https://t.me/+6rJbDLqdMxA3ZTUx"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded inline-flex items-center"
                                  title="Book a free AMA session"
                                >
                                  Book Free AMA
                                </a>
                              </>
                            ) : (
                              <span className="text-yellow-500 px-3 py-1">
                                Bump Pending
                              </span>
                            )}
                            <button
                              onClick={() => onEditAd(ad)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => { if (window.confirm('Are you sure you want to delete this ad?')) { onDeleteAd(ad.id); } }}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                              title="Delete this ad"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              {/* Token Balance Widget - Only for freelancers and admins */}
              {(currentUser?.userType === 'freelancer' || currentUser?.isAdmin) && (
                <div className="mb-6">
                  <TokenBalance 
                    onPurchaseClick={() => setShowTokenPurchaseModal(true)}
                    showNotification={showNotification}
                    currentUser={currentUser}
                  />
                </div>
              )}
              
              {activeBookingConversation ? (
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
                    alert(message);
                  }}
                  onShowReviews={handleShowReviews}
                  onOpenConversation={handleOpenConversation}
                  refreshBookings={fetchBookings}
                />
              )}
            </div>
          )}

          {activeTab === 'affiliateAnalytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">Affiliate Analytics</h2>
                <button
                  onClick={fetchAffiliateAnalytics}
                  disabled={loadingAnalytics}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loadingAnalytics ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {loadingAnalytics ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                </div>
              ) : affiliateAnalytics ? (
                <div>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-400">Total Affiliates</h3>
                      <p className="text-2xl font-bold text-blue-400">{affiliateAnalytics.summary.totalAffiliates}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-400">This Week</h3>
                      <p className="text-2xl font-bold text-green-400">+{affiliateAnalytics.summary.thisWeekSignups}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-400">Active This Week</h3>
                      <p className="text-2xl font-bold text-orange-400">{affiliateAnalytics.summary.activeThisWeek}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-400">Verified</h3>
                      <p className="text-2xl font-bold text-purple-400">{affiliateAnalytics.summary.verifiedAffiliates}</p>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Performance Tiers</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Top Performers (1000+ pts)</span>
                          <span className="text-green-400 font-bold">{affiliateAnalytics.performance.topPerformers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Moderate (500-1000 pts)</span>
                          <span className="text-yellow-400 font-bold">{affiliateAnalytics.performance.moderatePerformers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">New Users (0-500 pts)</span>
                          <span className="text-blue-400 font-bold">{affiliateAnalytics.performance.newAffiliates}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Engagement</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Verification Rate</span>
                          <span className="text-purple-400 font-bold">{affiliateAnalytics.summary.verificationRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Activity Rate</span>
                          <span className="text-orange-400 font-bold">{affiliateAnalytics.summary.activityRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Network Builders</span>
                          <span className="text-green-400 font-bold">{affiliateAnalytics.summary.networkBuilders}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Rewards</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Avg Points</span>
                          <span className="text-blue-400 font-bold">{affiliateAnalytics.summary.averagePoints}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Total Tokens</span>
                          <span className="text-yellow-400 font-bold">{affiliateAnalytics.summary.totalAffiliateTokens}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">This Month</span>
                          <span className="text-green-400 font-bold">+{affiliateAnalytics.summary.thisMonthSignups}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Growth Chart */}
                  {Object.keys(affiliateAnalytics.growth.monthlyData).length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Monthly Growth</h3>
                      <div className="flex items-end space-x-2 h-32">
                        {Object.entries(affiliateAnalytics.growth.monthlyData).map(([month, count]) => (
                          <div key={month} className="flex flex-col items-center">
                            <div 
                              className="bg-blue-500 rounded-t w-8 transition-all duration-300"
                              style={{ height: `${(count / Math.max(...Object.values(affiliateAnalytics.growth.monthlyData))) * 100}%` }}
                            ></div>
                            <span className="text-xs text-gray-400 mt-1">{month.split('-')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fraud Analysis */}
                  {affiliateAnalytics.fraudAnalysis && (
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Network Trust Analysis</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Risk Score */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Network Trust Score</h4>
                          <div className="flex items-center space-x-3">
                            <div className="relative w-16 h-16">
                              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeDasharray={`${100 - affiliateAnalytics.fraudAnalysis.riskScore}, 100`}
                                  className={`${
                                    affiliateAnalytics.fraudAnalysis.riskLevel === 'high' ? 'text-red-500' :
                                    affiliateAnalytics.fraudAnalysis.riskLevel === 'medium' ? 'text-yellow-500' :
                                    'text-green-500'
                                  }`}
                                />
                                <path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeDasharray="100, 100"
                                  className="text-gray-600"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">
                                  {Math.round(100 - affiliateAnalytics.fraudAnalysis.riskScore)}%
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className={`text-lg font-bold ${
                                affiliateAnalytics.fraudAnalysis.riskLevel === 'high' ? 'text-red-400' :
                                affiliateAnalytics.fraudAnalysis.riskLevel === 'medium' ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                {affiliateAnalytics.fraudAnalysis.riskLevel.toUpperCase()} TRUST
                              </p>
                              <p className="text-xs text-gray-400">
                                {affiliateAnalytics.fraudAnalysis.riskLevel === 'high' ? 'Review your network' :
                                 affiliateAnalytics.fraudAnalysis.riskLevel === 'medium' ? 'Moderate confidence' :
                                 'Excellent network quality'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Activity & Login Scores */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Your Activity Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Activity Diversity</span>
                              <span className="text-blue-400 font-bold">
                                {Math.round(affiliateAnalytics.fraudAnalysis.activityScore * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Login Frequency</span>
                              <span className="text-green-400 font-bold">
                                {Math.round(affiliateAnalytics.fraudAnalysis.loginFrequency * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Account Age</span>
                              <span className="text-purple-400 font-bold">
                                {affiliateAnalytics.fraudAnalysis.loginDetails.accountAgeDays || 0} days
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Network Analysis */}
                      <div className="mt-4 bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Network Diversity</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-400">
                              {affiliateAnalytics.fraudAnalysis.networkAnalysis.uniqueIPs}
                            </p>
                            <p className="text-xs text-gray-400">Unique IPs</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-400">
                              {affiliateAnalytics.fraudAnalysis.networkAnalysis.uniqueCountries}
                            </p>
                            <p className="text-xs text-gray-400">Countries</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-purple-400">
                              {affiliateAnalytics.fraudAnalysis.networkAnalysis.uniqueDevices}
                            </p>
                            <p className="text-xs text-gray-400">Devices</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-orange-400">
                              {affiliateAnalytics.fraudAnalysis.networkAnalysis.rapidSignups}
                            </p>
                            <p className="text-xs text-gray-400">Recent (24h)</p>
                          </div>
                        </div>
                      </div>

                      {/* Risk Factors */}
                      {affiliateAnalytics.fraudAnalysis.riskFactors.length > 0 && (
                        <div className="mt-4 bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Improvement Areas</h4>
                          <div className="space-y-1">
                            {affiliateAnalytics.fraudAnalysis.riskFactors.map((factor, index) => (
                              <div key={index} className="flex items-center space-x-2 text-sm">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-gray-300">
                                  {factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Affiliate List */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Your Affiliates</h3>
                    {affiliateAnalytics.affiliates.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No affiliates yet. Share your referral link to get started!</p>
                    ) : (
                      <div className="space-y-3">
                        {affiliateAnalytics.affiliates.map((affiliate, index) => (
                          <div key={index} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${affiliate.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                <span className="text-white font-medium">{affiliate.username}</span>
                              </div>
                              {affiliate.emailVerified && (
                                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">✓</span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-300">
                                {affiliate.points} pts • {affiliate.tokens} tokens
                              </div>
                              <div className="text-xs text-gray-400">
                                {affiliate.daysSinceJoin} days • {affiliate.affiliateCount} affiliates
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No affiliate data available</p>
                  <button
                    onClick={fetchAffiliateAnalytics}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
                  >
                    Load Analytics
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && currentUser.isAdmin && (
            <div className="flex h-full">
              {/* Left Sidebar Navigation */}
              <div className="w-64 bg-gray-800 rounded-l-lg p-4 border-r border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Admin Sections</h3>
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveAdminSection('bumps')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors relative ${
                      activeAdminSection === 'bumps' 
                        ? 'bg-blue-600 text-white' 
                        : pendingBumpAds.length > 0
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white bg-red-900/30 border-l-4 border-red-500'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    📈 Bump Approvals
                    {pendingBumpAds.length > 0 && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {pendingBumpAds.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveAdminSection('banners')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors relative ${
                      activeAdminSection === 'banners' 
                        ? 'bg-blue-600 text-white' 
                        : bannerAds.filter(banner => banner.status === 'pending').length > 0
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white bg-orange-900/30 border-l-4 border-orange-500'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    🎯 Banner Management
                    {bannerAds.filter(banner => banner.status === 'pending').length > 0 && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {bannerAds.filter(banner => banner.status === 'pending').length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveAdminSection('giftcards')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors relative ${
                      activeAdminSection === 'giftcards' 
                        ? 'bg-blue-600 text-white' 
                        : (pendingRedemptions.length > 0)
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white bg-yellow-900/30 border-l-4 border-yellow-500'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    🎁 Redemptions & Claims
                    {(pendingRedemptions.length > 0) && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {pendingRedemptions.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveAdminSection('listings')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors relative ${
                      activeAdminSection === 'listings' 
                        ? 'bg-blue-600 text-white' 
                        : pendingListings.length > 0
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white bg-green-900/30 border-l-4 border-green-500'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    🫧 Bubble Listings
                    {pendingListings.length > 0 && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {pendingListings.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveAdminSection('allads')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      activeAdminSection === 'allads' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    📱 All Ads Management
                  </button>
                  <button
                    onClick={() => setActiveAdminSection('premium')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors relative ${
                      activeAdminSection === 'premium' 
                        ? 'bg-blue-600 text-white' 
                        : premiumRequests.length > 0
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white bg-purple-900/30 border-l-4 border-purple-500'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    💎 Premium Requests
                    {premiumRequests.length > 0 && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {premiumRequests.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveAdminSection('tokens')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors relative ${
                      activeAdminSection === 'tokens' 
                        ? 'bg-blue-600 text-white' 
                        : pendingTokenPurchases.length > 0
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white bg-pink-900/30 border-l-4 border-pink-500'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    🪙 Token Purchases
                    {pendingTokenPurchases.length > 0 && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {pendingTokenPurchases.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveAdminSection('discountcodes')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      activeAdminSection === 'discountcodes' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    🏷️ Discount Codes
                  </button>
                  <button
                    onClick={() => setActiveAdminSection('services')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors relative ${
                      activeAdminSection === 'services' 
                        ? 'bg-blue-600 text-white' 
                        : pendingServices.length > 0
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white bg-cyan-900/30 border-l-4 border-cyan-500'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    💼 Service Approvals
                    {pendingServices.length > 0 && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {pendingServices.length}
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveAdminSection('affiliates');
                      if (topAffiliates.length === 0) fetchTopAffiliates();
                      if (suspiciousUsers.length === 0) fetchSuspiciousUsers();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      activeAdminSection === 'affiliates' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    👥 Affiliate Management
                  </button>
                </nav>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-gray-900 rounded-r-lg p-6">
                {activeAdminSection === 'bumps' && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">Pending Bump Approvals</h3>
                    {pendingBumpAds.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No pending bump approvals.</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingBumpAds.map(ad => {
                          // Calculate duration display
                          const getDurationDisplay = (durationMs) => {
                            if (durationMs === -1) return 'Lifetime';
                            const days = durationMs / (24 * 60 * 60 * 1000);
                            return `${days} days`;
                          };

                          // Calculate price based on duration
                          const getPrice = (durationMs) => {
                            if (durationMs === -1) return 150;
                            return 0;
                          };

                          const originalPrice = getPrice(ad.bumpRequest.duration);
                          const discountAmount = ad.bumpRequest.discountAmount || 0;
                          const finalPrice = originalPrice - discountAmount;
                          const isPayPal = ad.bumpRequest.txSignature === 'paypal';

                          return (
                          <div key={ad.id} className="bg-gray-700 rounded-lg p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              {/* Left side - Ad Info */}
                              <div className="flex items-start space-x-4">
                                <img src={ad.logo} alt={ad.title} className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-semibold text-base sm:text-lg mb-1">{ad.title}</h4>
                                  <p className="text-gray-400 text-sm mb-1">
                                    <span className="font-medium">Owner:</span> {ad.owner}
                                  </p>
                                  <p className="text-gray-400 text-xs sm:text-sm">
                                    <span className="font-medium">Requested:</span> {new Date(ad.bumpRequest.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Right side - Payment & Bump Details */}
                              <div className="flex flex-col items-start sm:items-end gap-3">
                                {/* Bump Details */}
                                <div className="bg-gray-800 rounded-lg p-3 w-full sm:w-auto sm:min-w-[250px]">
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between gap-4">
                                      <span className="text-gray-400">Duration:</span>
                                      <span className="text-white font-semibold">{getDurationDisplay(ad.bumpRequest.duration)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-gray-400">Payment Method:</span>
                                      <span className={`font-semibold ${isPayPal ? 'text-yellow-400' : 'text-blue-400'}`}>
                                        {isPayPal ? '💳 PayPal/Card' : '🔗 Crypto'}
                                      </span>
                                    </div>
                                    {ad.bumpRequest.appliedDiscountCode && (
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-400">Discount Code:</span>
                                        <span className="text-green-400 font-semibold">{ad.bumpRequest.appliedDiscountCode}</span>
                                      </div>
                                    )}
                                    <div className="border-t border-gray-700 pt-2 mt-2">
                                      {discountAmount > 0 && (
                                        <div className="flex justify-between gap-4 mb-1">
                                          <span className="text-gray-400">Original Price:</span>
                                          <span className="text-gray-400 line-through">${originalPrice}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-400 font-medium">Total Price:</span>
                                        <span className="text-green-400 font-bold text-base">
                                          ${finalPrice} {isPayPal ? 'USD' : 'USDC'}
                                        </span>
                                      </div>
                                      {discountAmount > 0 && (
                                        <p className="text-xs text-green-400 mt-1 text-right">
                                          Saved ${discountAmount}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Transaction Link & Actions */}
                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                  {!isPayPal ? (
                                    <a 
                                      href={`https://solscan.io/tx/${ad.bumpRequest.txSignature}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-400 hover:text-blue-300 text-sm text-center sm:text-right hover:underline"
                                    >
                                      🔍 View Transaction
                                    </a>
                                  ) : (
                                    <p className="text-yellow-400 text-sm text-center sm:text-right">
                                      💳 PayPal Payment - Verify manually
                                    </p>
                                  )}
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleApprove(ad)} 
                                      className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-semibold transition-colors"
                                    >
                                      ✓ Approve
                                    </button>
                                    <button 
                                      onClick={() => handleReject(ad)} 
                                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold transition-colors"
                                    >
                                      ✗ Reject
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Reject Modal */}
                    {showRejectModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                  </div>
                )}

                {activeAdminSection === 'banners' && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">Banner Ad Management</h3>
                    <div className="space-y-4">
                      {bannerAds.filter(banner => banner.status !== 'rejected').map(banner => (
                        <div key={banner._id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-white font-semibold text-lg">{banner.title}</h4>
                              
                              {/* User Information */}
                              <div className="mt-2 space-y-1">
                                <p className="text-gray-300 text-sm">
                                  <span className="font-medium">Created by:</span> {banner.owner?.username || 'Unknown User'} ({banner.owner?.email || 'N/A'})
                                </p>
                                <p className="text-gray-400 text-sm">
                                  <span className="font-medium">Status:</span> <span className={`font-semibold ${banner.status === 'active' ? 'text-green-400' : banner.status === 'pending' ? 'text-yellow-400' : 'text-gray-400'}`}>{banner.status}</span>
                                </p>
                                <p className="text-gray-400 text-sm">
                                  <span className="font-medium">Created:</span> {new Date(banner.createdAt).toLocaleString()}
                                </p>
                                
                                {/* Payment Information */}
                                <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-600">
                                  <p className="text-blue-400 font-semibold text-sm mb-2">💳 Payment Information</p>
                                  <div className="space-y-1">
                                    <p className="text-gray-300 text-sm">
                                      <span className="font-medium">Method:</span> {banner.txSignature === 'paypal' ? (
                                        <span className="text-yellow-400 font-semibold">Card/PayPal</span>
                                      ) : (
                                        <span className="text-blue-400 font-semibold">Crypto ({banner.chainSymbol})</span>
                                      )}
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                      <span className="font-medium">Chain:</span> {banner.paymentChain}
                                    </p>
                                    {banner.txSignature === 'paypal' ? (
                                      <p className="text-gray-300 text-sm">
                                        <span className="font-medium">Payment Link:</span>{' '}
                                        <a 
                                          href={banner.chainAddress} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-yellow-400 hover:text-yellow-300 underline"
                                        >
                                          View PayPal Payment
                                        </a>
                                      </p>
                                    ) : (
                                      <>
                                        <p className="text-gray-300 text-sm break-all">
                                          <span className="font-medium">Tx Signature:</span>{' '}
                                          <span className="font-mono text-xs text-blue-300">{banner.txSignature}</span>
                                        </p>
                                        <p className="text-gray-300 text-sm break-all">
                                          <span className="font-medium">Payment Address:</span>{' '}
                                          <span className="font-mono text-xs text-gray-400">{banner.chainAddress}</span>
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <a href={banner.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm inline-block mt-2">
                                  🔗 {banner.url}
                                </a>
                              </div>
                            </div>
                            {banner.status === 'pending' && (
                              <div className="flex space-x-2 ml-4">
                                <button 
                                  onClick={() => handleApproveBanner(banner._id)} 
                                  disabled={approvingBannerId === banner._id || rejectingBannerId === banner._id}
                                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  {approvingBannerId === banner._id ? (
                                    <>
                                      <FaSpinner className="animate-spin mr-2" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>✓ Approve</>
                                  )}
                                </button>
                                <button 
                                  onClick={() => { 
                                    const reason = prompt('Enter rejection reason:'); 
                                    if (reason) handleRejectBanner(banner._id, reason); 
                                  }} 
                                  disabled={approvingBannerId === banner._id || rejectingBannerId === banner._id}
                                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  {rejectingBannerId === banner._id ? (
                                    <>
                                      <FaSpinner className="animate-spin mr-2" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>✗ Reject</>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="mt-4">
                            <p className="text-gray-400 text-sm mb-2">Banner Preview:</p>
                            <img src={banner.gif} alt={banner.title} className="max-h-32 rounded object-contain bg-gray-800 border border-gray-600" />
                          </div>
                          {currentUser?.isAdmin && banner.status === 'active' && (
                            <div className="mt-4 flex space-x-2 pt-3 border-t border-gray-600">
                              <button onClick={() => handleEditBanner(banner)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                Edit Banner
                              </button>
                              <button onClick={() => handleDeleteBanner(banner._id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                                Delete Banner
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Banner Edit Modal */}
                {showBannerEditModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                      <h3 className="text-xl font-semibold text-white mb-4">Edit Banner Ad</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Title:
                          </label>
                          <input
                            type="text"
                            value={bannerEditData.title}
                            onChange={(e) => setBannerEditData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            URL:
                          </label>
                          <input
                            type="url"
                            value={bannerEditData.url}
                            onChange={(e) => setBannerEditData(prev => ({ ...prev, url: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            GIF URL:
                          </label>
                          <input
                            type="url"
                            value={bannerEditData.gif}
                            onChange={(e) => setBannerEditData(prev => ({ ...prev, gif: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {bannerEditData.gif && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Preview:
                            </label>
                            <img src={bannerEditData.gif} alt="Banner preview" className="max-h-32 rounded object-contain bg-gray-800" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2 mt-6">
                        <button
                          onClick={() => {
                            setShowBannerEditModal(false);
                            setSelectedBannerForEdit(null);
                            setBannerEditData({ title: '', url: '', gif: '' });
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveBannerEdit}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeAdminSection === 'giftcards' && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">Pending Redemptions & Claims</h3>
                    
                    {/* Gift Card Redemptions */}
                    <div className="mb-8">
                      <h4 className="text-xl font-semibold text-blue-400 mb-4">Gift Card Redemptions</h4>
                      {!Array.isArray(pendingRedemptions) ? (
                        <p className="text-gray-400 text-center py-8">Error loading redemptions. Please try again.</p>
                      ) : pendingRedemptions.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No pending gift card redemptions.</p>
                      ) : (
                        <div className="space-y-4">
                          {pendingRedemptions.map(user => (
                            <div key={user._id} className="bg-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="text-white font-semibold">{user.username}</h5>
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
                                  <button onClick={() => handleProcessRedemption(user._id, 'approved')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
                                    Approve
                                  </button>
                                  <button onClick={() => handleProcessRedemption(user._id, 'rejected')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>


                  </div>
                )}

                {activeAdminSection === 'listings' && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">Bubble Listing Approvals</h3>
                    <div className="bg-gray-700 rounded-lg p-4">
                      {isLoadingListings ? (
                        <div className="text-center py-8">
                          <div className="spinner"></div>
                          <p className="mt-2 text-gray-400">Loading pending listings...</p>
                        </div>
                      ) : pendingListings.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          No pending bubble listings to approve
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-600">
                                <th className="px-4 py-2 text-left text-white">Project</th>
                                <th className="px-4 py-2 text-left text-white">Owner</th>
                                <th className="px-4 py-2 text-left text-white">Payment</th>
                                <th className="px-4 py-2 text-left text-white">Date</th>
                                <th className="px-4 py-2 text-left text-white">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingListings.map((listing) => (
                                <tr key={listing.id} className="border-b border-gray-600">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center">
                                      <img src={listing.logo} alt={listing.title} className="w-8 h-8 rounded-full mr-3" onError={(e) => { e.target.src = 'https://placehold.co/40x40?text=?' }} />
                                      <div>
                                        <div className="font-medium text-white">{listing.title}</div>
                                        <div className="text-sm text-gray-400">
                                          <a href={listing.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                                            {listing.url?.replace(/(^\w+:|^)\/\//, '')}
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-gray-300">{listing.owner}</td>
                                  <td className="px-4 py-3 text-gray-300">
                                    <div className="text-sm">
                                      <div>Chain: {listing.paymentChain}</div>
                                      <div className="text-gray-400 text-xs truncate max-w-[160px]" title={listing.txSignature}>
                                        Tx: {listing.txSignature?.substring(0, 8)}...
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-gray-300">{new Date(listing.createdAt).toLocaleDateString()}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex space-x-2">
                                      <button 
                                        onClick={() => handleApproveListing(listing.id)} 
                                        disabled={approvingListingId === listing.id || approvingListingId !== null}
                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                      >
                                        {approvingListingId === listing.id && <FaSpinner className="animate-spin" />}
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => openRejectModal(listing)} 
                                        disabled={approvingListingId !== null}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeAdminSection === 'allads' && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">All Ads Management</h3>
                    {ads.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No ads found.</p>
                    ) : (
                      <div className="space-y-4">
                        {ads.map(ad => {
                          const totalVotes = (ad.bullishVotes || 0) + (ad.bearishVotes || 0);
                          const bullishPercentage = totalVotes > 0 ? Math.round(((ad.bullishVotes || 0) / totalVotes) * 100) : 0;
                          const bearishPercentage = totalVotes > 0 ? Math.round(((ad.bearishVotes || 0) / totalVotes) * 100) : 0;
                          
                          return (
                            <div key={ad.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <img src={ad.logo} alt={ad.title} className="w-12 h-12 object-contain rounded" />
                                <div>
                                  <h3 className="text-white font-semibold">{ad.title}</h3>
                                  <p className="text-gray-400 text-sm">{ad.url}</p>
                                  <p className="text-gray-400 text-sm">Owner: {ad.owner}</p>
                                  {ad.status === 'pending' && (
                                    <p className="text-yellow-500 text-sm">Bump Pending</p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Vote Counts Display */}
                              <div className="flex items-center space-x-6 mr-4">
                                <div className="text-center">
                                  <div className="text-xs text-gray-400 mb-1">Community Votes</div>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-green-400 font-bold">👍</span>
                                      <span className="text-green-400 font-semibold">{ad.bullishVotes || 0}</span>
                                      <span className="text-green-400 text-sm">({bullishPercentage}%)</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <span className="text-red-400 font-bold">👎</span>
                                      <span className="text-red-400 font-semibold">{ad.bearishVotes || 0}</span>
                                      <span className="text-red-400 text-sm">({bearishPercentage}%)</span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">Total: {totalVotes}</div>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                {!ad.status || ad.status !== 'pending' ? (
                                  <>
                                    <button onClick={() => handleBumpClick(ad.id)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded" title="Bump this ad">
                                      Bump
                                    </button>
                                    <a
                                      href="https://t.me/+6rJbDLqdMxA3ZTUx"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded inline-flex items-center"
                                      title="Book a free AMA session"
                                    >
                                      Book Free AMA
                                    </a>
                                  </>
                                ) : (
                                  <span className="text-yellow-500 px-3 py-1">
                                    Bump Pending
                                  </span>
                                )}
                                <button onClick={() => onEditAd(ad)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded" title="Edit this ad">
                                  Edit
                                </button>
                                <button onClick={() => { if (window.confirm('Are you sure you want to delete this ad?')) { onDeleteAd(ad.id); } }} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded" title="Delete this ad">
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeAdminSection === 'premium' && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">Premium Service Requests</h3>
                    {premiumRequests.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No pending premium requests</p>
                    ) : (
                      <div className="space-y-4">
                        {premiumRequests.map(request => (
                          <div key={request._id} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-white">{request.title}</h4>
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
                                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectPremium(request._id)}
                                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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

                {activeAdminSection === 'tokens' && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">Token Purchase Requests</h3>
                    {pendingTokenPurchases.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No pending token purchases</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingTokenPurchases.map(purchase => (
                          <div key={purchase._id} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <h4 className="font-medium text-white">
                                  {purchase.amount} Tokens Purchase
                                </h4>
                                <p className="text-sm text-gray-400">
                                  User: <span className="text-white">{purchase.userId?.username}</span>
                                </p>
                                <p className="text-sm text-gray-400">
                                  Cost: <span className="text-green-400 font-medium">${purchase.cost} {purchase.currency}</span>
                                </p>
                                <p className="text-sm text-gray-400">
                                  Payment Chain: <span className="text-blue-400">{purchase.paymentChain}</span>
                                </p>
                                {purchase.txSignature && (
                                  <p className="text-sm text-gray-400">
                                    TX: <span className="text-blue-400 font-mono text-xs break-all">{purchase.txSignature}</span>
                                  </p>
                                )}
                                <p className="text-sm text-gray-400">
                                  Requested: <span className="text-gray-300">{new Date(purchase.createdAt).toLocaleString()}</span>
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveTokenPurchase(purchase._id)}
                                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectTokenPurchase(purchase._id)}
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
                  </div>
                )}

                               {activeAdminSection === 'discountcodes' && (
                 <AdminDiscountCodes currentUser={currentUser} />
               )}

                {activeAdminSection === 'services' && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">Service Approvals</h3>
                    {isLoadingServices ? (
                      <div className="text-center py-8">
                        <div className="spinner"></div>
                        <p className="mt-2 text-gray-400">Loading pending services...</p>
                      </div>
                    ) : pendingServices.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No pending services to approve
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingServices.map(service => (
                          <div key={service._id} className="bg-gray-700 rounded-lg p-4">
                                                         <div className="flex flex-col">
                               {/* Full Banner Image */}
                               <div className="mb-4">
                                 <p className="font-medium text-gray-200 mb-2">Service Banner:</p>
                                 <img 
                                   src={service.image} 
                                   alt={service.title} 
                                   className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-600"
                                   onError={(e) => {
                                     e.target.src = '/api/placeholder/400/200';
                                   }}
                                 />
                               </div>
                               
                               <div className="flex justify-between items-start">
                                 <div className="flex-1">
                                   <h4 className="font-medium text-white text-lg">{service.title}</h4>
                                   <p className="text-sm text-gray-400 mb-2">
                                     Seller: <span className="text-white">{service.seller?.username}</span>
                                   </p>
                                   <p className="text-sm text-gray-400 mb-2">
                                     Category: <span className="text-blue-400">{service.category}</span>
                                   </p>
                                   <div className="flex justify-center gap-2 mb-3">
                                     <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex-1 max-w-[120px]">
                                       <div className="text-green-400 text-sm font-bold">
                                         ${service.price} {service.currency}
                                       </div>
                                       <div className="text-green-300 text-xs">
                                         Starting Price
                                       </div>
                                     </div>
                                                                             {service.hourlyRate && (
                                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 flex-1 max-w-[120px]">
                                            <div className="text-orange-400 text-sm font-bold">
                                              ${service.hourlyRate} {service.currency}/hr
                                            </div>
                                          </div>
                                        )}
                                   </div>
                                   <p className="text-sm text-gray-400 mb-2">
                                     Delivery: <span className="text-gray-300">{service.deliveryTime}</span>
                                   </p>
                                   <p className="text-sm text-gray-400 mb-2">
                                     Created: <span className="text-gray-300">{new Date(service.createdAt).toLocaleString()}</span>
                                   </p>
                                   
                                   {/* Full Description */}
                                   <div className="text-sm text-gray-300 mt-2 mb-2">
                                     <p className="font-medium text-gray-200">Description:</p>
                                     <p className="bg-gray-600 p-2 rounded mt-1 whitespace-pre-wrap">{service.description}</p>
                                   </div>
                                   
                                   {/* Requirements */}
                                   {service.requirements && (
                                     <div className="text-sm text-gray-300 mb-2">
                                       <p className="font-medium text-gray-200">Requirements:</p>
                                       <p className="bg-gray-600 p-2 rounded mt-1 whitespace-pre-wrap">{service.requirements}</p>
                                     </div>
                                   )}
                                   
                                   {/* Video URL */}
                                   {service.videoUrl && (
                                     <div className="text-sm text-gray-300 mb-2">
                                       <p className="font-medium text-gray-200">Video:</p>
                                       <a 
                                         href={service.videoUrl} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="text-blue-400 hover:text-blue-300 underline"
                                       >
                                         {service.videoUrl}
                                       </a>
                                     </div>
                                                                      )}
                                 </div>
                                 
                                 {/* Action Buttons */}
                                 <div className="flex gap-2 ml-4">
                                   <button
                                     onClick={() => handleApproveService(service._id)}
                                     className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                                   >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                     </svg>
                                     Approve
                                   </button>
                                   <button
                                     onClick={() => openServiceRejectModal(service)}
                                     className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                                   >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                     </svg>
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
                )}

                {activeAdminSection === 'affiliates' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                                            <div>
                        <h3 className="text-2xl font-semibold text-white">Affiliate Management</h3>
                        {lastRefreshTime && (
                          <div className="text-xs text-gray-400 mt-2">
                            Last refreshed: {lastRefreshTime.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleSyncAffiliateCounts}
                        disabled={loadingAffiliateData}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded font-medium disabled:opacity-50"
                      >
                        {loadingAffiliateData ? 'Syncing...' : 'Sync Affiliate Counts'}
                      </button>
                    </div>
                    
                    {/* Search Users */}
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Search Users</h4>
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={affiliateSearchQuery}
                          onChange={(e) => setAffiliateSearchQuery(e.target.value)}
                          placeholder="Search by username or email..."
                          className="flex-1 bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-400"
                          onKeyPress={(e) => e.key === 'Enter' && handleAffiliateSearch()}
                        />
                        <button
                          onClick={handleAffiliateSearch}
                          disabled={loadingAffiliateData}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                        >
                          {loadingAffiliateData ? 'Searching...' : 'Search'}
                        </button>
                      </div>
                      
                      {affiliateSearchResults.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-white font-medium">Search Results:</h5>
                          {affiliateSearchResults.map(user => (
                            <div key={user.id} className="flex justify-between items-center bg-gray-600 p-3 rounded">
                              <div>
                                <span className="text-white font-medium">{user.username}</span>
                                <span className="text-gray-300 ml-2">({user.email})</span>
                                <span className="text-blue-400 ml-2">{user.affiliateCount} affiliates</span>
                              </div>
                              <button
                                onClick={() => fetchUserAffiliates(user.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                              >
                                View Affiliates
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected User Affiliates */}
                    {selectedUserAffiliates && (
                      <div className="bg-gray-700 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-semibold text-white">
                            Affiliates for {selectedUserAffiliates.user.username}
                          </h4>
                          <button
                            onClick={() => setSelectedUserAffiliates(null)}
                            className="text-gray-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                        
                        {/* Enhanced Summary with New Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4 text-center">
                          <div className="bg-gray-600 p-3 rounded">
                            <div className="text-2xl font-bold text-white">{selectedUserAffiliates.summary.totalAffiliates}</div>
                            <div className="text-gray-300 text-sm">Total Affiliates</div>
                          </div>
                          <div className="bg-gray-600 p-3 rounded">
                            <div className="text-2xl font-bold text-green-400">{selectedUserAffiliates.summary.emailVerified}</div>
                            <div className="text-gray-300 text-sm">Email Verified</div>
                          </div>
                          <div className="bg-gray-600 p-3 rounded">
                            <div className="text-2xl font-bold text-red-400">{selectedUserAffiliates.summary.sameIP}</div>
                            <div className="text-gray-300 text-sm">Same IP</div>
                          </div>
                          <div className="bg-gray-600 p-3 rounded">
                            <div className="text-2xl font-bold text-orange-400">{selectedUserAffiliates.summary.recentSignups}</div>
                            <div className="text-gray-300 text-sm">Last 24h</div>
                          </div>
                          <div className="bg-gray-600 p-3 rounded">
                            <div className="text-2xl font-bold text-purple-400">{selectedUserAffiliates.summary.averageActivityScore || '0.00'}</div>
                            <div className="text-gray-300 text-sm">Avg Activity</div>
                          </div>
                          <div className={`p-3 rounded ${(selectedUserAffiliates.summary.dormantAffiliates || 0) > 0 ? 'bg-red-900 bg-opacity-30 border border-red-500' : 'bg-gray-600'}`}>
                            <div className={`text-2xl font-bold ${(selectedUserAffiliates.summary.dormantAffiliates || 0) > 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                              {selectedUserAffiliates.summary.dormantAffiliates || 0}
                            </div>
                            <div className="text-gray-300 text-sm">Dormant</div>
                          </div>
                          <div className={`p-3 rounded ${(selectedUserAffiliates.summary.unverifiedAffiliates || 0) > 0 ? 'bg-purple-900 bg-opacity-30 border border-purple-500' : 'bg-gray-600'}`}>
                            <div className={`text-2xl font-bold ${(selectedUserAffiliates.summary.unverifiedAffiliates || 0) > 0 ? 'text-purple-400' : 'text-gray-400'}`}>
                              {selectedUserAffiliates.summary.unverifiedAffiliates || 0}
                            </div>
                            <div className="text-gray-300 text-sm">Unverified</div>
                          </div>
                        </div>

                        {/* User Risk Analysis */}
                        {selectedUserAffiliates.user.riskScore !== undefined && (
                          <div className="bg-gray-600 p-4 rounded mb-4">
                            <h5 className="text-white font-medium mb-2">User Risk Analysis</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${selectedUserAffiliates.user.riskScore >= 75 ? 'text-red-400' : selectedUserAffiliates.user.riskScore >= 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                                  {selectedUserAffiliates.user.riskScore}%
                                </div>
                                <div className="text-gray-300 text-sm">Risk Score</div>
                              </div>
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${selectedUserAffiliates.user.activityScore < 0.2 ? 'text-red-400' : selectedUserAffiliates.user.activityScore < 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                                  {(selectedUserAffiliates.user.activityScore * 100).toFixed(0)}%
                                </div>
                                <div className="text-gray-300 text-sm">Activity Diversity</div>
                              </div>
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${selectedUserAffiliates.user.loginFrequency < 0.2 ? 'text-red-400' : selectedUserAffiliates.user.loginFrequency < 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                                  {(selectedUserAffiliates.user.loginFrequency * 100).toFixed(0)}%
                                </div>
                                <div className="text-gray-300 text-sm">Login Frequency</div>
                              </div>
                            </div>
                            {selectedUserAffiliates.user.riskFactors && selectedUserAffiliates.user.riskFactors.length > 0 && (
                              <div className="mt-3">
                                <div className="text-gray-300 text-sm mb-2">Risk Factors:</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserAffiliates.user.riskFactors.map(factor => (
                                    <span key={factor} className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                                      {factor.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Enhanced Affiliates List */}
                        <div className="max-h-96 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-600 sticky top-0">
                              <tr>
                                <th className="text-left p-2 text-white">Username</th>
                                <th className="text-left p-2 text-white">Email</th>
                                <th className="text-left p-2 text-white">Created</th>
                                <th className="text-left p-2 text-white">Points</th>
                                <th className="text-left p-2 text-white">Activity</th>
                                <th className="text-left p-2 text-white">Login Freq</th>
                                <th className="text-left p-2 text-white">Status</th>
                                <th className="text-left p-2 text-white">Country</th>
                                <th className="text-left p-2 text-white">Verified</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedUserAffiliates.affiliates.map(affiliate => {
                                                                    // Debug logging to help verify dormant detection
                                    if (affiliate.isDormant !== undefined) {
                                      logger.log(`Affiliate ${affiliate.username}: isDormant=${affiliate.isDormant}, isUnverified=${affiliate.isUnverified}, daysSinceLastSeen=${affiliate.daysSinceLastSeen}, loginFrequency=${affiliate.loginFrequency}, hasRealActivityData=${affiliate.hasRealActivityData}, accountAgeDays=${affiliate.accountAgeDays}`);
                                    }
                                return (
                                <tr key={affiliate.id} className={`border-b border-gray-600 ${affiliate.isDormant ? 'bg-red-900 bg-opacity-20' : ''} ${affiliate.isUnverified ? 'bg-purple-900 bg-opacity-20' : ''}`}>
                                  <td className="p-2 text-white">{affiliate.username}</td>
                                  <td className="p-2 text-gray-300">{affiliate.email || 'N/A'}</td>
                                  <td className="p-2 text-gray-300">{new Date(affiliate.createdAt).toLocaleDateString()}</td>
                                  <td className="p-2 text-blue-400">{affiliate.points}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      affiliate.activityScore < 0.1 ? 'bg-red-500 text-white' : 
                                      affiliate.activityScore < 0.3 ? 'bg-yellow-500 text-black' : 
                                      'bg-green-500 text-white'
                                    }`}>
                                      {((affiliate.activityScore || 0) * 100).toFixed(0)}%
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      affiliate.loginFrequency < 0.2 ? 'bg-red-500 text-white' : 
                                      affiliate.loginFrequency < 0.5 ? 'bg-yellow-500 text-black' : 
                                      'bg-green-500 text-white'
                                    }`}>
                                      {((affiliate.loginFrequency || 0) * 100).toFixed(0)}%
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex flex-col gap-1">
                                      <span className={`px-1 py-0.5 rounded text-xs ${
                                        affiliate.isOnline ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                                      }`}>
                                        {affiliate.isOnline ? 'Online' : 'Offline'}
                                      </span>
                                      {affiliate.isUnverified && (
                                        <span className="px-1 py-0.5 rounded text-xs bg-purple-500 text-white font-bold">
                                          UNVERIFIED
                                        </span>
                                      )}
                                      {affiliate.isDormant && !affiliate.isUnverified && (
                                        <span className="px-1 py-0.5 rounded text-xs bg-red-500 text-white font-bold">
                                          DORMANT
                                        </span>
                                      )}
                                      {affiliate.isDormant === false && affiliate.daysSinceLastSeen > 7 && !affiliate.isUnverified && (
                                        <span className="px-1 py-0.5 rounded text-xs bg-yellow-500 text-black">
                                          Inactive
                                        </span>
                                      )}
                                      {affiliate.daysSinceLastSeen !== undefined && (
                                        <span className="text-xs text-gray-400">
                                          {affiliate.daysSinceLastSeen}d ago
                                        </span>
                                      )}
                                      {affiliate.hasRealActivityData === false && (
                                        <span className="px-1 py-0.5 rounded text-xs bg-orange-500 text-white">
                                          No Real Data
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2 text-gray-300">{affiliate.country || 'N/A'}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 rounded text-xs ${affiliate.emailVerified ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                      {affiliate.emailVerified ? 'Yes' : 'No'}
                                    </span>
                                  </td>
                                </tr>
                              );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Top Affiliates */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                              <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-semibold text-white">Top Affiliates</h4>
                          <button
                            onClick={fetchTopAffiliates}
                            disabled={loadingAffiliateData}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                          >
                            {loadingAffiliateData ? 'Loading...' : 'Refresh'}
                          </button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {topAffiliates.map(user => (
                            <div key={user.id} className="flex justify-between items-center bg-gray-600 p-3 rounded">
                              <div>
                                <div className="text-white font-medium">{user.username}</div>
                                <div className="text-gray-300 text-sm">{user.email}</div>
                                <div className="text-blue-400 text-sm">{user.affiliateCount} affiliates • {user.points} points</div>
                              </div>
                              <button
                                onClick={() => fetchUserAffiliates(user.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                              >
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Suspicious Users */}
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-semibold text-white">Suspicious Users</h4>
                          <button
                            onClick={fetchSuspiciousUsers}
                            disabled={loadingAffiliateData}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                          >
                            {loadingAffiliateData ? 'Loading...' : 'Refresh'}
                          </button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {suspiciousUsers.map(user => (
                            <div key={user.id} className={`bg-gray-600 p-3 rounded border-l-4 ${
                              user.riskScore >= 75 ? 'border-red-500' : 
                              user.riskScore >= 50 ? 'border-yellow-500' : 
                              'border-orange-500'
                            }`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="text-white font-medium">{user.username}</div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                      user.riskScore >= 75 ? 'bg-red-500 text-white' : 
                                      user.riskScore >= 50 ? 'bg-yellow-500 text-black' : 
                                      'bg-orange-500 text-white'
                                    }`}>
                                      {user.riskScore}% RISK
                                    </span>
                                  </div>
                                  <div className="text-gray-300 text-sm">{user.email}</div>
                                  
                                  {/* Enhanced Metrics Grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                                    <div className="bg-gray-700 p-2 rounded">
                                      <div className="text-blue-400 font-medium">{user.affiliateCount}</div>
                                      <div className="text-gray-400">Affiliates</div>
                                    </div>
                                    <div className="bg-gray-700 p-2 rounded">
                                      <div className={`font-medium ${
                                        user.activityScore < 0.1 ? 'text-red-400' : 
                                        user.activityScore < 0.3 ? 'text-yellow-400' : 
                                        'text-green-400'
                                      }`}>
                                        {((user.activityScore || 0) * 100).toFixed(0)}%
                                      </div>
                                      <div className="text-gray-400">Activity</div>
                                    </div>
                                    <div className="bg-gray-700 p-2 rounded">
                                      <div className={`font-medium ${
                                        user.loginFrequency < 0.2 ? 'text-red-400' : 
                                        user.loginFrequency < 0.5 ? 'text-yellow-400' : 
                                        'text-green-400'
                                      }`}>
                                        {((user.loginFrequency || 0) * 100).toFixed(0)}%
                                      </div>
                                      <div className="text-gray-400">Login Freq</div>
                                    </div>
                                    <div className="bg-gray-700 p-2 rounded">
                                      <div className="text-gray-400 font-medium">
                                        {user.daysSinceLastSeen !== undefined ? `${user.daysSinceLastSeen}d` : 'N/A'}
                                      </div>
                                      <div className="text-gray-400">Last Seen</div>
                                    </div>
                                  </div>

                                  {/* Additional Status Indicators */}
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {user.isDormant && (
                                      <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                                        DORMANT
                                      </span>
                                    )}
                                    {user.isHighlyDormant && (
                                      <span className="bg-red-700 text-white text-xs px-2 py-1 rounded">
                                        HIGHLY DORMANT
                                      </span>
                                    )}
                                    {user.accountAgeDays < 7 && (
                                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                        NEW ACCOUNT
                                      </span>
                                    )}
                                    {user.hasRealActivityData === false && (
                                      <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded">
                                        NO REAL ACTIVITY DATA
                                      </span>
                                    )}
                                  </div>

                                  {/* Risk Factors */}
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {user.flags.map(flag => (
                                      <span key={flag} className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                                        {flag.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <button
                                  onClick={() => fetchUserAffiliates(user.id)}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded text-sm font-medium ml-2"
                                >
                                  Investigate
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* Add the Twitter Raids tab content */}
          {activeTab === 'twitterRaids' && currentUser?.isAdmin && renderTwitterRaidsTab()}

          {/* Add the Facebook Raids tab content */}
          {activeTab === 'facebookRaids' && currentUser?.isAdmin && renderFacebookRaidsTab()}
          
          {/* Partner Store tab content for project users */}
          {activeTab === 'partnerStore' && currentUser?.userType === 'project' && (
            <PartnerStoreManager currentUser={currentUser} />
          )}

          {/* Partner Admin tab content */}
          {activeTab === 'partnerAdmin' && currentUser?.isAdmin && (
            <PartnerAdmin currentUser={currentUser} />
          )}

          {/* Membership tab content */}
          {activeTab === 'membership' && (
            <MembershipManager 
              currentUser={currentUser} 
              userPoints={pointsInfo?.points || 0}
              membershipInfo={membershipInfo}
              isLoading={isLoadingMembership}
              socket={socket}
              onPointsUpdate={(newPoints) => {
                setPointsInfo(prev => prev ? { ...prev, points: newPoints } : null);
              }}
            />
          )}

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">My Job Postings</h3>
            <JobList
              jobs={userJobs}
              currentUser={currentUser}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
              onRefreshJob={handleRefreshJob}
            />
          </div>

          {currentUser?.isAdmin && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <h3 className="text-xl font-semibold mb-4">Manage VIP Affiliates</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={vipUsername}
                  onChange={(e) => setVipUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-gray-700 px-3 py-2 rounded w-full sm:flex-1"
                />
                <button
                  onClick={() => handleVipAffiliateToggle(vipUsername)}
                  className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 w-full sm:w-auto whitespace-nowrap"
                >
                  Toggle VIP Status
                </button>
              </div>
            </div>
          )}

          {currentUser?.isAdmin && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <h3 className="text-xl font-semibold mb-4">Manage Free Raid Projects</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={freeRaidUsername}
                  onChange={(e) => setFreeRaidUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-gray-700 px-3 py-2 rounded w-full sm:flex-1"
                />
                <button
                  onClick={() => handleFreeRaidProjectToggle(freeRaidUsername)}
                  className="bg-green-500 px-4 py-2 rounded hover:bg-green-600 w-full sm:w-auto whitespace-nowrap"
                >
                  Toggle Free Raid Status
                </button>
              </div>
            </div>
          )}

          {currentUser?.isAdmin && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <h3 className="text-xl font-semibold mb-4">Suspend/Unsuspend User Account</h3>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={suspensionUsername}
                    onChange={(e) => setSuspensionUsername(e.target.value)}
                    placeholder="Enter username"
                    className="bg-gray-700 px-3 py-2 rounded w-full"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="Reason for suspension (optional)"
                    className="bg-gray-700 px-3 py-2 rounded w-full sm:flex-1"
                  />
                  <button
                    onClick={() => handleSuspendUser(suspensionUsername, suspensionReason)}
                    className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 w-full sm:w-auto whitespace-nowrap"
                  >
                    Toggle Suspension
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  This will suspend or unsuspend the user account. Suspended users cannot access the platform.
                </p>
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
            alert(message);
          }}
          onReviewsUpdate={(updatedService) => {
            // Update the service data with new rating and review count
            setSelectedService(prevService => ({
              ...prevService,
              rating: updatedService.rating,
              reviews: updatedService.reviews
            }));
          }}
          viewOnly={selectedViewOnly}
        />
      )}

      {selectedAdForBump && showBumpStoreModal && (
        <BumpStore
          ad={selectedAdForBump}
          onSubmitPayment={handleSubmitBump}
          onClose={handleCloseBumpStore}
        />
      )}

      {/* Easter Egg Animation */}
      {showEasterEgg && pointsInfo && (
        <EasterEggAnimation 
          points={pointsInfo.points} 
          onClose={handleCloseEasterEgg} 
        />
      )}

      {/* Edit Job Modal */}
      {jobToEdit && (
        <CreateJobModal
          job={jobToEdit}
          onClose={() => setJobToEdit(null)}
          onCreateJob={handleUpdateJob}
        />
      )}

      {/* Rejection Confirmation Modal */}
      {showRejectListingModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold mb-4">Reject Bubble Listing</h3>
            <p className="mb-4 text-gray-300">
              You are about to reject the listing for "{selectedListing?.title}". 
              Please provide a reason for rejection:
            </p>
            <textarea
              value={listingRejectionReason}
              onChange={(e) => setListingRejectionReason(e.target.value)}
              placeholder="Enter rejection reason (optional)"
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
            ></textarea>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectListingModal(false);
                  setSelectedListing(null);
                  setListingRejectionReason('');
                }}
                disabled={isRejectingListing}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectListing}
                disabled={isRejectingListing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRejectingListing && <FaSpinner className="animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Rejection Confirmation Modal */}
      {showRejectServiceModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold mb-4">Reject Service</h3>
            <p className="mb-4 text-gray-300">
              You are about to reject the service "{selectedServiceForRejection?.title}" by {selectedServiceForRejection?.seller?.username}. 
              Please provide a reason for rejection:
            </p>
            <textarea
              value={serviceRejectionReason}
              onChange={(e) => setServiceRejectionReason(e.target.value)}
              placeholder="Enter rejection reason (optional)"
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
            ></textarea>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectServiceModal(false);
                  setSelectedServiceForRejection(null);
                  setServiceRejectionReason('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectService}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Purchase Modal - Only for freelancers and admins */}
      {showTokenPurchaseModal && (currentUser?.userType === 'freelancer' || currentUser?.isAdmin) && (
        <TokenPurchaseModal
          isOpen={showTokenPurchaseModal}
          onClose={() => setShowTokenPurchaseModal(false)}
          showNotification={showNotification}
          onPurchaseComplete={handleTokenPurchaseComplete}
          currentUser={currentUser}
        />
      )}

      {/* QR Code Customizer Modal */}
      <QRCodeCustomizerModal
        isOpen={showReferralQRModal}
        onClose={() => setShowReferralQRModal(false)}
        referralUrl={`${window.location.origin}/?ref=${currentUser?.username}`}
        username={currentUser?.username}
      />
    </div>
  );
};

export default Dashboard; 