import React, { useState, useEffect, useRef } from 'react';
import './SocialMediaRaids.css'; // Reuse the same CSS

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Add this delay utility function at the top of the component
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Add function to check if a raid is less than 2 days old
const isWithinTwoDays = (dateString) => {
  if (!dateString) return true; // If no date, show the raid
  const raidDate = new Date(dateString);
  const now = new Date();
  const diffTime = now - raidDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 2;
};

// Add this utility function to format the time remaining
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

// Add this utility function to format the date in a readable format
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
  const postEmbedRef = useRef(null);
  const [userData, setUserData] = useState(currentUser);
  const [facebookUsername, setFacebookUsername] = useState('');
  // Add a dedicated state for points
  const [pointsData, setPointsData] = useState({ points: 0 });
  const [loadingPoints, setLoadingPoints] = useState(true);
  
  // Add missing state variables
  const [showIframe, setShowIframe] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeInteractions, setIframeInteractions] = useState({ liked: false, shared: false, commented: false });
  const [iframeVerified, setIframeVerified] = useState(false);
  const iframeContainerRef = useRef(null);
  
  // Add anti-cheat tracking state
  const [interactionTimes, setInteractionTimes] = useState({
    liked: null,
    shared: null,
    commented: null
  });
  const [suspiciousActivity, setSuspiciousActivity] = useState({
    liked: false,
    shared: false,
    commented: false
  });
  
  // For admin creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRaid, setNewRaid] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Share & Comment to earn 50 points!',
    points: 50
  });
  
  // For points-based raid creation
  const [showPointsCreateForm, setShowPointsCreateForm] = useState(false);
  const [pointsRaidData, setPointsRaidData] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Share & Comment to earn 50 points!'
  });

  // For free raid creation
  const [showFreeRaidForm, setShowFreeRaidForm] = useState(false);
  const [freeRaidData, setFreeRaidData] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Share & Comment to earn 50 points!'
  });
  const [freeRaidEligibility, setFreeRaidEligibility] = useState(null);

  // Fetch user points data from the backend API
  const fetchUserPoints = async () => {
    // Get token from currentUser object (same as Twitter raids)
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
    // Debug: Log currentUser info
    console.log('FacebookRaids - currentUser:', currentUser);
    console.log('FacebookRaids - currentUser.token:', currentUser?.token);
    
    fetchRaids();
    fetchUserPoints();
    checkFreeRaidEligibility();
    if (currentUser?.facebookUsername) {
      setFacebookUsername(currentUser.facebookUsername);
    }
  }, [currentUser]);

  // Fetch Facebook raids
  const fetchRaids = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/facebook-raids`);
      if (response.ok) {
        const data = await response.json();
        
        // Filter out raids older than 2 days (same as Twitter raids)
        const filteredRaids = data.filter(raid => isWithinTwoDays(raid.createdAt));
        
        setRaids(filteredRaids);
      } else {
        setError('Failed to fetch Facebook raids');
      }
    } catch (error) {
      setError('Error fetching Facebook raids');
    } finally {
      setLoading(false);
    }
  };

  // Extract Facebook Post ID
  const extractPostId = (url) => {
    if (!url) return null;
    
    // Try multiple patterns for Facebook URLs
    const patterns = [
      /facebook\.com\/[^\/]+\/posts\/(\d+)/i,
      /mobile\.facebook\.com\/[^\/]+\/posts\/(\d+)/i,
      /\/posts\/(\d+)/i,
      /facebook\.com\/share\/p\/([^\/]+)/i, // Facebook share post URLs
      /\/share\/p\/([^\/]+)/i, // Facebook share post URLs (shorter pattern)
      /facebook\.com\/share\/v\/([^\/]+)/i, // Facebook share video URLs
      /\/share\/v\/([^\/]+)/i, // Facebook share video URLs (shorter pattern)
      /facebook\.com\/[^\/]+\/videos\/(\d+)/i, // Facebook video URLs
      /mobile\.facebook\.com\/[^\/]+\/videos\/(\d+)/i, // Mobile Facebook video URLs
      /\/videos\/(\d+)/i, // Video URLs (shorter pattern)
      /(\d{10,20})/ // Fallback for just numbers
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Handle raid card click
  const handleRaidClick = (raid) => {
    setSelectedRaid(raid);
    setShowIframe(true);
    setIframeLoading(true);
    setError(null);
    setSuccess(null);
  };

  // Handle iframe interactions (Like, Share, Comment)
  const handleIframeInteraction = (type) => {
    const now = Date.now();
    setInteractionTimes(prev => ({ ...prev, [type]: now }));
    
    setIframeInteractions(prev => {
      const newInteractions = { ...prev, [type]: !prev[type] };
      
      // Check for suspicious activity (too fast interactions)
      const lastInteraction = interactionTimes[type];
      if (lastInteraction && (now - lastInteraction) < 1000) {
        setSuspiciousActivity(prev => ({ ...prev, [type]: true }));
      }
      
      return newInteractions;
    });
  };

  // Handle free raid form submission
  const handleFreeRaidSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.token) {
      setError('You must be logged in to create raids');
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    setError(null);

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
        setSuccess(data.message || 'Free Facebook raid created successfully!');
        setShowFreeRaidForm(false);
        setFreeRaidData({
          postUrl: '',
          title: 'Facebook Raid',
          description: 'Like, Share & Comment to earn 50 points!'
        });
        fetchRaids();
        checkFreeRaidEligibility();
        showNotification('Free Facebook raid created successfully!', 'success');
      } else {
        setError(data.error || 'Failed to create free Facebook raid');
      }
    } catch (error) {
      setError('Error creating free Facebook raid');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle admin raid creation
  const handleCreateRaid = async (e) => {
    e.preventDefault();
    if (!currentUser?.token) {
      setError('You must be logged in to create raids');
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    setError(null);

    // Debug: Log what we're sending
    console.log('Sending admin raid data:', newRaid);
    console.log('URL being tested:', newRaid.postUrl);

    try {
      const response = await fetch(`${API_URL}/api/facebook-raids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(newRaid)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Facebook raid created successfully!');
        setShowCreateForm(false);
        setNewRaid({
          postUrl: '',
          title: 'Facebook Raid',
          description: 'Like, Share & Comment to earn 50 points!',
          points: 50
        });
        fetchRaids();
        showNotification('Facebook raid created successfully!', 'success');
      } else {
        console.log('Admin raid creation failed:', data);
        setError(data.error || 'Failed to create Facebook raid');
      }
    } catch (error) {
      setError('Error creating Facebook raid');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle points-based raid creation
  const handlePointsRaidSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.token) {
      setError('You must be logged in to create raids');
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    setError(null);

    // Debug: Log what we're sending
    console.log('Sending points raid data:', pointsRaidData);

    try {
      const response = await fetch(`${API_URL}/api/facebook-raids/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(pointsRaidData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Facebook raid created successfully with points!');
        setShowPointsCreateForm(false);
        setPointsRaidData({
          postUrl: '',
          title: 'Facebook Raid',
          description: 'Like, Share & Comment to earn 50 points!'
        });
        fetchRaids();
        fetchUserPoints(); // Refresh points balance
        showNotification(data.message || 'Facebook raid created successfully with points!', 'success');
      } else {
        console.log('Points raid creation failed:', data);
        setError(data.error || 'Failed to create Facebook raid with points');
      }
    } catch (error) {
      setError('Error creating Facebook raid with points');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input changes for admin form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRaid(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Check free raid eligibility
  const checkFreeRaidEligibility = async () => {
    if (!currentUser?.token) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/facebook-raids/free-eligibility`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFreeRaidEligibility(data.eligibility);
      }
    } catch (error) {
      console.error('Error checking free raid eligibility:', error);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Facebook Raids</h1>
            <p className="text-gray-400 mt-1">Complete Facebook raids to earn points and grow your community</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Free Raid Button */}
            {freeRaidEligibility?.eligible && (
              <button
                onClick={() => setShowFreeRaidForm(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Free Raid ({freeRaidEligibility.remainingToday} left today)
              </button>
            )}
            
            {/* Points Raid Button */}
            <button
              onClick={() => setShowPointsCreateForm(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Create with Points (2000)
            </button>
            
            {/* Admin Create Button */}
            {currentUser?.isAdmin && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Create as Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rules Section */}
      <div className="p-6 border-b border-gray-700/30 bg-gray-800/30">
        <h2 className="text-lg font-semibold text-white mb-3">How Facebook Raids Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">1</div>
            <div>
              <strong>Find a Facebook Post</strong>
              <p className="text-gray-400 mt-1">Browse available Facebook raids or create your own</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">2</div>
            <div>
              <strong>Interact with the Post</strong>
              <p className="text-gray-400 mt-1">Like, share, and comment on the Facebook post</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">3</div>
            <div>
              <strong>Earn Points</strong>
              <p className="text-gray-400 mt-1">Get points after admin approval of your completion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Success Message */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-3 m-4 rounded">
          {success}
        </div>
      )}

      {/* Error Display */}
      {error && !showCreateForm && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 m-4 rounded">
          {error}
        </div>
      )}

      {/* Free Raid Form */}
      {showFreeRaidForm && (
        <div className="bg-purple-500/10 border border-purple-500/30 p-4 m-4 rounded-lg">
                    <h3 className="text-lg font-bold text-white mb-4">Create Free Facebook Raid</h3>
          <form onSubmit={handleFreeRaidSubmit}>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Facebook Post/Video URL *</label>
              <input 
                type="text" 
                value={freeRaidData.postUrl} 
                onChange={(e) => setFreeRaidData({...freeRaidData, postUrl: e.target.value})} 
                placeholder="https://www.facebook.com/username/posts/123456789 or https://www.facebook.com/share/p/1CmC12Rtxp/ or https://www.facebook.com/share/v/1AzuJXxci7/" 
                className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                required 
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={submitting} 
                className={`px-4 py-2 rounded font-medium ${submitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
              >
                {submitting ? 'Creating...' : 'Create Free Raid'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowFreeRaidForm(false)} 
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Create Form */}
      {showCreateForm && currentUser?.isAdmin && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg m-4">
          <h3 className="text-lg font-bold text-white mb-4">Create New Facebook Raid</h3>
          <form onSubmit={handleCreateRaid}>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Facebook Post/Video URL *</label>
                             <input 
                 type="text" 
                 name="postUrl" 
                 value={newRaid.postUrl} 
                 onChange={handleInputChange} 
                 placeholder="https://www.facebook.com/username/posts/123456789 or https://www.facebook.com/share/p/1CmC12Rtxp/ or https://www.facebook.com/share/v/1AzuJXxci7/" 
                 className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                 required 
               />
              <p className="text-gray-500 text-sm mt-2">
                Enter the URL of the Facebook post you want users to interact with.
                <br />A new raid will be created with standard values:
                <br />• Title: "Facebook Raid"
                <br />• Description: "Like, Share & Comment to earn 50 points!"
                <br />• Points: 50
              </p>
            </div>
            <button 
              type="submit" 
              disabled={submitting} 
              className={`px-4 py-2 rounded font-medium ${submitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              {submitting ? 'Creating...' : 'Create Facebook Raid'}
            </button>
          </form>
        </div>
      )}

      {/* Points-based Raid Create Form */}
      {showPointsCreateForm && currentUser && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg m-4">
          <h3 className="text-lg font-bold text-white mb-4">Create Facebook Raid with Points (2000 Points)</h3>
          <form onSubmit={handlePointsRaidSubmit}>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Facebook Post/Video URL *</label>
                             <input 
                 type="text" 
                 value={pointsRaidData.postUrl} 
                 onChange={(e) => setPointsRaidData({...pointsRaidData, postUrl: e.target.value})} 
                 placeholder="https://www.facebook.com/username/posts/123456789 or https://www.facebook.com/share/p/1CmC12Rtxp/ or https://www.facebook.com/share/v/1AzuJXxci7/" 
                 className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-500" 
                 required 
               />
            </div>
            <div className="p-4 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg mb-4">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">Using Affiliate Points</p>
                  <div className="flex items-center">
                    {loadingPoints ? (
                      <p className="text-sm mr-2">Loading points balance...</p>
                    ) : (
                      <p className="text-sm mr-2">You currently have {getUserPoints()} points. Creating this raid will cost 2000 points.</p>
                    )}
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); fetchUserPoints(); showNotification('Points balance refreshed', 'info'); }} 
                      className="text-blue-400 hover:text-blue-300 p-1 rounded" 
                      title="Refresh points balance" 
                      disabled={loadingPoints}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loadingPoints ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={submitting || getUserPoints() < 2000} 
              className={`px-4 py-2 rounded font-medium ${submitting || getUserPoints() < 2000 ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
            >
              {submitting ? 'Creating...' : 'Create Facebook Raid (2000 Points)'}
            </button>
          </form>
        </div>
      )}

             {/* Facebook Raids Listing */}
       <div className="p-6">
         {loading ? (
           <div className="text-center text-gray-400 py-8">Loading Facebook raids...</div>
         ) : raids.length === 0 ? (
           <div className="text-center text-gray-400 py-8">No Facebook raids available at the moment.</div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {raids.map((raid) => (
               <div key={raid._id} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/30 hover:border-gray-600/50 transition-colors">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <h3 className="text-lg font-semibold text-white">{raid.title}</h3>
                     <p className="text-gray-400 text-sm">{raid.description}</p>
                   </div>
                   <div className="text-right">
                     <div className="text-2xl font-bold text-green-400">{raid.points}</div>
                     <div className="text-xs text-gray-500">points</div>
                   </div>
                 </div>
                 
                 <div className="mb-4">
                   <div className="text-sm text-gray-400 mb-2">Created by: {raid.createdBy?.username || 'Unknown'}</div>
                   <div className="text-sm text-gray-400 mb-2">Created: {formatDate(raid.createdAt)}</div>
                   {isWithinTwoDays(raid.createdAt) && (
                     <div className="text-sm text-yellow-400">{getDaysRemaining(raid.createdAt)}</div>
                   )}
                   
                   {/* Completions count */}
                   {raid.completions && raid.completions.length > 0 && (
                     <div className="mt-3 pt-3 border-t border-gray-700">
                       <p className="text-gray-400 text-sm">{raid.completions.length} completions</p>
                     </div>
                   )}
                 </div>

                 <div className="flex gap-2">
                   <button
                     onClick={() => handleRaidClick(raid)}
                     className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium transition-colors"
                   >
                     Complete Raid
                   </button>
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>

       {/* Completion Modal */}
       {showIframe && selectedRaid && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-white">Complete Facebook Raid</h2>
                 <button
                   onClick={() => {
                     setShowIframe(false);
                     setSelectedRaid(null);
                     setIframeLoading(false);
                     setIframeInteractions({ liked: false, shared: false, commented: false });
                     setIframeVerified(false);
                     setFacebookUsername('');
                     setError(null);
                     setSuccess(null);
                   }}
                   className="text-gray-400 hover:text-white"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Facebook Post Display */}
                 <div className="space-y-4">
                   <div className="bg-gray-800 rounded-lg p-4">
                     <h3 className="text-lg font-semibold text-white mb-2">{selectedRaid.title}</h3>
                     <p className="text-gray-400 mb-4">{selectedRaid.description}</p>
                     
                     <div className="bg-gray-700 rounded-lg p-4">
                       <div className="flex items-center justify-between mb-3">
                         <span className="text-white font-medium">Facebook Post</span>
                         <span className="text-green-400 font-bold">{selectedRaid.points} points</span>
                       </div>
                       
                       <div className="bg-gray-600 rounded p-3 mb-3">
                         <p className="text-gray-300 text-sm break-all">{selectedRaid.postUrl}</p>
                       </div>
                       
                       <div className="flex gap-2">
                         <button
                           onClick={() => window.open(selectedRaid.postUrl, '_blank')}
                           className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm inline-flex items-center"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                           </svg>
                           Open Facebook Post
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Completion Form */}
                 <div className="space-y-4">
                   {/* Error/Success messages */}
                   {error && (
                     <div className="text-red-400 mb-4 p-3 bg-red-400/10 rounded-lg">
                       <div className="flex items-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                         </svg>
                         {error}
                       </div>
                     </div>
                   )}
                   
                   {success && (
                     <div className="text-green-400 mb-4 p-3 bg-green-400/10 rounded-lg">
                       <div className="flex items-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                         </svg>
                         {success}
                       </div>
                     </div>
                   )}
                   
                   {/* How to complete guide */}
                   <div className="bg-gray-800/70 rounded p-3 border border-gray-700 mb-4">
                     <h4 className="text-white font-medium mb-2 text-sm">How to Complete:</h4>
                     <ol className="list-decimal list-inside text-gray-400 text-xs space-y-1 ml-2">
                       <li>Click "Open Facebook Post" to view the post</li>
                       <li>Like, share, and comment on the Facebook post</li>
                       <li>Complete all three actions on Facebook</li>
                       <li>Enter your Facebook username below</li>
                       <li>Click "Submit for Admin Approval" to earn points</li>
                     </ol>
                   </div>
                   
                   {/* Form submission */}
                   <form onSubmit={async (e) => {
                     e.preventDefault();
                     if (!currentUser?.token) {
                       setError('You must be logged in to complete raids');
                       return;
                     }
                     if (!facebookUsername.trim()) {
                       setError('Please enter your Facebook username');
                       return;
                     }
                     
                     setSubmitting(true);
                     setError(null);
                     
                     try {
                       const response = await fetch(`${API_URL}/api/facebook-raids/${selectedRaid._id}/complete`, {
                         method: 'POST',
                         headers: {
                           'Content-Type': 'application/json',
                           'Authorization': `Bearer ${currentUser.token}`
                         },
                         body: JSON.stringify({
                           postUrl: selectedRaid.postUrl,
                           facebookUsername: facebookUsername.trim().replace(/^@/, ''),
                           postId: extractPostId(selectedRaid.postUrl)
                         })
                       });
                       
                       const data = await response.json();
                       
                       if (response.ok) {
                         setSuccess(data.message || 'Facebook raid completed successfully! Your submission is pending admin approval.');
                         showNotification(data.message || 'Facebook raid completed successfully!', 'success');
                         // Close modal after 3 seconds
                         setTimeout(() => {
                           setShowIframe(false);
                           setSelectedRaid(null);
                           setFacebookUsername('');
                           setSuccess(null);
                         }, 3000);
                       } else {
                         setError(data.error || 'Failed to complete Facebook raid');
                       }
                     } catch (error) {
                       setError('Error completing Facebook raid');
                     } finally {
                       setSubmitting(false);
                     }
                   }}>
                     {/* Facebook Username Input */}
                     <div className="mb-4">
                       <label htmlFor="facebookUsername" className="block text-sm font-medium text-gray-300 mb-2">
                         Your Facebook Username <span className="text-red-400">*</span>
                       </label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <span className="text-gray-400">@</span>
                         </div>
                         <input
                           type="text"
                           id="facebookUsername"
                           value={facebookUsername}
                           onChange={(e) => setFacebookUsername(e.target.value)}
                           className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="username"
                           maxLength="50"
                           required
                         />
                       </div>
                       <p className="text-xs text-gray-400 mt-1">
                         Enter your Facebook username so we can verify your completion
                       </p>
                     </div>
                     
                     <button
                       type="submit"
                       className={`w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors ${
                         submitting ? 'opacity-70 cursor-wait' : 
                         (!facebookUsername.trim().replace(/^@/, '')) ? 'opacity-50 cursor-not-allowed bg-gray-600 hover:bg-gray-600' : ''
                       }`}
                       disabled={submitting || !facebookUsername.trim().replace(/^@/, '')}
                     >
                       {submitting ? 'Submitting for Approval...' : 
                        facebookUsername.trim().replace(/^@/, '') ? 'Submit for Admin Approval' : 
                        'Enter Your Facebook Username'}
                     </button>
                   </form>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default FacebookRaids;
