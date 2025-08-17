import React, { useState, useEffect, useRef } from 'react';
import './SocialMediaRaids.css'; // Reuse the same CSS

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isWithinTwoDays = (dateString) => {
  if (!dateString) return true;
  const raidDate = new Date(dateString);
  const now = new Date();
  const diffTime = now - raidDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 2;
};

const getDaysRemaining = (dateString) => {
  if (!dateString) return null;
  const raidDate = new Date(dateString);
  const now = new Date();
  const diffTime = now - raidDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const timeRemaining = Math.ceil(2 - diffDays);
  
  if (timeRemaining <= 0) return "Expiring today";
  return "Less than 2 days left";
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const FacebookRaids = ({ currentUser, showNotification }) => {
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaid, setSelectedRaid] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [verifyingPost, setVerifyingPost] = useState(false);
  const [postUrl, setPostUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [userData, setUserData] = useState(currentUser);
  const [facebookUsername, setFacebookUsername] = useState('');
  const [pointsData, setPointsData] = useState({ points: 0 });
  const [loadingPoints, setLoadingPoints] = useState(true);
  
  // Iframe states
  const [showIframe, setShowIframe] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeInteractions, setIframeInteractions] = useState({ liked: false, shared: false, commented: false });
  const [iframeVerified, setIframeVerified] = useState(false);
  const iframeContainerRef = useRef(null);
  
  // Admin creation states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRaid, setNewRaid] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Share & Comment to earn 50 points!',
    points: 50
  });
  
  // Points-based raid creation
  const [showPointsCreateForm, setShowPointsCreateForm] = useState(false);
  const [pointsRaidData, setPointsRaidData] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Share & Comment to earn 50 points!'
  });

  // Free raid creation
  const [showFreeRaidForm, setShowFreeRaidForm] = useState(false);
  const [freeRaidData, setFreeRaidData] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Share & Comment to earn 50 points!'
  });
  const [freeRaidSubmitting, setFreeRaidSubmitting] = useState(false);
  const [freeRaidEligibility, setFreeRaidEligibility] = useState(null);

  // Preview state
  const [previewState, setPreviewState] = useState({
    loading: false,
    error: false,
    message: '',
    postId: null
  });

  // Fetch user points data from the backend API
  const fetchUserPoints = async () => {
    if (!currentUser?.token) {
      setLoadingPoints(false);
      return;
    }

    try {
      setLoadingPoints(true);
      
      const response = await fetch(`${API_URL}/api/points/my-points`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPointsData(data);
        
        // Also update the localStorage to keep everything in sync
        try {
          const storedUser = JSON.parse(localStorage.getItem('currentUser'));
          if (storedUser) {
            storedUser.points = data.points;
            localStorage.setItem('currentUser', JSON.stringify(storedUser));
          }
        } catch (e) {
          // Silently handle localStorage errors
        }
      } else {
        // Error handled silently to avoid console logs
      }
    } catch (error) {
      // Silently handle fetch errors
    } finally {
      setLoadingPoints(false);
    }
  };

  // Get user points - now using our dedicated pointsData state
  const getUserPoints = () => {
    // First try from our dedicated pointsData state
    if (pointsData && typeof pointsData.points === 'number') {
      return pointsData.points;
    }
    
    // Try from userData state
    if (userData && typeof userData.points === 'number') {
      return userData.points;
    }
    
    // Try from currentUser prop
    if (currentUser && typeof currentUser.points === 'number') {
      return currentUser.points;
    }
    
    // Try from localStorage
    try {
      const storedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (storedUser && typeof storedUser.points === 'number') {
        return storedUser.points;
      }
    } catch (e) {
      // Silently handle localStorage errors
    }
    
    // Default to 0
    return 0;
  };

  useEffect(() => {
    fetchRaids();
    fetchUserPoints();
    checkFreeRaidEligibility();
    
    // Initialize Facebook username from user data if available
    if (currentUser?.facebookUsername) {
      setFacebookUsername(currentUser.facebookUsername);
    }
  }, [currentUser]);

  // Check free raid eligibility
  const checkFreeRaidEligibility = async () => {
    if (!currentUser?.token) {
      setFreeRaidEligibility({ eligible: false, reason: 'User ID not available' });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/facebook-raids/free-eligibility`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFreeRaidEligibility(data.eligibility);
      } else {
        setFreeRaidEligibility({ eligible: false, reason: 'Not a free raid project' });
      }
    } catch (error) {
      setFreeRaidEligibility({ eligible: false, reason: 'Error checking eligibility' });
    }
  };

  const fetchRaids = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/facebook-raids`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Facebook raids');
      }
      
      const data = await response.json();
      
      // Filter out raids older than 2 days
      const filteredRaids = data.filter(raid => isWithinTwoDays(raid.createdAt));
      
      setRaids(filteredRaids);
      
      // If a raid was selected, but it's now completed, we should deselect it
      if (selectedRaid) {
        const raidStillAvailable = filteredRaids.find(r => r._id === selectedRaid._id);
        
        // Check if the current user has completed this raid
        const selectedRaidCompleted = raidStillAvailable?.completions?.some(
          completion => completion.userId && completion.userId.toString() === (currentUser?.userId || currentUser?.id || currentUser?._id)
        );
        
        if (selectedRaidCompleted) {
          setSelectedRaid(null);
        }
      }
    } catch (err) {
      setError('Failed to load Facebook raids. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const extractPostId = (url) => {
    if (!url) return null;
    
    try {
      // Handle cases where someone might paste "@URL" by mistake
      const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
      
      // Try multiple approaches to extract the post ID
      
      // Approach 1: Try to parse as a URL first
      let parsedUrl;
      try {
        // Check if URL has protocol, add if missing
        const urlWithProtocol = (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('https'))
          ? `https://${cleanUrl}` 
          : cleanUrl;
        
        parsedUrl = new URL(urlWithProtocol);
      } catch (e) {
        // Continue to fallback regex approach
      }
      
      // If we successfully parsed the URL, check the domain and extract ID
      if (parsedUrl) {
        // Check if it's a Facebook domain
        if (parsedUrl.hostname.includes('facebook.com')) {
          // Extract ID from pathname
          const match = parsedUrl.pathname.match(/\/posts\/(\d+)/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
      
      // Approach 2: Fallback to regex for all URL formats
      const standardMatch = cleanUrl.match(/facebook\.com\/[^\/]+\/posts\/(\d+)/i);
      if (standardMatch && standardMatch[1]) {
        return standardMatch[1];
      }
      
      // Approach 3: Handle mobile.facebook.com URLs
      const mobileMatch = cleanUrl.match(/mobile\.facebook\.com\/[^\/]+\/posts\/(\d+)/i);
      if (mobileMatch && mobileMatch[1]) {
        return mobileMatch[1];
      }
      
      // Approach 4: Try to handle direct posts URLs with just numbers
      const directPostMatch = cleanUrl.match(/\/posts\/(\d+)/i);
      if (directPostMatch && directPostMatch[1]) {
        return directPostMatch[1];
      }
      
      // Approach 5: Last resort - just try to find any numeric sequence that could be a post ID
      const looseMatch = cleanUrl.match(/(\d{10,20})/); // Post IDs are typically long numbers
      if (looseMatch && looseMatch[1]) {
        return looseMatch[1];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleRaidClick = (raid) => {
    // Don't allow interaction with pending raids
    if (raid.isPaid && raid.paymentStatus === 'pending') {
      showNotification('This raid is pending admin approval', 'warning');
      return;
    }
    
    setSelectedRaid(raid);
    
    // Set the post URL from the raid automatically
    setPostUrl(raid.postUrl);
    setIsValidUrl(true);
    
    // Reset iframe-related states
    setShowIframe(false);
    setIframeInteractions({ 
      liked: false, 
      shared: false, 
      commented: false,
      likedLoading: false,
      sharedLoading: false,
      commentedLoading: false
    });
    setIframeVerified(false);
    setIframeLoading(true);
    
    // Extract post ID and prepare for preview
    const postId = extractPostId(raid.postUrl);
    if (postId) {
      setPreviewState({
        loading: false,
        error: false,
        message: 'Post ready to view',
        postId
      });
      setIframeLoading(false);
    } else {
      setPreviewState({
        loading: false,
        error: true,
        message: 'Could not parse post URL for preview',
        postId: null
      });
      setIframeLoading(false);
    }
    
    // Clear error message but keep success message if present
    setError(null);
    
    // Scroll to the form section for better UX
    setTimeout(() => {
      const formElement = document.getElementById('verification-form-section');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Simple iframe interaction handler
  const handleIframeInteraction = (type) => {
    // Set this interaction to loading
    setIframeInteractions(prev => ({
      ...prev,
      [`${type}Loading`]: true
    }));
    
    // Simple 2-second delay then mark as completed
    setTimeout(() => {
      setIframeInteractions(prev => {
        const newInteractions = { 
          ...prev, 
          [type]: true,
          [`${type}Loading`]: false
        };
        
        // Check if all three interactions are completed
        if (newInteractions.liked && newInteractions.shared && newInteractions.commented) {
          setIframeVerified(true);
        }
        
        return newInteractions;
      });
    }, 2000);
  };

  // Handle free raid form submission
  const handleFreeRaidSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser?.token) {
      showNotification('Please log in to create a free raid', 'error');
      return;
    }

    if (!freeRaidData.postUrl || !freeRaidData.title || !freeRaidData.description) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setFreeRaidSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/facebook-raids/free`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(freeRaidData)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('Free Facebook raid created successfully!', 'success');
        setFreeRaidData({
          postUrl: '',
          title: 'Facebook Raid',
          description: 'Like, Share & Comment to earn 50 points!'
        });
        setShowFreeRaidForm(false);
        fetchRaids(); // Refresh the raids list
        checkFreeRaidEligibility(); // Update eligibility
      } else {
        showNotification(data.error || 'Failed to create free raid', 'error');
      }
    } catch (error) {
      showNotification('Error creating free raid', 'error');
    } finally {
      setFreeRaidSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <div className="bg-blue-500/10 border-b border-blue-500/30 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-blue-400">Facebook Raids</h2>
            <p className="text-gray-300 mt-2">
              Complete Facebook tasks to earn points with automated verification!
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {currentUser?.isAdmin && (
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  setShowPointsCreateForm(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base"
              >
                {showCreateForm ? 'Cancel' : 'Create Raid (Admin)'}
              </button>
            )}
            
            {currentUser && (
              <button
                onClick={() => {
                  setShowPointsCreateForm(!showPointsCreateForm);
                  setShowCreateForm(false);
                  setShowFreeRaidForm(false);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {showPointsCreateForm ? 'Cancel' : 'Create Raid (2000 Points)'}
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => {
                  setShowFreeRaidForm(!showFreeRaidForm);
                  setShowCreateForm(false);
                  setShowPointsCreateForm(false);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                {showFreeRaidForm ? 'Cancel' : 'Create Free Raid'}
              </button>
            )}
          </div>
        </div>
        
        {/* Facebook Raid Rules */}
        <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-yellow-400 font-semibold mb-2">Facebook Raid Rules</h4>
              <div className="text-yellow-300 text-sm space-y-1">
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Facebook account must be at least <strong>6 months old</strong></span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Account must have at least <strong>50 friends</strong></span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Must be following <strong>Aquads</strong> page</span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Account must be <strong>public</strong> (not private)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>No <strong>bot/spam accounts</strong> (reasonable posting frequency)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Comments must be at least <strong>1 full sentence</strong> and include <strong>The Projects Name. Must add value to Aquads and the account posting the content</strong></span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Facebook account must not be <strong>restricted</strong> or <strong>suspended</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Global success message */}
        {success && !selectedRaid && (
          <div className="mt-4 bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold">Raid Completed Successfully!</h4>
              <p>{success}</p>
            </div>
          </div>
        )}
      </div>

             {/* Error Display */}
       {error && !showCreateForm && (
         <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 m-4 rounded">
           {error}
         </div>
       )}

       {/* Free Raid Form */}
       {showFreeRaidForm && (
         <div className="bg-purple-500/10 border border-purple-500/30 p-4 m-4 rounded-lg">
           <h3 className="text-purple-400 font-semibold mb-4">Create Free Facebook Raid</h3>
           
           {freeRaidEligibility && (
             <div className={`mb-4 p-3 rounded-lg ${
               freeRaidEligibility.eligible
                 ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                 : 'bg-red-500/20 border border-red-500/50 text-red-400'
             }`}>
               <div className="flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${freeRaidEligibility.eligible ? 'text-green-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={freeRaidEligibility.eligible ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
                 </svg>
                 <div>
                   <div className="font-semibold">
                     {freeRaidEligibility.eligible ? 'Free Raid Available' : 'Not Eligible'}
                   </div>
                   <div className="text-sm">
                     {freeRaidEligibility.eligible
                       ? `You have ${freeRaidEligibility.raidsRemaining} free raids remaining today (${freeRaidEligibility.raidsUsedToday}/2 used)`
                       : freeRaidEligibility.reason
                     }
                   </div>
                 </div>
               </div>
             </div>
           )}
           
           <form onSubmit={handleFreeRaidSubmit} className="space-y-4">
             <div>
               <label className="block text-purple-300 text-sm font-medium mb-2">
                 Facebook Post URL *
               </label>
               <input
                 type="url"
                 value={freeRaidData.postUrl}
                 onChange={(e) => setFreeRaidData({...freeRaidData, postUrl: e.target.value})}
                 placeholder="https://www.facebook.com/username/posts/123456789"
                 className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                 required
               />
             </div>
             
             <div>
               <label className="block text-purple-300 text-sm font-medium mb-2">
                 Title *
               </label>
               <input
                 type="text"
                 value={freeRaidData.title}
                 onChange={(e) => setFreeRaidData({...freeRaidData, title: e.target.value})}
                 placeholder="Facebook Raid"
                 className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                 required
               />
             </div>
             
             <div>
               <label className="block text-purple-300 text-sm font-medium mb-2">
                 Description *
               </label>
               <textarea
                 value={freeRaidData.description}
                 onChange={(e) => setFreeRaidData({...freeRaidData, description: e.target.value})}
                 placeholder="Like, Share & Comment to earn 50 points!"
                 rows="3"
                 className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                 required
               />
             </div>
             
             <div className="flex gap-3">
               <button
                 type="submit"
                 disabled={freeRaidSubmitting || !freeRaidEligibility?.eligible}
                 className={`px-4 py-2 rounded-md font-medium transition-colors ${
                   freeRaidSubmitting || !freeRaidEligibility?.eligible
                     ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                     : 'bg-purple-600 hover:bg-purple-700 text-white'
                 }`}
               >
                 {freeRaidSubmitting ? 'Creating...' : 'Create Free Raid'}
               </button>
               <button
                 type="button"
                 onClick={() => setShowFreeRaidForm(false)}
                 className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
               >
                 Cancel
               </button>
             </div>
           </form>
         </div>
       )}

      {/* Facebook Raids Listing */}
      {raids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {raids.map(raid => {
            const isSelected = selectedRaid?._id === raid._id;
            const isPendingPaid = raid.isPaid && raid.paymentStatus === 'pending';
            
            // Check if user completed this raid
            let userCompleted = false;
            
            if (currentUser && raid.completions && raid.completions.length > 0) {
              const currentId = currentUser.userId || currentUser.id || currentUser._id;
              if (currentId) {
                for (const completion of raid.completions) {
                  let completionUserId = null;
                  
                  if (completion.userId) {
                    completionUserId = typeof completion.userId === 'object' ? completion.userId._id : completion.userId;
                  } else if (completion.user) {
                    completionUserId = typeof completion.user === 'object' ? completion.user._id : completion.user;
                  }
                  
                  if (completionUserId && completionUserId.toString() === currentId.toString()) {
                    userCompleted = true;
                    break;
                  }
                }
              }
            }
            
            return (
              <div 
                key={raid._id}
                className="raid-card-container flex flex-col"
              >
                <div 
                  className={`bg-gray-800/50 rounded-lg p-4 border relative ${
                    isPendingPaid
                      ? 'border-yellow-500/30 opacity-75 cursor-not-allowed'
                      : isSelected
                        ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer rounded-b-none' 
                        : 'border-gray-700 hover:border-blue-500/50 hover:shadow-md cursor-pointer'
                  }`}
                  style={{ transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
                  onClick={() => isPendingPaid ? 
                    showNotification('This raid is pending admin approval', 'warning') : 
                    handleRaidClick(raid)}
                >
                  {/* Pending overlay */}
                  {isPendingPaid && (
                    <div className="absolute inset-0 bg-gray-900/30 flex items-center justify-center rounded-lg z-10">
                      <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Awaiting Approval
                      </div>
                    </div>
                  )}

                  {/* Admin Delete Button */}
                  {currentUser?.isAdmin && (
                    <div 
                      className="absolute top-2 right-2 z-20 w-8 h-8" 
                      onClick={(e) => e.stopPropagation()}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <button
                        className="absolute inset-0 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full flex items-center justify-center transition-colors duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          // handleDeleteRaid(raid._id);
                        }}
                        title="Delete Raid"
                        style={{ transform: 'translateZ(0)' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                    
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center mb-1">
                        <h3 className="text-white font-bold mr-2">{raid.title}</h3>
                        {raid.isPaid && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            raid.paymentStatus === 'approved' 
                              ? 'bg-green-500/20 text-green-400' 
                              : raid.paymentStatus === 'pending' 
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}>
                            {raid.paymentStatus === 'approved' 
                              ? 'Paid' 
                              : raid.paymentStatus === 'pending' 
                                ? 'Payment Pending' 
                                : 'Payment Rejected'}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">
                        Created by: {raid.createdBy?.username || 'Admin'}
                      </p>
                      {raid.createdAt && (
                        <div className="mt-1 flex items-center">
                          <span className="text-xs text-gray-500 mr-2">
                            {formatDate(raid.createdAt)}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            raid.createdAt && getDaysRemaining(raid.createdAt).includes("today")
                              ? "bg-red-500/20 text-red-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}>
                            {getDaysRemaining(raid.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-full ${userCompleted ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'} flex items-center justify-center`} title={userCompleted ? "You've completed this raid" : ""}>
                      {/* Facebook logo */}
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-3">{raid.description}</p>
                  <div className="flex justify-between items-center">
                    <a 
                      href={raid.postUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 hover:underline text-sm inline-flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>View Post</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </a>
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">+{raid.points} points</span>
                  </div>
                  
                  {/* Completions */}
                  {raid.completions && raid.completions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-gray-400 text-sm">{raid.completions.length} completions</p>
                    </div>
                  )}
                  
                  {/* Expand/Collapse indicator */}
                  {isSelected && (
                    <div className="text-center pt-2">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 mx-auto text-blue-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          {loading ? 'Loading Facebook raids...' : 'No Facebook raids found'}
        </div>
      )}
    </div>
  );
};

export default FacebookRaids;
