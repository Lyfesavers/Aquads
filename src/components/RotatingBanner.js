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

// AquaSwap Banner Component - Infographic Style
const AquaSwapBanner = () => {
  return (
    <div 
      className="rounded-lg p-3 sm:p-4 relative overflow-hidden shadow-lg h-full"
      style={{
        background: 'linear-gradient(to right, #51159D, #6B21A8, #51159D)',
        borderColor: '#FEBC10',
        borderWidth: '2px',
        boxShadow: '0 10px 25px rgba(81, 21, 157, 0.3)'
      }}
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-20" style={{background: 'linear-gradient(to right, transparent, rgba(254, 188, 16, 0.3), transparent)'}}></div>
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-lg border-2 border-transparent opacity-40" style={{background: 'linear-gradient(to right, rgba(254, 188, 16, 0.5), rgba(81, 21, 157, 0.5), rgba(254, 188, 16, 0.5))'}}></div>
      <div className="absolute inset-[2px] rounded-lg backdrop-blur-sm" style={{background: 'rgba(81, 21, 157, 0.9)'}}></div>
      
      {/* Infographic Layout - Grid System */}
      <div className="relative z-10 grid grid-cols-12 gap-2 sm:gap-3 items-center h-full">
        {/* Left Section - Logo & Title */}
        <div className="col-span-12 sm:col-span-3 flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <img 
              src="/AquaSwap.svg" 
              alt="AquaSwap" 
              className="w-10 h-10 sm:w-12 sm:h-12 filter drop-shadow-lg flex-shrink-0"
              style={{filter: 'drop-shadow(0 0 10px rgba(254, 188, 16, 0.8))'}}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs sm:text-sm mb-0.5" style={{color: '#FEBC10', lineHeight: '1.2'}}>
              AquaSwap BEX
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse" style={{background: 'linear-gradient(to right, #FEBC10, #FCD34D)', color: '#51159D'}}>
                LIVE
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{background: 'rgba(254, 188, 16, 0.2)', color: '#FCD34D'}}>
                Cross-Chain
              </span>
            </div>
          </div>
        </div>

        {/* Center Section - Features Grid */}
        <div className="col-span-12 sm:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
          {/* 50+ Blockchains - Featured */}
          <div className="col-span-2 sm:col-span-1 bg-white/20 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(254, 188, 16, 0.4)', boxShadow: '0 0 8px rgba(254, 188, 16, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs sm:text-sm">🔗</span>
              <span className="text-[10px] sm:text-xs font-bold" style={{color: '#FCD34D'}}>50+ Chains</span>
            </div>
            <p className="text-[9px] sm:text-[10px] leading-tight" style={{color: '#FEF3C7'}}>Ethereum, BSC, Polygon, Solana & more</p>
          </div>

          {/* Instant Swaps */}
          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(254, 188, 16, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">⚡</span>
              <span className="text-[10px] font-semibold" style={{color: '#FCD34D'}}>Instant</span>
            </div>
            <p className="text-[9px] leading-tight" style={{color: '#FEF3C7'}}>Lightning fast</p>
          </div>

          {/* Best Rates */}
          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(254, 188, 16, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">💰</span>
              <span className="text-[10px] font-semibold" style={{color: '#FCD34D'}}>Best Rates</span>
            </div>
            <p className="text-[9px] leading-tight" style={{color: '#FEF3C7'}}>Optimal pricing</p>
          </div>

          {/* Bridge Support */}
          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(254, 188, 16, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">🌉</span>
              <span className="text-[10px] font-semibold" style={{color: '#FCD34D'}}>Bridge</span>
            </div>
            <p className="text-[9px] leading-tight" style={{color: '#FEF3C7'}}>Cross-chain</p>
          </div>

          {/* Secure */}
          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(254, 188, 16, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">🔒</span>
              <span className="text-[10px] font-semibold" style={{color: '#FCD34D'}}>Secure</span>
            </div>
            <p className="text-[9px] leading-tight" style={{color: '#FEF3C7'}}>Audited</p>
          </div>
        </div>

        {/* Right Section - CTA Button */}
        <div className="col-span-12 sm:col-span-3 flex justify-center sm:justify-end">
          <Link
            to="/aquaswap"
            className="relative px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap flex items-center gap-1.5 group text-xs sm:text-sm w-full sm:w-auto justify-center"
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
      
      {/* Animated wave effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-80" style={{background: 'linear-gradient(to right, #FEBC10, #FCD34D, #FEBC10)'}}>
        <div className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
      </div>
    </div>
  );
};

// Chrome Extension Banner Component (Gold base with purple accents) - Infographic Style
const ChromeExtensionBanner = () => {
  const extensionUrl = "https://chromewebstore.google.com/detail/ofppakgepmejdbfajgmbjlgoighgbpfd?utm_source=item-share-cb";
  
  return (
    <div 
      className="rounded-lg p-3 sm:p-4 relative overflow-hidden shadow-lg h-full"
      style={{
        background: 'linear-gradient(to right, #FCD34D, #FEBC10, #FCD34D)',
        borderColor: '#6B21A8',
        borderWidth: '2px',
        boxShadow: '0 10px 25px rgba(252, 211, 77, 0.3)'
      }}
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-20" style={{background: 'linear-gradient(to right, transparent, rgba(107, 33, 168, 0.3), transparent)'}}></div>
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-lg border-2 border-transparent opacity-40" style={{background: 'linear-gradient(to right, rgba(107, 33, 168, 0.5), rgba(252, 211, 77, 0.5), rgba(107, 33, 168, 0.5))'}}></div>
      <div className="absolute inset-[2px] rounded-lg backdrop-blur-sm" style={{background: 'rgba(252, 211, 77, 0.9)'}}></div>
      
      {/* Infographic Layout - Grid System */}
      <div className="relative z-10 grid grid-cols-12 gap-2 sm:gap-3 items-center h-full">
        {/* Left Section - Icon & Title */}
        <div className="col-span-12 sm:col-span-3 flex items-center gap-2 sm:gap-3">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)',
              filter: 'drop-shadow(0 0 10px rgba(107, 33, 168, 0.8))',
              boxShadow: '0 0 15px rgba(107, 33, 168, 0.5)'
            }}
          >
            <span className="text-white text-base sm:text-lg font-bold">🌊</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs sm:text-sm mb-0.5" style={{color: '#6B21A8', lineHeight: '1.2'}}>
              AquaSwap Extension
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse" style={{background: 'linear-gradient(to right, #6B21A8, #7C3AED)', color: '#FCD34D'}}>
                FREE
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{background: 'rgba(107, 33, 168, 0.2)', color: '#7C3AED'}}>
                5.0 ⭐
              </span>
            </div>
          </div>
        </div>

        {/* Center Section - Features Grid */}
        <div className="col-span-12 sm:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
          {/* Token Advisor - Featured */}
          <div className="col-span-2 sm:col-span-1 bg-white/20 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(107, 33, 168, 0.4)', boxShadow: '0 0 8px rgba(107, 33, 168, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs sm:text-sm">🎯</span>
              <span className="text-[10px] sm:text-xs font-bold" style={{color: '#7C3AED'}}>Token Advisor</span>
            </div>
            <p className="text-[9px] sm:text-[10px] leading-tight" style={{color: '#78350F'}}>AI-powered analysis on DexScreener & Dextools</p>
          </div>

          {/* Instant Swaps */}
          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(107, 33, 168, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">⚡</span>
              <span className="text-[10px] font-semibold" style={{color: '#7C3AED'}}>Instant</span>
            </div>
            <p className="text-[9px] leading-tight" style={{color: '#78350F'}}>Swap from any page</p>
          </div>

          {/* 50+ Chains */}
          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(107, 33, 168, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">🔗</span>
              <span className="text-[10px] font-semibold" style={{color: '#7C3AED'}}>50+ Chains</span>
            </div>
            <p className="text-[9px] leading-tight" style={{color: '#78350F'}}>Multi-chain support</p>
          </div>

          {/* Secure */}
          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(107, 33, 168, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">🔒</span>
              <span className="text-[10px] font-semibold" style={{color: '#7C3AED'}}>100% Secure</span>
            </div>
            <p className="text-[9px] leading-tight" style={{color: '#78350F'}}>No data stored</p>
          </div>

          {/* Best Rates */}
          <div className="bg-white/15 backdrop-blur-sm rounded-md p-1.5 sm:p-2 border" style={{borderColor: 'rgba(107, 33, 168, 0.3)'}}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">💰</span>
              <span className="text-[10px] font-semibold" style={{color: '#7C3AED'}}>Best Rates</span>
            </div>
            <p className="text-[9px] leading-tight" style={{color: '#78350F'}}>Optimal pricing</p>
          </div>
        </div>

        {/* Right Section - CTA Button */}
        <div className="col-span-12 sm:col-span-3 flex justify-center sm:justify-end">
          <a
            href={extensionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap flex items-center gap-1.5 group text-xs sm:text-sm w-full sm:w-auto justify-center"
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
      
      {/* Animated wave effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-80" style={{background: 'linear-gradient(to right, #6B21A8, #7C3AED, #6B21A8)'}}>
        <div className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
      </div>
    </div>
  );
};

export default RotatingBanner;

