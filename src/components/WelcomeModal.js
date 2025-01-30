import React from 'react';
import './WelcomeModal.css';

const WelcomeModal = ({ username, onClose, referralCode }) => {
  const handleShare = () => {
    const tweetText = encodeURIComponent(`🎉 Just joined Aquads! Can't wait to explore amazing services and connect with the community! Check it out! #Aquads #Community\n\nhttps://aquads.xyz`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    alert('Referral code copied to clipboard!');
  };

  return (
    <div className="modal-backdrop">
      <div className="welcome-modal">
        <h2>🎉 Welcome to Aquads, {username}!</h2>
        <p>Your account has been successfully created. We're excited to have you join our community. Use the Share now button and get 24 hours free advertising!</p>
        
        <div className="referral-code-section">
          <h3>⚠️ IMPORTANT: Save Your Secret Code ⚠️</h3>
          <p>Your Referral code to share is your username.</p>
          <p>This is your unique Secret code. You'll need it for:</p>

          <ul>
            <li>Leaving reviews</li>
            <li>Account recovery</li>
            <li>Verification purposes</li>
          </ul>
          <div className="code-display">
            <code>{referralCode}</code>
            <button className="copy-button" onClick={handleCopyCode}>
              Copy Code
            </button>
          </div>
          <p className="warning-text">
            ⚠️ Please save this code before closing - you'll need it later! ⚠️
          </p>
        </div>
        
        <div className="welcome-actions">
          <button className="share-button" onClick={handleShare}>
            Share on Twitter
          </button>
          <button 
            className="close-button" 
            onClick={() => {
              const confirmed = window.confirm('Have you saved your referral code? You will need it later!');
              if (confirmed) onClose();
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal; 