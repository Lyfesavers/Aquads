import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import './LandingPage.css';

// Floating particle component
const FloatingParticle = ({ delay, size, color, x, y }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      left: `${x}%`,
      top: `${y}%`,
    }}
    animate={{
      y: [0, -30, 0],
      x: [0, 15, -15, 0],
      scale: [1, 1.2, 0.9, 1],
      opacity: [0.4, 0.8, 0.4],
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
);

// Morphing blob component
const MorphingBlob = ({ color, size, position, delay }) => (
  <motion.div
    className="absolute rounded-full blur-3xl pointer-events-none"
    style={{
      width: size,
      height: size,
      background: color,
      ...position,
    }}
    animate={{
      scale: [1, 1.3, 0.9, 1.1, 1],
      x: [0, 50, -30, 20, 0],
      y: [0, -40, 30, -20, 0],
      rotate: [0, 90, 180, 270, 360],
    }}
    transition={{
      duration: 20,
      delay,
      repeat: Infinity,
      ease: "linear"
    }}
  />
);

// Grid line component
const GridLine = ({ vertical, position }) => (
  <motion.div
    className={`absolute ${vertical ? 'h-full w-px' : 'w-full h-px'}`}
    style={{
      background: 'linear-gradient(to right, transparent, rgba(0, 255, 255, 0.1), transparent)',
      [vertical ? 'left' : 'top']: position,
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2 }}
  />
);

// Interactive 3D Carousel Component
const FeaturesCarousel = ({ features }) => {
  const [activeIndex, setActiveIndex] = useState(-1); // Start with no card selected
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef(null);
  const scrollRef = useRef(null);
  const autoScrollInterval = useRef(null);


  const handleScroll = (e) => {
    // Don't auto-select on scroll - let user interact manually
  };

  // Auto-scroll functionality - pauses on hover
  useEffect(() => {
    if (!scrollRef.current) return;

    const scrollContainer = scrollRef.current;
    let currentIndex = 0;
    let startDelayTimeout = null;

    const getCardWidth = () => {
      // Calculate card width based on viewport
      const viewportWidth = window.innerWidth;
      if (viewportWidth >= 1280) return viewportWidth * 0.30; // xl: 30vw
      if (viewportWidth >= 1024) return viewportWidth * 0.35; // lg: 35vw
      if (viewportWidth >= 768) return viewportWidth * 0.45;  // md: 45vw
      if (viewportWidth >= 640) return viewportWidth * 0.70;  // sm: 70vw
      return viewportWidth * 0.85; // default: 85vw
    };

    const autoScroll = () => {
      if (isPaused || !scrollContainer) return;
      
      currentIndex = (currentIndex + 1) % features.length;
      const cardWidth = getCardWidth();
      const gap = window.innerWidth >= 768 ? 24 : 16; // md:gap-6 = 24px, gap-4 = 16px
      const targetScroll = currentIndex * (cardWidth + gap);

      scrollContainer.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    };

    // Start auto-scroll after initial delay
    startDelayTimeout = setTimeout(() => {
      // Start first scroll immediately
      autoScroll();
      // Then continue with interval - reduced for smoother flow
      autoScrollInterval.current = setInterval(autoScroll, 2000); // Scroll every 2 seconds
    }, 1500);

    return () => {
      if (startDelayTimeout) {
        clearTimeout(startDelayTimeout);
      }
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    };
  }, [features.length, isPaused]);

  // Pause on hover
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  return (
    <div 
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Scrollable container - full width */}
      <div
        ref={carouselRef}
        className="relative perspective-1000 w-full"
        style={{ perspective: '1000px' }}
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-visible pb-8 snap-x snap-mandatory scrollbar-hide w-full px-4 md:px-0"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {features.map((feature, index) => {
            // No auto-selection - all cards equal until user interacts
            const isActive = activeIndex >= 0 && index === activeIndex;
            const distance = activeIndex >= 0 ? Math.abs(index - activeIndex) : 0;
            // All cards same scale - no zoom until user selects
            const scale = activeIndex < 0 ? 0.95 : (distance === 0 ? 1.02 : 0.95);
            const opacity = activeIndex < 0 ? 0.8 : (distance === 0 ? 1 : 0.8);
            const rotateY = 0; // No tilt
            const zIndex = 1;

            return (
  <motion.div
                key={feature.title}
                className="flex-shrink-0 w-[85vw] sm:w-[70vw] md:w-[45vw] lg:w-[35vw] xl:w-[30vw] snap-center"
                style={{
                  transformStyle: 'preserve-3d',
                  zIndex
                }}
                animate={{
                  scale,
                  opacity,
                  rotateY: 0, // No tilt
                  y: 0 // No lift
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30
                }}
                whileHover={{
                  scale: 1.03, // Subtle hover zoom
                  y: -8, // Subtle hover lift
                  rotateY: 0 // No tilt on hover
                }}
                onClick={() => setActiveIndex(index === activeIndex ? -1 : index)} // Toggle selection on click
              >
                {feature.link ? (
                  <Link to={feature.link} className="block h-full">
                    <CarouselCard feature={feature} index={index} />
                  </Link>
                ) : (
                  <CarouselCard feature={feature} index={index} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-2 mt-8">
        {features.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              const getCardWidth = () => {
                const viewportWidth = window.innerWidth;
                if (viewportWidth >= 1280) return viewportWidth * 0.30;
                if (viewportWidth >= 1024) return viewportWidth * 0.35;
                if (viewportWidth >= 768) return viewportWidth * 0.45;
                if (viewportWidth >= 640) return viewportWidth * 0.70;
                return viewportWidth * 0.85;
              };
              const cardWidth = getCardWidth();
              const gap = window.innerWidth >= 768 ? 24 : 16;
              scrollRef.current?.scrollTo({
                left: index * (cardWidth + gap),
                behavior: 'smooth'
              });
              setActiveIndex(index);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === activeIndex && activeIndex >= 0
                ? 'bg-cyan-400 w-8'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 text-gray-400 text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span>Scroll</span>
        <motion.div
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          →
        </motion.div>
      </motion.div>
    </div>
  );
};

// Feature Preview SVG Component
const FeaturePreviewSVG = ({ featureTitle }) => {
  const svgProps = {
    width: "100%",
    height: "140",
    viewBox: "0 0 300 140",
    className: "mt-4 opacity-80"
  };

  switch (featureTitle) {
    case 'Freelancer Marketplace':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="marketplaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Service Card 1 */}
          <rect x="10" y="20" width="85" height="100" rx="8" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5"/>
          <rect x="15" y="25" width="75" height="40" rx="4" fill="rgba(99, 102, 241, 0.3)"/>
          <text x="52.5" y="45" fontSize="10" fill="#a78bfa" textAnchor="middle" fontWeight="600">Web Dev</text>
          <text x="52.5" y="58" fontSize="8" fill="#cbd5e1" textAnchor="middle">$50/hr</text>
          <rect x="15" y="70" width="35" height="8" rx="2" fill="rgba(34, 211, 238, 0.3)"/>
          <rect x="55" y="70" width="35" height="8" rx="2" fill="rgba(34, 211, 238, 0.3)"/>
          <text x="52.5" y="95" fontSize="7" fill="#9ca3af" textAnchor="middle">⭐ 4.9 (120)</text>
          
          {/* Service Card 2 */}
          <rect x="105" y="20" width="85" height="100" rx="8" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5"/>
          <rect x="110" y="25" width="75" height="40" rx="4" fill="rgba(99, 102, 241, 0.3)"/>
          <text x="147.5" y="45" fontSize="10" fill="#a78bfa" textAnchor="middle" fontWeight="600">Design</text>
          <text x="147.5" y="58" fontSize="8" fill="#cbd5e1" textAnchor="middle">$75/hr</text>
          <rect x="110" y="70" width="35" height="8" rx="2" fill="rgba(34, 211, 238, 0.3)"/>
          <rect x="150" y="70" width="35" height="8" rx="2" fill="rgba(34, 211, 238, 0.3)"/>
          <text x="147.5" y="95" fontSize="7" fill="#9ca3af" textAnchor="middle">⭐ 4.8 (89)</text>
          
          {/* Service Card 3 */}
          <rect x="200" y="20" width="85" height="100" rx="8" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5"/>
          <rect x="205" y="25" width="75" height="40" rx="4" fill="rgba(99, 102, 241, 0.3)"/>
          <text x="242.5" y="45" fontSize="10" fill="#a78bfa" textAnchor="middle" fontWeight="600">Marketing</text>
          <text x="242.5" y="58" fontSize="8" fill="#cbd5e1" textAnchor="middle">$60/hr</text>
          <rect x="205" y="70" width="35" height="8" rx="2" fill="rgba(34, 211, 238, 0.3)"/>
          <rect x="245" y="70" width="35" height="8" rx="2" fill="rgba(34, 211, 238, 0.3)"/>
          <text x="242.5" y="95" fontSize="7" fill="#9ca3af" textAnchor="middle">⭐ 5.0 (156)</text>
        </svg>
      );

    case 'Web3 Game Hub':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* Game Card 1 */}
          <rect x="10" y="15" width="90" height="110" rx="8" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(249, 115, 22, 0.4)" strokeWidth="1.5"/>
          <rect x="15" y="20" width="80" height="50" rx="4" fill="rgba(249, 115, 22, 0.3)"/>
          <circle cx="55" cy="45" r="12" fill="rgba(251, 146, 60, 0.5)"/>
          <text x="55" y="50" fontSize="16" fill="#fb923c" textAnchor="middle">🎮</text>
          <text x="55" y="85" fontSize="9" fill="#fbbf24" textAnchor="middle" fontWeight="600">Blockchain RPG</text>
          <text x="55" y="100" fontSize="7" fill="#9ca3af" textAnchor="middle">Play to Earn</text>
          
          {/* Game Card 2 */}
          <rect x="110" y="15" width="90" height="110" rx="8" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(249, 115, 22, 0.4)" strokeWidth="1.5"/>
          <rect x="115" y="20" width="80" height="50" rx="4" fill="rgba(249, 115, 22, 0.3)"/>
          <circle cx="155" cy="45" r="12" fill="rgba(251, 146, 60, 0.5)"/>
          <text x="155" y="50" fontSize="16" fill="#fb923c" textAnchor="middle">⚔️</text>
          <text x="155" y="85" fontSize="9" fill="#fbbf24" textAnchor="middle" fontWeight="600">NFT Battle</text>
          <text x="155" y="100" fontSize="7" fill="#9ca3af" textAnchor="middle">Multiplayer</text>
          
          {/* Game Card 3 */}
          <rect x="210" y="15" width="85" height="110" rx="8" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(249, 115, 22, 0.4)" strokeWidth="1.5"/>
          <rect x="215" y="20" width="75" height="50" rx="4" fill="rgba(249, 115, 22, 0.3)"/>
          <circle cx="252.5" cy="45" r="12" fill="rgba(251, 146, 60, 0.5)"/>
          <text x="252.5" y="50" fontSize="16" fill="#fb923c" textAnchor="middle">🏆</text>
          <text x="252.5" y="85" fontSize="9" fill="#fbbf24" textAnchor="middle" fontWeight="600">Strategy</text>
          <text x="252.5" y="100" fontSize="7" fill="#9ca3af" textAnchor="middle">DeFi Game</text>
        </svg>
      );

    case 'Twitter Raids':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* Twitter Icon */}
          <circle cx="50" cy="40" r="25" fill="rgba(29, 161, 242, 0.2)" stroke="rgba(29, 161, 242, 0.5)" strokeWidth="2"/>
          <path d="M 50 25 L 45 35 L 55 35 Z" fill="#1da1f2"/>
          <text x="50" y="75" fontSize="8" fill="#60a5fa" textAnchor="middle">Twitter</text>
          
          {/* Raid Stats */}
          <rect x="90" y="20" width="100" height="60" rx="6" fill="rgba(55, 65, 81, 0.5)" stroke="rgba(14, 165, 233, 0.3)" strokeWidth="1.5"/>
          <text x="140" y="40" fontSize="10" fill="#22d3ee" textAnchor="middle" fontWeight="600">Raid Campaign</text>
          <text x="100" y="58" fontSize="8" fill="#cbd5e1">Likes: 1.2K</text>
          <text x="100" y="72" fontSize="8" fill="#cbd5e1">RTs: 340</text>
          
          {/* Points Badge */}
          <rect x="200" y="30" width="80" height="40" rx="6" fill="rgba(34, 211, 238, 0.2)" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="1.5"/>
          <text x="240" y="48" fontSize="9" fill="#22d3ee" textAnchor="middle" fontWeight="600">Points Earned</text>
          <text x="240" y="62" fontSize="12" fill="#67e8f9" textAnchor="middle" fontWeight="700">2,000</text>
        </svg>
      );

    case 'AquaPay':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* QR Code Box */}
          <rect x="20" y="20" width="60" height="60" rx="4" fill="white" stroke="rgba(34, 211, 238, 0.5)" strokeWidth="2"/>
          <rect x="25" y="25" width="50" height="50" fill="rgba(15, 23, 42, 0.8)"/>
          {/* QR Pattern */}
          <rect x="30" y="30" width="8" height="8" fill="white"/>
          <rect x="42" y="30" width="8" height="8" fill="white"/>
          <rect x="54" y="30" width="8" height="8" fill="white"/>
          <rect x="30" y="42" width="8" height="8" fill="white"/>
          <rect x="54" y="42" width="8" height="8" fill="white"/>
          <rect x="30" y="54" width="8" height="8" fill="white"/>
          <rect x="42" y="54" width="8" height="8" fill="white"/>
          <rect x="54" y="54" width="8" height="8" fill="white"/>
          
          {/* Payment Link */}
          <rect x="95" y="25" width="180" height="25" rx="4" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(34, 211, 238, 0.3)" strokeWidth="1"/>
          <text x="100" y="42" fontSize="8" fill="#22d3ee">aquads.xyz/pay/username</text>
          
          {/* Chain Badges */}
          <rect x="95" y="60" width="40" height="18" rx="3" fill="rgba(98, 126, 234, 0.3)" stroke="rgba(98, 126, 234, 0.5)" strokeWidth="1"/>
          <text x="115" y="72" fontSize="7" fill="#818cf8" textAnchor="middle">ETH</text>
          
          <rect x="140" y="60" width="40" height="18" rx="3" fill="rgba(0, 102, 255, 0.3)" stroke="rgba(0, 102, 255, 0.5)" strokeWidth="1"/>
          <text x="160" y="72" fontSize="7" fill="#60a5fa" textAnchor="middle">Base</text>
          
          <rect x="185" y="60" width="40" height="18" rx="3" fill="rgba(20, 241, 149, 0.3)" stroke="rgba(20, 241, 149, 0.5)" strokeWidth="1"/>
          <text x="205" y="72" fontSize="7" fill="#34d399" textAnchor="middle">SOL</text>
          
          <rect x="230" y="60" width="50" height="18" rx="3" fill="rgba(130, 71, 229, 0.3)" stroke="rgba(130, 71, 229, 0.5)" strokeWidth="1"/>
          <text x="255" y="72" fontSize="7" fill="#a78bfa" textAnchor="middle">Polygon</text>
        </svg>
      );

    case 'Dynamic Token Bubbles':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Bubble 1 */}
          <circle cx="60" cy="50" r="25" fill="rgba(98, 126, 234, 0.3)" stroke="rgba(98, 126, 234, 0.6)" strokeWidth="2" filter="url(#glow)"/>
          <text x="60" y="48" fontSize="12" fill="#818cf8" textAnchor="middle" fontWeight="600">ETH</text>
          <text x="60" y="60" fontSize="8" fill="#cbd5e1" textAnchor="middle">$2,450</text>
          
          {/* Bubble 2 */}
          <circle cx="150" cy="40" r="22" fill="rgba(20, 241, 149, 0.3)" stroke="rgba(20, 241, 149, 0.6)" strokeWidth="2" filter="url(#glow)"/>
          <text x="150" y="38" fontSize="11" fill="#34d399" textAnchor="middle" fontWeight="600">SOL</text>
          <text x="150" y="50" fontSize="8" fill="#cbd5e1" textAnchor="middle">$98</text>
          
          {/* Bubble 3 */}
          <circle cx="240" cy="55" r="20" fill="rgba(240, 185, 11, 0.3)" stroke="rgba(240, 185, 11, 0.6)" strokeWidth="2" filter="url(#glow)"/>
          <text x="240" y="53" fontSize="10" fill="#fbbf24" textAnchor="middle" fontWeight="600">BNB</text>
          <text x="240" y="65" fontSize="8" fill="#cbd5e1" textAnchor="middle">$315</text>
          
          {/* Bubble 4 */}
          <circle cx="100" cy="100" r="18" fill="rgba(130, 71, 229, 0.3)" stroke="rgba(130, 71, 229, 0.6)" strokeWidth="2" filter="url(#glow)"/>
          <text x="100" y="98" fontSize="9" fill="#a78bfa" textAnchor="middle" fontWeight="600">MATIC</text>
          <text x="100" y="108" fontSize="7" fill="#cbd5e1" textAnchor="middle">$0.85</text>
          
          {/* Bubble 5 */}
          <circle cx="200" cy="95" r="16" fill="rgba(0, 102, 255, 0.3)" stroke="rgba(0, 102, 255, 0.6)" strokeWidth="2" filter="url(#glow)"/>
          <text x="200" y="93" fontSize="8" fill="#60a5fa" textAnchor="middle" fontWeight="600">BASE</text>
          <text x="200" y="103" fontSize="7" fill="#cbd5e1" textAnchor="middle">$0.32</text>
        </svg>
      );

    case 'AquaSwap':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* Swap Box */}
          <rect x="20" y="20" width="260" height="100" rx="8" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(20, 184, 166, 0.4)" strokeWidth="2"/>
          
          {/* From Token */}
          <rect x="30" y="30" width="110" height="35" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(20, 184, 166, 0.3)" strokeWidth="1"/>
          <circle cx="50" cy="47.5" r="10" fill="rgba(98, 126, 234, 0.5)"/>
          <text x="50" y="51" fontSize="10" fill="#818cf8" textAnchor="middle">ETH</text>
          <text x="70" y="45" fontSize="10" fill="#e2e8f0" fontWeight="600">Ethereum</text>
          <text x="70" y="58" fontSize="8" fill="#94a3b8">1.5</text>
          
          {/* Arrow */}
          <path d="M 150 47.5 L 150 42.5 M 150 47.5 L 150 52.5 M 145 47.5 L 150 42.5 M 145 47.5 L 150 52.5" stroke="#14b8a6" strokeWidth="2" fill="none"/>
          <circle cx="150" cy="47.5" r="8" fill="rgba(20, 184, 166, 0.2)"/>
          
          {/* To Token */}
          <rect x="170" y="30" width="100" height="35" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(20, 184, 166, 0.3)" strokeWidth="1"/>
          <circle cx="190" cy="47.5" r="10" fill="rgba(20, 241, 149, 0.5)"/>
          <text x="190" y="51" fontSize="10" fill="#34d399" textAnchor="middle">SOL</text>
          <text x="210" y="45" fontSize="10" fill="#e2e8f0" fontWeight="600">Solana</text>
          <text x="210" y="58" fontSize="8" fill="#94a3b8">~98.5</text>
          
          {/* Chart Preview */}
          <rect x="30" y="75" width="240" height="35" rx="4" fill="rgba(15, 23, 42, 0.8)"/>
          <polyline points="40,100 60,85 80,90 100,75 120,80 140,70 160,75 180,65 200,70 220,60 240,65 260,55" 
            fill="none" stroke="#14b8a6" strokeWidth="2"/>
          <text x="155" y="105" fontSize="7" fill="#64748b" textAnchor="middle">TradingView Chart</text>
        </svg>
      );

    case 'Trust Score System':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* Score Circle */}
          <circle cx="80" cy="50" r="35" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="4"/>
          <circle cx="80" cy="50" r="35" fill="none" stroke="#8b5cf6" strokeWidth="4" 
            strokeDasharray={`${2 * Math.PI * 35 * 0.92} ${2 * Math.PI * 35}`} 
            strokeDashoffset={2 * Math.PI * 35 * 0.08}
            transform="rotate(-90 80 50)"/>
          <text x="80" y="48" fontSize="20" fill="#a78bfa" textAnchor="middle" fontWeight="700">92</text>
          <text x="80" y="62" fontSize="8" fill="#cbd5e1" textAnchor="middle">Trust Score</text>
          
          {/* Metrics */}
          <rect x="140" y="25" width="140" height="20" rx="3" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
          <text x="145" y="38" fontSize="8" fill="#cbd5e1">Verification: ✓ Verified</text>
          
          <rect x="140" y="50" width="140" height="20" rx="3" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
          <text x="145" y="63" fontSize="8" fill="#cbd5e1">Projects: 45 Completed</text>
          
          <rect x="140" y="75" width="140" height="20" rx="3" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1"/>
          <text x="145" y="88" fontSize="8" fill="#cbd5e1">Rating: ⭐ 4.9/5.0</text>
          
          {/* Badge */}
          <rect x="140" y="100" width="140" height="25" rx="4" fill="rgba(139, 92, 246, 0.2)" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5"/>
          <text x="210" y="117" fontSize="10" fill="#a78bfa" textAnchor="middle" fontWeight="600">🏆 Top Rated</text>
        </svg>
      );

    case 'Live Market Data':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* Chart Area */}
          <rect x="20" y="20" width="260" height="100" rx="6" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(244, 63, 94, 0.3)" strokeWidth="1.5"/>
          
          {/* Price Line */}
          <polyline points="30,100 50,85 70,90 90,75 110,80 130,70 150,75 170,65 190,70 210,60 230,65 250,55 270,50" 
            fill="none" stroke="#f43f5e" strokeWidth="2.5"/>
          
          {/* Grid Lines */}
          <line x1="30" y1="100" x2="270" y2="100" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1"/>
          <line x1="30" y1="80" x2="270" y2="80" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1"/>
          <line x1="30" y1="60" x2="270" y2="60" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1"/>
          <line x1="30" y1="40" x2="270" y2="40" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1"/>
          
          {/* Price Label */}
          <rect x="200" y="25" width="60" height="20" rx="3" fill="rgba(244, 63, 94, 0.2)" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="1"/>
          <text x="230" y="38" fontSize="9" fill="#f43f5e" textAnchor="middle" fontWeight="600">$2,450.32</text>
          
          {/* Change Indicator */}
          <text x="30" y="35" fontSize="8" fill="#22c55e" fontWeight="600">+2.45%</text>
          
          {/* Time Labels */}
          <text x="30" y="115" fontSize="7" fill="#64748b">24h</text>
          <text x="150" y="115" fontSize="7" fill="#64748b" textAnchor="middle">7d</text>
          <text x="270" y="115" fontSize="7" fill="#64748b" textAnchor="end">30d</text>
        </svg>
      );

    case 'Job Board':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* Job Card 1 */}
          <rect x="10" y="15" width="130" height="110" rx="6" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5"/>
          <rect x="15" y="20" width="120" height="30" rx="3" fill="rgba(245, 158, 11, 0.2)"/>
          <circle cx="35" cy="35" r="8" fill="rgba(251, 191, 36, 0.5)"/>
          <text x="35" y="38" fontSize="10" fill="#fbbf24" textAnchor="middle">💼</text>
          <text x="50" y="32" fontSize="9" fill="#fbbf24" fontWeight="600">Senior Dev</text>
          <text x="50" y="43" fontSize="7" fill="#cbd5e1">Remote • Full-time</text>
          <text x="15" y="65" fontSize="8" fill="#e2e8f0" fontWeight="500">Blockchain Developer</text>
          <text x="15" y="80" fontSize="7" fill="#94a3b8">$80K - $120K</text>
          <rect x="15" y="90" width="50" height="15" rx="2" fill="rgba(34, 211, 238, 0.2)"/>
          <text x="40" y="100" fontSize="6" fill="#22d3ee" textAnchor="middle">Web3</text>
          
          {/* Job Card 2 */}
          <rect x="150" y="15" width="130" height="110" rx="6" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5"/>
          <rect x="155" y="20" width="120" height="30" rx="3" fill="rgba(245, 158, 11, 0.2)"/>
          <circle cx="175" cy="35" r="8" fill="rgba(251, 191, 36, 0.5)"/>
          <text x="175" y="38" fontSize="10" fill="#fbbf24" textAnchor="middle">🎨</text>
          <text x="190" y="32" fontSize="9" fill="#fbbf24" fontWeight="600">Designer</text>
          <text x="190" y="43" fontSize="7" fill="#cbd5e1">Hybrid • Contract</text>
          <text x="155" y="65" fontSize="8" fill="#e2e8f0" fontWeight="500">UI/UX Designer</text>
          <text x="155" y="80" fontSize="7" fill="#94a3b8">$60/hr</text>
          <rect x="155" y="90" width="50" height="15" rx="2" fill="rgba(34, 211, 238, 0.2)"/>
          <text x="180" y="100" fontSize="6" fill="#22d3ee" textAnchor="middle">NFT</text>
        </svg>
      );

    case 'AquaFi':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* Pool Card 1 */}
          <rect x="10" y="20" width="85" height="100" rx="6" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5"/>
          <text x="52.5" y="40" fontSize="10" fill="#22c55e" textAnchor="middle" fontWeight="600">USDC Vault</text>
          <text x="52.5" y="55" fontSize="16" fill="#4ade80" textAnchor="middle" fontWeight="700">4.2%</text>
          <text x="52.5" y="68" fontSize="7" fill="#9ca3af" textAnchor="middle">APY</text>
          <rect x="15" y="75" width="75" height="8" rx="2" fill="rgba(34, 197, 94, 0.2)"/>
          <text x="52.5" y="95" fontSize="7" fill="#cbd5e1" textAnchor="middle">Low Risk</text>
          <text x="52.5" y="108" fontSize="6" fill="#64748b" textAnchor="middle">$1.25B TVL</text>
          
          {/* Pool Card 2 */}
          <rect x="105" y="20" width="85" height="100" rx="6" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5"/>
          <text x="147.5" y="40" fontSize="10" fill="#22c55e" textAnchor="middle" fontWeight="600">ETH Vault</text>
          <text x="147.5" y="55" fontSize="16" fill="#4ade80" textAnchor="middle" fontWeight="700">2.1%</text>
          <text x="147.5" y="68" fontSize="7" fill="#9ca3af" textAnchor="middle">APY</text>
          <rect x="110" y="75" width="75" height="8" rx="2" fill="rgba(34, 197, 94, 0.2)"/>
          <text x="147.5" y="95" fontSize="7" fill="#cbd5e1" textAnchor="middle">Low Risk</text>
          <text x="147.5" y="108" fontSize="6" fill="#64748b" textAnchor="middle">$2.1B TVL</text>
          
          {/* Pool Card 3 */}
          <rect x="200" y="20" width="85" height="100" rx="6" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5"/>
          <text x="242.5" y="40" fontSize="10" fill="#22c55e" textAnchor="middle" fontWeight="600">USDT Vault</text>
          <text x="242.5" y="55" fontSize="16" fill="#4ade80" textAnchor="middle" fontWeight="700">3.8%</text>
          <text x="242.5" y="68" fontSize="7" fill="#9ca3af" textAnchor="middle">APY</text>
          <rect x="205" y="75" width="75" height="8" rx="2" fill="rgba(34, 197, 94, 0.2)"/>
          <text x="242.5" y="95" fontSize="7" fill="#cbd5e1" textAnchor="middle">Low Risk</text>
          <text x="242.5" y="108" fontSize="6" fill="#64748b" textAnchor="middle">$890M TVL</text>
        </svg>
      );

    case 'Marketing & PR':
      return (
        <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
          {/* Media Logos */}
          <rect x="20" y="20" width="60" height="25" rx="3" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(236, 72, 153, 0.4)" strokeWidth="1"/>
          <text x="50" y="37" fontSize="8" fill="#ec4899" textAnchor="middle" fontWeight="700">Forbes</text>
          
          <rect x="90" y="20" width="60" height="25" rx="3" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(236, 72, 153, 0.4)" strokeWidth="1"/>
          <text x="120" y="37" fontSize="7" fill="#ec4899" textAnchor="middle" fontWeight="700">Yahoo Finance</text>
          
          <rect x="160" y="20" width="60" height="25" rx="3" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(236, 72, 153, 0.4)" strokeWidth="1"/>
          <text x="190" y="37" fontSize="8" fill="#ec4899" textAnchor="middle" fontWeight="700">Benzinga</text>
          
          <rect x="230" y="20" width="50" height="25" rx="3" fill="rgba(55, 65, 81, 0.6)" stroke="rgba(236, 72, 153, 0.4)" strokeWidth="1"/>
          <text x="255" y="37" fontSize="7" fill="#ec4899" textAnchor="middle" fontWeight="700">+72 More</text>
          
          {/* Package Cards */}
          <rect x="20" y="55" width="80" height="65" rx="4" fill="rgba(55, 65, 81, 0.5)" stroke="rgba(236, 72, 153, 0.3)" strokeWidth="1"/>
          <text x="60" y="72" fontSize="8" fill="#f472b6" textAnchor="middle" fontWeight="600">AquaSplash</text>
          <text x="60" y="88" fontSize="7" fill="#cbd5e1" textAnchor="middle">Starter</text>
          
          <rect x="110" y="55" width="80" height="65" rx="4" fill="rgba(55, 65, 81, 0.5)" stroke="rgba(236, 72, 153, 0.3)" strokeWidth="1"/>
          <text x="150" y="72" fontSize="8" fill="#f472b6" textAnchor="middle" fontWeight="600">AquaWave</text>
          <text x="150" y="88" fontSize="7" fill="#cbd5e1" textAnchor="middle">Premium</text>
          
          <rect x="200" y="55" width="80" height="65" rx="4" fill="rgba(55, 65, 81, 0.5)" stroke="rgba(236, 72, 153, 0.3)" strokeWidth="1"/>
          <text x="240" y="72" fontSize="8" fill="#f472b6" textAnchor="middle" fontWeight="600">AquaStorm</text>
          <text x="240" y="88" fontSize="7" fill="#cbd5e1" textAnchor="middle">Enterprise</text>
        </svg>
      );

    default:
      return null;
  }
};

