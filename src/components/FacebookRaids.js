import React, { useState, useEffect, useRef } from 'react';
import './SocialMediaRaids.css';

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
  const [iframeInteractions, setIframeInteractions] = useState({ liked: false, commented: false, shared: false });
  const [iframeVerified, setIframeVerified] = useState(false);
  const iframeContainerRef = useRef(null);
  
  // Add anti-cheat tracking state
  const [interactionTimes, setInteractionTimes] = useState({
    liked: null,
    commented: null,
    shared: null
  });
  const [suspiciousActivity, setSuspiciousActivity] = useState({
    liked: false,
    commented: false,
    shared: false
  });
  
  // For admin creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRaid, setNewRaid] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Comment & Share to earn 50 points!',
    points: 50
  });
  
  // For points-based raid creation
  const [showPointsCreateForm, setShowPointsCreateForm] = useState(false);
  const [pointsRaidData, setPointsRaidData] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Comment & Share to earn 50 points!'
  });

  // For free raid creation
  const [showFreeRaidForm, setShowFreeRaidForm] = useState(false);
  const [freeRaidData, setFreeRaidData] = useState({
    postUrl: '',
    title: 'Facebook Raid',
    description: 'Like, Comment & Share to earn 50 points!'
  });

  // Fetch raids on component mount
  useEffect(() => {
    fetchRaids();
    fetchUserPoints();
  }, []);

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

  // Fetch Facebook raids
  const fetchRaids = async () => {
    try {
      const response = await fetch(`${API_URL}/api/facebook-raids`);
      if (response.ok) {
        const data = await response.json();
        setRaids(data);
      } else {
        console.error('Failed to fetch Facebook raids');
      }
    } catch (error) {
      console.error('Error fetching Facebook raids:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle raid selection
  const handleRaidClick = (raid) => {
    setSelectedRaid(raid);
    setError(null);
    setSuccess(null);
    setPostUrl('');
    setFacebookUsername('');
    setShowIframe(false);
    setIframeVerified(false);
    setIframeInteractions({ liked: false, commented: false, shared: false });
  };

  // Handle Facebook post URL validation
  const validateFacebookUrl = (url) => {
    const facebookRegex = /^https?:\/\/(www\.)?facebook\.com\/.*/i;
    return facebookRegex.test(url);
  };

  // Handle URL input change
  const handleUrlChange = (e) => {
    const url = e.target.value;
    setPostUrl(url);
    setIsValidUrl(url === '' || validateFacebookUrl(url));
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

    if (newInteractions.liked && newInteractions.commented && newInteractions.shared) {
      setIframeVerified(true);
    }
  };

  // Handle raid completion
  const handleCompleteRaid = async () => {
    if (!facebookUsername.trim()) {
      setError('Please enter your Facebook username');
      return;
    }

    if (!postUrl.trim() && !iframeVerified) {
      setError('Please provide a Facebook post URL or complete the iframe verification');
      return;
    }

    if (postUrl.trim() && !validateFacebookUrl(postUrl)) {
      setError('Please enter a valid Facebook post URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/facebook-raids/${selectedRaid._id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          facebookUsername: facebookUsername.trim(),
          postUrl: postUrl.trim() || null,
          iframeVerified,
          iframeInteractions: Object.values(iframeInteractions).filter(Boolean).length
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Facebook raid completed successfully!');
        setFacebookUsername('');
        setPostUrl('');
        setShowIframe(false);
        setIframeVerified(false);
        setIframeInteractions({ liked: false, commented: false, shared: false });
        
        // Refresh raids to update completion status
        await fetchRaids();
        
        // Show notification
        if (showNotification) {
          showNotification(data.message || 'Facebook raid completed successfully!', 'success');
        }
      } else {
        setError(data.error || 'Failed to complete Facebook raid');
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
    
    if (!newRaid.postUrl || !newRaid.title || !newRaid.description) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateFacebookUrl(newRaid.postUrl)) {
      setError('Please enter a valid Facebook post URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/facebook-raids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRaid)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Facebook raid created successfully!');
        setNewRaid({
          postUrl: '',
          title: 'Facebook Raid',
          description: 'Like, Comment & Share to earn 50 points!',
          points: 50
        });
        setShowCreateForm(false);
        await fetchRaids();
        
        if (showNotification) {
          showNotification('Facebook raid created successfully!', 'success');
        }
      } else {
        setError(data.error || 'Failed to create Facebook raid');
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
    
    if (!pointsRaidData.postUrl || !pointsRaidData.title || !pointsRaidData.description) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateFacebookUrl(pointsRaidData.postUrl)) {
      setError('Please enter a valid Facebook post URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/facebook-raids/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pointsRaidData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Facebook raid created successfully!');
        setPointsRaidData({
          postUrl: '',
          title: 'Facebook Raid',
          description: 'Like, Comment & Share to earn 50 points!'
        });
        setShowPointsCreateForm(false);
        await fetchRaids();
        await fetchUserPoints();
        
        if (showNotification) {
          showNotification(data.message || 'Facebook raid created successfully!', 'success');
        }
      } else {
        setError(data.error || 'Failed to create Facebook raid');
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
    
    if (!freeRaidData.postUrl || !freeRaidData.title || !freeRaidData.description) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateFacebookUrl(freeRaidData.postUrl)) {
      setError('Please enter a valid Facebook post URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/facebook-raids/free`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(freeRaidData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Free Facebook raid created successfully!');
        setFreeRaidData({
          postUrl: '',
          title: 'Facebook Raid',
          description: 'Like, Comment & Share to earn 50 points!'
        });
        setShowFreeRaidForm(false);
        await fetchRaids();
        
        if (showNotification) {
          showNotification(data.message || 'Free Facebook raid created successfully!', 'success');
        }
      } else {
        setError(data.error || 'Failed to create free Facebook raid');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Facebook post in new tab
  const openFacebookPost = () => {
    if (selectedRaid && selectedRaid.postUrl) {
      window.open(selectedRaid.postUrl, '_blank');
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

  if (loading) {
    return (
      <div className="social-media-raids">
        <div className="loading">Loading Facebook raids...</div>
      </div>
    );
  }

  return (
    <div className="social-media-raids">
      <div className="raids-header">
        <h2>Facebook Raids</h2>
        <p>Complete Facebook tasks to earn points!</p>
        
        {/* Admin Controls */}
        {currentUser?.isAdmin && (
          <div className="admin-controls">
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="admin-btn"
            >
              {showCreateForm ? 'Cancel' : 'Create Admin Raid'}
            </button>
            <button 
              onClick={() => setShowPointsCreateForm(!showPointsCreateForm)}
              className="admin-btn"
            >
              {showPointsCreateForm ? 'Cancel' : 'Create Points Raid'}
            </button>
            <button 
              onClick={() => setShowFreeRaidForm(!showFreeRaidForm)}
              className="admin-btn"
            >
              {showFreeRaidForm ? 'Cancel' : 'Create Free Raid'}
            </button>
          </div>
        )}

        {/* Admin Create Form */}
        {showCreateForm && currentUser?.isAdmin && (
          <div className="create-raid-form">
            <h3>Create New Facebook Raid (Admin)</h3>
            <form onSubmit={handleCreateRaid}>
              <input
                type="url"
                placeholder="Facebook Post URL"
                value={newRaid.postUrl}
                onChange={(e) => setNewRaid({...newRaid, postUrl: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Title"
                value={newRaid.title}
                onChange={(e) => setNewRaid({...newRaid, title: e.target.value})}
                required
              />
              <textarea
                placeholder="Description"
                value={newRaid.description}
                onChange={(e) => setNewRaid({...newRaid, description: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Points (default: 50)"
                value={newRaid.points}
                onChange={(e) => setNewRaid({...newRaid, points: parseInt(e.target.value) || 50})}
              />
              <button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Raid'}
              </button>
            </form>
          </div>
        )}

        {/* Points Create Form */}
        {showPointsCreateForm && (
          <div className="create-raid-form">
            <h3>Create Facebook Raid with Points (2000 points required)</h3>
            <p>Your points: {pointsData.points || 0}</p>
            <form onSubmit={handleCreatePointsRaid}>
              <input
                type="url"
                placeholder="Facebook Post URL"
                value={pointsRaidData.postUrl}
                onChange={(e) => setPointsRaidData({...pointsRaidData, postUrl: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Title"
                value={pointsRaidData.title}
                onChange={(e) => setPointsRaidData({...pointsRaidData, title: e.target.value})}
                required
              />
              <textarea
                placeholder="Description"
                value={pointsRaidData.description}
                onChange={(e) => setPointsRaidData({...pointsRaidData, description: e.target.value})}
                required
              />
              <button type="submit" disabled={submitting || (pointsData.points || 0) < 2000}>
                {submitting ? 'Creating...' : `Create Raid (2000 points)`}
              </button>
            </form>
          </div>
        )}

        {/* Free Raid Create Form */}
        {showFreeRaidForm && (
          <div className="create-raid-form">
            <h3>Create Free Facebook Raid</h3>
            <form onSubmit={handleCreateFreeRaid}>
              <input
                type="url"
                placeholder="Facebook Post URL"
                value={freeRaidData.postUrl}
                onChange={(e) => setFreeRaidData({...freeRaidData, postUrl: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Title"
                value={freeRaidData.title}
                onChange={(e) => setFreeRaidData({...freeRaidData, title: e.target.value})}
                required
              />
              <textarea
                placeholder="Description"
                value={freeRaidData.description}
                onChange={(e) => setFreeRaidData({...freeRaidData, description: e.target.value})}
                required
              />
              <button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Free Raid'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Error and Success Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Raids List */}
      <div className="raids-list">
        {raids.length === 0 ? (
          <div className="no-raids">No Facebook raids available at the moment.</div>
        ) : (
          raids.map(raid => (
            <div 
              key={raid._id} 
              className={`raid-item ${selectedRaid?._id === raid._id ? 'selected' : ''}`}
              onClick={() => handleRaidClick(raid)}
            >
              <div className="raid-header">
                <h3>{raid.title}</h3>
                <span className="points">{raid.points} points</span>
              </div>
              <p>{raid.description}</p>
              <div className="raid-meta">
                <span>Created: {formatDate(raid.createdAt)}</span>
                {!isWithinTwoDays(raid.createdAt) && (
                  <span className="expiring">{getDaysRemaining(raid.createdAt)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Raid Details */}
      {selectedRaid && (
        <div className="raid-details">
          <div className="raid-details-header">
            <h3>{selectedRaid.title}</h3>
            <button onClick={() => setSelectedRaid(null)} className="close-btn">×</button>
          </div>
          
          <div className="raid-content">
            <p>{selectedRaid.description}</p>
            <div className="points-info">
              <strong>Reward: {selectedRaid.points} points</strong>
            </div>
            
            <div className="facebook-actions">
              <button onClick={openFacebookPost} className="facebook-btn">
                Open Facebook Post
              </button>
              <button onClick={showIframeForInteraction} className="facebook-btn">
                Complete Interactions
              </button>
            </div>

            {/* How to Complete Guide */}
            <div className="how-to-complete">
              <h4>How to Complete:</h4>
              <ol>
                <li>Click "Open Facebook Post" to view the post</li>
                <li>Like the Facebook post</li>
                <li>Comment on the Facebook post</li>
                <li>Share the Facebook post</li>
                <li>Enter your Facebook username below</li>
                <li>Submit for verification</li>
              </ol>
            </div>

            {/* Completion Form */}
            <div className="completion-form">
              <h4>Submit Completion</h4>
              
              <div className="form-group">
                <label>Facebook Username:</label>
                <input
                  type="text"
                  placeholder="Enter your Facebook username"
                  value={facebookUsername}
                  onChange={(e) => setFacebookUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Facebook Post URL (optional if using iframe):</label>
                <input
                  type="url"
                  placeholder="Paste the Facebook post URL here"
                  value={postUrl}
                  onChange={handleUrlChange}
                  className={!isValidUrl ? 'invalid' : ''}
                />
                {!isValidUrl && <span className="error-text">Please enter a valid Facebook URL</span>}
              </div>

              <button 
                onClick={handleCompleteRaid}
                disabled={submitting || !facebookUsername.trim() || (postUrl.trim() && !isValidUrl)}
                className="complete-btn"
              >
                {submitting ? 'Submitting...' : 'Submit Completion'}
              </button>
            </div>

            {/* Iframe for Interaction */}
            {showIframe && (
              <div className="iframe-section">
                <h4>Complete Interactions</h4>
                <div className="iframe-container" ref={iframeContainerRef}>
                  {iframeLoading && <div className="iframe-loading">Loading Facebook post...</div>}
                  <iframe
                    src={selectedRaid.postUrl}
                    title="Facebook Post"
                    onLoad={handleIframeLoad}
                    style={{ display: iframeLoading ? 'none' : 'block' }}
                  />
                </div>
                
                <div className="interaction-buttons">
                  <button 
                    onClick={() => handleIframeInteraction('liked')}
                    className={iframeInteractions.liked ? 'completed' : ''}
                  >
                    {iframeInteractions.liked ? '✓ Liked' : 'Mark as Liked'}
                  </button>
                  <button 
                    onClick={() => handleIframeInteraction('commented')}
                    className={iframeInteractions.commented ? 'completed' : ''}
                  >
                    {iframeInteractions.commented ? '✓ Commented' : 'Mark as Commented'}
                  </button>
                  <button 
                    onClick={() => handleIframeInteraction('shared')}
                    className={iframeInteractions.shared ? 'completed' : ''}
                  >
                    {iframeInteractions.shared ? '✓ Shared' : 'Mark as Shared'}
                  </button>
                </div>
                
                {iframeVerified && (
                  <div className="verification-success">
                    ✓ All interactions completed! You can now submit your completion.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacebookRaids;
