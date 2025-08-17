import React, { useState, useEffect, useRef } from 'react';
import './SocialMediaRaids.css';
import FacebookRaids from './FacebookRaids';

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
  const [activeTab, setActiveTab] = useState('twitter'); // 'twitter' or 'facebook'
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

  // For free raid creation
  const [showFreeRaidForm, setShowFreeRaidForm] = useState(false);
  const [freeRaidData, setFreeRaidData] = useState({
    tweetUrl: '',
    title: 'Twitter Raid',
    description: 'Retweet, Like & Comment to earn 50 points!'
  });

  // Fetch raids on component mount
  useEffect(() => {
    if (activeTab === 'twitter') {
      fetchRaids();
      fetchUserPoints();
    }
  }, [activeTab]);

  // Fetch user points
  const fetchUserPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingPoints(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/users/points`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPointsData(data);
      }
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoadingPoints(false);
    }
  };

  // Fetch Twitter raids
  const fetchRaids = async () => {
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids`);
      if (response.ok) {
        const data = await response.json();
        setRaids(data);
      } else {
        console.error('Failed to fetch Twitter raids');
      }
    } catch (error) {
      console.error('Error fetching Twitter raids:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle raid selection
  const handleRaidClick = (raid) => {
    setSelectedRaid(raid);
    setError(null);
    setSuccess(null);
    setTweetUrl('');
    setTwitterUsername('');
    setShowIframe(false);
    setIframeVerified(false);
    setIframeInteractions({ liked: false, retweeted: false, commented: false });
  };

  // Handle Twitter URL validation
  const validateTwitterUrl = (url) => {
    const twitterRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.*\/status\/\d+/i;
    return twitterRegex.test(url);
  };

  // Handle URL input change
  const handleUrlChange = (e) => {
    const url = e.target.value;
    setTweetUrl(url);
    setIsValidUrl(url === '' || validateTwitterUrl(url));
  };

  // Handle iframe interaction
  const handleIframeInteraction = (action) => {
    const now = Date.now();
    setInteractionTimes(prev => ({
      ...prev,
      [action]: now
    }));

    setIframeInteractions(prev => ({
      ...prev,
      [action]: true
    }));

    // Check for suspicious activity (too fast interactions)
    const lastInteraction = interactionTimes[action];
    if (lastInteraction && (now - lastInteraction) < 1000) {
      setSuspiciousActivity(prev => ({
        ...prev,
        [action]: true
      }));
    }

    // Check if all required interactions are completed
    const newInteractions = {
      ...iframeInteractions,
      [action]: true
    };

    if (newInteractions.liked && newInteractions.retweeted && newInteractions.commented) {
      setIframeVerified(true);
    }
  };

  // Handle raid completion
  const handleCompleteRaid = async () => {
    if (!twitterUsername.trim()) {
      setError('Please enter your Twitter username');
      return;
    }

    if (!tweetUrl.trim() && !iframeVerified) {
      setError('Please provide a Twitter URL or complete the iframe verification');
      return;
    }

    if (tweetUrl.trim() && !validateTwitterUrl(tweetUrl)) {
      setError('Please enter a valid Twitter URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/twitter-raids/${selectedRaid._id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          twitterUsername: twitterUsername.trim(),
          tweetUrl: tweetUrl.trim() || null,
          iframeVerified,
          iframeInteractions: Object.values(iframeInteractions).filter(Boolean).length
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Twitter raid completed successfully!');
        setTwitterUsername('');
        setTweetUrl('');
        setShowIframe(false);
        setIframeVerified(false);
        setIframeInteractions({ liked: false, retweeted: false, commented: false });
        
        // Refresh raids to update completion status
        await fetchRaids();
        
        // Show notification
        if (showNotification) {
          showNotification(data.message || 'Twitter raid completed successfully!', 'success');
        }
      } else {
        setError(data.error || 'Failed to complete Twitter raid');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle admin raid creation
  const handleCreateRaid = async (e) => {
    e.preventDefault();
    
    if (!newRaid.tweetUrl || !newRaid.title || !newRaid.description) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateTwitterUrl(newRaid.tweetUrl)) {
      setError('Please enter a valid Twitter URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/twitter-raids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRaid)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Twitter raid created successfully!');
        setNewRaid({
          tweetUrl: '',
          title: 'Twitter Raid',
          description: 'Retweet, Like & Comment to earn 50 points!',
          points: 50
        });
        setShowCreateForm(false);
        await fetchRaids();
        
        if (showNotification) {
          showNotification('Twitter raid created successfully!', 'success');
        }
      } else {
        setError(data.error || 'Failed to create Twitter raid');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle points-based raid creation
  const handleCreatePointsRaid = async (e) => {
    e.preventDefault();
    
    if (!pointsRaidData.tweetUrl || !pointsRaidData.title || !pointsRaidData.description) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateTwitterUrl(pointsRaidData.tweetUrl)) {
      setError('Please enter a valid Twitter URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/twitter-raids/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pointsRaidData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Twitter raid created successfully!');
        setPointsRaidData({
          tweetUrl: '',
          title: 'Twitter Raid',
          description: 'Retweet, Like & Comment to earn 50 points!'
        });
        setShowPointsCreateForm(false);
        await fetchRaids();
        await fetchUserPoints();
        
        if (showNotification) {
          showNotification(data.message || 'Twitter raid created successfully!', 'success');
        }
      } else {
        setError(data.error || 'Failed to create Twitter raid');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle free raid creation
  const handleCreateFreeRaid = async (e) => {
    e.preventDefault();
    
    if (!freeRaidData.tweetUrl || !freeRaidData.title || !freeRaidData.description) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateTwitterUrl(freeRaidData.tweetUrl)) {
      setError('Please enter a valid Twitter URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/twitter-raids/free`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(freeRaidData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Free Twitter raid created successfully!');
        setFreeRaidData({
          tweetUrl: '',
          title: 'Twitter Raid',
          description: 'Retweet, Like & Comment to earn 50 points!'
        });
        setShowFreeRaidForm(false);
        await fetchRaids();
        
        if (showNotification) {
          showNotification(data.message || 'Free Twitter raid created successfully!', 'success');
        }
      } else {
        setError(data.error || 'Failed to create free Twitter raid');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Twitter post in new tab
  const openTwitterPost = () => {
    if (selectedRaid && selectedRaid.tweetUrl) {
      window.open(selectedRaid.tweetUrl, '_blank');
    }
  };

  // Handle iframe loading
  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  // Show iframe for interaction
  const showIframeForInteraction = () => {
    setShowIframe(true);
    setIframeLoading(true);
  };

  if (loading && raids.length === 0) {
    return <div className="text-center p-4">Loading raids...</div>;
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="bg-gray-800/50 border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('twitter')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'twitter'
                ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            Twitter Raids
          </button>
          <button
            onClick={() => setActiveTab('facebook')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'facebook'
                ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            Facebook Raids
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'twitter' ? (
        <div>
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
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base"
                  >
                    {showCreateForm ? 'Cancel' : 'Create Raid (Admin)'}
                  </button>
                )}
                
                {currentUser && (
                  <button
                    onClick={() => setShowPointsCreateForm(!showPointsCreateForm)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base"
                  >
                    {showPointsCreateForm ? 'Cancel' : 'Create Raid (2000 Points)'}
                  </button>
                )}

                {currentUser && (
                  <button
                    onClick={() => setShowFreeRaidForm(!showFreeRaidForm)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded whitespace-nowrap text-sm sm:text-base"
                  >
                    {showFreeRaidForm ? 'Cancel' : 'Create Free Raid'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Admin Create Form */}
          {showCreateForm && currentUser?.isAdmin && (
            <div className="p-4 bg-gray-800/50 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Twitter Raid (Admin)</h3>
              <form onSubmit={handleCreateRaid} className="space-y-4">
                <input
                  type="url"
                  placeholder="Twitter Post URL"
                  value={newRaid.tweetUrl}
                  onChange={(e) => setNewRaid({...newRaid, tweetUrl: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={newRaid.title}
                  onChange={(e) => setNewRaid({...newRaid, title: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={newRaid.description}
                  onChange={(e) => setNewRaid({...newRaid, description: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <input
                  type="number"
                  placeholder="Points (default: 50)"
                  value={newRaid.points}
                  onChange={(e) => setNewRaid({...newRaid, points: parseInt(e.target.value) || 50})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  {submitting ? 'Creating...' : 'Create Raid'}
                </button>
              </form>
            </div>
          )}

          {/* Points Create Form */}
          {showPointsCreateForm && (
            <div className="p-4 bg-gray-800/50 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Create Twitter Raid with Points (2000 points required)</h3>
              <p className="text-gray-300 mb-4">Your points: {pointsData.points || 0}</p>
              <form onSubmit={handleCreatePointsRaid} className="space-y-4">
                <input
                  type="url"
                  placeholder="Twitter Post URL"
                  value={pointsRaidData.tweetUrl}
                  onChange={(e) => setPointsRaidData({...pointsRaidData, tweetUrl: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={pointsRaidData.title}
                  onChange={(e) => setPointsRaidData({...pointsRaidData, title: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={pointsRaidData.description}
                  onChange={(e) => setPointsRaidData({...pointsRaidData, description: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <button type="submit" disabled={submitting || (pointsData.points || 0) < 2000} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                  {submitting ? 'Creating...' : `Create Raid (2000 points)`}
                </button>
              </form>
            </div>
          )}

          {/* Free Raid Create Form */}
          {showFreeRaidForm && (
            <div className="p-4 bg-gray-800/50 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Create Free Twitter Raid</h3>
              <form onSubmit={handleCreateFreeRaid} className="space-y-4">
                <input
                  type="url"
                  placeholder="Twitter Post URL"
                  value={freeRaidData.tweetUrl}
                  onChange={(e) => setFreeRaidData({...freeRaidData, tweetUrl: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={freeRaidData.title}
                  onChange={(e) => setFreeRaidData({...freeRaidData, title: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={freeRaidData.description}
                  onChange={(e) => setFreeRaidData({...freeRaidData, description: e.target.value})}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
                <button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
                  {submitting ? 'Creating...' : 'Create Free Raid'}
                </button>
              </form>
            </div>
          )}

          {/* Error and Success Messages */}
          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 m-4 rounded">{error}</div>}
          {success && <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-3 m-4 rounded">{success}</div>}

          {/* Twitter Raids List */}
          <div className="p-4">
            {raids.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No Twitter raids available at the moment.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {raids.map(raid => (
                  <div 
                    key={raid._id} 
                    className={`bg-gray-800/50 rounded-lg p-4 border cursor-pointer transition-all ${
                      selectedRaid?._id === raid._id ? 'border-blue-500 shadow-lg' : 'border-gray-700 hover:border-blue-500/50'
                    }`}
                    onClick={() => handleRaidClick(raid)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-semibold">{raid.title}</h3>
                      <span className="text-blue-400 font-bold">{raid.points} points</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{raid.description}</p>
                    <div className="text-xs text-gray-400">
                      <span>Created: {formatDate(raid.createdAt)}</span>
                      {!isWithinTwoDays(raid.createdAt) && (
                        <span className="ml-2 text-yellow-400">{getDaysRemaining(raid.createdAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Raid Details */}
          {selectedRaid && (
            <div className="p-4 bg-gray-800/50 border-t border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{selectedRaid.title}</h3>
                <button onClick={() => setSelectedRaid(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-300">{selectedRaid.description}</p>
                <div className="text-blue-400 font-bold">Reward: {selectedRaid.points} points</div>
                
                <div className="flex gap-2">
                  <button onClick={openTwitterPost} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    Open Twitter Post
                  </button>
                  <button onClick={showIframeForInteraction} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                    Complete Interactions
                  </button>
                </div>

                {/* How to Complete Guide */}
                <div className="bg-gray-700/50 rounded p-3">
                  <h4 className="text-white font-medium mb-2">How to Complete:</h4>
                  <ol className="list-decimal list-inside text-gray-300 text-sm space-y-1">
                    <li>Click "Open Twitter Post" to view the tweet</li>
                    <li>Like the Twitter post</li>
                    <li>Retweet the Twitter post</li>
                    <li>Comment on the Twitter post</li>
                    <li>Enter your Twitter username below</li>
                    <li>Submit for verification</li>
                  </ol>
                </div>

                {/* Completion Form */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Submit Completion</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Twitter Username:</label>
                    <input
                      type="text"
                      placeholder="Enter your Twitter username"
                      value={twitterUsername}
                      onChange={(e) => setTwitterUsername(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Twitter Post URL (optional if using iframe):</label>
                    <input
                      type="url"
                      placeholder="Paste the Twitter post URL here"
                      value={tweetUrl}
                      onChange={handleUrlChange}
                      className={`w-full p-2 bg-gray-700 border rounded text-white ${!isValidUrl ? 'border-red-500' : 'border-gray-600'}`}
                    />
                    {!isValidUrl && <span className="text-red-400 text-sm">Please enter a valid Twitter URL</span>}
                  </div>

                  <button 
                    onClick={handleCompleteRaid}
                    disabled={submitting || !twitterUsername.trim() || (tweetUrl.trim() && !isValidUrl)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Completion'}
                  </button>
                </div>

                {/* Iframe for Interaction */}
                {showIframe && (
                  <div className="space-y-4">
                    <h4 className="text-white font-medium">Complete Interactions</h4>
                    <div className="bg-gray-700 rounded p-4">
                      {iframeLoading && <div className="text-gray-300">Loading Twitter post...</div>}
                      <iframe
                        src={selectedRaid.tweetUrl}
                        title="Twitter Post"
                        onLoad={handleIframeLoad}
                        className="w-full h-96 border-0"
                        style={{ display: iframeLoading ? 'none' : 'block' }}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleIframeInteraction('liked')}
                        className={`px-4 py-2 rounded ${iframeInteractions.liked ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {iframeInteractions.liked ? '✓ Liked' : 'Mark as Liked'}
                      </button>
                      <button 
                        onClick={() => handleIframeInteraction('retweeted')}
                        className={`px-4 py-2 rounded ${iframeInteractions.retweeted ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {iframeInteractions.retweeted ? '✓ Retweeted' : 'Mark as Retweeted'}
                      </button>
                      <button 
                        onClick={() => handleIframeInteraction('commented')}
                        className={`px-4 py-2 rounded ${iframeInteractions.commented ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {iframeInteractions.commented ? '✓ Commented' : 'Mark as Commented'}
                      </button>
                    </div>
                    
                    {iframeVerified && (
                      <div className="bg-green-500/20 border border-green-500 text-green-400 p-3 rounded">
                        ✓ All interactions completed! You can now submit your completion.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Facebook Tab Content */
        <FacebookRaids currentUser={currentUser} showNotification={showNotification} />
      )}
    </div>
  );
};

export default SocialMediaRaids;
