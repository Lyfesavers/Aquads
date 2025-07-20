import React, { useState, useEffect, useRef } from 'react';
import './SocialMediaRaids.css'; // Add this to load the CSS file we'll create

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

const SocialMediaRaids = ({ currentUser, showNotification }) => {
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaid, setSelectedRaid] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [verifyingTweet, setVerifyingTweet] = useState(false);
  const [tweetUrl, setTweetUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const tweetEmbedRef = useRef(null);
  const [userData, setUserData] = useState(currentUser);
  const [twitterUsername, setTwitterUsername] = useState('');
  // Add a dedicated state for points
  const [pointsData, setPointsData] = useState({ points: 0 });
  const [loadingPoints, setLoadingPoints] = useState(true);
  
  // Add missing state variables
  const [showIframe, setShowIframe] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeInteractions, setIframeInteractions] = useState({ liked: false, retweeted: false, commented: false });
  const [iframeVerified, setIframeVerified] = useState(false);
  const iframeContainerRef = useRef(null);
  
  // Add anti-cheat tracking state
  const [interactionTimes, setInteractionTimes] = useState({
    liked: null,
    retweeted: null,
    commented: null
  });
  const [suspiciousActivity, setSuspiciousActivity] = useState({
    liked: false,
    retweeted: false,
    commented: false
  });
  
  // For admin creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRaid, setNewRaid] = useState({
    tweetUrl: '',
    title: 'Twitter Raid',
    description: 'Retweet, Like & Comment to earn 50 points!',
    points: 50
  });
  
  // For points-based raid creation
  const [showPointsCreateForm, setShowPointsCreateForm] = useState(false);
  const [pointsRaidData, setPointsRaidData] = useState({
    tweetUrl: '',
    title: 'Twitter Raid',
    description: 'Retweet, Like & Comment to earn 50 points!'
  });

  // Use a state to track if preview is loading, rather than direct DOM manipulation
  const [previewState, setPreviewState] = useState({
    loading: false,
    error: false,
    message: '',
    tweetId: null
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
    // Load Twitter widget script
    loadTwitterWidgetScript();
    // Fetch user points from API
    fetchUserPoints();
    
    // Initialize Twitter username from user data if available
    if (currentUser?.twitterUsername) {
      setTwitterUsername(currentUser.twitterUsername);
    }
  }, [currentUser]);



  useEffect(() => {
    // When tweet URL changes, try to embed it
    if (tweetUrl) {
      try {
        embedTweet(tweetUrl);
      } catch (error) {
        // Don't let embed errors crash the component
        setPreviewState({
          loading: false,
          error: true,
          message: 'Error embedding tweet. Please check URL format.',
          tweetId: null
        });
      }
    } else {
      // Reset preview state when URL is cleared
      setPreviewState({
        loading: false,
        error: false,
        message: '',
        tweetId: null
      });
    }
  }, [tweetUrl]);

  const loadTwitterWidgetScript = () => {
    // Skip if already loaded or if we've already tried loading it
    if (window.twttrLoaded) return;
    
    try {
      window.twttrLoaded = true;
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = () => {};
      script.onerror = () => {};
      document.body.appendChild(script);
    } catch (error) {
      // Error handling
    }
  };

  const extractTweetId = (url) => {
    if (!url) return null;
    
    try {
      // Handle cases where someone might paste "@URL" by mistake
      const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
      
      // Try multiple approaches to extract the tweet ID
      
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
        // Check if it's a Twitter or X domain
        if (parsedUrl.hostname.includes('twitter.com') || parsedUrl.hostname.includes('x.com')) {
          // Extract ID from pathname
          const match = parsedUrl.pathname.match(/\/status\/(\d+)/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
      
      // Approach 2: Fallback to regex for all URL formats
      // This handles regular twitter.com and x.com URLs
      const standardMatch = cleanUrl.match(/(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/i);
      if (standardMatch && standardMatch[1]) {
        return standardMatch[1];
      }
      
      // Approach 3: Handle mobile.twitter.com URLs
      const mobileMatch = cleanUrl.match(/mobile\.twitter\.com\/[^\/]+\/status\/(\d+)/i);
      if (mobileMatch && mobileMatch[1]) {
        return mobileMatch[1];
      }
      
      // Approach 4: Try to handle direct status URLs with just numbers
      const directStatusMatch = cleanUrl.match(/\/status\/(\d+)/i);
      if (directStatusMatch && directStatusMatch[1]) {
        return directStatusMatch[1];
      }
      
      // Approach 5: Last resort - just try to find any numeric sequence that could be a tweet ID
      // This is a very loose match and should be used with caution
      const looseMatch = cleanUrl.match(/(\d{10,20})/); // Tweet IDs are typically long numbers
      if (looseMatch && looseMatch[1]) {
        return looseMatch[1];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const generateVerificationCode = () => {
    // Always use aquads.xyz as the verification code
    return 'aquads.xyz';
  };

  const embedTweet = (url) => {
    // Instead of manipulating DOM directly, we'll update state
    try {
      const tweetId = extractTweetId(url);
      
      if (!tweetId) {
        setPreviewState({
          loading: false,
          error: true,
          message: 'Invalid tweet URL format',
          tweetId: null
        });
        setIframeLoading(false);
        return;
      }
      
      // Set loading state
      setPreviewState({
        loading: true,
        error: false,
        message: 'Loading tweet preview...',
        tweetId
      });
      
      // After a delay, update to "loaded" state
      // This avoids any direct DOM manipulation
      setTimeout(() => {
        setPreviewState({
          loading: false,
          error: false,
          message: 'Tweet URL verified',
          tweetId
        });
        // Set iframeLoading to false since tweet ID is ready
        setIframeLoading(false);
      }, 500);
    } catch (error) {
      setPreviewState({
        loading: false,
        error: true,
        message: 'Error verifying tweet URL',
        tweetId: null
      });
      // Also set iframeLoading to false if there's an error
      setIframeLoading(false);
    }
  };

  const verifyUserCompletion = async () => {
    try {
      // Check if all interactions are verified
      if (!iframeVerified) {
        setError('Please complete all three Twitter interactions first (like, retweet, and comment)');
        return false;
      }
      
      return true;
    } catch (error) {
      setError(error.message || 'Verification failed. Please check your inputs.');
      return false;
    }
  };

  const fetchRaids = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/twitter-raids`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Twitter raids');
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
          completion => completion.userId && completion.userId.toString() === (currentUser?.id || currentUser?._id)
        );
        
        if (selectedRaidCompleted) {
          setSelectedRaid(null);
        }
      }
    } catch (err) {
      setError('Failed to load Twitter raids. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const validateTweetUrl = (url) => {
    if (!url) {
      setIsValidUrl(true); // Empty is not invalid yet
      return true;
    }
    
    const tweetId = extractTweetId(url);
    setIsValidUrl(!!tweetId);
    return !!tweetId;
  };

  const handleRaidClick = (raid) => {
    // Don't allow interaction with pending raids
    if (raid.isPaid && raid.paymentStatus === 'pending') {
      showNotification('This raid is pending admin approval', 'warning');
      return;
    }
    
    setSelectedRaid(raid);
    
    // Set the tweet URL from the raid automatically
    setTweetUrl(raid.tweetUrl);
    setIsValidUrl(true);
    
    // Reset Twitter username for new raid
    setTwitterUsername('');
    
    // Reset iframe-related states
    handleShowIframe(false);
    setIframeInteractions({ 
      liked: false, 
      retweeted: false, 
      commented: false,
      likedLoading: false,
      retweetedLoading: false,
      commentedLoading: false
    });
    setIframeVerified(false);
    setIframeLoading(true);
    
    // Reset anti-cheat states
    setInteractionTimes({
      liked: null,
      retweeted: null,
      commented: null
    });
    setSuspiciousActivity({
      liked: false,
      retweeted: false,
      commented: false
    });
    
    // Extract tweet ID and prepare for preview
    const tweetId = extractTweetId(raid.tweetUrl);
    if (tweetId) {
      setPreviewState({
        loading: false,
        error: false,
        message: 'Tweet ready to view',
        tweetId
      });
      // Set iframeLoading to false since tweet ID is ready
      setIframeLoading(false);
    } else {
      setPreviewState({
        loading: false,
        error: true,
        message: 'Could not parse tweet URL for preview',
        tweetId: null
      });
      // Also set iframeLoading to false if there's an error
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

  const safeHandleSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault(); // Prevent the default form submission
    }
    
    // Reset the preview state instead of manipulating DOM
    setPreviewState({
      loading: false,
      error: false,
      message: 'Processing your submission...',
      tweetId: previewState.tweetId // Preserve the tweet ID
    });
    
    // Call the actual submission function
    handleSubmitTask(e);
  };

  const handleSubmitTask = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    try {
      if (!currentUser) {
        showNotification('Please log in to complete Twitter raids', 'error');
        return;
      }

      // Check if Twitter username is provided
      if (!twitterUsername.trim()) {
        setError('Please enter your Twitter username');
        return;
      }

      // Validate Twitter username format (basic validation)
      const cleanUsername = twitterUsername.trim().replace(/^@/, ''); // Remove @ if present
      const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
      if (!usernameRegex.test(cleanUsername)) {
        setError('Please enter a valid Twitter username (letters, numbers, underscore only, max 15 characters)');
        return;
      }

      // Verify all interactions are completed
      if (!iframeVerified) {
        setError('Please complete all three Twitter interactions first (like, retweet, and comment)');
        return;
      }

      // Run verification check
      const verified = await verifyUserCompletion();
      if (!verified) {
        return;
      }

      // Set submitting state
      setSubmitting(true);
      setError(null);
      
      // Save the raid ID before sending the request
      const raidId = selectedRaid._id;
      
      try {
        // Use fetchWithDelay instead of fetch
        const response = await fetchWithDelay(`${API_URL}/api/twitter-raids/${raidId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({
            tweetUrl: selectedRaid?.tweetUrl || tweetUrl || null,
            twitterUsername: cleanUsername,
            iframeVerified: true, // Always set to true since we require this
            directInteractions: iframeInteractions, // Include all interaction data
            tweetId: previewState.tweetId // Include the tweet ID explicitly
          })
        });
        
        // Get the raw text first to see if there's an error in JSON parsing
        const responseText = await response.text();
        
        let data;
        
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          throw new Error('Server returned an invalid response. Please try again later.');
        }
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to complete raid');
        }
        
        // Instead of updating React state while doing DOM manipulation,
        // use a sequential approach to avoid React reconciliation issues
        
        // Step 1: First update submitting and reset UI
        setSubmitting(false);
        setTweetUrl('');
        setPreviewState({
          loading: false,
          error: false,
          message: '',
          tweetId: null
        });
        
        // Step 2: Show success message
        const successMessage = data.message || 'Task submitted for admin approval! Points will be awarded after verification.';
        const notificationMessage = data.note ? `${successMessage} ${data.note}` : successMessage;
        setSuccess(successMessage);
        showNotification(notificationMessage, 'success');
        
        // Step 3: After a brief delay, reset selected raid and fetch new data
        setTimeout(() => {
          setSelectedRaid(null);
          // Don't reset Twitter username - keep it for next raid
          fetchRaids();
        }, 50);
      } catch (networkError) {
        setError(networkError.message || 'Network error. Please try again.');
        setSubmitting(false);
      }
    } catch (err) {
      // Display more helpful error message if the server gave us one
      if (err.message && err.message.includes('TwitterRaid validation failed')) {
        setError('There was a validation error with your submission. Please contact support.');
      } else {
        setError(err.message || 'Failed to submit task. Please try again.');
      }
      
      // Notify with error
      showNotification(err.message || 'Error completing raid', 'error');
      setSubmitting(false);
    }
  };
  
  const handleCreateRaid = async (e) => {
    e.preventDefault();
    
    if (!currentUser || !currentUser.isAdmin) {
      showNotification('Only admins can create Twitter raids', 'error');
      return;
    }
    
    if (!newRaid.tweetUrl) {
      setError('Please enter the Tweet URL');
      return;
    }
    
    // Always set fixed values for these fields
    const raidData = {
      ...newRaid,
      title: 'Twitter Raid',
      description: 'Retweet, Like & Comment to earn 50 points!',
      points: 50
    };
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(raidData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Twitter raid');
      }
      
      // Reset form and hide it
      setNewRaid({
        tweetUrl: '',
        title: 'Twitter Raid',
        description: 'Retweet, Like & Comment to earn 50 points!',
        points: 50
      });
      setShowCreateForm(false);
      
      // Refresh raids list
      fetchRaids();
      
      showNotification('Twitter raid created successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to create Twitter raid');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeleteRaid = async (raidId) => {
    if (!currentUser || !currentUser.isAdmin) {
      showNotification('Only admins can delete Twitter raids', 'error');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this Twitter raid?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids/${raidId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete Twitter raid');
      }
      
      // If the deleted raid was selected, deselect it
      if (selectedRaid && selectedRaid._id === raidId) {
        setSelectedRaid(null);
      }
      
      // Refresh raids list
      fetchRaids();
      
      showNotification('Twitter raid deleted successfully!', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to delete Twitter raid', 'error');
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRaid(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add this safety function to check if raid object is valid
  const isValidRaid = (raid) => {
    return raid && raid._id && typeof raid._id === 'string';
  };

  // Use a better fetch function that ensures responses are handled properly
  const fetchWithDelay = async (url, options) => {
    try {
      // No delay needed - just use normal fetch
      const response = await fetch(url, options);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Utility function to handle address copying
  const handleCopyAddress = async (address, setCopiedAddressCallback) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddressCallback(true);
      setTimeout(() => setCopiedAddressCallback(false), 2000);
    } catch (err) {
      console.error('Failed to copy address: ', err);
    }
  };

  // Simple iframe interaction handler without time checking
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
        if (newInteractions.liked && newInteractions.retweeted && newInteractions.commented) {
          setIframeVerified(true);
        }
        
        return newInteractions;
      });
    }, 2000);
  };

  // Add a handler function for showing/hiding iframe
  const handleShowIframe = (show) => {
    setShowIframe(show);
    if (show) {
      // Make sure we're not stuck in loading state
      setIframeLoading(false);
    }
  };

  // Add utility function to create a points-based Twitter raid
  const createPointsTwitterRaid = async (data, token) => {
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Twitter raid');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  // Function to handle submission of points-based raid form
  const handlePointsRaidSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      showNotification('Please log in to create a Twitter raid', 'error');
      return;
    }
    
    // Get latest points directly from the API
    await fetchUserPoints();
    const currentPoints = getUserPoints();
    
    if (currentPoints < 2000) {
      setError(`Not enough points. You need 2000 points but only have ${currentPoints}.`);
      return;
    }
    
    if (!pointsRaidData.tweetUrl) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Create the points-based Twitter raid
      const token = currentUser?.token || JSON.parse(localStorage.getItem('currentUser'))?.token;
      const result = await createPointsTwitterRaid(pointsRaidData, token);
      
      // Reset form and hide it
      setPointsRaidData({
        tweetUrl: '',
        title: 'Twitter Raid',
        description: 'Retweet, Like & Comment to earn 50 points!'
      });
      setShowPointsCreateForm(false);
      
      // Show success message
      showNotification(result.message || 'Twitter raid created using your affiliate points!', 'success');
      
      // Fetch updated points from the API to get the new balance
      await fetchUserPoints();
      
      // Refresh raids list
      fetchRaids();
    } catch (err) {
      setError(err.message || 'Failed to create Twitter raid');
      showNotification(err.message || 'Failed to create Twitter raid', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin function to approve a pending paid raid
  const handleApproveRaid = async (raidId) => {
    if (!currentUser || !currentUser.isAdmin) {
      showNotification('Only admins can approve raids', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids/${raidId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve raid');
      }
      
      const result = await response.json();
      showNotification(result.message || 'Raid approved successfully!', 'success');
      
      // Refresh raids list
      fetchRaids();
    } catch (error) {
      showNotification(error.message || 'Failed to approve raid', 'error');
    }
  };
  
  // Admin function to reject a pending paid raid
  const handleRejectRaid = async (raidId) => {
    if (!currentUser || !currentUser.isAdmin) {
      showNotification('Only admins can reject raids', 'error');
      return;
    }
    
    // Prompt for rejection reason
    const reason = prompt('Enter reason for rejection:');
    if (reason === null) return; // User cancelled
    
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids/${raidId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ rejectionReason: reason })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject raid');
      }
      
      const result = await response.json();
      showNotification(result.message || 'Raid rejected', 'success');
      
      // Refresh raids list
      fetchRaids();
    } catch (error) {
      showNotification(error.message || 'Failed to reject raid', 'error');
    }
  };

  if (loading && raids.length === 0) {
    return <div className="text-center p-4">Loading Twitter raids...</div>;
  }

  // Update the safeSelectedRaid check to also verify that raids are not pending
  const safeSelectedRaid = selectedRaid && isValidRaid(selectedRaid) && 
    !(selectedRaid.isPaid && selectedRaid.paymentStatus === 'pending') ? selectedRaid : null;

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <div className="bg-blue-500/10 border-b border-blue-500/30 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-blue-400">Twitter Raids</h2>
            <p className="text-gray-300 mt-2">
              Complete Twitter tasks to earn points with automated verification!
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
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {showPointsCreateForm ? 'Cancel' : 'Create Raid (2000 Points)'}
              </button>
            )}
          </div>
        </div>
        
        {/* Twitter Raid Rules */}
        <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-yellow-400 font-semibold mb-2">Twitter Raid Rules</h4>
              <div className="text-yellow-300 text-sm space-y-1">
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Twitter account must be at least <strong>6 months old</strong></span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Account must have at least <strong>100 followers</strong></span>
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
                  <span>Comments must be at least <strong>1 full sentence</strong> and include <strong>The Projects Name</strong></span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  <span>Twitter account must not be <strong>shadow banned</strong> or <strong>suspended</strong></span>
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
        
        {/* Admin Create Form */}
        {showCreateForm && currentUser?.isAdmin && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">Create New Twitter Raid</h3>
            
            <form onSubmit={handleCreateRaid}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">
                  Tweet URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="tweetUrl"
                  value={newRaid.tweetUrl}
                  onChange={handleInputChange}
                  placeholder="https://twitter.com/username/status/1234567890"
                  className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-gray-500 text-sm mt-2">
                  Enter the URL of the tweet you want users to interact with.
                  <br />
                  A new raid will be created with standard values:
                  <br />
                  • Title: "Twitter Raid"
                  <br />
                  • Description: "Retweet, Like & Comment to earn 50 points!"
                  <br />
                  • Points: 50
                </p>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded font-medium ${
                  submitting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {submitting ? 'Creating...' : 'Create Twitter Raid'}
              </button>
            </form>
          </div>
        )}
        
        {/* Points-based Raid Create Form */}
        {showPointsCreateForm && currentUser && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">Create Twitter Raid with Points (2000 Points)</h3>
            
            <form onSubmit={handlePointsRaidSubmit}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">
                  Tweet URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pointsRaidData.tweetUrl}
                  onChange={(e) => setPointsRaidData({...pointsRaidData, tweetUrl: e.target.value})}
                  placeholder="https://twitter.com/username/status/1234567890"
                  className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        onClick={(e) => {
                          e.preventDefault();
                          fetchUserPoints();
                          showNotification('Points balance refreshed', 'info');
                        }}
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
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded mb-4">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={submitting || getUserPoints() < 2000}
                className={`px-4 py-2 rounded font-medium ${
                  submitting || getUserPoints() < 2000
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {submitting 
                  ? 'Creating...' 
                  : getUserPoints() < 2000 
                    ? 'Not Enough Points (Need 2000)' 
                    : 'Create Twitter Raid with Points'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && !showCreateForm && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 m-4 rounded">
          {error}
        </div>
      )}

      {/* Verification Form - Shown at the top when a raid is selected */}
      {safeSelectedRaid && false && (
        // This form has been removed as it's now integrated in the expanded raid card
        <div></div>
      )}

      {/* Twitter Raids Listing */}
      {raids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {raids.map(raid => {
            const isSelected = safeSelectedRaid?._id === raid._id;
            const isPendingPaid = raid.isPaid && raid.paymentStatus === 'pending';
            
            // Check if user completed this raid (with multiple fallbacks)
            let userCompleted = false;
            
            // Method 1: Check the completions array (if available)
            if (currentUser && raid.completions && raid.completions.length > 0) {
              const currentId = currentUser.id || currentUser._id;
              if (currentId) {
                // Check if any completion matches this user
                for (const completion of raid.completions) {
                  let completionUserId = null;
                  
                  // Try to extract user ID in various formats
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
            
            // Method 2: Check for match in selectedRaidCompleted logic from fetchRaids function
            if (!userCompleted && currentUser && raid._id === selectedRaid?._id) {
              const currentId = currentUser.id || currentUser._id;
              const selectedRaidCompleted = raid.completions?.some(
                completion => completion.userId && completion.userId.toString() === (currentId || '').toString()
              );
              userCompleted = selectedRaidCompleted;
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
                {/* If raid is pending, add an overlay warning message */}
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
                        handleDeleteRaid(raid._id);
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
                    {/* Twitter bird logo - green for completed raids */}
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085a4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                </div>
                <p className="text-gray-300 mb-3">{raid.description}</p>
                <div className="flex justify-between items-center">
                  <a 
                    href={raid.tweetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-400 hover:underline text-sm inline-flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>View Tweet</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">+{raid.points} points</span>
                </div>
                
                {/* Admin Approval Buttons for Pending Paid Raids */}
                {currentUser?.isAdmin && raid.isPaid && raid.paymentStatus === 'pending' && (
                  <div className="mt-3 pt-3 border-t border-gray-700 flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproveRaid(raid._id);
                      }}
                      className="bg-green-600/20 hover:bg-green-600/40 text-green-400 px-2 py-1 rounded text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectRaid(raid._id);
                      }}
                      className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-2 py-1 rounded text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                  </div>
                )}
                
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
              
              {/* Expanded raid content (verification form and tweet interactions) */}
              {isSelected && (
                <div id="verification-form-section" className="bg-gray-800/80 p-4 rounded-b-lg border-l border-r border-b border-blue-500 transition-all duration-200">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <a 
                        href={safeSelectedRaid.tweetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 px-3 py-1.5 rounded text-sm inline-flex items-center"
                      >
                        <span>Open Original Tweet</span>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </a>
                      
                      {safeSelectedRaid.isPaid && (
                        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs inline-block">
                          Paid Raid
                        </span>
                      )}
                    </div>
                    
                    {/* Interactive section with tabs for better organization */}
                    <div className="mb-4 border border-gray-700 rounded-lg overflow-hidden">
                      <div className="flex">
                        <button
                          onClick={() => {
                            const newShowIframe = !showIframe;
                            handleShowIframe(newShowIframe);
                          }}
                          className={`flex-1 py-2 px-4 text-center text-sm font-medium ${
                            showIframe 
                              ? 'bg-blue-600/30 text-blue-400 border-b-2 border-blue-500' 
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {showIframe ? 'Hide Interaction Buttons' : 'Show Interaction Buttons'}
                        </button>
                      </div>
                      
                      <div className="p-4 bg-gray-800/50">
                        {/* Tweet preview and interaction UI */}
                        {previewState.tweetId ? (
                          <>
                            {/* Show iframe if enabled */}
                            {showIframe ? (
                              <div className="w-full bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
                                <div className="text-gray-400 text-sm p-2 bg-gray-800">
                                  <span className="font-semibold">Instructions:</span> Click the buttons below to interact with the tweet on Twitter. Complete all 3 interactions to verify.
                                </div>
                                
                                {/* Tweet interaction buttons */}
                                <div 
                                  ref={iframeContainerRef}
                                  className="relative bg-gray-900 p-4 sm:p-6 overflow-x-hidden"
                                >
                                  {iframeLoading ? (
                                    <div className="p-10 text-center">
                                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                      <p className="text-gray-400">Loading tweet preview...</p>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="bg-gray-800 rounded-lg p-3 sm:p-4 mb-4 text-center">
                                        <h3 className="font-bold text-base sm:text-lg text-white mb-2 whitespace-normal">Tweet Interaction</h3>
                                        <p className="text-gray-400 mb-3 text-xs sm:text-sm">Click each button to interact with the tweet.</p>
                                        <div className="flex justify-center text-blue-400">
                                          <a 
                                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(selectedRaid?.tweetUrl || tweetUrl)}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="mx-1 text-xs sm:text-sm"
                                          >
                                            @{selectedRaid?.tweetUrl?.split('/')[3] || 'Twitter'}
                                          </a>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                                        {/* Like button */}
                                        <div className={`${iframeInteractions.liked ? 'bg-green-500/20 border-green-500' : iframeInteractions.likedLoading ? 'bg-yellow-500/20 border-yellow-500' : suspiciousActivity.liked ? 'bg-red-500/20 border-red-500' : 'bg-gray-800 border-gray-700'} border rounded-lg p-2 sm:p-3 text-center transition-colors w-full sm:max-w-[80px]`}>
                                          <button 
                                            onClick={() => {
                                              if (!iframeInteractions.liked && !iframeInteractions.likedLoading) {
                                                window.open(`https://twitter.com/intent/like?tweet_id=${previewState.tweetId}`, '_blank');
                                                handleIframeInteraction('liked');
                                              }
                                            }}
                                            disabled={iframeInteractions.liked || iframeInteractions.likedLoading}
                                            className={`${(iframeInteractions.liked || iframeInteractions.likedLoading) ? 'opacity-70 cursor-default' : 'hover:text-pink-500'} w-full flex flex-row sm:flex-col items-center justify-center`}
                                          >
                                            <svg className={`w-5 h-5 sm:w-6 sm:h-6 sm:mb-1 mr-2 sm:mr-0 ${iframeInteractions.liked ? 'text-pink-500' : iframeInteractions.likedLoading ? 'text-yellow-500' : suspiciousActivity.liked ? 'text-red-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z"/>
                                            </svg>
                                            <span className={`${iframeInteractions.liked ? 'text-green-400' : iframeInteractions.likedLoading ? 'text-yellow-400' : suspiciousActivity.liked ? 'text-red-400' : 'text-gray-300'} font-medium text-xs`}>
                                              {iframeInteractions.liked ? 'Liked ✓' : iframeInteractions.likedLoading ? 'Verifying...' : suspiciousActivity.liked ? 'Try Again' : 'Like'}
                                            </span>
                                          </button>
                                        </div>
                                        
                                        {/* Retweet button */}
                                        <div className={`${iframeInteractions.retweeted ? 'bg-green-500/20 border-green-500' : iframeInteractions.retweetedLoading ? 'bg-yellow-500/20 border-yellow-500' : suspiciousActivity.retweeted ? 'bg-red-500/20 border-red-500' : 'bg-gray-800 border-gray-700'} border rounded-lg p-2 sm:p-3 text-center transition-colors w-full sm:max-w-[80px]`}>
                                          <button 
                                            onClick={() => {
                                              if (!iframeInteractions.retweeted && !iframeInteractions.retweetedLoading) {
                                                window.open(`https://twitter.com/intent/retweet?tweet_id=${previewState.tweetId}`, '_blank');
                                                handleIframeInteraction('retweeted');
                                              }
                                            }}
                                            disabled={iframeInteractions.retweeted || iframeInteractions.retweetedLoading}
                                            className={`${(iframeInteractions.retweeted || iframeInteractions.retweetedLoading) ? 'opacity-70 cursor-default' : 'hover:text-green-500'} w-full flex flex-row sm:flex-col items-center justify-center`}
                                          >
                                            <svg className={`w-5 h-5 sm:w-6 sm:h-6 sm:mb-1 mr-2 sm:mr-0 ${iframeInteractions.retweeted ? 'text-green-500' : iframeInteractions.retweetedLoading ? 'text-yellow-500' : suspiciousActivity.retweeted ? 'text-red-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"></path>
                                            </svg>
                                            <span className={`${iframeInteractions.retweeted ? 'text-green-400' : iframeInteractions.retweetedLoading ? 'text-yellow-400' : suspiciousActivity.retweeted ? 'text-red-400' : 'text-gray-300'} font-medium text-xs`}>
                                              {iframeInteractions.retweeted ? 'Retweeted ✓' : iframeInteractions.retweetedLoading ? 'Verifying...' : suspiciousActivity.retweeted ? 'Try Again' : 'Retweet'}
                                            </span>
                                          </button>
                                        </div>
                                        
                                        {/* Reply button */}
                                        <div className={`${iframeInteractions.commented ? 'bg-green-500/20 border-green-500' : iframeInteractions.commentedLoading ? 'bg-yellow-500/20 border-yellow-500' : suspiciousActivity.commented ? 'bg-red-500/20 border-red-500' : 'bg-gray-800 border-gray-700'} border rounded-lg p-2 sm:p-3 text-center transition-colors w-full sm:max-w-[80px]`}>
                                          <button 
                                            onClick={() => {
                                              if (!iframeInteractions.commented && !iframeInteractions.commentedLoading) {
                                                window.open(`https://twitter.com/intent/tweet?in_reply_to=${previewState.tweetId}`, '_blank');
                                                handleIframeInteraction('commented');
                                              }
                                            }}
                                            disabled={iframeInteractions.commented || iframeInteractions.commentedLoading}
                                            className={`${(iframeInteractions.commented || iframeInteractions.commentedLoading) ? 'opacity-70 cursor-default' : 'hover:text-blue-500'} w-full flex flex-row sm:flex-col items-center justify-center`}
                                          >
                                            <svg className={`w-5 h-5 sm:w-6 sm:h-6 sm:mb-1 mr-2 sm:mr-0 ${iframeInteractions.commented ? 'text-blue-500' : iframeInteractions.commentedLoading ? 'text-yellow-500' : suspiciousActivity.commented ? 'text-red-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67c0-.414-.335-.75-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z"></path>
                                            </svg>
                                            <span className={`${iframeInteractions.commented ? 'text-green-400' : iframeInteractions.commentedLoading ? 'text-yellow-400' : suspiciousActivity.commented ? 'text-red-400' : 'text-gray-300'} font-medium text-xs`}>
                                              {iframeInteractions.commented ? 'Replied ✓' : iframeInteractions.commentedLoading ? 'Verifying...' : suspiciousActivity.commented ? 'Try Again' : 'Reply'}
                                            </span>
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Verification status */}
                                      <div className="mt-4 text-center">
                                        <div className="flex justify-center space-x-2 mb-2">
                                          <div className={`w-3 h-3 rounded-full ${iframeInteractions.liked ? 'bg-green-500' : iframeInteractions.likedLoading ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600'}`}></div>
                                          <div className={`w-3 h-3 rounded-full ${iframeInteractions.retweeted ? 'bg-green-500' : iframeInteractions.retweetedLoading ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600'}`}></div>
                                          <div className={`w-3 h-3 rounded-full ${iframeInteractions.commented ? 'bg-green-500' : iframeInteractions.commentedLoading ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600'}`}></div>
                                        </div>
                                        
                                        {iframeVerified ? (
                                          <div className="bg-green-500/20 text-green-400 py-1 px-3 rounded-full inline-flex items-center text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            All interactions verified!
                                          </div>
                                        ) : (
                                          <div>
                                            <p className="text-gray-400 text-sm">
                                              {(iframeInteractions.liked ? 1 : 0) + 
                                              (iframeInteractions.retweeted ? 1 : 0) + 
                                              (iframeInteractions.commented ? 1 : 0)}/3 interactions completed
                                            </p>
                                            {(iframeInteractions.likedLoading || iframeInteractions.retweetedLoading || iframeInteractions.commentedLoading) && (
                                              <p className="text-yellow-400 text-xs mt-1">
                                                Verifying actions... Please wait...
                                              </p>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Anti-cheat warning removed */}
                                        
                                        {/* Anti-cheat info */}
                                        <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left">
                                          <div className="flex items-start">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="text-blue-400 text-xs">
                                              <p className="font-medium mb-1">Anti-Cheat System Active</p>
                                              <p>Please actually complete each action before returning to avoid being flagged.</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                                <div className="flex items-center mb-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mr-3">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085a4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                    </svg>
                                  </div>
                                  <h3 className="text-white font-medium text-sm">Click "Show Interaction Buttons" to get started</h3>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => {
                                      handleShowIframe(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm inline-flex items-center"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Show Interaction Buttons
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="bg-gray-800 p-4 rounded-lg text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                            <p className="text-gray-400">Loading tweet information...</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
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
                        <li>Click the "Show Interaction Buttons" button above</li>
                        <li>Use the buttons to like, retweet, and comment on the tweet</li>
                        <li>Each button will open Twitter in a new tab</li>
                        <li>Complete all three actions on Twitter</li>
                        <li>After all three actions are verified, click "Complete Task" to earn points</li>
                      </ol>
                    </div>
                    
                    {/* Form submission */}
                    <form onSubmit={safeHandleSubmit} id="verification-form">
                      {/* Hidden tweet URL input - keeping for backend compatibility */}
                      <input
                        type="hidden"
                        id="tweetUrl"
                        value={tweetUrl}
                      />
                      
                      {/* Twitter Username Input */}
                      <div className="mb-4">
                        <label htmlFor="twitterUsername" className="block text-sm font-medium text-gray-300 mb-2">
                          Your Twitter Username <span className="text-red-400">*</span>
                          {currentUser?.twitterUsername && twitterUsername === currentUser.twitterUsername && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Saved
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400">@</span>
                          </div>
                          <input
                            type="text"
                            id="twitterUsername"
                            value={twitterUsername}
                            onChange={(e) => setTwitterUsername(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="username"
                            maxLength="15"
                            required
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {currentUser?.twitterUsername && twitterUsername === currentUser.twitterUsername ? 
                            'Your saved Twitter username is pre-filled. You can change it if needed.' :
                            'Enter your Twitter username so we can verify your completion'
                          }
                        </p>
                      </div>
                      
                      {iframeVerified && (
                        <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg">
                          <div className="flex items-center text-green-400 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            All Tweet Interactions Verified!
                          </div>
                          <p className="text-gray-300 mt-1 text-sm">You can now complete the task to earn your points.</p>
                        </div>
                      )}
                      
                      <button
                        type="submit"
                        className={`w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors ${
                          verifyingTweet || submitting ? 'opacity-70 cursor-wait' : 
                          (!iframeVerified || !twitterUsername.trim().replace(/^@/, '')) ? 'opacity-50 cursor-not-allowed bg-gray-600 hover:bg-gray-600' : ''
                        }`}
                        disabled={verifyingTweet || submitting || !iframeVerified || !twitterUsername.trim().replace(/^@/, '')}
                      >
                                                 {verifyingTweet ? 'Verifying Tweet...' : 
                         submitting ? 'Submitting for Approval...' : 
                         iframeVerified && twitterUsername.trim().replace(/^@/, '') ? 'Submit for Admin Approval' : 
                         !twitterUsername.trim().replace(/^@/, '') ? 'Enter Your Twitter Username' :
                         'Complete All Three Actions to Continue'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          {loading ? 'Loading Twitter raids...' : 'No Twitter raids found'}
        </div>
      )}
    </div>
  );
};

export default SocialMediaRaids;
