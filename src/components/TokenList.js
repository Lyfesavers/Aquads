import React, { useState, useEffect, useRef } from 'react';
import TokenReviews from './TokenReviews';
import { Chart } from 'chart.js/auto';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
console.log('Using API URL:', API_URL);

// Initialize socket
const socket = io(API_URL, {
  withCredentials: true,
  transports: ['websocket'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

const TokenList = ({ currentUser, showNotification }) => {
  // Combine all state declarations at the top
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  // ... other state variables ...

  // Load ads
  useEffect(() => {
    const loadAds = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching ads from:', `${API_URL}/api/ads`);
        
        const response = await fetch(`${API_URL}/api/ads`);
        console.log('Response:', response);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Ads data:', data);
        
        setAds(data);
      } catch (error) {
        console.error('Error loading ads:', error);
        setError(error.message);
        showNotification('Error loading ads: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    loadAds();
  }, [showNotification]);

  // Render ads
  const renderAds = () => {
    if (loading) return <div>Loading ads...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!ads || ads.length === 0) return <div>No ads available</div>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map(ad => (
          <div key={ad._id} className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-white">{ad.title}</h3>
            <p className="text-gray-300">{ad.description}</p>
          </div>
        ))}
      </div>
    );
  };

  // ... rest of your component code ...

  return (
    <div>
      {/* Your existing content */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Featured Ads</h2>
        {renderAds()}
      </div>
      {/* Rest of your component */}
    </div>
  );
};

export default TokenList; 