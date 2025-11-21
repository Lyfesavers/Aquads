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
      className="container mx-auto px-2 sm:px-4 mb-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative">
        {/* Banner Container */}
        <div className="relative overflow-hidden rounded-lg sm:rounded-xl shadow-lg" style={{ minHeight: 'auto' }}>
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
        <div className="absolute bottom-2 sm:bottom-3 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToBanner(index)}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 touch-manipulation ${
                currentIndex === index
                  ? 'w-6 sm:w-8 bg-white/80'
                  : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/60 active:bg-white/70'
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-white/20 z-20">
          <div
            className="h-full bg-white/60 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// AquaSwap Banner Component - Premium Design (Fully Responsive)
const AquaSwapBanner = () => {
  return (
    <div 
      className="rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 relative overflow-hidden shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, #51159D 0%, #6B21A8 50%, #51159D 100%)',
        border: '2px solid #FEBC10',
        boxShadow: '0 20px 40px rgba(81, 21, 157, 0.4), 0 0 30px rgba(254, 188, 16, 0.2)',
        minHeight: 'auto'
      }}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 opacity-30" style={{
        background: 'linear-gradient(135deg, rgba(254, 188, 16, 0.1) 0%, transparent 50%, rgba(254, 188, 16, 0.1) 100%)',
        animation: 'shimmer 3s ease-in-out infinite'
      }}></div>
      
      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 lg:gap-6">
        {/* Left Section - Branding */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 w-full lg:w-auto justify-center lg:justify-start">
          <div className="relative">
            <img 
              src="/AquaSwap.svg" 
              alt="AquaSwap" 
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 filter drop-shadow-2xl"
              style={{filter: 'drop-shadow(0 0 20px rgba(254, 188, 16, 0.9))'}}
            />
          </div>
          <div className="flex-1 lg:flex-none">
            <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 text-center lg:text-left" style={{color: '#FEBC10', textShadow: '0 2px 10px rgba(254, 188, 16, 0.5)'}}>
              AquaSwap BEX
            </h3>
            <div className="flex items-center gap-1.5 sm:gap-2 justify-center lg:justify-start">
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold animate-pulse" style={{
                background: 'linear-gradient(135deg, #FEBC10, #FCD34D)',
                color: '#51159D',
                boxShadow: '0 4px 12px rgba(254, 188, 16, 0.4)'
              }}>
                LIVE
              </span>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold" style={{
                background: 'rgba(254, 188, 16, 0.25)',
                color: '#FCD34D',
                border: '1px solid rgba(254, 188, 16, 0.5)'
              }}>
                Cross-Chain
              </span>
            </div>
          </div>
        </div>

        {/* Center Section - Features */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 w-full lg:max-w-4xl">
          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(254, 188, 16, 0.4)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">🔗</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#FCD34D'}}>50+ Chains</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#FEF3C7', opacity: 0.9}}>
              <span className="hidden sm:inline">Ethereum, BSC, Polygon, Solana & more</span>
              <span className="sm:hidden">50+ blockchains</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(254, 188, 16, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">⚡</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#FCD34D'}}>Instant</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#FEF3C7', opacity: 0.9}}>
              <span className="hidden sm:inline">Lightning fast swaps</span>
              <span className="sm:hidden">Fast swaps</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(254, 188, 16, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">💰</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#FCD34D'}}>Best Rates</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#FEF3C7', opacity: 0.9}}>
              <span className="hidden sm:inline">Optimal pricing</span>
              <span className="sm:hidden">Great rates</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(254, 188, 16, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">🌉</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#FCD34D'}}>Bridge</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#FEF3C7', opacity: 0.9}}>
              <span className="hidden sm:inline">Cross-chain support</span>
              <span className="sm:hidden">Cross-chain</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(254, 188, 16, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">🔒</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#FCD34D'}}>Secure</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#FEF3C7', opacity: 0.9}}>
              <span className="hidden sm:inline">Audited & safe</span>
              <span className="sm:hidden">Audited</span>
            </p>
          </div>
        </div>

        {/* Right Section - CTA */}
        <div className="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-end">
          <Link
            to="/aquaswap"
            className="relative px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl flex items-center justify-center gap-2 group w-full sm:w-auto touch-manipulation"
            style={{
              background: 'linear-gradient(135deg, #FEBC10, #FCD34D)',
              color: '#51159D',
              boxShadow: '0 10px 30px rgba(254, 188, 16, 0.5)',
              minHeight: '44px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #FCD34D, #FDE68A)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(254, 188, 16, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #FEBC10, #FCD34D)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(254, 188, 16, 0.5)';
            }}
          >
            <span>Buy Crypto</span>
            <span className="text-base sm:text-lg group-hover:translate-x-1 transition-transform duration-300">🚀</span>
            <div className="absolute inset-0 rounded-lg sm:rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 -z-10" style={{
              background: 'linear-gradient(135deg, #FEBC10, #FCD34D)'
            }}></div>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Chrome Extension Banner Component - Premium Design (Fully Responsive)
const ChromeExtensionBanner = () => {
  const extensionUrl = "https://chromewebstore.google.com/detail/ofppakgepmejdbfajgmbjlgoighgbpfd?utm_source=item-share-cb";
  
  return (
    <div 
      className="rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 relative overflow-hidden shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, #FCD34D 0%, #FEBC10 50%, #FCD34D 100%)',
        border: '2px solid #6B21A8',
        boxShadow: '0 20px 40px rgba(252, 211, 77, 0.4), 0 0 30px rgba(107, 33, 168, 0.2)',
        minHeight: 'auto'
      }}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 opacity-30" style={{
        background: 'linear-gradient(135deg, rgba(107, 33, 168, 0.1) 0%, transparent 50%, rgba(107, 33, 168, 0.1) 100%)',
        animation: 'shimmer 3s ease-in-out infinite'
      }}></div>
      
      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 lg:gap-6">
        {/* Left Section - Branding */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 w-full lg:w-auto justify-center lg:justify-start">
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)',
              filter: 'drop-shadow(0 0 20px rgba(107, 33, 168, 0.9))',
              boxShadow: '0 10px 30px rgba(107, 33, 168, 0.5)'
            }}
          >
            <span className="text-white text-lg sm:text-xl md:text-2xl font-bold">🌊</span>
          </div>
          <div className="flex-1 lg:flex-none">
            <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 text-center lg:text-left" style={{color: '#6B21A8', textShadow: '0 2px 10px rgba(107, 33, 168, 0.5)'}}>
              AquaSwap Extension
            </h3>
            <div className="flex items-center gap-1.5 sm:gap-2 justify-center lg:justify-start">
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold animate-pulse" style={{
                background: 'linear-gradient(135deg, #6B21A8, #7C3AED)',
                color: '#FCD34D',
                boxShadow: '0 4px 12px rgba(107, 33, 168, 0.4)'
              }}>
                FREE
              </span>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold" style={{
                background: 'rgba(107, 33, 168, 0.25)',
                color: '#7C3AED',
                border: '1px solid rgba(107, 33, 168, 0.5)'
              }}>
                5.0 ⭐
              </span>
            </div>
          </div>
        </div>

        {/* Center Section - Features */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 w-full lg:max-w-4xl">
          {/* Token Advisor - Featured */}
          <div className="bg-white/15 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border-2" style={{
            borderColor: 'rgba(107, 33, 168, 0.5)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 0 20px rgba(107, 33, 168, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, rgba(107, 33, 168, 0.2), rgba(124, 58, 237, 0.15))'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">🎯</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>Token Advisor</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#78350F', opacity: 0.9}}>
              <span className="hidden sm:inline">AI analysis on DexScreener & Dextools</span>
              <span className="sm:hidden">AI token analysis</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(107, 33, 168, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">⚡</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>Instant</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#78350F', opacity: 0.9}}>
              <span className="hidden sm:inline">Swap from any page</span>
              <span className="sm:hidden">Any page</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(107, 33, 168, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">🔗</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>50+ Chains</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#78350F', opacity: 0.9}}>
              <span className="hidden sm:inline">Multi-chain support</span>
              <span className="sm:hidden">Multi-chain</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(107, 33, 168, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">🔒</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>100% Secure</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#78350F', opacity: 0.9}}>
              <span className="hidden sm:inline">No data stored</span>
              <span className="sm:hidden">Secure</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-md sm:rounded-lg p-2 sm:p-3 border" style={{
            borderColor: 'rgba(107, 33, 168, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className="text-base sm:text-lg">💰</span>
              <span className="text-xs sm:text-sm font-bold" style={{color: '#7C3AED'}}>Best Rates</span>
            </div>
            <p className="text-[10px] sm:text-xs leading-tight" style={{color: '#78350F', opacity: 0.9}}>
              <span className="hidden sm:inline">Optimal pricing</span>
              <span className="sm:hidden">Great rates</span>
            </p>
          </div>
        </div>

        {/* Right Section - CTA */}
        <div className="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-end">
          <a
            href={extensionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl flex items-center justify-center gap-2 group w-full sm:w-auto touch-manipulation"
            style={{
              background: 'linear-gradient(135deg, #6B21A8, #7C3AED)',
              color: '#FCD34D',
              boxShadow: '0 10px 30px rgba(107, 33, 168, 0.5)',
              minHeight: '44px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED, #8B5CF6)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(107, 33, 168, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #6B21A8, #7C3AED)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(107, 33, 168, 0.5)';
            }}
          >
            <span>Install Now</span>
            <span className="text-base sm:text-lg group-hover:translate-x-1 transition-transform duration-300">⬇️</span>
            <div className="absolute inset-0 rounded-lg sm:rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 -z-10" style={{
              background: 'linear-gradient(135deg, #6B21A8, #7C3AED)'
            }}></div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default RotatingBanner;

