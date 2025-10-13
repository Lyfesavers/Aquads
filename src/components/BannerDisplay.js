import React, { useEffect, useState } from 'react';
import { API_URL } from '../services/api';
import logger from '../utils/logger';

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
        logger.error('Failed to fetch active banners:', error);
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

  // Preload the next banner to prevent blurry transitions
  useEffect(() => {
    if (banners.length > 1) {
      const nextIndex = (currentIndex + 1) % banners.length;
      const nextBanner = banners[nextIndex];
      const img = new Image();
      img.src = nextBanner.gif;
    }
  }, [currentIndex, banners]);

  // Add CSS to disable pointer events when modals are shown
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .banner-container {
        pointer-events: auto;
      }
      body:has(.modal-backdrop) .banner-container {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  if (!banners.length) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="banner-container w-full relative z-0">
      <a 
        href={currentBanner.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full flex items-center justify-center overflow-hidden rounded-lg"
      >
        <img
          src={currentBanner.gif}
          alt={currentBanner.title}
          className="w-full h-[60px] sm:h-[80px] md:h-[200px] object-contain rounded-lg"
          width="1280"
          height="200"
          loading="eager"
          onLoad={(e) => {
            if (e.target.src.toLowerCase().endsWith('.gif')) {
              e.target.setAttribute('loop', 'infinite');
            }
          }}
        />
      </a>
    </div>
  );
};

export default BannerDisplay; 