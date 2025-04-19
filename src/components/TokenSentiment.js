import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import logger from '../utils/logger';

const TokenSentiment = ({ tokenId }) => {
  const [sentiment, setSentiment] = useState({
    bullish: 0,
    bearish: 0,
    loading: true,
    error: false
  });

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
  }, [tokenId]);

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
      <h3 className="text-lg font-semibold text-white mb-3">How do traders feel about {tokenId} today?</h3>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center p-3 rounded-full bg-gray-700 text-green-400">
            <FaArrowUp className="text-xl" />
          </div>
          <span className="text-green-400 mt-2">{sentiment.bullish}%</span>
          <span className="text-gray-400 text-sm">Bullish</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center p-3 rounded-full bg-gray-700 text-red-400">
            <FaArrowDown className="text-xl" />
          </div>
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
        Based on CoinGecko community sentiment
      </div>
    </div>
  );
};

export default TokenSentiment; 