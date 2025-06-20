import React, { useState } from 'react';

const YouTubeEmbed = ({ url, className = '', autoplay = false, muted = true }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Extract video ID from various YouTube URL formats
  const getVideoId = (url) => {
    if (!url) return null;
    
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const videoId = getVideoId(url);

  if (!videoId) {
    return null;
  }

  // YouTube embed parameters for clean look with minimal controls
  const embedParams = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: muted ? '1' : '0',
    controls: '1',           // Show minimal controls (needed for sound)
    modestbranding: '1',     // Remove YouTube logo
    rel: '0',                // Don't show related videos
    showinfo: '0',           // Hide video info (deprecated but still works)
    title: '0',              // Hide video title
    byline: '0',             // Hide video byline
    portrait: '0',           // Hide portrait
    fs: '0',                 // Disable fullscreen
    cc_load_policy: '0',     // Hide captions
    iv_load_policy: '3',     // Hide annotations
    loop: '1',               // Loop the video
    playlist: videoId,       // Required for loop to work
    playsinline: '1',        // Play inline on mobile
    enablejsapi: '1',        // Enable JavaScript API
    color: 'white',          // Use white progress bar (cleaner look)
    origin: window.location.origin // Required for JS API
  }).toString();

  const embedUrl = `https://www.youtube.com/embed/${videoId}?${embedParams}`;

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  if (hasError) {
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <p className="text-sm">Video unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      )}
      <iframe
        src={embedUrl}
        title="Service Video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={false}
        className={`w-full h-full ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
};

export default YouTubeEmbed; 