// Carousel Card Component
const CarouselCard = ({ feature, index }) => {
  return (
    <motion.div
      className={`relative h-full min-h-[400px] md:min-h-[500px] rounded-3xl border border-white/10 backdrop-blur-xl bg-gradient-to-br ${feature.gradient} overflow-hidden group cursor-pointer`}
      initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col p-6 md:p-8">
        {/* Icon */}
        <motion.div
          className="text-5xl md:text-6xl mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
          whileHover={{ scale: 1.2, rotate: 10 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          {feature.icon}
        </motion.div>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-white mb-3 font-display">
          {feature.title}
        </h3>

        {/* Description */}
        <p className="text-gray-300 text-sm md:text-base leading-relaxed flex-grow">
          {feature.description}
        </p>

        {/* Feature Preview SVG - Show for all except On-Chain Resume and Telegram Bot */}
        {!feature.hasVisual && feature.title !== 'Telegram Bot' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <FeaturePreviewSVG featureTitle={feature.title} />
          </motion.div>
        )}

        {/* Special visual for On-Chain Resume */}
        {feature.hasVisual && (
          <div className="mt-6 space-y-3">
            {[
              { label: 'Skills Verified', icon: '✓', color: 'emerald' },
              { label: 'Work History', icon: '📋', color: 'blue' },
              { label: 'Reputation', icon: '⭐', color: 'amber' }
            ].map((block, i) => (
              <motion.div
                key={block.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className={`flex items-center gap-3 p-3 rounded-lg bg-${block.color}-500/20 border border-${block.color}-500/30`}
              >
                <div className="text-xl">{block.icon}</div>
                <div className="flex-1 text-white text-sm font-medium">{block.label}</div>
                <div className="text-emerald-400">✓</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Hover indicator */}
        <motion.div
          className="mt-auto pt-4 flex items-center gap-2 text-cyan-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {feature.link && (
            <>
              <span>Learn more</span>
              <span>→</span>
            </>
          )}
        </motion.div>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 blur-xl" />
      </div>
    </motion.div>
  );
};

// Feature card for bento grid (keeping for reference but not used)
const FeatureCard = ({ icon, title, description, gradient, delay, size = 'normal', hasVisual = false, link }) => {
  const CardContent = (
    <>
    {/* Glow effect on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
    </div>
    
    {/* Content */}
    <div className={`relative z-10 flex flex-col ${size === 'large' || size === 'wide' ? 'h-full' : 'min-h-0'}`}>
      <div className="text-2xl md:text-4xl mb-2 md:mb-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] flex-shrink-0">{icon}</div>
      <h3 className={`${size === 'large' ? 'text-base md:text-2xl' : 'text-sm md:text-xl'} font-bold text-white mb-1 md:mb-2 font-display flex-shrink-0`}>{title}</h3>
      <p className={`text-gray-400 ${size === 'large' ? 'text-xs md:text-base' : 'text-[11px] md:text-sm'} leading-relaxed flex-grow-0`}>{description}</p>
      
      {/* Visual infographic for On-Chain Resume - hidden on small screens */}
      {hasVisual && (
        <div className="hidden sm:flex mt-4 md:mt-6 flex-1 items-center justify-center">
          <div className="relative w-full max-w-xs">
            {/* Blockchain visual representation */}
            <div className="flex flex-col gap-3">
              {/* Chain blocks */}
              {[
                { label: 'Skills Verified', icon: '✓', color: 'from-emerald-500 to-teal-500' },
                { label: 'Work History', icon: '📋', color: 'from-blue-500 to-cyan-500' },
                { label: 'Reputation', icon: '⭐', color: 'from-amber-500 to-yellow-500' }
              ].map((block, i) => (
                <motion.div
                  key={block.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="relative"
                >
                  <div className={`
                    flex items-center gap-3 p-3 rounded-lg 
                    bg-gradient-to-r ${block.color} bg-opacity-20
                    border border-white/20 backdrop-blur-sm
                  `}>
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">
                      {block.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">{block.label}</div>
                      <div className="text-gray-400 text-xs">On-Chain Attestation</div>
                    </div>
                    <div className="text-emerald-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  {/* Chain connector */}
                  {i < 2 && (
                    <div className="absolute left-5 -bottom-3 w-0.5 h-3 bg-gradient-to-b from-emerald-500/50 to-transparent" />
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Base chain badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400"
            >
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">B</span>
              </div>
              <span>Powered by Base & EAS</span>
            </motion.div>
          </div>
        </div>
      )}
    </div>
    
    {/* Corner accent */}
    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
    </>
  );

  const cardProps = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, delay },
    whileHover: { scale: 1.02, y: -5 },
    className: `
      relative overflow-hidden rounded-2xl border border-white/10
      backdrop-blur-xl bg-gradient-to-br ${gradient}
      ${size === 'large' ? 'md:col-span-2 md:row-span-2 p-4 md:p-8' : size === 'wide' ? 'md:col-span-2 p-4 md:p-6' : 'p-3 md:p-4'}
      group cursor-pointer
      ${size !== 'large' && size !== 'wide' ? 'self-start h-fit' : ''}
    `
  };

  if (link) {
    return (
      <Link to={link}>
        <motion.div {...cardProps}>
          {CardContent}
  </motion.div>
      </Link>
    );
  }

  return (
    <motion.div {...cardProps}>
      {CardContent}
    </motion.div>
  );
};

// Animated counter
const AnimatedCounter = ({ value, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isVisible, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

// Custom SVG icons for hero sections
const ProjectsIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
    {/* Chart bars */}
    <rect x="8" y="32" width="10" height="24" rx="2" fill="currentColor" opacity="0.9"/>
    <rect x="22" y="20" width="10" height="36" rx="2" fill="currentColor" opacity="0.7"/>
    <rect x="36" y="28" width="10" height="28" rx="2" fill="currentColor" opacity="0.8"/>
    <rect x="50" y="12" width="10" height="44" rx="2" fill="currentColor" opacity="1"/>
    {/* Trend line */}
    <path d="M8 28 L22 16 L36 22 L55 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6"/>
    <circle cx="55" cy="8" r="4" fill="currentColor"/>
  </svg>
);

const FreelancersIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
    {/* Center person */}
    <circle cx="32" cy="18" r="10" fill="currentColor" opacity="0.9"/>
    <path d="M16 52 C16 40 24 32 32 32 C40 32 48 40 48 52" fill="currentColor" opacity="0.9"/>
    {/* Left person */}
    <circle cx="12" cy="26" r="7" fill="currentColor" opacity="0.5"/>
    <path d="M2 48 C2 40 6 34 12 34 C18 34 22 40 22 48" fill="currentColor" opacity="0.5"/>
    {/* Right person */}
    <circle cx="52" cy="26" r="7" fill="currentColor" opacity="0.5"/>
    <path d="M42 48 C42 40 46 34 52 34 C58 34 62 40 62 48" fill="currentColor" opacity="0.5"/>
    {/* Connection lines */}
    <path d="M20 30 L26 26 M44 30 L38 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

// Main orb component for hero - Triangle design
const HeroOrb = ({ side, onClick, label, sublabel }) => (
  <motion.div
    className={`
      relative flex-1 h-full flex items-center justify-center cursor-pointer
      ${side === 'left' ? 'bg-gradient-to-br from-cyan-950/50 via-slate-950 to-slate-950' : 'bg-gradient-to-bl from-purple-950/50 via-slate-950 to-slate-950'}
    `}
    whileHover={{ scale: 1.02 }}
    onClick={onClick}
  >
    {/* Large central triangle container */}
    <motion.div
      className="absolute w-44 h-44 xs:w-52 xs:h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 flex items-center justify-center"
      animate={{
        scale: [1, 1.05, 0.98, 1],
        rotate: side === 'left' ? [0, 5, -3, 0] : [0, -5, 3, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Outer glow triangle */}
      <svg 
        viewBox="0 0 200 200" 
        className="absolute w-full h-full"
        style={{ filter: `drop-shadow(0 0 40px ${side === 'left' ? 'rgba(34, 211, 238, 0.4)' : 'rgba(192, 132, 252, 0.4)'})` }}
      >
        <defs>
          <linearGradient id={`gradient-outer-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={side === 'left' ? '#22d3ee' : '#c084fc'} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={side === 'left' ? '#14b8a6' : '#a855f7'} stopOpacity="0.05"/>
          </linearGradient>
        </defs>
        <polygon 
          points="100,15 185,170 15,170" 
          fill={`url(#gradient-outer-${side})`}
          stroke={side === 'left' ? 'rgba(34, 211, 238, 0.3)' : 'rgba(192, 132, 252, 0.3)'}
          strokeWidth="1"
        />
      </svg>
      
      {/* Inner glow */}
      <div 
        className="absolute w-3/4 h-3/4 blur-2xl"
        style={{
          background: side === 'left' 
            ? 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(192, 132, 252, 0.3) 0%, transparent 70%)'
        }}
      />
      
      {/* Core triangle */}
      <motion.div
        className="absolute w-1/2 h-1/2 flex items-center justify-center"
        animate={{ rotate: side === 'left' ? [0, 360] : [360, 0] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <svg 
          viewBox="0 0 200 200" 
          className="w-full h-full"
          style={{ 
            filter: `drop-shadow(0 0 30px ${side === 'left' ? 'rgba(34, 211, 238, 0.6)' : 'rgba(192, 132, 252, 0.6)'})` 
          }}
        >
          <defs>
            <linearGradient id={`gradient-inner-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={side === 'left' ? '#22d3ee' : '#c084fc'}/>
              <stop offset="50%" stopColor={side === 'left' ? '#14b8a6' : '#a855f7'}/>
              <stop offset="100%" stopColor={side === 'left' ? '#06b6d4' : '#9333ea'}/>
            </linearGradient>
          </defs>
          <polygon 
            points="100,20 180,165 20,165" 
            fill={`url(#gradient-inner-${side})`}
          />
        </svg>
      </motion.div>
      
      {/* Icon in center - counter-rotate to stay upright */}
      <motion.div 
        className={`absolute flex items-center justify-center ${side === 'left' ? 'text-cyan-100' : 'text-purple-100'}`}
        animate={{ rotate: side === 'left' ? [0, -360] : [-360, 0] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {side === 'left' ? <ProjectsIcon /> : <FreelancersIcon />}
      </motion.div>
    </motion.div>

    {/* Labels */}
    <div className="absolute bottom-16 md:bottom-24 left-0 right-0 text-center px-2">
      <motion.h2 
        className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-1 md:mb-2 tracking-tight"
        style={{ fontFamily: "'Clash Display', 'Space Grotesk', sans-serif" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {label}
      </motion.h2>
      <motion.p
        className="text-gray-400 text-[10px] xs:text-xs sm:text-sm md:text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {sublabel}
      </motion.p>
    </div>

    {/* Click indicator */}
    <motion.div
      className={`
        absolute bottom-4 sm:bottom-6 md:bottom-10 left-1/2 -translate-x-1/2
        px-3 xs:px-4 sm:px-6 py-1.5 xs:py-2 sm:py-3 rounded-full border backdrop-blur-sm
        ${side === 'left' 
          ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20' 
          : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/20'
        }
        transition-all duration-300
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="font-semibold text-[10px] xs:text-xs sm:text-sm md:text-base">Enter →</span>
    </motion.div>

    {/* Floating particles */}
    {[...Array(6)].map((_, i) => (
      <FloatingParticle
        key={i}
        delay={i * 0.5}
        size={Math.random() * 100 + 50}
        color={side === 'left' ? 'rgba(34, 211, 238, 0.3)' : 'rgba(192, 132, 252, 0.3)'}
        x={Math.random() * 80 + 10}
        y={Math.random() * 60 + 20}
      />
    ))}
  </motion.div>
);

const LandingPage = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showContent, setShowContent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const contentOpacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 1]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Close mobile menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [mobileMenuOpen]);

  const features = [
    {
      icon: '🔗',
      title: 'On-Chain Resume',
      description: 'World\'s first blockchain-verified freelancer credentials. Your skills, reputation, and work history permanently stored on Base via Ethereum Attestation Service. Portable, tamper-proof, and truly yours.',
      gradient: 'from-emerald-900/40 to-slate-900/80',
      size: 'large',
      hasVisual: true
    },
    {
      icon: '🤖',
      title: 'Telegram Bot',
      description: 'Complete Telegram integration for project growth. Create Twitter & Facebook raids—5 FREE daily, then use points for additional posts. Exclusive community raid network: when groups opt-in, they automatically receive all raid notifications, maximizing your reach across participating communities. Premium features include custom branding on vote notifications, boost trending services for enhanced visibility, and vote + member boost packages.',
      gradient: 'from-indigo-900/40 to-slate-900/80',
      link: '/telegram-bot',
      size: 'wide'
    },
    {
      icon: '👥',
      title: 'Freelancer Marketplace',
      description: 'Web3\'s premier talent marketplace. Complete booking system—get paid for your skills. Browse service listings, receive lead notifications, and connect directly with clients. No monthly fees, only pay for results.',
      gradient: 'from-violet-900/40 to-slate-900/80',
      link: '/marketplace'
    },
    {
      icon: '🎮',
      title: 'Web3 Game Hub',
      description: 'Discover and promote blockchain games. Connect developers with gamers.',
      gradient: 'from-orange-900/40 to-slate-900/80'
    },
    {
      icon: '🚀',
      title: 'Twitter Raids',
      description: 'Boost visibility with coordinated social campaigns. Earn points for engagement.',
      gradient: 'from-sky-900/40 to-slate-900/80'
    },
    {
      icon: '💸',
      title: 'AquaPay',
      description: 'Create your personal crypto payment link. Accept payments on Solana, Ethereum, Base, Polygon, BNB Chain & more. Non-custodial & instant.',
      gradient: 'from-blue-900/40 to-cyan-900/80'
    },
    {
      icon: '🔮',
      title: 'Dynamic Token Bubbles',
      description: 'Interactive visualization of crypto projects based on community engagement. BEX trending section integration, bubble leaderboards, and trending visibility across platforms. Projects gain exposure through community voting and rankings.',
      gradient: 'from-cyan-900/40 to-slate-900/80'
    },
    {
      icon: '💱',
      title: 'AquaSwap',
      description: 'Seamless token swapping across multiple chains with professional TradingView charts. Available as Chrome browser extension—swap tokens from any webpage instantly. Cross-chain bridging and professional trading tools.',
      gradient: 'from-teal-900/40 to-slate-900/80',
      link: '/aquaswap'
    },
    {
      icon: '⚡',
      title: 'Trust Score System',
      description: 'AI-powered freelancer vetting with transparent reliability metrics.',
      gradient: 'from-purple-900/40 to-slate-900/80'
    },
    {
      icon: '📈',
      title: 'Live Market Data',
      description: 'Real-time token tracking, price alerts, and community-driven reviews.',
      gradient: 'from-rose-900/40 to-slate-900/80'
    },
    {
      icon: '💼',
      title: 'Job Board',
      description: 'Post and discover Web3 jobs. Browse hiring and for-hire positions from our platform. AI-powered job matching for freelancers. Remote, hybrid, and onsite opportunities.',
      gradient: 'from-amber-900/40 to-slate-900/80',
      link: '/marketplace',
      size: 'wide'
    },
    {
      icon: '💰',
      title: 'AquaFi',
      description: 'Savings & Staking Hub. Professional DeFi management with yield farming and staking pools across multiple chains (Ethereum, Base, BNB). Built-in savings calculator. Earn passive income with automated optimization.',
      gradient: 'from-green-900/40 to-slate-900/80',
      link: '/aquafi'
    },
    {
      icon: '📢',
      title: 'Marketing & PR',
      description: 'Powered by Coinbound/Mintfunnel. Guaranteed coverage on Forbes, Yahoo Finance, Benzinga, and 75+ media outlets. AquaSplash, AquaRipple, AquaWave, AquaFlow, AquaStorm packages. SEO optimization included. Reach millions with professional PR campaigns.',
      gradient: 'from-pink-900/40 to-slate-900/80',
      size: 'wide'
    }
  ];

  const stats = [
    { value: 50, suffix: '+', label: 'Blockchains Supported' },
    { value: 170, suffix: '+', label: 'Wallets Integrated' },
    { value: 1000, suffix: '+', label: 'User Accounts' },
    { value: 30, suffix: '+', label: 'Service Categories' }
  ];

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-y-auto overflow-x-hidden bg-slate-950"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap');
        
        .font-display {
          font-family: 'Clash Display', 'Space Grotesk', system-ui, sans-serif;
        }
        
        .text-gradient-cyan {
          background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .text-gradient-purple {
          background: linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #9333ea 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .text-gradient-gold {
          background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glow-cyan {
          box-shadow: 0 0 40px rgba(34, 211, 238, 0.3);
        }
        
        .glow-purple {
          box-shadow: 0 0 40px rgba(192, 132, 252, 0.3);
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #0f172a;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #22d3ee, #a855f7);
          border-radius: 3px;
        }

        /* Hide scrollbar for better aesthetics on landing */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Carousel styles */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        
        {/* Animated blobs */}
        <MorphingBlob 
          color="rgba(34, 211, 238, 0.15)" 
          size="600px" 
          position={{ top: '-200px', left: '-200px' }} 
          delay={0} 
        />
        <MorphingBlob 
          color="rgba(192, 132, 252, 0.15)" 
          size="500px" 
          position={{ bottom: '-150px', right: '-150px' }} 
          delay={5} 
        />
        <MorphingBlob 
          color="rgba(20, 184, 166, 0.1)" 
          size="400px" 
          position={{ top: '40%', right: '20%' }} 
          delay={10} 
        />

        {/* Grid lines */}
        {[...Array(10)].map((_, i) => (
          <GridLine key={`v-${i}`} vertical position={`${i * 10}%`} />
        ))}
        {[...Array(10)].map((_, i) => (
          <GridLine key={`h-${i}`} vertical={false} position={`${i * 10}%`} />
        ))}

        {/* Mouse follow glow */}
        <motion.div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, transparent 70%)',
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <img 
              src="/Aquadsnewlogo.png" 
              alt="AQUADS" 
              className="h-8 md:h-10 w-auto filter drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.5))' }}
            />
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/whitepaper"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Whitepaper
            </Link>
            <Link 
              to="/learn"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Learn
            </Link>
            <Link 
              to="/games"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Games
            </Link>
            <Link 
              to="/aquaswap"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              AquaSwap
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-5 h-4 flex flex-col justify-between">
              <motion.span
                className="w-full h-0.5 bg-cyan-400 rounded-full origin-center"
                animate={mobileMenuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="w-full h-0.5 bg-cyan-400 rounded-full"
                animate={mobileMenuOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="w-full h-0.5 bg-cyan-400 rounded-full origin-center"
                animate={mobileMenuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="md:hidden fixed inset-0 bg-black/50 -z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                className="md:hidden absolute top-full left-0 right-0 mt-2 mx-4"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-2">
                    <Link 
                      to="/home"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-cyan-500/10 transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">🚀</span>
                      <span className="font-medium">Projects</span>
                    </Link>
                    <Link 
                      to="/marketplace"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/10 transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">👥</span>
                      <span className="font-medium">Freelancers</span>
                    </Link>
                    <div className="h-px bg-white/10 my-2" />
                    <Link 
                      to="/whitepaper"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">📄</span>
                      <span className="font-medium">Whitepaper</span>
                    </Link>
                    <Link 
                      to="/learn"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">📚</span>
                      <span className="font-medium">Learn</span>
                    </Link>
                    <Link 
                      to="/games"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">🎮</span>
                      <span className="font-medium">Games</span>
                    </Link>
                    <Link 
                      to="/aquaswap"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">💱</span>
                      <span className="font-medium">AquaSwap</span>
                    </Link>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex items-center justify-center gap-6 py-3">
                      <a 
                        href="https://x.com/_Aquads_" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-cyan-400 transition-colors p-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                      <a 
                        href="https://t.me/+6rJbDLqdMxA3ZTUx" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-cyan-400 transition-colors p-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section - Split Screen */}
      <motion.section 
        className="relative h-screen flex"
        style={{ opacity: heroOpacity }}
      >
        {/* Center divider line */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent z-20" />

        {/* Left side - Projects */}
        <Link to="/home" className="flex-1 h-full">
          <HeroOrb 
            side="left"
            label="PROJECTS"
            sublabel="Discover & Promote Crypto Projects"
          />
        </Link>

        {/* Right side - Freelancers */}
        <Link to="/marketplace" className="flex-1 h-full">
          <HeroOrb 
            side="right"
            label="FREELANCERS"
            sublabel="Web3's Premier Talent Marketplace"
          />
        </Link>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-gray-500 text-xs tracking-widest uppercase hidden sm:block">Scroll to Explore</span>
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.section>

      {/* Tagline Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 md:mb-6 leading-tight font-display">
              The <span className="text-gradient-cyan">Web3</span> Hub for
              <br />
              <span className="text-gradient-purple">Projects & Talent</span>
            </h2>
            <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto mb-6 md:mb-8 leading-relaxed">
              List your crypto project, find verified Web3 freelancers, and connect across 50+ blockchains.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="relative p-3 md:p-6 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
                whileHover={{ scale: 1.05, borderColor: 'rgba(34, 211, 238, 0.5)' }}
              >
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gradient-gold mb-1 md:mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                </div>
                <div className="text-gray-500 text-[10px] sm:text-xs md:text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Interactive Carousel */}
      <section className="relative w-full py-12 md:py-20 overflow-hidden">
        <div className="w-full">
          <motion.div
            className="text-center mb-8 md:mb-12 px-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl sm:text-3xl md:text-5xl font-bold text-white mb-2 md:mb-3 font-display">
              Everything You Need
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm md:text-lg max-w-2xl mx-auto">
              A complete ecosystem for Web3 projects and professionals
            </p>
          </motion.div>

          {/* Interactive 3D Carousel */}
          <FeaturesCarousel features={features} />
        </div>
      </section>

      {/* AquaPay Highlight Section */}
      <section className="relative px-4 md:px-6 py-12 md:py-20 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl -translate-y-1/2" />
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/50 via-slate-900/90 to-cyan-950/50 backdrop-blur-xl overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-3xl opacity-50">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-cyan-500/50 to-blue-500/0 animate-pulse" style={{ maskImage: 'linear-gradient(black, transparent)' }} />
            </div>
            
            <div className="relative p-6 md:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* Left content */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 font-display">
                  <span className="text-gradient-cyan">AquaPay</span>
                  <br />
                  <span className="text-xl sm:text-2xl md:text-3xl text-gray-300">Your Universal Crypto Payment Link</span>
                </h2>
                
                <p className="text-gray-400 text-sm md:text-base lg:text-lg mb-6 max-w-xl">
                  Create a single payment link to receive crypto on any chain. Share it with anyone, anywhere. 
                  Funds go directly to your wallet - no middleman, no fees from us.
                </p>
                
                {/* Feature highlights */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: '⚡', label: 'Instant Payments' },
                    { icon: '🔐', label: 'Non-Custodial' },
                    { icon: '🌐', label: '8+ Chains' }
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      className="flex items-center gap-2 text-white text-xs md:text-sm bg-white/5 rounded-lg px-2 py-1.5"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <span className="text-lg drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">{item.icon}</span>
                      <span>{item.label}</span>
                    </motion.div>
                  ))}
                </div>
                
                <motion.div
                  className="flex flex-col gap-3 justify-center lg:justify-start"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                >
                  <Link to="/home">
                    <motion.button
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-sm md:text-base shadow-lg shadow-blue-500/25"
                      whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      💸 Create Your Payment Link
                    </motion.button>
                  </Link>
                  
                  {/* Guide indicator */}
                  <div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Login → Username → <span className="text-white">📊 Dashboard</span> → <span className="text-cyan-400 font-medium">💸 AquaPay</span> tab</span>
                  </div>
                </motion.div>
              </div>
              
              {/* Right visual - Payment link mockup */}
              <motion.div
                className="flex-shrink-0 w-full max-w-xs lg:max-w-sm"
                initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="relative">
                  {/* Glow behind card */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-2xl blur-2xl scale-110" />
                  
                  {/* Mockup card */}
                  <div className="relative bg-gray-900 rounded-2xl p-6 border border-white/20 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                        💸
                      </div>
                      <div>
                        <div className="text-white font-bold">yourname</div>
                        <div className="text-gray-400 text-sm">aquads.xyz/pay/yourname</div>
                      </div>
                    </div>
                    
                    {/* Chain selector mockup */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { icon: '◎', color: 'text-purple-400', bg: 'bg-purple-500/30 border border-purple-500/50', active: true },
                        { icon: 'Ξ', color: 'text-blue-400', bg: 'bg-white/10' },
                        { icon: '▣', color: 'text-blue-400', bg: 'bg-white/10' },
                        { icon: '◆', color: 'text-purple-400', bg: 'bg-white/10' }
                      ].map((item, i) => (
                        <div 
                          key={i} 
                          className={`p-2 rounded-lg text-center text-lg font-bold ${item.active ? item.bg : item.bg} ${item.color}`}
                        >
                          {item.icon}
                        </div>
                      ))}
                    </div>
                    
                    {/* Amount mockup */}
                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                      <div className="text-gray-400 text-sm mb-1">Amount</div>
                      <div className="text-white text-2xl font-bold">0.5 SOL</div>
                      <div className="text-gray-400 text-sm">≈ $52.50 USD</div>
                    </div>
                    
                    {/* Pay button mockup */}
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-center py-3 rounded-xl font-bold">
                      Connect Wallet & Pay
                    </div>
                  </div>
                  
                  {/* Floating badges */}
                  <motion.div
                    className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✓ Verified
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center px-4 md:px-6 py-8 md:py-12">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-white mb-4 md:mb-6 font-display">
            Ready to <span className="text-gradient-cyan">Dive In</span>?
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center">
            <Link to="/home">
              <motion.button
                className="px-6 md:px-8 py-3 md:py-4 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-sm md:text-lg glow-cyan"
                whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(34, 211, 238, 0.5)' }}
                whileTap={{ scale: 0.95 }}
              >
                🚀 Explore Projects
              </motion.button>
            </Link>
            
            <Link to="/marketplace">
              <motion.button
                className="px-6 md:px-8 py-3 md:py-4 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold text-sm md:text-lg glow-purple"
                whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(192, 132, 252, 0.5)' }}
                whileTap={{ scale: 0.95 }}
              >
                👥 Find Talent
              </motion.button>
            </Link>
          </div>

          <motion.p
            className="mt-6 md:mt-8 text-gray-500 text-[10px] sm:text-xs md:text-sm"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            No wallet required to browse • Free freelancer profiles
          </motion.p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 px-4 md:px-6 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-5 md:gap-6">
            {/* Logo & Copyright */}
            <div className="flex items-center gap-2 md:gap-3">
              <img 
                src="/Aquadsnewlogo.png" 
                alt="AQUADS" 
                className="h-6 md:h-8 w-auto"
              />
              <span className="text-gray-400 text-xs md:text-sm">© {new Date().getFullYear()} Aquads</span>
            </div>
            
            {/* Footer Links - Better tap targets on mobile */}
            <div className="flex flex-wrap items-center justify-center gap-1 md:gap-6">
              <Link to="/terms" className="text-gray-500 hover:text-white text-xs md:text-sm transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
                Terms
              </Link>
              <Link to="/privacy-policy" className="text-gray-500 hover:text-white text-xs md:text-sm transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
                Privacy
              </Link>
              <Link to="/whitepaper" className="text-gray-500 hover:text-white text-xs md:text-sm transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
                Whitepaper
              </Link>
            </div>
            
            {/* Social Links - Larger tap targets */}
            <div className="flex items-center gap-2 md:gap-4">
              <a 
                href="https://x.com/_Aquads_" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5"
              >
                <svg className="w-5 h-5 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="https://t.me/+6rJbDLqdMxA3ZTUx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5"
              >
                <svg className="w-5 h-5 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

