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
    },
    {
      type: 'onchain-resume',
      id: 2
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

          {/* OnChain Resume Banner */}
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              currentIndex === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <OnChainResumeBanner />
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
    <Link
      to="/aquaswap"
      className="block rounded-lg p-2 sm:p-3 relative overflow-hidden shadow-lg h-full sm:no-underline"
      style={{
        background: 'linear-gradient(to right, #51159D, #6B21A8, #51159D)',
        borderColor: '#FEBC10',
        borderWidth: '2px',
        boxShadow: '0 10px 25px rgba(81, 21, 157, 0.3)',
        cursor: 'pointer'
      }}
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-20" style={{background: 'linear-gradient(to right, transparent, rgba(254, 188, 16, 0.3), transparent)'}}></div>
      
      {/* Floating blockchain icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1 left-8 animate-bounce text-xs sm:text-sm" style={{color: '#FEBC10', opacity: 0.6, animationDelay: '0s', animationDuration: '3s'}}>⚡</div>
        <div className="absolute top-2 right-16 animate-bounce text-xs sm:text-sm" style={{color: '#FEBC10', opacity: 0.6, animationDelay: '1s', animationDuration: '2.5s'}}>🔗</div>
        <div className="absolute bottom-1 left-16 animate-bounce text-xs sm:text-sm" style={{color: '#FEBC10', opacity: 0.6, animationDelay: '2s', animationDuration: '3.5s'}}>💎</div>
        <div className="absolute bottom-1 right-8 animate-bounce text-xs sm:text-sm" style={{color: '#FEBC10', opacity: 0.6, animationDelay: '0.5s', animationDuration: '2.8s'}}>🌊</div>
        <div className="absolute top-1/2 left-1/4 animate-bounce text-xs sm:text-sm" style={{color: '#FEBC10', opacity: 0.6, animationDelay: '1.5s', animationDuration: '3.2s'}}>⭐</div>
        <div className="absolute top-1/3 right-1/3 animate-bounce text-xs sm:text-sm" style={{color: '#FEBC10', opacity: 0.6, animationDelay: '2.5s', animationDuration: '2.7s'}}>🚀</div>
      </div>
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-lg border-2 border-transparent opacity-40" style={{background: 'linear-gradient(to right, rgba(254, 188, 16, 0.5), rgba(81, 21, 157, 0.5), rgba(254, 188, 16, 0.5))'}}></div>
      <div className="absolute inset-[2px] rounded-lg backdrop-blur-sm" style={{background: 'rgba(81, 21, 157, 0.9)'}}></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Enhanced logo with glow effect */}
          <div className="relative">
            <img 
              src="/AquaSwap.svg" 
              alt="AquaSwap" 
              className="w-8 h-8 sm:w-10 sm:h-10 filter drop-shadow-lg flex-shrink-0"
              style={{filter: 'drop-shadow(0 0 10px rgba(254, 188, 16, 0.8))'}}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs sm:text-base mb-0.5 sm:mb-1 flex flex-wrap items-center gap-1 sm:gap-2" style={{color: '#FEBC10'}}>
              <span className="hidden sm:inline">🚀 Use AquaSwap - The Ultimate Cross-Chain BEX!</span>
              <span className="sm:hidden">🚀 AquaSwap BEX</span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full font-bold animate-pulse whitespace-nowrap" style={{background: 'linear-gradient(to right, #FEBC10, #FCD34D)', color: '#51159D'}}>
                LIVE
              </span>
            </h3>
            <p className="text-xs sm:text-sm mb-0.5 sm:mb-1" style={{color: '#FEF3C7'}}>
              <span className="flex items-center gap-1 flex-wrap">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse flex-shrink-0" style={{background: '#FEBC10'}}></span>
                <span>Swap & bridge across 50+ blockchains</span>
                <span className="hidden sm:inline" style={{color: '#FEBC10'}}>•</span>
                <span className="hidden sm:inline font-semibold" style={{color: '#FCD34D'}}>Best rates & speed</span>
              </span>
            </p>
            
            {/* Feature highlights */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(254, 188, 16, 0.2)', color: '#FCD34D', border: '1px solid rgba(254, 188, 16, 0.4)'}}>
                ⚡ Instant Swaps
              </span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(254, 188, 16, 0.2)', color: '#FCD34D', border: '1px solid rgba(254, 188, 16, 0.4)'}}>
                🔗 Cross-Chain
              </span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(254, 188, 16, 0.2)', color: '#FCD34D', border: '1px solid rgba(254, 188, 16, 0.4)'}}>
                💰 Best Rates
              </span>
            </div>
          </div>
        </div>
        
        {/* Enhanced launch button - Hidden on mobile */}
        <div className="relative hidden sm:block">
          <Link
            to="/aquaswap"
            className="relative px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap flex items-center gap-2 group text-sm sm:text-base"
            style={{
              background: 'linear-gradient(to right, #FEBC10, #FCD34D)',
              color: '#51159D',
              boxShadow: '0 10px 25px rgba(254, 188, 16, 0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
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
            
            {/* Button glow effect */}
            <div className="absolute inset-0 rounded-lg blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 -z-10" style={{background: 'linear-gradient(to right, #FEBC10, #FCD34D)'}}></div>
          </Link>
        </div>
      </div>
      
      {/* Animated wave effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-80" style={{background: 'linear-gradient(to right, #FEBC10, #FCD34D, #FEBC10)'}}>
        <div className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
      </div>
    </Link>
  );
};

// Chrome Extension Banner Component (Gold base with purple accents)
const ChromeExtensionBanner = () => {
  const extensionUrl = "https://chromewebstore.google.com/detail/ofppakgepmejdbfajgmbjlgoighgbpfd?utm_source=item-share-cb";
  
  return (
    <a
      href={extensionUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg p-2 sm:p-3 relative overflow-hidden shadow-lg h-full sm:no-underline"
      style={{
        background: 'linear-gradient(to right, #FCD34D, #FEBC10, #FCD34D)',
        borderColor: '#6B21A8',
        borderWidth: '2px',
        boxShadow: '0 10px 25px rgba(252, 211, 77, 0.3)',
        cursor: 'pointer'
      }}
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-20" style={{background: 'linear-gradient(to right, transparent, rgba(107, 33, 168, 0.3), transparent)'}}></div>
      
      {/* Floating browser/extension icons - featuring Token Advisor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1 left-8 animate-bounce text-xs sm:text-sm" style={{color: '#6B21A8', opacity: 0.6, animationDelay: '0s', animationDuration: '3s'}}>🎯</div>
        <div className="absolute top-2 right-16 animate-bounce text-xs sm:text-sm" style={{color: '#6B21A8', opacity: 0.6, animationDelay: '1s', animationDuration: '2.5s'}}>⚡</div>
        <div className="absolute bottom-1 left-16 animate-bounce text-xs sm:text-sm" style={{color: '#6B21A8', opacity: 0.6, animationDelay: '2s', animationDuration: '3.5s'}}>🌐</div>
        <div className="absolute bottom-1 right-8 animate-bounce text-xs sm:text-sm" style={{color: '#6B21A8', opacity: 0.6, animationDelay: '0.5s', animationDuration: '2.8s'}}>🚀</div>
        <div className="absolute top-1/2 left-1/4 animate-bounce text-xs sm:text-sm" style={{color: '#6B21A8', opacity: 0.6, animationDelay: '1.5s', animationDuration: '3.2s'}}>💎</div>
        <div className="absolute top-1/3 right-1/3 animate-bounce text-xs sm:text-sm" style={{color: '#6B21A8', opacity: 0.6, animationDelay: '2.5s', animationDuration: '2.7s'}}>⭐</div>
      </div>
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-lg border-2 border-transparent opacity-40" style={{background: 'linear-gradient(to right, rgba(107, 33, 168, 0.5), rgba(252, 211, 77, 0.5), rgba(107, 33, 168, 0.5))'}}></div>
      <div className="absolute inset-[2px] rounded-lg backdrop-blur-sm" style={{background: 'rgba(252, 211, 77, 0.9)'}}></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Chrome Extension Icon */}
          <div className="relative">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)',
                filter: 'drop-shadow(0 0 10px rgba(107, 33, 168, 0.8))',
                boxShadow: '0 0 15px rgba(107, 33, 168, 0.5)'
              }}
            >
              <span className="text-white text-xs sm:text-sm font-bold">🌊</span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs sm:text-base mb-0.5 sm:mb-1 flex flex-wrap items-center gap-1 sm:gap-2" style={{color: '#6B21A8'}}>
              <span className="hidden sm:inline">🌐 Get AquaSwap Extension - Swap & Analyze Tokens Instantly!</span>
              <span className="sm:hidden">🌐 AquaSwap Extension</span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full font-bold animate-pulse whitespace-nowrap" style={{background: 'linear-gradient(to right, #6B21A8, #7C3AED)', color: '#FCD34D'}}>
                FREE
              </span>
            </h3>
            <p className="text-xs sm:text-sm mb-0.5 sm:mb-1" style={{color: '#78350F'}}>
              <span className="flex items-center gap-1 flex-wrap">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse flex-shrink-0" style={{background: '#6B21A8'}}></span>
                <span className="font-semibold" style={{color: '#7C3AED'}}>✨ Token Advisor</span>
                <span className="hidden sm:inline">- Get instant token analysis on DexScreener & Dextools</span>
                <span className="hidden sm:inline" style={{color: '#6B21A8'}}>•</span>
                <span className="hidden sm:inline font-semibold" style={{color: '#7C3AED'}}>Swap from any page</span>
              </span>
            </p>
            
            {/* Feature highlights - Strong selling points with Token Advisor featured */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full font-semibold" style={{background: 'rgba(107, 33, 168, 0.3)', color: '#7C3AED', border: '2px solid rgba(107, 33, 168, 0.6)', boxShadow: '0 0 8px rgba(107, 33, 168, 0.4)'}}>
                🎯 Token Advisor
              </span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(107, 33, 168, 0.2)', color: '#7C3AED', border: '1px solid rgba(107, 33, 168, 0.4)'}}>
                ⚡ Instant Swaps
              </span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(107, 33, 168, 0.2)', color: '#7C3AED', border: '1px solid rgba(107, 33, 168, 0.4)'}}>
                🔒 100% Secure
              </span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(107, 33, 168, 0.2)', color: '#7C3AED', border: '1px solid rgba(107, 33, 168, 0.4)'}}>
                50+ Chains
              </span>
            </div>
          </div>
        </div>
        
        {/* Enhanced install button - Hidden on mobile */}
        <div className="relative hidden sm:block">
          <a
            href={extensionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap flex items-center gap-2 group text-sm sm:text-base"
            style={{
              background: 'linear-gradient(to right, #6B21A8, #7C3AED)',
              color: '#FCD34D',
              boxShadow: '0 10px 25px rgba(107, 33, 168, 0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #7C3AED, #8B5CF6)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(107, 33, 168, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #6B21A8, #7C3AED)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(107, 33, 168, 0.4)';
            }}
          >
            <span>Install Extension</span>
            <span className="group-hover:translate-x-1 transition-transform duration-300">⬇️</span>
            
            {/* Button glow effect */}
            <div className="absolute inset-0 rounded-lg blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 -z-10" style={{background: 'linear-gradient(to right, #6B21A8, #7C3AED)'}}></div>
          </a>
        </div>
      </div>
      
      {/* Animated wave effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-80" style={{background: 'linear-gradient(to right, #6B21A8, #7C3AED, #6B21A8)'}}>
        <div className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
      </div>
    </a>
  );
};

// OnChain Resume Banner Component (Teal/Cyan theme for blockchain trust)
const OnChainResumeBanner = () => {
  return (
    <Link
      to="/?tab=onchain"
      className="block rounded-lg p-2 sm:p-3 relative overflow-hidden shadow-lg h-full sm:no-underline"
      style={{
        background: 'linear-gradient(135deg, #0D9488, #14B8A6, #0F766E)',
        borderColor: '#5EEAD4',
        borderWidth: '2px',
        boxShadow: '0 10px 25px rgba(13, 148, 136, 0.3)',
        cursor: 'pointer'
      }}
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-20" style={{background: 'linear-gradient(to right, transparent, rgba(94, 234, 212, 0.3), transparent)'}}></div>
      
      {/* Floating blockchain/credential icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1 left-8 animate-bounce text-xs sm:text-sm" style={{color: '#5EEAD4', opacity: 0.6, animationDelay: '0s', animationDuration: '3s'}}>⛓️</div>
        <div className="absolute top-2 right-16 animate-bounce text-xs sm:text-sm" style={{color: '#5EEAD4', opacity: 0.6, animationDelay: '1s', animationDuration: '2.5s'}}>📜</div>
        <div className="absolute bottom-1 left-16 animate-bounce text-xs sm:text-sm" style={{color: '#5EEAD4', opacity: 0.6, animationDelay: '2s', animationDuration: '3.5s'}}>✅</div>
        <div className="absolute bottom-1 right-8 animate-bounce text-xs sm:text-sm" style={{color: '#5EEAD4', opacity: 0.6, animationDelay: '0.5s', animationDuration: '2.8s'}}>🏆</div>
        <div className="absolute top-1/2 left-1/4 animate-bounce text-xs sm:text-sm" style={{color: '#5EEAD4', opacity: 0.6, animationDelay: '1.5s', animationDuration: '3.2s'}}>🔗</div>
        <div className="absolute top-1/3 right-1/3 animate-bounce text-xs sm:text-sm" style={{color: '#5EEAD4', opacity: 0.6, animationDelay: '2.5s', animationDuration: '2.7s'}}>💎</div>
      </div>
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-lg border-2 border-transparent opacity-40" style={{background: 'linear-gradient(to right, rgba(94, 234, 212, 0.5), rgba(13, 148, 136, 0.5), rgba(94, 234, 212, 0.5))'}}></div>
      <div className="absolute inset-[2px] rounded-lg backdrop-blur-sm" style={{background: 'rgba(13, 148, 136, 0.9)'}}></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* OnChain Resume Icon */}
          <div className="relative">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #5EEAD4, #2DD4BF)',
                filter: 'drop-shadow(0 0 10px rgba(94, 234, 212, 0.8))',
                boxShadow: '0 0 15px rgba(94, 234, 212, 0.5)'
              }}
            >
              <span className="text-teal-900 text-sm sm:text-lg font-bold">⛓️</span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs sm:text-base mb-0.5 sm:mb-1 flex flex-wrap items-center gap-1 sm:gap-2" style={{color: '#5EEAD4'}}>
              <span className="hidden sm:inline">🔗 Create Your On-Chain Resume - Verifiable Trust on Base!</span>
              <span className="sm:hidden">🔗 On-Chain Resume</span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full font-bold animate-pulse whitespace-nowrap" style={{background: 'linear-gradient(to right, #5EEAD4, #2DD4BF)', color: '#134E4A'}}>
                NEW
              </span>
            </h3>
            <p className="text-xs sm:text-sm mb-0.5 sm:mb-1" style={{color: '#CCFBF1'}}>
              <span className="flex items-center gap-1 flex-wrap">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse flex-shrink-0" style={{background: '#5EEAD4'}}></span>
                <span className="font-semibold" style={{color: '#99F6E4'}}>✨ Mint Your Trust Score</span>
                <span className="hidden sm:inline">- Portable, verifiable credentials on the blockchain</span>
                <span className="hidden sm:inline" style={{color: '#5EEAD4'}}>•</span>
                <span className="hidden sm:inline font-semibold" style={{color: '#99F6E4'}}>Powered by EAS</span>
              </span>
            </p>
            
            {/* Feature highlights */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full font-semibold" style={{background: 'rgba(94, 234, 212, 0.3)', color: '#99F6E4', border: '2px solid rgba(94, 234, 212, 0.6)', boxShadow: '0 0 8px rgba(94, 234, 212, 0.4)'}}>
                ⛓️ On-Chain Verified
              </span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(94, 234, 212, 0.2)', color: '#99F6E4', border: '1px solid rgba(94, 234, 212, 0.4)'}}>
                🏆 Trust Score
              </span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(94, 234, 212, 0.2)', color: '#99F6E4', border: '1px solid rgba(94, 234, 212, 0.4)'}}>
                📜 Portable CV
              </span>
              <span className="text-xs px-1.5 py-0.5 sm:px-2 rounded-full" style={{background: 'rgba(94, 234, 212, 0.2)', color: '#99F6E4', border: '1px solid rgba(94, 234, 212, 0.4)'}}>
                🔵 Base Network
              </span>
            </div>
          </div>
        </div>
        
        {/* Enhanced CTA button - Hidden on mobile */}
        <div className="relative hidden sm:block">
          <Link
            to="/?tab=onchain"
            className="relative px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap flex items-center gap-2 group text-sm sm:text-base"
            style={{
              background: 'linear-gradient(to right, #5EEAD4, #2DD4BF)',
              color: '#134E4A',
              boxShadow: '0 10px 25px rgba(94, 234, 212, 0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #99F6E4, #5EEAD4)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(94, 234, 212, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #5EEAD4, #2DD4BF)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(94, 234, 212, 0.4)';
            }}
          >
            <span>Create Resume</span>
            <span className="group-hover:translate-x-1 transition-transform duration-300">⛓️</span>
            
            {/* Button glow effect */}
            <div className="absolute inset-0 rounded-lg blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 -z-10" style={{background: 'linear-gradient(to right, #5EEAD4, #2DD4BF)'}}></div>
          </Link>
        </div>
      </div>
      
      {/* Animated wave effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-80" style={{background: 'linear-gradient(to right, #5EEAD4, #2DD4BF, #5EEAD4)'}}>
        <div className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
      </div>
    </Link>
  );
};

export default RotatingBanner;

