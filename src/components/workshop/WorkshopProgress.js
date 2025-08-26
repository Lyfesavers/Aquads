import React from 'react';
import { 
  FaCheckCircle, FaLock, FaPlay, FaClock, FaTrophy 
} from 'react-icons/fa';

const WorkshopProgress = ({ modules, currentModule, progress, onModuleSelect }) => {
  const getModuleStatus = (moduleIndex, moduleId) => {
    if (progress.completedModules.includes(moduleId)) {
      return 'completed';
    } else if (moduleIndex === currentModule) {
      return 'current';
    } else if (moduleIndex <= currentModule) {
      return 'available';
    } else {
      return 'locked';
    }
  };

  const getModuleProgress = (moduleId) => {
    const completedSections = progress.completedSections?.[moduleId] || [];
    const module = modules.find(m => m.id === moduleId);
    const progressPercent = Math.round((completedSections.length / module.sections.length) * 100);
    return Math.min(progressPercent, 100); // Cap at 100%
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center">
        <FaTrophy className="inline mr-2 text-yellow-400" />
        Workshop Progress
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {modules.map((module, index) => {
          const status = getModuleStatus(index, module.id);
          const moduleProgress = getModuleProgress(module.id);
          const IconComponent = module.icon;
          
          return (
            <div
              key={module.id}
              onClick={() => status !== 'locked' && onModuleSelect(index)}
              className={`
                relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-105
                ${status === 'completed' 
                  ? 'border-green-500 bg-green-500/20' 
                  : status === 'current'
                  ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                  : status === 'available'
                  ? 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                  : 'border-gray-700 bg-gray-800/30 cursor-not-allowed'
                }
              `}
            >
              {/* Status Icon */}
              <div className="absolute top-2 right-2">
                {status === 'completed' && (
                  <FaCheckCircle className="text-green-400 text-lg" />
                )}
                {status === 'current' && (
                  <FaPlay className="text-blue-400 text-lg animate-pulse" />
                )}
                {status === 'locked' && (
                  <FaLock className="text-gray-500 text-lg" />
                )}
              </div>

              {/* Module Icon */}
              <div className={`
                w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-2 sm:mb-3
                bg-gradient-to-r ${module.color}
              `}>
                <IconComponent className="text-lg sm:text-xl text-white" />
              </div>

              {/* Module Info */}
              <h3 className="font-bold text-base sm:text-lg mb-2 leading-tight">
                {module.title}
              </h3>
              
              <p className="text-gray-400 text-xs sm:text-sm mb-3 line-clamp-2">
                {module.subtitle}
              </p>

              {/* Duration */}
              <div className="flex justify-center items-center mb-3">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <FaClock />
                  {module.duration}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className={`
                    h-2 rounded-full transition-all duration-500
                    ${status === 'completed' 
                      ? 'bg-green-500' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }
                  `}
                  style={{ width: `${moduleProgress}%` }}
                />
              </div>
              
              <p className="text-xs text-gray-400 text-center">
                {moduleProgress}% Complete
              </p>

              {/* Badge Preview */}
              {status === 'completed' && module.badge && (
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                    {module.badge.icon} {module.badge.name}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkshopProgress;
