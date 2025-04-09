import React, { useState, useEffect, useRef } from 'react';
import './SocialMediaRaids.css'; // Add this to load the CSS file we'll create

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Payment blockchain options
const BLOCKCHAIN_OPTIONS = [
  {
    name: 'Solana',
    symbol: 'SOL',
    address: 'F4HuQfUx5zsuQpxca4KQfX6uZPYtRp3Y7HYVGsuHdYVf',
    amount: 'USDC'
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: 'USDC'
  },
  {
    name: 'Base',
    symbol: 'BASE',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: 'USDC'
  },
  {
    name: 'Sui',
    symbol: 'SUI',
    address: '0xdadea3003856d304535c3f1b6d5670ab07a8e71715c7644bf230dd3a4ba7d13a',
    amount: 'USDC'
  }
];

// Add this delay utility function at the top of the component
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Add function to check if a raid is less than 7 days old
const isWithinSevenDays = (dateString) => {
  if (!dateString) return true; // If no date, show the raid
  const raidDate = new Date(dateString);
  const now = new Date();
  const diffTime = now - raidDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
};

// Add this utility function to format the days remaining
const getDaysRemaining = (dateString) => {
  if (!dateString) return null;
  const raidDate = new Date(dateString);
  const now = new Date();
  const diffTime = now - raidDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.ceil(7 - diffDays);
  
  if (daysRemaining <= 0) return "Expiring today";
  if (daysRemaining === 1) return "1 day left";
  return `${daysRemaining} days left`;
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
  const [twitterUsername, setTwitterUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingTweet, setVerifyingTweet] = useState(false);
  const [tweetUrl, setTweetUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const tweetEmbedRef = useRef(null);
  
  // For admin creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRaid, setNewRaid] = useState({
    tweetUrl: '',
    title: 'Twitter Raid',
    description: 'Retweet, Like & Comment to earn 50 points!',
    points: 50
  });
  
  // For paid raid creation
  const [showPaidCreateForm, setShowPaidCreateForm] = useState(false);
  const [paidRaidData, setPaidRaidData] = useState({
    tweetUrl: '',
    title: 'Twitter Raid',
    description: 'Retweet, Like & Comment to earn 50 points!',
    txSignature: ''
  });
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Add this state to track remaining raid posts
  const [remainingRaidPosts, setRemainingRaidPosts] = useState(0);

  useEffect(() => {
    fetchRaids();
    // Load Twitter widget script
    loadTwitterWidgetScript();
  }, []);

  // Add effect to get user data including remaining raid posts
  useEffect(() => {
    if (currentUser?.token) {
      fetch(`${API_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      })
        .then(res => res.json())
        .then(userData => {
          if (userData.remainingRaidPosts) {
            setRemainingRaidPosts(userData.remainingRaidPosts);
          }
        })
        .catch(err => console.error('Error fetching user data:', err));
    }
  }, [currentUser]);

  useEffect(() => {
    // When tweet URL changes, try to embed it
    if (tweetUrl) {
      try {
        embedTweet(tweetUrl);
      } catch (error) {
        console.error('Error in tweet embed useEffect:', error);
        // Don't let embed errors crash the component
        if (tweetEmbedRef.current) {
          tweetEmbedRef.current.innerHTML = '<div class="p-4 text-red-400">Error embedding tweet. Please check URL format.</div>';
        }
      }
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
      script.onload = () => {
        console.log('Twitter widgets script loaded');
      };
      script.onerror = () => {
        console.error('Failed to load Twitter widgets script');
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error loading Twitter script:', error);
    }
  };

  const extractTweetId = (url) => {
    if (!url) return null;
    
    try {
      // Handle cases where someone might paste "@URL" by mistake
      const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
      
      // Try to parse as a URL first
      let parsedUrl;
      try {
        parsedUrl = new URL(cleanUrl);
      } catch (e) {
        // If it's not a valid URL, try adding https://
        if (!cleanUrl.startsWith('http')) {
          try {
            parsedUrl = new URL(`https://${cleanUrl}`);
          } catch (err) {
            return null;
          }
        } else {
          return null;
        }
      }
      
      // Check if it's a Twitter or X domain
      if (!parsedUrl.hostname.includes('twitter.com') && !parsedUrl.hostname.includes('x.com')) {
        return null;
      }
      
      // Extract ID from pathname
      const match = parsedUrl.pathname.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error parsing tweet URL:', error);
      
      // Fallback to regex for simpler validation
      const match = url.match(/(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/i);
      return match ? match[1] : null;
    }
  };

  const generateVerificationCode = () => {
    // Always use aquads.xyz as the verification code
    return 'aquads.xyz';
  };

  const embedTweet = (url) => {
    if (!tweetEmbedRef.current) return;
    
    // Clear previous embed
    tweetEmbedRef.current.innerHTML = '';
    
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      tweetEmbedRef.current.innerHTML = '<div class="p-4 text-red-400">Invalid tweet URL format</div>';
      return;
    }
    
    // Show loading indicator
    tweetEmbedRef.current.innerHTML = 
      '<div class="flex items-center justify-center p-6">' +
        '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>' +
      '</div>';
    
    try {
      // Fallback to iframe embed which is more reliable than the widget API
      const iframe = document.createElement('iframe');
      
      iframe.setAttribute('src', `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`);
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '400px');
      iframe.setAttribute('frameBorder', '0');
      iframe.setAttribute('scrolling', 'no');
      iframe.style.borderRadius = '12px';
      iframe.style.border = '1px solid rgba(75, 85, 99, 0.3)';
      iframe.style.overflow = 'hidden';
      iframe.style.backgroundColor = 'transparent';
      
      // Clear loading indicator and add the iframe
      tweetEmbedRef.current.innerHTML = '';
      tweetEmbedRef.current.appendChild(iframe);
    } catch (error) {
      console.error('Tweet embedding error:', error);
      tweetEmbedRef.current.innerHTML = '<div class="p-4 text-red-400">Error embedding tweet: ' + (error.message || 'Unknown error') + '</div>';
    }
  };

  const verifyUserCompletion = async () => {
    if (!twitterUsername) {
      setError('Please provide your Twitter username');
      return false;
    }

    setVerifyingTweet(true);

    try {
      // Validate tweet URL format first
      if (!validateTweetUrl(tweetUrl)) {
        throw new Error('Invalid tweet URL format. Please use the format: https://x.com/username/status/1234567890');
      }

      // If URL format is valid, proceed with verification
      const tweetId = extractTweetId(tweetUrl);
      if (!tweetId) {
        throw new Error('Could not extract tweet ID from the URL. Please check the format.');
      }

      // For a more reliable approach, we'll just check if the URL looks valid
      // and let the server handle verification
      return true;
    } catch (err) {
      console.error("Verification error:", err);
      setError(err.message || "We couldn't verify your interaction with the tweet");
      return false;
    } finally {
      setVerifyingTweet(false);
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
      
      // Filter out raids older than 7 days
      const filteredRaids = data.filter(raid => isWithinSevenDays(raid.createdAt));
      
      setRaids(filteredRaids);
    } catch (err) {
      console.error('Error fetching Twitter raids:', err);
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
    setTwitterUsername('');
    setError(null);
    setSuccess(null);
    setTweetUrl('');
    setIsValidUrl(true);
    // Generate a new verification code for the user
    setVerificationCode(generateVerificationCode());
    
    // Scroll to the form section for better UX
    setTimeout(() => {
      const formElement = document.getElementById('verification-form-section');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    
    try {
      if (!currentUser) {
        showNotification('Please log in to complete Twitter raids', 'error');
        return;
      }

      if (!twitterUsername) {
        setError('Please provide your Twitter username');
        return;
      }

      // Run verification check
      const verified = await verifyUserCompletion();
      if (!verified) {
        return;
      }

      setSubmitting(true);
      setError(null);
      
      // Validate URL one more time before submission
      if (!tweetUrl || !validateTweetUrl(tweetUrl)) {
        throw new Error('Please provide a valid tweet URL');
      }

      // Add a short delay to prevent screen going blank during submission
      await delay(100);
      
      console.log('Submitting raid completion:', {
        twitterUsername,
        tweetUrl,
        raidId: selectedRaid?._id
      });
      
      // Use fetchWithDelay instead of fetch
      const response = await fetchWithDelay(`${API_URL}/api/twitter-raids/${selectedRaid._id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          twitterUsername,
          verificationCode,
          tweetUrl: tweetUrl || null
        })
      });
      
      // Get the raw text first to see if there's an error in JSON parsing
      const responseText = await response.text();
      
      // Add another small delay before updating state
      await delay(100);
      
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Error parsing response JSON:', responseText);
        throw new Error('Server returned an invalid response. Please try again later.');
      }
      
      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || 'Failed to complete raid');
      }
      
      console.log('Success response:', data);
      
      // Set success message with a delay to prevent UI issues
      await delay(100);
      setSuccess(data.message || 'Task completed! You earned points.');
      
      // Clear inputs after confirmed success
      setTwitterUsername('');
      setTweetUrl('');
      
      // Notify the user
      showNotification(data.message || 'Successfully completed Twitter raid!', 'success');
      
      // After a delay, refresh the raids list to show completion
      setTimeout(() => {
        fetchRaids();
      }, 500);
    } catch (err) {
      console.error('Task submission error:', err);
      
      // Display more helpful error message if the server gave us one
      if (err.message && err.message.includes('TwitterRaid validation failed')) {
        setError('There was a validation error with your submission. Please contact support.');
      } else {
        setError(err.message || 'Failed to submit task. Please try again.');
      }
      
      // Notify with error
      showNotification(err.message || 'Error completing raid', 'error');
    } finally {
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

  // Use setTimeout in the fetch function to prevent screen going blank
  const fetchWithDelay = async (url, options) => {
    try {
      // Introduce a minimal delay to prevent rendering issues
      await delay(100);
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error("Fetch with delay error:", error);
      throw error;
    }
  };

  // Add this wrapper function around the form submission
  const safeHandleSubmit = (e) => {
    try {
      // Add a short preventive delay to avoid UI freezing
      setTimeout(() => {
        try {
          handleSubmitTask(e);
        } catch (innerError) {
          console.error("Error in delayed submit:", innerError);
          setError("An error occurred during submission. Please try again.");
          setSubmitting(false);
        }
      }, 50);
    } catch (outerError) {
      console.error("Error in submit wrapper:", outerError);
      setError("An error occurred. Please try again.");
      setSubmitting(false);
    }
    
    // Return false to prevent default form submission
    return false;
  };

  // Utility function to handle address copying
  const handleCopyAddress = async (address, setCopiedAddressCallback) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddressCallback(true);
      setTimeout(() => setCopiedAddressCallback(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Utility function to create a paid Twitter raid
  const createPaidTwitterRaid = async (data, token) => {
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids/paid`, {
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
      console.error('Error creating paid Twitter raid:', error);
      throw error;
    }
  };

  // Function to handle submission of paid raid form
  const handlePaidRaidSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      showNotification('Please log in to create a paid Twitter raid', 'error');
      return;
    }
    
    if (!paidRaidData.tweetUrl || !paidRaidData.txSignature) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare data for submission
      const submissionData = {
        ...paidRaidData,
        paymentChain: selectedChain.name,
        chainSymbol: selectedChain.symbol,
        chainAddress: selectedChain.address
      };
      
      // Create the paid Twitter raid
      const result = await createPaidTwitterRaid(submissionData, currentUser.token);
      
      // Reset form and hide it
      setPaidRaidData({
        tweetUrl: '',
        title: 'Twitter Raid',
        description: 'Retweet, Like & Comment to earn 50 points!',
        txSignature: ''
      });
      setShowPaidCreateForm(false);
      
      // Show success message
      showNotification(result.message || 'Twitter raid created! Awaiting payment approval.', 'success');
      
      // Fetch updated user data to get remainingRaidPosts
      try {
        const userResponse = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setRemainingRaidPosts(userData.remainingRaidPosts || 0);
          if (userData.remainingRaidPosts > 0) {
            showNotification(`You have ${userData.remainingRaidPosts} remaining raid posts available.`, 'info');
          }
        }
      } catch (userError) {
        console.error('Error fetching updated user data:', userError);
      }
      
      // Refresh raids list
      fetchRaids();
    } catch (err) {
      console.error('Error submitting paid raid:', err);
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
      showNotification(result.message || 'Raid approved successfully! User now has 4 additional raid posts available.', 'success');
      
      // Refresh raids list
      fetchRaids();
    } catch (error) {
      console.error('Error approving raid:', error);
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
      console.error('Error rejecting raid:', error);
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
                  setShowPaidCreateForm(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base"
              >
                {showCreateForm ? 'Cancel' : 'Create Raid (Admin)'}
              </button>
            )}
            
            {currentUser && (
              <button
                onClick={() => {
                  setShowPaidCreateForm(!showPaidCreateForm);
                  setShowCreateForm(false);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showPaidCreateForm ? 'Cancel' : 'Create Paid Raid (5 posts for 5 USDC)'}
              </button>
            )}
            {remainingRaidPosts > 0 && (
              <div className="text-center mt-2 text-sm text-green-400 font-medium bg-green-900/30 px-3 py-1 rounded-full">
                You have {remainingRaidPosts} pre-paid raid post{remainingRaidPosts !== 1 ? 's' : ''} available
              </div>
            )}
          </div>
        </div>
        
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
        
        {/* Paid Raid Create Form */}
        {showPaidCreateForm && currentUser && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">Create Paid Twitter Raid (5 posts for 5 USDC)</h3>
            
            {remainingRaidPosts > 0 && (
              <div className="mb-4 p-3 bg-green-900/30 rounded border border-green-500/30">
                <p className="text-green-400">
                  <span className="font-semibold">Good news!</span> You have {remainingRaidPosts} pre-paid raid post{remainingRaidPosts !== 1 ? 's' : ''} available. This post will be automatically approved upon submission.
                </p>
              </div>
            )}
            
            <form onSubmit={handlePaidRaidSubmit}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">
                  Tweet URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={paidRaidData.tweetUrl}
                  onChange={(e) => setPaidRaidData({...paidRaidData, tweetUrl: e.target.value})}
                  placeholder="https://twitter.com/username/status/1234567890"
                  className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-gray-400 text-sm mt-2">
                  With your 5 USDC payment, you'll receive a total of 5 raid posts. The first post requires admin approval, after which your remaining 4 posts will be automatically approved.
                </p>
              </div>
              
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3">Payment Options</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {BLOCKCHAIN_OPTIONS.map((chain) => (
                    <button
                      key={chain.symbol}
                      type="button"
                      onClick={() => setSelectedChain(chain)}
                      className={`p-4 rounded-lg border flex flex-col items-center justify-center h-20 ${
                        selectedChain === chain
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      <div className="font-medium">{chain.name}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        5 {chain.amount}
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 p-4 bg-gray-700 rounded-lg mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-400">Send 5 USDC to:</div>
                    <div className="font-mono text-sm truncate">{selectedChain.address}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(selectedChain.address, setCopiedAddress)}
                    className="p-2 hover:text-blue-400"
                  >
                    {copiedAddress ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">
                    Transaction Signature <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paidRaidData.txSignature}
                    onChange={(e) => setPaidRaidData({...paidRaidData, txSignature: e.target.value})}
                    placeholder="Enter your transaction signature/ID"
                    className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded mb-4">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded font-medium ${
                    submitting
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  } text-white`}
                >
                  {submitting ? 'Submitting...' : 'Create Paid Raid'}
                </button>
              </div>
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
      {safeSelectedRaid && (
        <div id="verification-form-section" className="p-4 border-b border-gray-700 bg-gray-800/80">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085a4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Complete: {safeSelectedRaid.title}</h3>
              {safeSelectedRaid.isPaid && (
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs inline-block mb-1">
                  Paid Raid
                </span>
              )}
              <p className="text-blue-400">
                <a 
                  href={safeSelectedRaid.tweetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:underline inline-flex items-center"
                >
                  View Original Tweet
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </a>
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <div className="bg-gray-800/70 p-4 rounded-lg mb-4">
                  <h4 className="text-white font-semibold mb-2">Task Instructions</h4>
                  <p className="text-gray-300 mb-3">{safeSelectedRaid.description}</p>
                  <a 
                    href={safeSelectedRaid.tweetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 px-4 py-2 rounded inline-flex items-center"
                  >
                    <span>Go to Tweet</span>
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <h4 className="text-blue-400 font-semibold mb-1">Verification Tag</h4>
                  <div className="bg-gray-800 p-3 rounded flex items-center justify-between mb-2">
                    <code className="text-green-400 font-mono text-sm sm:text-lg overflow-auto">{verificationCode}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(verificationCode);
                        showNotification('Verification tag copied!', 'success');
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-1 rounded ml-2 flex-shrink-0"
                      title="Copy tag"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Include <span className="text-green-400 font-semibold">aquads.xyz</span> in your tweet/reply so we can verify your participation.
                  </p>
                </div>
  
                <form onSubmit={safeHandleSubmit} className="mobile-friendly-form">
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2">
                      Your Twitter Username <span className="text-gray-500">(@username)</span>
                    </label>
                    <div className="flex">
                      <span className="bg-gray-700 px-3 py-2 rounded-l text-gray-500 flex items-center">
                        @
                      </span>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-700 rounded-r text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="username"
                        value={twitterUsername}
                        onChange={(e) => setTwitterUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2">
                      Your Tweet/Reply URL <span className="text-gray-500">(must include "aquads.xyz")</span>
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 ${
                        tweetUrl && !isValidUrl ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                      }`}
                      placeholder="https://x.com/username/status/1234567890"
                      value={tweetUrl}
                      onChange={(e) => {
                        setTweetUrl(e.target.value);
                        validateTweetUrl(e.target.value);
                      }}
                      required
                    />
                    {tweetUrl && !isValidUrl && (
                      <p className="text-red-400 text-sm mt-1 flex items-start sm:items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5 sm:mt-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Invalid URL format. Use format: https://x.com/username/status/1234567890</span>
                      </p>
                    )}
                    <p className="text-gray-500 text-sm mt-2">
                      After replying to the tweet with "aquads.xyz", copy and paste your reply's URL here. Make sure it contains "status" in the URL.
                    </p>
                  </div>
                  
                  {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded mb-4">
                      {error}
                    </div>
                  )}
                  
                  {success && (
                    <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-3 rounded mb-4">
                      {success}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={submitting || verifyingTweet}
                    className={`w-full px-4 py-3 rounded font-medium ${
                      submitting || verifyingTweet
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white verify-button`}
                  >
                    {verifyingTweet ? 'Verifying Tweet...' : submitting ? 'Submitting...' : 'Verify & Complete Task'}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="bg-gray-800/30 p-4 rounded-lg">
              <h4 className="text-white font-semibold mb-3">Tweet Preview</h4>
              {tweetUrl ? (
                <div
                  ref={tweetEmbedRef}
                  className="w-full bg-gray-800/50 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center"
                >
                  <div className="text-gray-400">Loading tweet...</div>
                </div>
              ) : (
                <div className="w-full bg-gray-800/50 rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                  <svg className="w-12 h-12 text-gray-500 mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085a4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  <p className="text-gray-400 mb-2">Enter your tweet or reply URL to see the preview</p>
                  <p className="text-gray-500 text-sm">This helps us verify your task completion</p>
                </div>
              )}
              
              <div className="mt-4 bg-gray-800/70 rounded p-3 border border-gray-700">
                <h5 className="text-gray-300 font-medium mb-2">How verification works:</h5>
                <ol className="list-decimal list-inside text-gray-400 text-sm space-y-2">
                  <li>Go to the tweet via the "Go to Tweet" button</li>
                  <li>Reply to the tweet with a message that includes "aquads.xyz"</li>
                  <li>Copy the URL of your reply and paste it in the field above</li>
                  <li>The system will verify your participation</li>
                  <li>You'll earn points once verified!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raids Grid */}
      {raids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {raids.map(raid => (
            <div 
              key={raid._id}
              className={`bg-gray-800/50 rounded-lg p-4 border relative ${
                raid.isPaid && raid.paymentStatus === 'pending'
                  ? 'border-yellow-500/30 opacity-75 cursor-not-allowed'
                  : safeSelectedRaid?._id === raid._id 
                    ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer' 
                    : 'border-gray-700 hover:border-blue-500/50 hover:shadow-md cursor-pointer'
              }`}
              style={{ transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
              onClick={() => raid.isPaid && raid.paymentStatus === 'pending' ? showNotification('This raid is pending admin approval', 'warning') : handleRaidClick(raid)}
            >
              {/* If raid is pending, add an overlay warning message */}
              {raid.isPaid && raid.paymentStatus === 'pending' && (
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
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  {/* Twitter bird logo */}
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
            </div>
          ))}
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