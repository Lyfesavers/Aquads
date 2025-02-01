import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';

const BannerDisplay = () => {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const fetchActiveBanner = async () => {
      try {
        const response = await fetch(`${API_URL}/bannerAds/active`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setBanner(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch active banner:', error);
      }
    };

    fetchActiveBanner();
    const interval = setInterval(fetchActiveBanner, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  if (!banner) {
    return null;
  }

  return (
    <div className="banner-container mb-4" style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <a 
        href={banner.url} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ display: 'block', textAlign: 'center' }}
      >
        <img
          src={banner.gif}
          alt={banner.title}
          style={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: '200px',
            objectFit: 'contain'
          }}
        />
      </a>
    </div>
  );
};

export default BannerDisplay; 