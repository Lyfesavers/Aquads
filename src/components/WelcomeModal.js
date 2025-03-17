import React from 'react';
import './WelcomeModal.css';
import { FaTwitter } from 'react-icons/fa';

const WelcomeModal = ({ username, onClose, referralCode }) => {
  const handleShare = () => {
    const tweetText = encodeURIComponent(`🚀 Excited to join @_Aquads_ - the premier Web3 freelancer marketplace! Ready to connect with top crypto talent and projects.\n\n💎 Join using my referral code: ${username}\n\nLet's shape the future of decentralized services together! 💫\n\nhttps://aquads.xyz`);
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
          <p>Your Referral code to share is your username located in your Dashboard.</p>
          <p>This is your unique Secret code. Do not share the code below with anyone. You'll need it for:</p>

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
            ⚠️ Please save this code before closing and DO NOT SHARE IT- you'll need it later! ⚠️
          </p>
        </div>
        
        <div className="welcome-actions">
          <button className="share-button" onClick={handleShare}>
            <FaTwitter className="mr-2" /> Share Referral
          </button>
          <button 
            className="close-button" 
            onClick={() => {
              const confirmed = window.confirm('Have you saved your Secret code? You will need it later!');
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