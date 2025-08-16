import React from 'react';
import { FaTrophy } from 'react-icons/fa';

const SkillBadges = ({ badges, showTitle = true, compact = false }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="relative group cursor-help"
            title={`${badge.badgeName} - This user has taken the skill test and passed verified by Aquads.xyz`}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-transform group-hover:scale-110 relative"
              style={{
                backgroundImage: `url('/badge.svg')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
            >
              <div className="relative z-10">
                {badge.badgeIcon}
              </div>
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              <div className="font-semibold mb-1">{badge.badgeName}</div>
              <div className="text-gray-300">This user has taken the skill test and passed verified by Aquads.xyz</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center space-x-2">
          <FaTrophy className="text-yellow-400" />
          <h4 className="text-sm font-semibold text-white">Skills & Certifications</h4>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 p-3 rounded-lg bg-gray-700/50 border border-gray-600 hover:border-gray-500 transition-colors"
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: `${badge.badgeColor}20` }}
            >
              {badge.badgeIcon}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-white text-sm truncate">
                {badge.badgeName}
              </h5>
              <p className="text-gray-400 text-xs truncate">
                {badge.badgeDescription}
              </p>
              {badge.score && (
                <p className="text-gray-500 text-xs">
                  Score: {badge.score}%
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillBadges;
