import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import logger from '../utils/logger';

const TokenSentiment = ({ tokenId, currentUser, showNotification }) => {
  // Combined state for base sentiment and user votes
  const [sentimentData, setSentimentData] = useState({
    baseBullish: 0,   // Base bullish votes from API/simulation
    baseBearish: 0,   // Base bearish votes from API/simulation
    userVotes: {      // All user votes from localStorage
      bullish: 0,
      bearish: 0
    },
    userVote: null,   // Current user's vote
    loading: true,
    error: false
  });

  // Calculate final percentages
  const calculatePercentages = (data) => {
    const totalBaseVotes = data.baseBullish + data.baseBearish;
    const totalUserVotes = data.userVotes.bullish + data.userVotes.bearish;
    const totalVotes = totalBaseVotes + totalUserVotes;
    
    if (totalVotes === 0) return { bullish: 50, bearish: 50 };
    
    const bullishVotes = data.baseBullish + data.userVotes.bullish;
    const bearishVotes = data.baseBearish + data.userVotes.bearish;
    
    const bullishPercent = Math.round((bullishVotes / totalVotes) * 100);
    const bearishPercent = 100 - bullishPercent;
    
    return { bullish: bullishPercent, bearish: bearishPercent };
  };

  // Load all user votes from localStorage
  useEffect(() => {
    const loadUserVotes = () => {
      try {
        const savedVotes = localStorage.getItem('allTokenSentiment') || '{}';
        const votesMap = JSON.parse(savedVotes);
        
        // Count bullish and bearish votes for this token
        const tokenVotes = votesMap[tokenId] || {};
        const bullishCount = Object.values(tokenVotes).filter(v => v === 'bullish').length;
        const bearishCount = Object.values(tokenVotes).filter(v => v === 'bearish').length;
        
        // Get current user's vote if logged in
        let userVote = null;
        if (currentUser) {
          userVote = currentUser.userId && tokenVotes[currentUser.userId] 
            ? tokenVotes[currentUser.userId] 
            : null;
        }
        
        setSentimentData(prev => ({
          ...prev,
          userVotes: {
            bullish: bullishCount,
            bearish: bearishCount
          },
          userVote
        }));
      } catch (err) {
        logger.error('Error loading votes', err);
      }
    };
    
    loadUserVotes();
  }, [tokenId, currentUser]);

  // Fetch base sentiment data
  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        // Here you would ideally fetch from a sentiment API
        // For now, we'll use simulated data based on popular tokens
        
        // Sample vote counts (simulate a base of 100 votes)
        let baseBullish = 0;
        let baseBearish = 0;
        
        // Accurate initial sentiment for well-known tokens
        if (tokenId === 'bitcoin') {
          baseBullish = 78;
          baseBearish = 22;
        } else if (tokenId === 'ethereum') {
          baseBullish = 81;
          baseBearish = 19;
        } else if (tokenId === 'binancecoin') {
          baseBullish = 70;
          baseBearish = 30;
        } else if (tokenId === 'solana') {
          baseBullish = 76;
          baseBearish = 24;
        } else if (tokenId === 'ripple') {
          baseBullish = 65;
          baseBearish = 35;
        } else {
          // Generate stable sentiment based on token ID
          const hash = tokenId.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
          }, 0);
          
          baseBullish = 40 + (hash % 40);
          baseBearish = 100 - baseBullish;
        }
        
        setSentimentData(prev => ({
          ...prev,
          baseBullish,
          baseBearish,
          loading: false,
          error: false
        }));
      } catch (error) {
        logger.error('Error fetching sentiment data:', error);
        setSentimentData(prev => ({
          ...prev,
          loading: false,
          error: true
        }));
      }
    };

    fetchSentiment();
  }, [tokenId]);

  const handleVote = (vote) => {
    if (!currentUser || !currentUser.userId) {
      if (showNotification) {
        showNotification('Please sign in to vote', 'info');
      }
      return;
    }

    // Toggle vote if clicking the same option
    const newVote = sentimentData.userVote === vote ? null : vote;
    
    try {
      // Get all token votes
      const savedVotes = localStorage.getItem('allTokenSentiment') || '{}';
      const allVotes = JSON.parse(savedVotes);
      
      // Get votes for this specific token
      if (!allVotes[tokenId]) allVotes[tokenId] = {};
      const tokenVotes = allVotes[tokenId];
      
      // Update or remove user's vote
      if (newVote) {
        tokenVotes[currentUser.userId] = newVote;
      } else {
        delete tokenVotes[currentUser.userId];
      }
      
      // Save back to localStorage
      localStorage.setItem('allTokenSentiment', JSON.stringify(allVotes));
      
      // Count updated votes
      const bullishCount = Object.values(tokenVotes).filter(v => v === 'bullish').length;
      const bearishCount = Object.values(tokenVotes).filter(v => v === 'bearish').length;
      
      // Update state
      setSentimentData(prev => ({
        ...prev,
        userVote: newVote,
        userVotes: {
          bullish: bullishCount,
          bearish: bearishCount
        }
      }));
      
      // Show notification
      if (showNotification) {
        if (newVote) {
          showNotification(`You've voted ${newVote} on ${tokenId}!`, 'success');
        } else {
          showNotification(`Vote removed for ${tokenId}`, 'info');
        }
      }
    } catch (err) {
      logger.error('Error saving vote', err);
      if (showNotification) {
        showNotification('Failed to save your vote', 'error');
      }
    }
  };

  if (sentimentData.loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <p className="text-gray-400 text-center">Loading sentiment data...</p>
      </div>
    );
  }

  if (sentimentData.error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <p className="text-gray-400 text-center">Sentiment data not available</p>
      </div>
    );
  }

  // Calculate displayed percentages
  const percentages = calculatePercentages(sentimentData);

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md">
      <h3 className="text-lg font-semibold text-white mb-3">How do you feel about {tokenId} today?</h3>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleVote('bullish')}
            className={`flex items-center justify-center p-3 rounded-full transition-colors
              ${sentimentData.userVote === 'bullish' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-green-400 hover:bg-gray-600'}`}
          >
            <FaArrowUp className="text-xl" />
          </button>
          <span className="text-green-400 mt-2">{percentages.bullish}%</span>
          <span className="text-gray-400 text-sm">Bullish</span>
        </div>
        
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleVote('bearish')}
            className={`flex items-center justify-center p-3 rounded-full transition-colors
              ${sentimentData.userVote === 'bearish' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-red-400 hover:bg-gray-600'}`}
          >
            <FaArrowDown className="text-xl" />
          </button>
          <span className="text-red-400 mt-2">{percentages.bearish}%</span>
          <span className="text-gray-400 text-sm">Bearish</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-green-600 h-2.5 rounded-full"
          style={{ width: `${percentages.bullish}%` }}
        ></div>
      </div>
      
      <div className="text-gray-400 text-sm text-center mt-2">
        {currentUser && currentUser.userId
          ? sentimentData.userVote 
            ? `Your vote: ${sentimentData.userVote}` 
            : 'Click to vote on market sentiment' 
          : 'Sign in to vote on market sentiment'}
      </div>
      
      <div className="text-gray-400 text-xs text-center mt-1">
        {sentimentData.userVotes.bullish + sentimentData.userVotes.bearish > 0 
          ? `${sentimentData.userVotes.bullish + sentimentData.userVotes.bearish} community votes` 
          : 'Based on market sentiment data'}
      </div>
    </div>
  );
};

export default TokenSentiment; 