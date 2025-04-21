import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EasterEggAnimation = ({ points, onClose }) => {
  const [visible, setVisible] = useState(false);
  
  // Only show animation when points are 3000 or more
  useEffect(() => {
    if (points >= 3000) {
      setVisible(true);
      
      // Auto close after 6 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 6000);
      
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
              {[...Array(20)].map((_, i) => (
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
              <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-3xl" />
            </motion.div>
          </div>
          
          {/* Main content */}
          <motion.div
            className="relative z-10 max-w-2xl text-center p-8"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 100,
              delay: 0.2
            }}
          >
            <motion.div
              className="text-6xl font-extrabold mb-6"
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
              className="mb-8 text-3xl font-bold text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span>You've reached </span>
              <span className="text-blue-400">3,000</span>
              <span> affiliate points!</span>
            </motion.div>
            
            <motion.div
              className="mb-8 text-xl text-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p>You're officially an Aquads affiliate superstar!</p>
              <p className="mt-2">Keep up the great work promoting our platform.</p>
            </motion.div>
            
            <motion.button
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full text-white font-bold text-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
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