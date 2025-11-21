import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const RotatingBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);

  const banners = [
    {
      type: 'aquaswap',
      id: 0
    },
    {
      type: 'extension',
      id: 1
    }
  ];

  // Auto-rotate every 10 seconds
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
        setProgress(0);
      }, 10000);

      // Progress bar animation
      progressRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 0.5; // 100% over 10 seconds (0.5% per 50ms)
        });
      }, 50);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPaused, currentIndex, banners.length]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    setProgress(0);
  };

  const goToBanner = (index) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  return (
    <div 
      className="container mx-auto px-4 mb-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative">
        {/* Banner Container */}
        <div className="relative overflow-hidden rounded-lg shadow-lg" style={{ minHeight: '120px' }}>
          {/* AquaSwap Banner */}
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              currentIndex === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <AquaSwapBanner />
          </div>

          {/* Chrome Extension Banner */}
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              currentIndex === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <ChromeExtensionBanner />
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToBanner(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === index
                  ? 'w-8 bg-white/80'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-white/60 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// AquaSwap Banner Component
const AquaSwapBanner = () => {
  return (
    <div 
      className="rounded-lg p-2 sm:p-3 relative overflow-hidden shadow-lg h-full"
      style={{
        background: 'linear-gradient(to right, #51159D, #6B21A8, #51159D)',
        borderColor: '#FEBC10',
        borderWidth: '2px',
        boxShadow: '0 10px 25px rgba(81, 21, 157, 0.3)'
      }}
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 opacity-10" style={{background: 'linear-gradient(to right, transparent, rgba(254, 188, 16, 0.2), transparent)'}}></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left Section - Logo & Title */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <img 
            src="/AquaSwap.svg" 
            alt="AquaSwap" 
            className="w-10 h-10 sm:w-12 sm:h-12 filter drop-shadow-lg flex-shrink-0"
            style={{filter: 'drop-shadow(0 0 10px rgba(254, 188, 16, 0.8))'}}
          />
          <div>
            <h3 className="font-bold text-sm sm:text-base mb-1 flex items-center gap-2" style={{color: '#FEBC10'}}>
              AquaSwap BEX
              <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse" style={{background: 'linear-gradient(to right, #FEBC10, #FCD34D)', color: '#51159D'}}>
                LIVE
              </span>
            </h3>
            <p className="text-xs sm:text-sm" style={{color: '#FEF3C7'}}>
              Swap & bridge across 50+ blockchains
            </p>
          </div>
        </div>
        
        {/* Center Section - Feature Stats */}
        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 md:gap-4 px-2">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-white/10 backdrop-blur-sm border" style={{borderColor: 'rgba(254, 188, 16, 0.3)'}}>
            <span className="text-base sm:text-lg">🔗</span>
            <div>
              <div className="text-xs sm:text-sm font-bold" style={{color: '#FCD34D'}}>50+</div>
              <div className="text-[10px] sm:text-xs" style={{color: '#FEF3C7', opacity: 0.8}}>Chains</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-white/10 backdrop-blur-sm border" style={{borderColor: 'rgba(254, 188, 16, 0.3)'}}>
            <span className="text-base sm:text-lg">⚡</span>
            <div>
              <div className="text-xs sm:text-sm font-bold" style={{color: '#FCD34D'}}>Instant</div>
              <div className="text-[10px] sm:text-xs" style={{color: '#FEF3C7', opacity: 0.8}}>Swaps</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-white/10 backdrop-blur-sm border" style={{borderColor: 'rgba(254, 188, 16, 0.3)'}}>
            <span className="text-base sm:text-lg">💰</span>
            <div>
              <div className="text-xs sm:text-sm font-bold" style={{color: '#FCD34D'}}>Best</div>
              <div className="text-[10px] sm:text-xs" style={{color: '#FEF3C7', opacity: 0.8}}>Rates</div>
            </div>
          </div>
        </div>
        
        {/* Right Section - CTA Button */}
        <div className="flex-shrink-0">
          <Link
            to="/aquaswap"
            className="relative px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap flex items-center gap-2 group text-sm sm:text-base"
            style={{
              background: 'linear-gradient(to right, #FEBC10, #FCD34D)',
              color: '#51159D',
              boxShadow: '0 10px 25px rgba(254, 188, 16, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #FCD34D, #FDE68A)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(254, 188, 16, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #FEBC10, #FCD34D)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(254, 188, 16, 0.4)';
            }}
          >
            <span>Buy Crypto</span>
            <span className="group-hover:translate-x-1 transition-transform duration-300">🚀</span>
            <div className="absolute inset-0 rounded-lg blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 -z-10" style={{background: 'linear-gradient(to right, #FEBC10, #FCD34D)'}}></div>
          </Link>
        </div>
      </div>
      
    </div>
  );
};

// Chrome Extension Banner Component (Gold base with purple accents)
const ChromeExtensionBanner = () => {
  const extensionUrl = "https://chromewebstore.google.com/detail/ofppakgepmejdbfajgmbjlgoighgbpfd?utm_source=item-share-cb";
  
  return (
    <div 
      className="rounded-lg p-2 sm:p-3 relative overflow-hidden shadow-lg h-full"
      style={{
        background: 'linear-gradient(to right, #FCD34D, #FEBC10, #FCD34D)',
        borderColor: '#6B21A8',
        borderWidth: '2px',
        boxShadow: '0 10px 25px rgba(252, 211, 77, 0.3)'
      }}
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 opacity-10" style={{background: 'linear-gradient(to right, transparent, rgba(107, 33, 168, 0.2), transparent)'}}></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left Section - Icon & Title */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)',
              filter: 'drop-shadow(0 0 10px rgba(107, 33, 168, 0.8))',
              boxShadow: '0 0 15px rgba(107, 33, 168, 0.5)'
            }}
          >
            <span className="text-white text-sm sm:text-base font-bold">🌊</span>
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base mb-1 flex items-center gap-2" style={{color: '#6B21A8'}}>
              AquaSwap Extension
              <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse" style={{background: 'linear-gradient(to right, #6B21A8, #7C3AED)', color: '#FCD34D'}}>
                FREE
              </span>
            </h3>
            <p className="text-xs sm:text-sm" style={{color: '#78350F'}}>
              <span className="font-semibold" style={{color: '#7C3AED'}}>Token Advisor</span> - Swap & analyze from any page
            </p>
          </div>
        </div>
        
        {/* Center Section - Feature Stats */}
        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 md:gap-4 px-2">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-white/10 backdrop-blur-sm border-2" style={{borderColor: 'rgba(107, 33, 168, 0.5)', boxShadow: '0 0 10px rgba(107, 33, 168, 0.3)'}}>
            <span className="text-base sm:text-lg">🎯</span>
            <div>
              <div className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>Token</div>
              <div className="text-[10px] sm:text-xs" style={{color: '#78350F', opacity: 0.9}}>Advisor</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-white/10 backdrop-blur-sm border" style={{borderColor: 'rgba(107, 33, 168, 0.3)'}}>
            <span className="text-base sm:text-lg">⚡</span>
            <div>
              <div className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>Instant</div>
              <div className="text-[10px] sm:text-xs" style={{color: '#78350F', opacity: 0.9}}>Swaps</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-white/10 backdrop-blur-sm border" style={{borderColor: 'rgba(107, 33, 168, 0.3)'}}>
            <span className="text-base sm:text-lg">🔗</span>
            <div>
              <div className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>50+</div>
              <div className="text-[10px] sm:text-xs" style={{color: '#78350F', opacity: 0.9}}>Chains</div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-white/10 backdrop-blur-sm border" style={{borderColor: 'rgba(107, 33, 168, 0.3)'}}>
            <span className="text-base sm:text-lg">🔒</span>
            <div>
              <div className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>Secure</div>
              <div className="text-[10px] sm:text-xs" style={{color: '#78350F', opacity: 0.9}}>100%</div>
            </div>
          </div>
        </div>
        
        {/* Right Section - CTA Button */}
        <div className="flex-shrink-0">
          <a
            href={extensionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap flex items-center gap-2 group text-sm sm:text-base"
            style={{
              background: 'linear-gradient(to right, #6B21A8, #7C3AED)',
              color: '#FCD34D',
              boxShadow: '0 10px 25px rgba(107, 33, 168, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #7C3AED, #8B5CF6)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(107, 33, 168, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #6B21A8, #7C3AED)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(107, 33, 168, 0.4)';
            }}
          >
            <span>Install Now</span>
            <span className="group-hover:translate-x-1 transition-transform duration-300">⬇️</span>
            <div className="absolute inset-0 rounded-lg blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 -z-10" style={{background: 'linear-gradient(to right, #6B21A8, #7C3AED)'}}></div>
          </a>
        </div>
      </div>
      
    </div>
  );
};

export default RotatingBanner;

