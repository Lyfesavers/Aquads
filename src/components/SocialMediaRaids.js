import React, { useState, useEffect, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  const tweetEmbedRef = useRef(null);
  
  // For admin creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRaid, setNewRaid] = useState({
    tweetUrl: '',
    title: '',
    description: '',
    points: 50
  });

  useEffect(() => {
    fetchRaids();
    // Load Twitter widget script
    loadTwitterWidgetScript();
  }, []);

  useEffect(() => {
    // When tweet URL changes, try to embed it
    if (tweetUrl) {
      embedTweet(tweetUrl);
    }
  }, [tweetUrl]);

  const loadTwitterWidgetScript = () => {
    // Skip if already loaded
    if (window.twttr) return;

    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const extractTweetId = (url) => {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const generateVerificationCode = () => {
    // Always use aquads.xyz as the verification code
    return 'aquads.xyz';
  };

  const embedTweet = (url) => {
    // Skip if Twitter widgets not loaded yet
    if (!window.twttr) {
      console.log('Twitter widgets not loaded yet');
      if (tweetEmbedRef.current) {
        tweetEmbedRef.current.innerHTML = '<div class="p-4 text-gray-400">Loading Twitter widgets...</div>';
      }
      // Try loading again
      loadTwitterWidgetScript();
      return;
    }

    // Clear previous embed
    if (tweetEmbedRef.current) {
      tweetEmbedRef.current.innerHTML = '';
    }

    const tweetId = extractTweetId(url);
    if (!tweetId) {
      if (tweetEmbedRef.current) {
        tweetEmbedRef.current.innerHTML = '<div class="p-4 text-red-400">Invalid tweet URL format</div>';
      }
      return;
    }

    // Show loading indicator
    if (tweetEmbedRef.current) {
      tweetEmbedRef.current.innerHTML = '<div class="flex items-center justify-center p-6"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>';
    }

    try {
      window.twttr.widgets.createTweet(
        tweetId,
        tweetEmbedRef.current,
        {
          theme: 'dark',
          dnt: true
        }
      ).then((el) => {
        if (el) {
          console.log('Tweet embedded successfully');
        } else {
          console.error('Failed to embed tweet');
          if (tweetEmbedRef.current) {
            tweetEmbedRef.current.innerHTML = '<div class="p-4 text-red-400">Could not embed this tweet. The tweet may be private, deleted, or unavailable.</div>';
          }
        }
      }).catch(err => {
        console.error('Error embedding tweet:', err);
        if (tweetEmbedRef.current) {
          tweetEmbedRef.current.innerHTML = '<div class="p-4 text-red-400">Error embedding tweet: ' + (err.message || 'Unknown error') + '</div>';
        }
      });
    } catch (error) {
      console.error('Tweet embedding error:', error);
      if (tweetEmbedRef.current) {
        tweetEmbedRef.current.innerHTML = '<div class="p-4 text-red-400">Error embedding tweet: ' + (error.message || 'Unknown error') + '</div>';
      }
    }
  };

  const verifyUserCompletion = async () => {
    if (!twitterUsername) {
      setError('Please provide your Twitter username');
      return false;
    }

    setVerifyingTweet(true);

    try {
      // If it's a reply, submit the URL directly
      if (tweetUrl) {
        const tweetId = extractTweetId(tweetUrl);
        if (!tweetId) {
          throw new Error('Invalid tweet URL format');
        }

        // For a more reliable approach, we'll just check if the URL looks valid
        // and let the server handle verification
        return true;
      } else {
        // For this implementation, we require a tweet URL
        throw new Error('Please provide the URL of your tweet or reply that includes "aquads.xyz"');
      }
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
      setRaids(data);
    } catch (err) {
      console.error('Error fetching Twitter raids:', err);
      setError('Failed to load Twitter raids. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRaidClick = (raid) => {
    setSelectedRaid(raid);
    setTwitterUsername('');
    setError(null);
    setSuccess(null);
    setTweetUrl('');
    // Generate a new verification code for the user
    setVerificationCode(generateVerificationCode());
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    
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
    
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids/${selectedRaid._id}/complete`, {
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete raid');
      }
      
      setSuccess(data.message || 'Task completed! You earned points.');
      setTwitterUsername('');
      setTweetUrl('');
      
      // Refresh raids list
      fetchRaids();
      
      // Notify the user
      showNotification(data.message || 'Successfully completed Twitter raid!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to submit task. Please try again.');
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
    
    if (!newRaid.tweetUrl || !newRaid.title || !newRaid.description) {
      setError('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/twitter-raids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(newRaid)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Twitter raid');
      }
      
      // Reset form and hide it
      setNewRaid({
        tweetUrl: '',
        title: '',
        description: '',
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

  if (loading && raids.length === 0) {
    return <div className="text-center p-4">Loading Twitter raids...</div>;
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <div className="bg-blue-500/10 border-b border-blue-500/30 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-blue-400">Twitter Raids</h2>
            <p className="text-gray-300 mt-2">
              Complete Twitter tasks to earn 50 points with automated verification!
            </p>
          </div>
          
          {currentUser?.isAdmin && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {showCreateForm ? 'Cancel' : 'Create New Raid'}
            </button>
          )}
        </div>
        
        {/* Admin Create Form */}
        {showCreateForm && currentUser?.isAdmin && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">Create New Twitter Raid</h3>
            
            <form onSubmit={handleCreateRaid}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
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
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={newRaid.title}
                    onChange={handleInputChange}
                    placeholder="Retweet Our Announcement"
                    className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={newRaid.description}
                    onChange={handleInputChange}
                    placeholder="Retweet our latest announcement to earn 50 points!"
                    className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    required
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    name="points"
                    value={newRaid.points}
                    onChange={handleInputChange}
                    min="1"
                    max="1000"
                    className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
      </div>

      {/* Error Display */}
      {error && !showCreateForm && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 m-4 rounded">
          {error}
        </div>
      )}

      {/* Raids Grid */}
      {raids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {raids.map(raid => (
            <div 
              key={raid._id}
              className={`bg-gray-800/50 rounded-lg p-4 border cursor-pointer transition-all hover:shadow-lg ${
                selectedRaid?._id === raid._id 
                  ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                  : 'border-gray-700 hover:border-blue-500/50'
              } relative`}
              onClick={() => handleRaidClick(raid)}
            >
              {/* Admin Delete Button */}
              {currentUser?.isAdmin && (
                <button
                  className="absolute top-2 right-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 p-1 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRaid(raid._id);
                  }}
                  title="Delete Raid"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
                
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-bold">{raid.title}</h3>
                  <p className="text-gray-400 text-sm">
                    Created by: {raid.createdBy?.username || 'Admin'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <i className="fab fa-twitter"></i>
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

      {selectedRaid && (
        <div className="mt-4 p-4 border-t border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Complete: {selectedRaid.title}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="mb-4">
                <div className="bg-gray-800/70 p-4 rounded-lg mb-4">
                  <h4 className="text-white font-semibold mb-2">Task Instructions</h4>
                  <p className="text-gray-300 mb-3">{selectedRaid.description}</p>
                  <a 
                    href={selectedRaid.tweetUrl} 
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
                    <code className="text-green-400 font-mono text-lg">{verificationCode}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(verificationCode);
                        showNotification('Verification tag copied!', 'success');
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-1 rounded"
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
  
                <form onSubmit={handleSubmitTask}>
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
                      className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://twitter.com/username/status/1234567890"
                      value={tweetUrl}
                      onChange={(e) => setTweetUrl(e.target.value)}
                      required
                    />
                    <p className="text-gray-500 text-sm mt-2">
                      After replying to the tweet with "aquads.xyz", copy and paste your reply's URL here.
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
                    className={`w-full px-4 py-2 rounded font-medium ${
                      submitting || verifyingTweet
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
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
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
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
    </div>
  );
};

export default SocialMediaRaids; 