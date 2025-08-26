import React from 'react';
import { 
  FaUsers, FaClock, FaTrophy, FaGraduationCap, FaChartLine, FaStar 
} from 'react-icons/fa';

const WorkshopStats = ({ progress, modules, totalProgress }) => {
  // Calculate estimated completion time based on progress
  const totalDuration = modules.reduce((acc, module) => {
    const duration = parseInt(module.duration.replace(' min', ''));
    return acc + duration;
  }, 0);
  
  const remainingTime = Math.round(totalDuration * (1 - totalProgress / 100));

  // Mock workshop statistics (in real implementation, these would come from API)
  const workshopStats = {
    totalStudents: 2847,
    averageRating: 4.9,
    completionRate: 89,
    successStories: 156,
    averageEarnings: '$3,200',
    timeToFirstClient: '14 days'
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      
      {/* Workshop Rating */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
        <div className="flex justify-center mb-2">
          <FaStar className="text-yellow-400 text-2xl" />
        </div>
        <p className="text-2xl font-bold text-yellow-400">
          {workshopStats.averageRating}
        </p>
        <p className="text-sm text-gray-300">Average Rating</p>
      </div>

      {/* Total Students */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
        <div className="flex justify-center mb-2">
          <FaUsers className="text-blue-400 text-2xl" />
        </div>
        <p className="text-2xl font-bold text-blue-400">
          {workshopStats.totalStudents.toLocaleString()}
        </p>
        <p className="text-sm text-gray-300">Students Enrolled</p>
      </div>

      {/* Completion Rate */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
        <div className="flex justify-center mb-2">
          <FaGraduationCap className="text-green-400 text-2xl" />
        </div>
        <p className="text-2xl font-bold text-green-400">
          {workshopStats.completionRate}%
        </p>
        <p className="text-sm text-gray-300">Completion Rate</p>
      </div>

      {/* Your Progress */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
        <div className="flex justify-center mb-2">
          <FaChartLine className="text-purple-400 text-2xl" />
        </div>
        <p className="text-2xl font-bold text-purple-400">
          {totalProgress}%
        </p>
        <p className="text-sm text-gray-300">Your Progress</p>
      </div>

      {/* Success Metrics Row */}
      <div className="col-span-2 md:col-span-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          
          {/* Average First Month Earnings */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-6 text-center border border-green-500/30">
            <div className="flex justify-center mb-3">
              <div className="bg-green-500/20 p-3 rounded-full">
                <FaTrophy className="text-green-400 text-xl" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-400 mb-1">
              {workshopStats.averageEarnings}
            </p>
            <p className="text-sm text-gray-300">Avg. First Month Earnings</p>
            <p className="text-xs text-green-400 mt-1">Based on graduate surveys</p>
          </div>

          {/* Time to First Client */}
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-6 text-center border border-blue-500/30">
            <div className="flex justify-center mb-3">
              <div className="bg-blue-500/20 p-3 rounded-full">
                <FaClock className="text-blue-400 text-xl" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-400 mb-1">
              {workshopStats.timeToFirstClient}
            </p>
            <p className="text-sm text-gray-300">Avg. Time to First Client</p>
            <p className="text-xs text-blue-400 mt-1">From course completion</p>
          </div>

          {/* Success Stories */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-6 text-center border border-purple-500/30">
            <div className="flex justify-center mb-3">
              <div className="bg-purple-500/20 p-3 rounded-full">
                <FaUsers className="text-purple-400 text-xl" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-400 mb-1">
              {workshopStats.successStories}+
            </p>
            <p className="text-sm text-gray-300">Success Stories</p>
            <p className="text-xs text-purple-400 mt-1">Six-figure freelancers</p>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {totalProgress > 0 && (
        <div className="col-span-2 md:col-span-4 mt-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Workshop Progress</h3>
              <span className="text-sm text-gray-400">
                {remainingTime} minutes remaining
              </span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            
                      <div className="flex justify-between text-sm text-gray-400">
            <span>{progress.completedModules.length} of {modules.length} modules completed</span>
            <span>{progress.totalWorkshopPoints || 0} workshop points earned</span>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopStats;
