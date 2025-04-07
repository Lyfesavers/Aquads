import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SocialMediaRaids = ({ currentUser, showNotification }) => {
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaid, setSelectedRaid] = useState(null);
  const [taskProof, setTaskProof] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // In a real implementation, you would fetch raids from the server
    // For now, we're using mock data
    const mockRaids = [
      {
        id: 1,
        title: 'Twitter Retweet Campaign',
        platform: 'Twitter',
        icon: 'twitter',
        description: 'Retweet our latest announcement and earn 50 points!',
        link: 'https://twitter.com/YourProject/status/1234567890',
        points: 50,
        createdBy: 'Admin',
        createdAt: new Date().toISOString(),
        taskType: 'retweet'
      },
      {
        id: 2,
        title: 'Discord Community Engagement',
        platform: 'Discord',
        icon: 'discord',
        description: 'Join our Discord server and say hello in the general channel!',
        link: 'https://discord.gg/yourproject',
        points: 50,
        createdBy: 'Project X',
        createdAt: new Date().toISOString(),
        taskType: 'join'
      },
      {
        id: 3,
        title: 'Telegram Group Promotion',
        platform: 'Telegram',
        icon: 'telegram',
        description: 'Join our Telegram group and share our pinned post!',
        link: 'https://t.me/yourproject',
        points: 50,
        createdBy: 'Project Y',
        createdAt: new Date().toISOString(),
        taskType: 'share'
      }
    ];

    setRaids(mockRaids);
    setLoading(false);
  }, []);

  const handleRaidClick = (raid) => {
    setSelectedRaid(raid);
    setTaskProof('');
    setError(null);
    setSuccess(null);
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      showNotification('Please log in to complete social media raids', 'error');
      return;
    }

    if (!taskProof) {
      setError('Please provide proof of task completion');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      // Call the API endpoint we created
      const response = await fetch(`${API_URL}/api/points/social-raids/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          raidId: selectedRaid.id,
          platform: selectedRaid.platform,
          proof: taskProof
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete raid');
      }
      
      setSuccess(`${data.message || 'Task completed! You earned 50 points.'}`);
      setTaskProof('');
      
      // Notify the user
      showNotification(data.message || `Successfully earned 50 points for completing the ${selectedRaid.platform} raid!`, 'success');
    } catch (err) {
      setError(err.message || 'Failed to submit task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading social media raids...</div>;
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <div className="bg-blue-500/10 border-b border-blue-500/30 p-4">
        <h2 className="text-xl font-bold text-blue-400">Social Media Raids</h2>
        <p className="text-gray-300 mt-2">
          Complete social media tasks to earn points and support your favorite projects!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {raids.map(raid => (
          <div 
            key={raid.id}
            className={`bg-gray-800/50 rounded-lg p-4 border cursor-pointer transition-all hover:shadow-lg ${
              selectedRaid?.id === raid.id 
                ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'border-gray-700 hover:border-blue-500/50'
            }`}
            onClick={() => handleRaidClick(raid)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-bold">{raid.title}</h3>
                <p className="text-gray-400 text-sm">Created by: {raid.createdBy}</p>
              </div>
              <div className={`w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400`}>
                <i className={`fab fa-${raid.icon}`}></i>
              </div>
            </div>
            <p className="text-gray-300 mb-3">{raid.description}</p>
            <div className="flex justify-between items-center">
              <a 
                href={raid.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:underline text-sm inline-flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Visit {raid.platform}</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </a>
              <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">+{raid.points} points</span>
            </div>
          </div>
        ))}
      </div>

      {selectedRaid && (
        <div className="mt-4 p-4 border-t border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Complete: {selectedRaid.title}</h3>
          
          <form onSubmit={handleSubmitTask}>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">
                Proof of Completion <span className="text-gray-500">(Screenshot URL, post link, or your username)</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter proof of completion"
                value={taskProof}
                onChange={(e) => setTaskProof(e.target.value)}
              />
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
              {submitting ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SocialMediaRaids; 