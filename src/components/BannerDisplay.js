import React, { useEffect, useState } from 'react';
import { API_URL } from '../services/api';

const BannerDisplay = () => {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchActiveBanners = async () => {
      try {
        const response = await fetch(`${API_URL}/bannerAds/active`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setBanners(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch active banners:', error);
      }
    };

    fetchActiveBanners();
    const fetchInterval = setInterval(fetchActiveBanners, 60000); // Refresh list every minute

    return () => clearInterval(fetchInterval);
  }, []);

  // Rotate through banners every 10 seconds
  useEffect(() => {
    if (banners.length <= 1) return;

    const rotationInterval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 10000); // Change banner every 10 seconds

    return () => clearInterval(rotationInterval);
  }, [banners.length]);

  if (!banners.length) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="banner-container w-full -mt-4">
      <a 
        href={currentBanner.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full flex items-center justify-center"
      >
        <img
          src={currentBanner.gif}
          alt={currentBanner.title}
          className="w-full h-[80px] sm:h-[100px] md:h-[300px] object-contain"
        />
      </a>
    </div>
  );
};

export default BannerDisplay; 