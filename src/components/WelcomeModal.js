import React from 'react';
import './WelcomeModal.css';

const WelcomeModal = ({ username, onClose }) => {
  const handleShare = () => {
    const tweetText = encodeURIComponent(`🎉 Just joined Aquads! Can't wait to explore amazing services and connect with the community! Check it out! #Aquads #Community\n\nhttps://aquads.xyz`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
  };

  return (
    <div className="modal-backdrop">
      <div className="welcome-modal">
        <h2>🎉 Welcome to Aquads, {username}!</h2>
        <p>Your account has been successfully created. We're excited to have you join our community!</p>
        
        <div className="welcome-actions">
          <button className="share-button" onClick={handleShare}>
            Share on Twitter
          </button>
          <button className="close-button" onClick={onClose}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal; 