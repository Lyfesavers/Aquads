import React, { useEffect, useState } from 'react';
import { API_URL } from '../services/api';

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
    <div className="banner-container w-full -mt-4">
      <a 
        href={banner.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full flex items-center justify-center"
      >
        <img
          src={banner.gif}
          alt={banner.title}
          className="w-full h-[80px] sm:h-[100px] md:h-[300px] object-contain"
        />
      </a>
    </div>
  );
};

export default BannerDisplay; 