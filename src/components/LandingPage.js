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

// Feature card for bento grid
const FeatureCard = ({ icon, title, description, gradient, delay, size = 'normal', hasVisual = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, delay }}
    whileHover={{ scale: 1.02, y: -5 }}
    className={`
      relative overflow-hidden rounded-2xl border border-white/10
      backdrop-blur-xl bg-gradient-to-br ${gradient}
      ${size === 'large' ? 'md:col-span-2 md:row-span-2 p-4 md:p-8' : size === 'wide' ? 'md:col-span-2 p-4 md:p-6' : 'p-4 md:p-6'}
      group cursor-pointer
    `}
  >
    {/* Glow effect on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
    </div>
    
    {/* Content */}
    <div className="relative z-10 h-full flex flex-col">
      <div className="text-2xl md:text-4xl mb-2 md:mb-4">{icon}</div>
      <h3 className={`${size === 'large' ? 'text-base md:text-2xl' : 'text-sm md:text-xl'} font-bold text-white mb-1 md:mb-2 font-display`}>{title}</h3>
      <p className={`text-gray-400 ${size === 'large' ? 'text-xs md:text-base' : 'text-[11px] md:text-sm'} leading-relaxed`}>{description}</p>
      
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
                    border border-white/10 backdrop-blur-sm
                  `}>
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
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
  </motion.div>
);

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
      icon: '⚡',
      title: 'Trust Score System',
      description: 'AI-powered freelancer vetting with transparent reliability metrics.',
      gradient: 'from-purple-900/40 to-slate-900/80'
    },
    {
      icon: '🔮',
      title: 'Dynamic Token Bubbles',
      description: 'Interactive visualization of crypto projects based on community engagement.',
      gradient: 'from-cyan-900/40 to-slate-900/80'
    },
    {
      icon: '🎮',
      title: 'Web3 Game Hub',
      description: 'Discover and promote blockchain games. Connect developers with gamers.',
      gradient: 'from-orange-900/40 to-slate-900/80'
    },
    {
      icon: '📈',
      title: 'Live Market Data',
      description: 'Real-time token tracking, price alerts, and community-driven reviews.',
      gradient: 'from-rose-900/40 to-slate-900/80',
      size: 'wide'
    },
    {
      icon: '🚀',
      title: 'Twitter Raids',
      description: 'Boost visibility with coordinated social campaigns. Earn points for engagement.',
      gradient: 'from-sky-900/40 to-slate-900/80'
    },
    {
      icon: '💱',
      title: 'AquaSwap',
      description: 'Seamless token swapping across multiple chains with professional charts.',
      gradient: 'from-teal-900/40 to-slate-900/80'
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
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
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
              className="h-10 w-auto filter drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.5))' }}
            />
          </motion.div>

          <div className="flex items-center gap-4">
            <Link 
              to="/whitepaper"
              className="hidden md:block text-gray-400 hover:text-white transition-colors text-sm"
            >
              Whitepaper
            </Link>
            <Link 
              to="/learn"
              className="hidden md:block text-gray-400 hover:text-white transition-colors text-sm"
            >
              Learn
            </Link>
            <Link 
              to="/games"
              className="hidden md:block text-gray-400 hover:text-white transition-colors text-sm"
            >
              Games
            </Link>
            <Link 
              to="/swap"
              className="hidden md:block text-gray-400 hover:text-white transition-colors text-sm"
            >
              Swap
            </Link>
          </div>
        </div>
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
              100% free to get started.
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

      {/* Features Bento Grid */}
      <section className="relative px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-6 md:mb-10"
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

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 auto-rows-fr">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                {...feature}
                delay={index * 0.1}
              />
            ))}
          </div>
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
            No wallet required to browse • Free to list projects • Free to create freelancer profiles
          </motion.p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 md:gap-3">
              <img 
                src="/Aquadsnewlogo.png" 
                alt="AQUADS" 
                className="h-6 md:h-8 w-auto"
              />
              <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm">© 2025 Aquads. All rights reserved.</span>
            </div>
            
            <div className="flex items-center gap-3 md:gap-6">
              <Link to="/terms" className="text-gray-500 hover:text-white text-[10px] sm:text-xs md:text-sm transition-colors">Terms</Link>
              <Link to="/privacy" className="text-gray-500 hover:text-white text-[10px] sm:text-xs md:text-sm transition-colors">Privacy</Link>
              <Link to="/whitepaper" className="text-gray-500 hover:text-white text-[10px] sm:text-xs md:text-sm transition-colors">Whitepaper</Link>
              <a 
                href="https://twitter.com/AquadsHQ" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-cyan-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="https://t.me/aquaborintern" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-cyan-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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

