import React, { useEffect, useState } from 'react';
import { getBannerRotationState, subscribeBannerRotation } from '../utils/bannerAdRotation';

function sameBanner(prev, next) {
  if (prev === next) return true;
  if (!prev || !next) return !prev && !next;
  return String(prev._id) === String(next._id) && prev.gif === next.gif && prev.url === next.url;
}

const BannerDisplay = ({ rounded = true }) => {
  const [currentBanner, setCurrentBanner] = useState(
    () => getBannerRotationState().currentBanner
  );

  useEffect(() => {
    return subscribeBannerRotation((state) => {
      setCurrentBanner((prev) => (sameBanner(prev, state.currentBanner) ? prev : state.currentBanner));
    });
  }, []);

  if (!currentBanner) {
    return null;
  }

  return (
    <div className={`banner-container w-full relative z-0 flex justify-center ${rounded ? 'banner-rounded' : ''}`}>
      <a 
        href={currentBanner.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center max-w-full"
      >
        <img
          src={currentBanner.gif}
          alt={currentBanner.title}
          className="w-auto max-w-full h-[60px] sm:h-[80px] md:h-[200px] object-contain"
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
