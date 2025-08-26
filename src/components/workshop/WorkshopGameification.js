import React, { useState } from 'react';
import { 
  FaCoins, FaTrophy, FaFire, FaCrown, FaStar, FaGem, 
  FaChartLine, FaAward, FaMedal, FaShieldAlt
} from 'react-icons/fa';

const WorkshopGameification = ({ progress }) => {
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Calculate level based on workshop points
  const getLevel = (workshopPoints) => {
    if (workshopPoints >= 1000) return { level: 6, title: 'Freelance Master', icon: FaCrown, color: 'text-yellow-400' };
    if (workshopPoints >= 800) return { level: 5, title: 'Expert Professional', icon: FaShieldAlt, color: 'text-purple-400' };
    if (workshopPoints >= 600) return { level: 4, title: 'Advanced Freelancer', icon: FaMedal, color: 'text-blue-400' };
    if (workshopPoints >= 400) return { level: 3, title: 'Skilled Practitioner', icon: FaAward, color: 'text-green-400' };
    if (workshopPoints >= 200) return { level: 2, title: 'Learning Enthusiast', icon: FaStar, color: 'text-orange-400' };
    return { level: 1, title: 'Workshop Beginner', icon: FaGem, color: 'text-gray-400' };
  };

  // Calculate points needed for next level
  const getNextLevelPoints = (currentPoints) => {
    const levels = [0, 200, 400, 600, 800, 1000];
    for (let i = 0; i < levels.length; i++) {
      if (currentPoints < levels[i]) {
        return levels[i] - currentPoints;
      }
    }
    return 0; // Max level reached
  };

  const workshopPoints = progress.totalWorkshopPoints || 0;
  const currentLevel = getLevel(workshopPoints);
  const nextLevelPoints = getNextLevelPoints(workshopPoints);
  const LevelIcon = currentLevel.icon;

  // Achievement badges that can be earned
  const achievementBadges = [
    { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', description: 'Complete a module in under 30 minutes', earned: workshopPoints >= 100 },
    { id: 'perfectionist', name: 'Perfectionist', icon: '💯', description: 'Score 100% on all quizzes in a module', earned: workshopPoints >= 200 },
    { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', description: 'Join the community and introduce yourself', earned: workshopPoints >= 50 },
    { id: 'early_bird', name: 'Early Bird', icon: '🐦', description: 'Start the workshop within first week', earned: true },
    { id: 'streak_master', name: 'Streak Master', icon: '🔥', description: 'Complete activities 3 days in a row', earned: progress.currentStreak >= 3 },
    { id: 'knowledge_seeker', name: 'Knowledge Seeker', icon: '📚', description: 'Complete all bonus content', earned: workshopPoints >= 500 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Level & Points Panel */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
        <div className="text-center">
          <div className="mb-4">
            <LevelIcon className={`text-4xl mx-auto ${currentLevel.color}`} />
          </div>
          <h3 className="text-xl font-bold mb-2">{currentLevel.title}</h3>
          <p className="text-3xl font-bold text-yellow-400 mb-2">
            <FaCoins className="inline mr-2" />
            {workshopPoints.toLocaleString()}
          </p>
          <p className="text-gray-400 text-sm">Workshop Points Earned</p>
          
          {nextLevelPoints > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">
                {nextLevelPoints} points to next level
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.max(0, Math.min(100, ((workshopPoints % 200) / 200) * 100))}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Stats */}
      <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <FaChartLine className="mr-2 text-green-400" />
          Your Progress
        </h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Modules Completed</span>
            <span className="font-bold text-green-400">
              {progress.completedModules.length} / 6
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Badges Earned</span>
            <span className="font-bold text-yellow-400">
              {progress.badges.length}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Current Streak</span>
            <span className="font-bold text-orange-400 flex items-center">
              <FaFire className="mr-1" />
              {progress.currentStreak} days
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Time Invested</span>
            <span className="font-bold text-blue-400">
              {Math.round(progress.timeSpent / 60)} hours
            </span>
          </div>
        </div>
      </div>

      {/* Badges Collection */}
      <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <FaTrophy className="mr-2 text-yellow-400" />
          Badge Collection
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {achievementBadges.map((badge) => (
            <div
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`
                relative p-3 rounded-lg text-center cursor-pointer transition-all duration-300 hover:scale-105
                ${badge.earned 
                  ? 'bg-yellow-500/20 border border-yellow-500/50' 
                  : 'bg-gray-700/30 border border-gray-600 opacity-50'
                }
              `}
            >
              <div className="text-2xl mb-1">{badge.icon}</div>
              <p className="text-xs font-medium leading-tight">{badge.name}</p>
              
              {badge.earned && (
                <div className="absolute -top-1 -right-1">
                  <FaStar className="text-yellow-400 text-sm" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {progress.badges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-600">
            <p className="text-sm text-gray-400 text-center">
              Latest: <span className="text-yellow-400 font-medium">
                {progress.badges[progress.badges.length - 1]?.name}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 border border-gray-600">
            <div className="text-center">
              <div className="text-4xl mb-3">{selectedBadge.icon}</div>
              <h3 className="text-xl font-bold mb-2">{selectedBadge.name}</h3>
              <p className="text-gray-400 mb-4">{selectedBadge.description}</p>
              <div className={`
                px-4 py-2 rounded-full text-sm font-medium mb-4
                ${selectedBadge.earned ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}
              `}>
                {selectedBadge.earned ? '✅ Earned' : '🔒 Not Yet Earned'}
              </div>
              <button
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopGameification;
