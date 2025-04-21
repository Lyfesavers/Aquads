import React, { useEffect } from 'react';

const EasterEggAnimation = ({ onClose }) => {
  useEffect(() => {
    // Set a timer to automatically close the animation after 10 seconds
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100000]">
      <div className="bg-black bg-opacity-50 absolute inset-0" onClick={onClose}></div>
      <div className="relative z-10 p-8 rounded-lg shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-center max-w-md">
        <h2 className="text-4xl font-bold text-white mb-4">Congratulations!</h2>
        <p className="text-xl text-white mb-6">You've reached 3000 affiliate points!</p>
        <p className="text-white mb-8">You've unlocked the Duck Hunt Easter egg game!</p>
        <button 
          onClick={onClose}
          className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg shadow-md hover:bg-gray-100 transition duration-200"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default EasterEggAnimation; 