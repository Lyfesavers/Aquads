import React from 'react';
import { FaTrophy } from 'react-icons/fa';

const SkillBadges = ({ badges, showTitle = true, compact = false }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-gray-700/50 border border-gray-600"
            title={`${badge.badgeName}: ${badge.badgeDescription}`}
          >
            <span className="text-sm">{badge.badgeIcon}</span>
            <span className="text-gray-300 font-medium">{badge.badgeName}</span>
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
