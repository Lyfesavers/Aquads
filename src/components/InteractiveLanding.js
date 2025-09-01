import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Tv, 
  Monitor, 
  Coffee, 
  BookOpen, 
  Users, 
  Trophy, 
  Gamepad2, 
  MessageCircle,
  ArrowLeft,
  X,
  Sparkles,
  Zap,
  Star,
  Heart,
  Briefcase,
  DollarSign,
  Wifi,
  Activity,
  Layers,
  Globe
} from 'lucide-react';

const InteractiveLanding = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeParticles, setActiveParticles] = useState([]);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const roomElements = [
    {
      id: 'freelancer-hub',
      name: 'Freelancer Hub',
      description: 'Connect with skilled freelancers and find the perfect talent for your projects.',
      icon: <Briefcase className="w-10 h-10" />,
      color: 'from-blue-500 via-indigo-600 to-purple-700',
      position: { x: 15, y: 25, z: 0 }, // Left wall - main desk area
      size: 'large',
      features: ['Project Listings', 'Freelancer Profiles', 'Skill Matching', 'Secure Payments'],
      glowColor: 'from-blue-400/40 to-purple-400/40',
      accentColor: 'from-blue-300 to-purple-400',
      link: '/marketplace',
      roomPosition: 'left-wall'
    },
    {
      id: 'paid-ads',
      name: 'Paid Ads Platform',
      description: 'Boost your project visibility with our dynamic bubble advertising system.',
      icon: <Activity className="w-10 h-10" />,
      color: 'from-emerald-500 via-green-600 to-teal-700',
      position: { x: 75, y: 20, z: 10 }, // Right wall - advertising board
      size: 'large',
      features: ['Bubble Ads', 'Real-time Bidding', 'Analytics Dashboard', 'Targeted Reach'],
      glowColor: 'from-green-400/40 to-emerald-400/40',
      accentColor: 'from-green-300 to-emerald-400',
      link: '/',
      action: 'openMintFunnelPlatform',
      roomPosition: 'right-wall'
    },
    {
      id: 'game-hub',
      name: 'Game Hub',
      description: 'Play exciting games, compete in tournaments, and win rewards.',
      icon: <Gamepad2 className="w-12 h-12" />,
      color: 'from-red-500 via-pink-600 to-rose-700',
      position: { x: 50, y: 15, z: -5 }, // Center back - gaming station
      size: 'xlarge',
      features: ['Horse Racing', 'Dots & Boxes', 'Tournaments', 'Leaderboards'],
      glowColor: 'from-red-400/40 to-pink-400/40',
      accentColor: 'from-red-300 to-pink-400',
      link: '/games',
      roomPosition: 'center-back'
    },
    {
      id: 'learning-center',
      name: 'Learning Center',
      description: 'Educational resources, tutorials, and guides for crypto and freelancing.',
      icon: <BookOpen className="w-9 h-9" />,
      color: 'from-indigo-500 via-blue-600 to-cyan-700',
      position: { x: 85, y: 65, z: 5 }, // Right side table
      size: 'medium',
      features: ['Crypto Guides', 'Freelancing Tips', 'Market Analysis', 'Video Tutorials'],
      glowColor: 'from-indigo-400/40 to-blue-400/40',
      accentColor: 'from-indigo-300 to-blue-400',
      link: '/learn',
      roomPosition: 'right-table'
    },
    {
      id: 'aquafi',
      name: 'AquaFi DeFi',
      description: 'Decentralized finance tools and cryptocurrency trading platform.',
      icon: <Layers className="w-11 h-11" />,
      color: 'from-purple-500 via-violet-600 to-fuchsia-700',
      position: { x: 25, y: 70, z: 15 }, // Left side - DeFi terminal
      size: 'large',
      features: ['DeFi Protocol', 'Yield Farming', 'Liquidity Pools', 'Staking Rewards'],
      glowColor: 'from-purple-400/40 to-fuchsia-400/40',
      accentColor: 'from-purple-300 to-fuchsia-400',
      link: '/aquafi',
      roomPosition: 'left-terminal'
    },
    {
      id: 'aquaswap',
      name: 'AquaSwap',
      description: 'Advanced cryptocurrency exchange and trading platform.',
      icon: <Wifi className="w-10 h-10" />,
      color: 'from-yellow-500 via-amber-600 to-orange-700',
      position: { x: 65, y: 75, z: 8 }, // Center table - trading hub
      size: 'large',
      features: ['Token Swapping', 'Multi-chain Support', 'Low Fees', 'Instant Trades'],
      glowColor: 'from-yellow-400/40 to-orange-400/40',
      accentColor: 'from-yellow-300 to-orange-400',
      link: '/swap',
      roomPosition: 'center-table'
    },
    {
      id: 'affiliate',
      name: 'Affiliate Program',
      description: 'Earn rewards by referring users and promoting platform features.',
      icon: <Users className="w-9 h-9" />,
      color: 'from-orange-500 via-red-600 to-pink-700',
      position: { x: 10, y: 45, z: 12 }, // Left side - networking area
      size: 'medium',
      features: ['Referral Rewards', 'Commission System', 'Performance Tracking', 'Bonus Incentives'],
      glowColor: 'from-orange-400/40 to-red-400/40',
      accentColor: 'from-orange-300 to-red-400',
      link: '/affiliate',
      roomPosition: 'left-side'
    },
    {
      id: 'why-list',
      name: 'Project Showcase',
      description: 'Discover the benefits of listing your project on our platform.',
      icon: <Globe className="w-9 h-9" />,
      color: 'from-teal-500 via-cyan-600 to-blue-700',
      position: { x: 90, y: 45, z: 10 }, // Right side - showcase area
      size: 'medium',
      features: ['Increased Visibility', 'Quality Traffic', 'Partnership Opportunities', 'Growth Support'],
      glowColor: 'from-teal-400/40 to-cyan-400/40',
      accentColor: 'from-teal-300 to-cyan-400',
      link: '/why-list',
      roomPosition: 'right-side'
    }
  ];

  // Helper function to get element size classes
  const getElementSizeClasses = (size) => {
    switch (size) {
      case 'xlarge': return 'w-32 h-32';
      case 'large': return 'w-28 h-28';
      case 'medium': return 'w-24 h-24';
      default: return 'w-20 h-20';
    }
  };

  // Enhanced particle effect
  const createParticleEffect = useCallback((x, y) => {
    const particles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x,
      y,
      angle: (i * 45) * (Math.PI / 180),
      velocity: Math.random() * 3 + 2,
      life: 1,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    }));
    
    setActiveParticles(prev => [...prev, ...particles]);
    
    setTimeout(() => {
      setActiveParticles(prev => prev.filter(p => !particles.includes(p)));
    }, 1000);
  }, []);

  const handleElementClick = (element) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setActiveSection(element);
    
    // Create particle effect at click location
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      createParticleEffect(element.position.x, element.position.y);
    }
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  const handleClose = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSection(null);
      setIsTransitioning(false);
    }, 300);
  };

  const handleBackToRoom = () => {
    handleClose();
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('mousemove', handleMouseMove);
    
    // Loading animation
    setTimeout(() => setIsLoaded(true), 500);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Enhanced parallax effect for true 3D feel
  const parallaxX = (mousePosition.x - window.innerWidth / 2) * 0.02;
  const parallaxY = (mousePosition.y - window.innerHeight / 2) * 0.02;
  const perspective = 1000 + parallaxX * 10;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ 
      background: `
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3), transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(120, 200, 255, 0.2), transparent 50%),
        linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)
      ` 
    }}>
      {/* Enhanced 3D Room Environment */}
      <div className="absolute inset-0" style={{ perspective: `${perspective}px` }}>
        {/* Room Floor */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent"
          style={{
            transform: `rotateX(85deg) translateZ(-100px)`,
            transformOrigin: 'bottom',
          }}
        />
        
        {/* Room Walls */}
        <div className="absolute inset-0">
          {/* Left Wall */}
          <motion.div 
            className="absolute left-0 top-0 w-px h-full bg-gradient-to-b from-blue-500/20 via-purple-500/20 to-transparent"
            style={{
              transform: `rotateY(45deg) translateZ(50px)`,
              transformOrigin: 'left',
            }}
          />
          
          {/* Right Wall */}
          <motion.div 
            className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-cyan-500/20 via-teal-500/20 to-transparent"
            style={{
              transform: `rotateY(-45deg) translateZ(50px)`,
              transformOrigin: 'right',
            }}
          />
          
          {/* Back Wall */}
          <motion.div 
            className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"
            style={{
              transform: `translateZ(-200px)`,
            }}
          />
        </div>

        {/* Advanced Grid Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)]"></div>
        </div>

        {/* Floating Energy Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 4 + 2,
                height: Math.random() * 4 + 2,
                background: `radial-gradient(circle, ${
                  ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'][Math.floor(Math.random() * 5)]
                }, transparent)`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [0, Math.random() * 200 - 100],
                y: [0, Math.random() * 200 - 100],
                opacity: [0.8, 0.2, 0.8],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: Math.random() * 20 + 15,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>

        {/* Active Particle Effects */}
        {activeParticles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 rounded-full pointer-events-none"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: particle.color,
              boxShadow: `0 0 10px ${particle.color}`,
            }}
            animate={{
              x: Math.cos(particle.angle) * particle.velocity * 20,
              y: Math.sin(particle.angle) * particle.velocity * 20,
              opacity: [1, 0],
              scale: [1, 0],
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        ))}
      </div>

      {/* Main Room Container */}
      <div ref={containerRef} className="relative w-full h-screen" style={{ perspective: `${perspective}px` }}>
        {/* Enhanced Title Section */}
        <motion.div 
          initial={{ opacity: 0, y: -30, z: -100 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: 0, z: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-12 left-1/2 transform -translate-x-1/2 z-30 text-center"
          style={{ transform: `translate(-50%, 0) translateZ(${parallaxY * 5}px)` }}
        >
          <div className="relative">
            {/* Holographic Effect */}
            <motion.div
              animate={{ 
                rotateY: [0, 360],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 bg-gradient-conic from-blue-500 via-purple-500 via-pink-500 to-blue-500 rounded-3xl blur-2xl opacity-40"
            />
            
            <motion.h1 
              className="relative text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 via-purple-600 to-pink-500 mb-4"
              style={{
                textShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
                filter: 'drop-shadow(0 4px 20px rgba(139, 92, 246, 0.4))'
              }}
            >
              Welcome to Aquads
            </motion.h1>
            
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto font-light leading-relaxed">
                Step into the future of 
                <span className="text-cyan-400 font-semibold"> Gaming</span>, 
                <span className="text-purple-400 font-semibold"> Trading</span>, and 
                <span className="text-pink-400 font-semibold"> Innovation</span>
              </p>
            </motion.div>
          </div>
          
          {/* Orbital Elements */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 pointer-events-none"
          >
            <Sparkles className="absolute -top-8 left-1/4 w-6 h-6 text-cyan-400 opacity-80" />
            <Star className="absolute -top-6 right-1/4 w-5 h-5 text-purple-400 opacity-80" />
            <Zap className="absolute top-8 -left-8 w-5 h-5 text-pink-400 opacity-80" />
          </motion.div>
        </motion.div>

        {/* Futuristic Interactive Elements */}
        {roomElements.map((element, index) => (
          <motion.div
            key={element.id}
            initial={{ opacity: 0, scale: 0, rotateY: -180 }}
            animate={{ 
              opacity: isLoaded ? 1 : 0, 
              scale: 1, 
              rotateY: 0,
            }}
            transition={{ 
              delay: index * 0.15 + 0.5,
              duration: 0.8,
              ease: "easeOut"
            }}
            className="absolute cursor-pointer group"
            style={{
              left: `${element.position.x}%`,
              top: `${element.position.y}%`,
              transform: `translateZ(${element.position.z}px) translate(-50%, -50%)`,
              transformStyle: "preserve-3d"
            }}
            onClick={() => handleElementClick(element)}
            onMouseEnter={() => setHoveredElement(element.id)}
            onMouseLeave={() => setHoveredElement(null)}
          >
            {/* 3D Element Container */}
            <motion.div
              className={`relative ${getElementSizeClasses(element.size)} rounded-3xl overflow-hidden`}
              whileHover={{ 
                scale: 1.15,
                rotateY: 10,
                rotateX: 5,
                z: 50
              }}
              whileTap={{ scale: 0.9 }}
              style={{
                transformStyle: "preserve-3d",
                perspective: "1000px"
              }}
            >
              {/* Holographic Base */}
              <div className={`absolute inset-0 bg-gradient-to-br ${element.color} rounded-3xl`} />
              
              {/* Energy Core */}
              <motion.div
                className={`absolute inset-2 bg-gradient-to-br ${element.glowColor} rounded-2xl blur-md`}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [0.9, 1.1, 0.9],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Mesh Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(255,255,255,0.1)_70%)] rounded-3xl" />
              
              {/* Scan Lines */}
              <motion.div
                className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] rounded-3xl"
                animate={{ y: ['-100%', '200%'] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: index * 0.3
                }}
              />
              
              {/* Icon Container */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <motion.div
                  className="text-white filter drop-shadow-lg"
                  animate={{
                    rotateZ: hoveredElement === element.id ? [0, 5, -5, 0] : 0,
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {element.icon}
                </motion.div>
              </div>

              {/* Border Glow */}
              <motion.div
                className={`absolute inset-0 rounded-3xl border-2 border-white/30`}
                animate={{
                  borderColor: hoveredElement === element.id 
                    ? ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.3)']
                    : 'rgba(255,255,255,0.3)',
                }}
                transition={{ duration: 1, repeat: hoveredElement === element.id ? Infinity : 0 }}
              />

              {/* Orbiting Elements */}
              {hoveredElement === element.id && (
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  {[0, 120, 240].map((angle, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-white rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `rotate(${angle}deg) translateY(-${element.size === 'xlarge' ? '60px' : element.size === 'large' ? '50px' : '40px'}) translateX(-1px)`
                      }}
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Floating Label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: hoveredElement === element.id ? 1 : 0, 
                y: hoveredElement === element.id ? 0 : 10,
                scale: hoveredElement === element.id ? 1 : 0.9
              }}
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-20"
            >
              <div className="px-6 py-3 bg-black/80 backdrop-blur-xl rounded-2xl text-white text-sm font-semibold whitespace-nowrap border border-white/20 shadow-2xl">
                <div className="text-center">
                  <div className="text-lg font-bold">{element.name}</div>
                  <div className="text-xs text-gray-300 mt-1">{element.roomPosition}</div>
                </div>
                {/* Pointer */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-black/80 border-l border-t border-white/20 rotate-45"></div>
              </div>
            </motion.div>

            {/* Area Effect */}
            <motion.div
              className={`absolute inset-0 rounded-full bg-gradient-radial ${element.glowColor} opacity-20`}
              animate={{ 
                scale: hoveredElement === element.id ? [1, 2, 1] : [1, 1.2, 1],
                opacity: hoveredElement === element.id ? [0.2, 0.4, 0.2] : [0.1, 0.2, 0.1]
              }}
              transition={{ 
                duration: hoveredElement === element.id ? 1.5 : 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              style={{ transform: 'translateZ(-10px)' }}
            />
          </motion.div>
        ))}

        {/* Enhanced Decorative Elements with Parallax */}
        <motion.div 
          className="absolute top-1/4 right-1/6 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          style={{ x: parallaxX * 2, y: parallaxY * 2 }}
        />
        <motion.div 
          className="absolute bottom-1/4 left-1/6 w-48 h-48 bg-gradient-to-br from-green-400/20 to-teal-400/20 rounded-full blur-3xl"
          style={{ x: -parallaxX * 1.5, y: -parallaxY * 1.5 }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/6 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-red-400/20 rounded-full blur-3xl"
          style={{ x: parallaxX * 1, y: parallaxY * 1 }}
        />
      </div>

      {/* Enhanced Section Detail Modal */}
      <AnimatePresence>
        {activeSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={handleClose}
            />

            {/* Enhanced Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20, rotateX: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20, rotateX: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/20"
              style={{
                transformStyle: "preserve-3d",
                perspective: "1000px"
              }}
            >
              {/* Enhanced Header */}
              <div className={`relative bg-gradient-to-r ${activeSection.color} p-6 text-white overflow-hidden`}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.3)_1px,transparent_0)] bg-[length:10px_10px]"></div>
                </div>
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.div 
                      className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                      {activeSection.icon}
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-bold">{activeSection.name}</h2>
                      <p className="text-white/90">{activeSection.description}</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>
              </div>

              {/* Enhanced Content */}
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {activeSection.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:scale-105"
                    >
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${activeSection.accentColor} shadow-lg`}></div>
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                                 {/* Enhanced Action Buttons */}
                 <div className="flex flex-col sm:flex-row gap-3">
                   <motion.button 
                     onClick={() => {
                       if (activeSection.action === 'openMintFunnelPlatform') {
                         // Special action for paid ads platform
                         window.open('/', '_blank');
                       } else if (activeSection.link) {
                         navigate(activeSection.link);
                       }
                       handleClose();
                     }}
                     className={`flex-1 bg-gradient-to-r ${activeSection.color} text-white py-4 px-6 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center justify-center space-x-2`}
                     whileHover={{ scale: 1.02, shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" }}
                     whileTap={{ scale: 0.98 }}
                   >
                     <Zap className="w-5 h-5" />
                     <span>Explore {activeSection.name}</span>
                   </motion.button>
                  <motion.button 
                    onClick={handleBackToRoom}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                    whileHover={{ scale: 1.02, backgroundColor: "#f9fafb" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Room</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

             {/* Enhanced Floating Navigation */}
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 1 }}
         className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
       >
         <div className="flex items-center space-x-4 bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-2xl">
           <motion.button 
             onClick={() => navigate('/marketplace')}
             className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center space-x-2"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
           >
             <Sparkles className="w-4 h-4" />
             <span>Get Started</span>
           </motion.button>
           <motion.button 
             onClick={() => navigate('/games')}
             className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg transition-all duration-300 flex items-center space-x-2"
             whileHover={{ scale: 1.05, shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" }}
             whileTap={{ scale: 0.95 }}
           >
             <Heart className="w-4 h-4" />
             <span>Explore Games</span>
           </motion.button>
         </div>
       </motion.div>
    </div>
  );
};

export default InteractiveLanding;
