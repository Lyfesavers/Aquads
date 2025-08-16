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
        width: 100vw !important;
        max-width: 100vw !important;
        margin-left: calc(-50vw + 50%) !important;
        margin-right: calc(-50vw + 50%) !important;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.1);
      }
      .banner-container a {
        width: 100vw !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .banner-container img {
        width: 100vw !important;
        max-width: 100vw !important;
        object-fit: contain !important;
        object-position: center !important;
        margin: 0 !important;
        padding: 0 !important;
        border-radius: 0 !important;
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
    <div className="banner-container w-screen max-w-screen overflow-hidden relative z-0" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
      <a 
        href={currentBanner.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full flex items-center justify-center"
      >
        <img
          src={currentBanner.gif}
          alt={currentBanner.title}
          className="w-full h-[60px] sm:h-[80px] md:h-[120px] lg:h-[140px] xl:h-[160px] 2xl:h-[180px] object-contain"
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