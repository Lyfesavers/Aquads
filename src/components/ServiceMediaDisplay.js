import React, { useState, useRef, useEffect } from 'react';
import YouTubeEmbed from './YouTubeEmbed';

// Global state to track which video is currently playing (prevent multiple videos)
let currentPlayingVideo = null;

const ServiceMediaDisplay = ({ service, className = "w-full h-48" }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const serviceIdRef = useRef(service._id);

  // Intersection Observer for mobile scroll detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
          
                     // On mobile, auto-play when 50% of the element is visible
           if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
             if (service.videoUrl && window.innerWidth <= 768) {
               // Small delay to avoid triggering too quickly on scroll
               clearTimeout(hoverTimeoutRef.current);
               hoverTimeoutRef.current = setTimeout(() => {
                 // Stop any currently playing video
                 if (currentPlayingVideo && currentPlayingVideo !== serviceIdRef.current) {
                   // Could emit custom event for more control if needed
                 }
                 currentPlayingVideo = serviceIdRef.current;
                 setShowVideo(true);
               }, 300);
             }
           } else {
             // Hide video when scrolled out of view
             if (window.innerWidth <= 768) {
               clearTimeout(hoverTimeoutRef.current);
               if (currentPlayingVideo === serviceIdRef.current) {
                 currentPlayingVideo = null;
               }
               setShowVideo(false);
             }
           }
        });
      },
      {
        threshold: [0.3, 0.5, 0.7], // Multiple thresholds for smooth transitions
        rootMargin: '-20px' // Slight margin to avoid premature triggering
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      clearTimeout(hoverTimeoutRef.current);
    };
  }, [service.videoUrl]);

  // Desktop hover handlers
  const handleMouseEnter = () => {
    if (service.videoUrl && window.innerWidth > 768) {
      // Small delay to avoid accidental triggers
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        // Stop any currently playing video
        if (currentPlayingVideo && currentPlayingVideo !== serviceIdRef.current) {
          // We could emit a custom event here if needed for more sophisticated control
        }
        currentPlayingVideo = serviceIdRef.current;
        setShowVideo(true);
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth > 768) {
      clearTimeout(hoverTimeoutRef.current);
      if (currentPlayingVideo === serviceIdRef.current) {
        currentPlayingVideo = null;
      }
      setShowVideo(false);
    }
  };

  // Touch handlers for mobile (optional - complement to intersection observer)
  const handleTouchStart = () => {
    if (service.videoUrl && window.innerWidth <= 768) {
      setShowVideo(true);
    }
  };

  const ServiceImageComponent = ({ src, alt, className }) => {
    const [imgSrc, setImgSrc] = useState(getImageUrl(src));

    return (
      <img 
        src={imgSrc}
        alt={alt}
        className={className}
        onError={(e) => {
          e.target.onerror = null;
          setImgSrc('https://placehold.co/400x300?text=No+Image');
        }}
      />
    );
  };

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'https://placehold.co/400x300?text=No+Image';
    }
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return 'https://placehold.co/400x300?text=No+Image';
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className} overflow-hidden rounded-t-lg group cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
    >
      {/* Image - Always rendered, hidden when video is playing */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${
          showVideo && service.videoUrl ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <ServiceImageComponent 
          src={service.image}
          alt={service.title}
          className="w-full h-full object-cover"
        />
        
        {/* Video indicator overlay */}
        {service.videoUrl && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Video - Only rendered when needed */}
      {showVideo && service.videoUrl && (
        <div className="absolute inset-0 transition-opacity duration-300 opacity-100">
          <YouTubeEmbed 
            url={service.videoUrl}
            className="w-full h-full"
            autoplay={true}
            muted={window.innerWidth > 768}
          />
        </div>
      )}

      {/* Loading indicator for video */}
      {showVideo && service.videoUrl && (
        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center pointer-events-none opacity-0 animate-pulse">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default ServiceMediaDisplay; 