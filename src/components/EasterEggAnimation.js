import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EasterEggAnimation = ({ points, onClose }) => {
  const [visible, setVisible] = useState(false);
  
  // Only show animation when points are 3000 or more
  useEffect(() => {
    if (points >= 3000) {
      setVisible(true);
      
      // Auto close after 10 seconds (extended from 6)
      const timer = setTimeout(() => {
        handleClose();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [points]);
  
  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 500); // Give animation time to complete before unmounting
  };
  
  // Prevent body scroll when animation is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className="fixed inset-0 flex items-center justify-center z-[500000] bg-black bg-opacity-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 overflow-hidden">
            {/* Animated particles */}
            <div className="absolute inset-0">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-blue-500"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.7 + 0.3,
                  }}
                  animate={{
                    y: [0, -Math.random() * 300 - 100],
                    x: [0, (Math.random() - 0.5) * 200],
                    scale: [1, Math.random() * 2 + 1, 0],
                    opacity: [0.7, 0]
                  }}
                  transition={{
                    duration: Math.random() * 2 + 3,
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>
            
            {/* Glowing circles */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.5, 0.2]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            >
              <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-3xl" />
            </motion.div>
          </div>
          
          {/* Main content */}
          <motion.div
            className="relative z-10 max-w-xs sm:max-w-sm md:max-w-2xl text-center px-4 py-6 sm:p-8"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 100,
              delay: 0.2
            }}
          >
            {/* Golden Egg */}
            <motion.div
              className="mx-auto mb-6 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 relative"
              animate={{ 
                rotateY: 360,
                rotateZ: [0, 10, 0, -10, 0]
              }}
              transition={{ 
                rotateY: {
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                },
                rotateZ: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            >
              <svg 
                viewBox="0 0 200 250" 
                className="w-full h-full drop-shadow-[0_0_30px_rgba(255,215,0,0.7)]"
              >
                <defs>
                  <radialGradient id="eggGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="#fff6a8" />
                    <stop offset="50%" stopColor="#ffdf00" />
                    <stop offset="100%" stopColor="#e7b500" />
                  </radialGradient>
                  <filter id="eggShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
                    <feOffset dx="0" dy="10" result="offsetblur" />
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.5" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <ellipse 
                  cx="100" 
                  cy="125" 
                  rx="80" 
                  ry="110" 
                  fill="url(#eggGradient)" 
                  filter="url(#eggShadow)"
                />
                <ellipse 
                  cx="70" 
                  cy="85" 
                  rx="12" 
                  ry="15" 
                  fill="white" 
                  fillOpacity="0.4" 
                />
                <ellipse 
                  cx="120" 
                  cy="105" 
                  rx="8" 
                  ry="10" 
                  fill="white" 
                  fillOpacity="0.2" 
                />
              </svg>
              
              {/* Sparkles around the egg */}
              {[...Array(8)].map((_, i) => (
                <motion.div 
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-yellow-300"
                  style={{
                    top: `${30 + 40 * Math.sin(i * Math.PI / 4)}%`,
                    left: `${30 + 40 * Math.cos(i * Math.PI / 4)}%`,
                    boxShadow: '0 0 10px 3px rgba(255, 215, 0, 0.6)'
                  }}
                  animate={{
                    scale: [0.5, 1.5, 0.5],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
            
            <motion.div
              className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 sm:mb-6"
              animate={{
                scale: [1, 1.1, 1],
                color: [
                  'rgb(59, 130, 246)', // blue-500
                  'rgb(79, 70, 229)', // indigo-600
                  'rgb(59, 130, 246)'  // blue-500
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                Congratulations!
              </span>
            </motion.div>
            
            <motion.div
              className="mb-4 sm:mb-8 text-xl sm:text-2xl md:text-3xl font-bold text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span>You've reached </span>
              <span className="text-yellow-400">3,000</span>
              <span> affiliate points!</span>
            </motion.div>
            
            <motion.div
              className="mb-6 sm:mb-8 text-base sm:text-xl text-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p>You're officially an Aquads affiliate superstar!</p>
              <p className="mt-2">Keep up the great work promoting our platform.</p>
            </motion.div>
            
            <motion.button
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-gray-900 font-bold text-base sm:text-lg shadow-lg hover:shadow-yellow-500/50 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClose}
            >
              Continue My Journey
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EasterEggAnimation; 