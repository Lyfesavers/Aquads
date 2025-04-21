import React, { useEffect, useState } from 'react';

const EasterEggAnimation = ({ onClose }) => {
  // Add state for animation elements
  const [confetti, setConfetti] = useState([]);
  
  useEffect(() => {
    // Auto close after 10 seconds
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 10000);
    
    // Generate random confetti
    const generateConfetti = () => {
      const newConfetti = [];
      for (let i = 0; i < 100; i++) {
        newConfetti.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 10 + 5,
          color: `hsl(${Math.random() * 360}, 100%, 70%)`,
          speed: Math.random() * 3 + 1
        });
      }
      setConfetti(newConfetti);
    };
    
    generateConfetti();
    
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999999] bg-black bg-opacity-90 overflow-hidden">
      {/* Confetti elements */}
      {confetti.map(particle => (
        <div 
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}vw`,
            top: `${particle.y}vh`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            animation: `fall ${particle.speed}s linear infinite, twinkle 1s ease-in-out infinite alternate`
          }}
        />
      ))}
      
      <div 
        className="relative bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl p-12 shadow-2xl text-center transform-gpu"
        style={{
          animation: "pulse 2s infinite alternate, float 3s infinite alternate",
          boxShadow: "0 0 50px rgba(124, 58, 237, 0.8)"
        }}
      >
        <h2 
          className="text-6xl font-bold text-white mb-6"
          style={{ 
            textShadow: "0 0 15px rgba(255,255,255,0.7)",
            animation: "glow 2s ease-in-out infinite alternate"
          }}
        >
          🎉 You found the Easter egg! 🎉
        </h2>
        <div 
          className="text-white text-3xl"
          style={{
            animation: "bounce 1.5s infinite alternate"
          }}
        >
          Congratulations on reaching 3000+ points!
        </div>
      </div>
      
      {/* Global animation keyframes */}
      <style>
        {`
        @keyframes pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-20px); }
        }
        
        @keyframes glow {
          0% { opacity: 0.8; }
          100% { opacity: 1; text-shadow: 0 0 30px rgba(255,255,255,0.9); }
        }
        
        @keyframes bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-15px); }
        }
        
        @keyframes fall {
          0% { transform: translateY(-100vh) rotate(0deg); }
          100% { transform: translateY(100vh) rotate(720deg); }
        }
        
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        `}
      </style>
    </div>
  );
};

export default EasterEggAnimation; 