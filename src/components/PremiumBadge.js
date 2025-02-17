import React from 'react';
import { FaCrown } from 'react-icons/fa';

const PremiumBadge = () => {
  return (
    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-sm font-medium shadow-lg flex items-center gap-1 backdrop-blur-sm">
      <FaCrown className="text-white" />
      <span>Premium</span>
    </div>
  );
};

export default PremiumBadge; 