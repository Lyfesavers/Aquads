import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import logger from '../utils/logger';

const TokenSentiment = ({ tokenId, currentUser, showNotification }) => {
  const [sentiment, setSentiment] = useState({
    bullish: 0,
    bearish: 0,
    loading: true,
    error: false
  });
  
  // Track user's vote
  const [userVote, setUserVote] = useState(null);

  // Load user votes from localStorage
  useEffect(() => {
    if (currentUser) {
      const savedVotes = localStorage.getItem('userTokenSentiment');
      if (savedVotes) {
        try {
          const votesMap = JSON.parse(savedVotes);
          if (votesMap[tokenId]) {
            setUserVote(votesMap[tokenId]);
          }
        } catch (err) {
          logger.error('Error parsing saved votes', err);
        }
      }
    }
  }, [tokenId, currentUser]);

  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        // Only fetch for Bitcoin for demo purposes as CoinGecko doesn't have sentiment for all coins
        // In a real implementation, you'd use their API that has sentiment data
        let bullish = 0;
        let bearish = 0;
        
        // For the purpose of demonstration, if the token is Bitcoin,
        // we'll show the CoinGecko interface with sample data
        if (tokenId === 'bitcoin') {
          bullish = 78;
          bearish = 22;
        } else {
          // For other tokens, randomize sentiment between 30-70% to simulate data
          bullish = Math.floor(Math.random() * 40) + 30;
          bearish = 100 - bullish;
        }
        
        // If we have a saved vote from this user, include it in the calculation
        // This is just a simulation - in a real app this would be handled by the server
        if (userVote) {
          if (userVote === 'bullish') {
            bullish = Math.min(100, bullish + 1);
            bearish = 100 - bullish;
          } else if (userVote === 'bearish') {
            bearish = Math.min(100, bearish + 1);
            bullish = 100 - bearish;
          }
        }
        
        setSentiment({
          bullish,
          bearish,
          loading: false,
          error: false
        });
      } catch (error) {
        logger.error('Error fetching sentiment data:', error);
        setSentiment({
          bullish: 0,
          bearish: 0,
          loading: false,
          error: true
        });
      }
    };

    fetchSentiment();
  }, [tokenId, userVote]);

  const handleVote = (vote) => {
    if (!currentUser) {
      if (showNotification) {
        showNotification('Please sign in to vote', 'info');
      }
      return;
    }

    // Toggle vote if clicking the same option
    const newVote = userVote === vote ? null : vote;
    setUserVote(newVote);
    
    // Save to localStorage
    try {
      const savedVotes = localStorage.getItem('userTokenSentiment') || '{}';
      const votesMap = JSON.parse(savedVotes);
      
      if (newVote) {
        votesMap[tokenId] = newVote;
      } else {
        delete votesMap[tokenId];
      }
      
      localStorage.setItem('userTokenSentiment', JSON.stringify(votesMap));
      
      if (showNotification) {
        if (newVote) {
          showNotification(`You're feeling ${newVote} on ${tokenId}!`, 'success');
        } else {
          showNotification(`Vote removed for ${tokenId}`, 'info');
        }
      }
    } catch (err) {
      logger.error('Error saving vote', err);
    }
  };

  if (sentiment.loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <p className="text-gray-400 text-center">Loading sentiment data...</p>
      </div>
    );
  }

  if (sentiment.error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <p className="text-gray-400 text-center">Sentiment data not available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md">
      <h3 className="text-lg font-semibold text-white mb-3">How do you feel about {tokenId} today?</h3>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleVote('bullish')}
            className={`flex items-center justify-center p-3 rounded-full transition-colors
              ${userVote === 'bullish' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-green-400 hover:bg-gray-600'}`}
          >
            <FaArrowUp className="text-xl" />
          </button>
          <span className="text-green-400 mt-2">{sentiment.bullish}%</span>
          <span className="text-gray-400 text-sm">Bullish</span>
        </div>
        
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleVote('bearish')}
            className={`flex items-center justify-center p-3 rounded-full transition-colors
              ${userVote === 'bearish' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-red-400 hover:bg-gray-600'}`}
          >
            <FaArrowDown className="text-xl" />
          </button>
          <span className="text-red-400 mt-2">{sentiment.bearish}%</span>
          <span className="text-gray-400 text-sm">Bearish</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-green-600 h-2.5 rounded-full"
          style={{ width: `${sentiment.bullish}%` }}
        ></div>
      </div>
      
      <div className="text-gray-400 text-sm text-center mt-2">
        {currentUser ? 
          'Click to vote on market sentiment' : 
          'Sign in to vote on market sentiment'}
      </div>
    </div>
  );
};

export default TokenSentiment; 