import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SocialMediaRaids = ({ currentUser, showNotification }) => {
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaid, setSelectedRaid] = useState(null);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
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
  }, []);

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
          twitterUsername
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete raid');
      }
      
      setSuccess(data.message || 'Task completed! You earned points.');
      setTwitterUsername('');
      
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
              Complete Twitter tasks to earn 50 points and support your favorite projects!
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
              <p className="text-gray-500 text-sm mt-2">
                Make sure you've performed the required action with this Twitter account.
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
              disabled={submitting}
              className={`px-4 py-2 rounded font-medium ${
                submitting
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {submitting ? 'Verifying...' : 'Verify Completion'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SocialMediaRaids; 