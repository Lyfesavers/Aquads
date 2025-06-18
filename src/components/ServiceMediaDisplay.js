import React, { useState, useRef, useEffect } from 'react';
import YouTubeEmbed from './YouTubeEmbed';

// Global state to track which video is currently playing (prevent multiple videos)
let currentPlayingVideo = null;

const ServiceMediaDisplay = ({ service, className = "w-full h-48" }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSoundToggle, setShowSoundToggle] = useState(false);
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
                 setShowSoundToggle(true);
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
               setShowSoundToggle(false);
               setIsMuted(true); // Reset to muted when scrolled out
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
        setShowSoundToggle(true);
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
      setShowSoundToggle(false);
      setIsMuted(true); // Reset to muted when leaving
    }
  };

  // Touch handlers for mobile (optional - complement to intersection observer)
  const handleTouchStart = () => {
    if (service.videoUrl && window.innerWidth <= 768) {
      setShowVideo(true);
      setShowSoundToggle(true);
    }
  };

  // Sound toggle handler
  const handleSoundToggle = (e) => {
    e.stopPropagation(); // Prevent triggering other hover events
    setIsMuted(!isMuted);
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
            muted={isMuted}
          />
          
          {/* Sound Toggle Button */}
          {showSoundToggle && (
            <button
              onClick={handleSoundToggle}
              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-2 transition-all duration-200 z-10"
              title={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
            </button>
          )}
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