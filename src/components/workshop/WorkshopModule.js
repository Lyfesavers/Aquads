import React, { useState, useEffect } from 'react';
import { 
  FaPlay, FaCheckCircle, FaLightbulb, FaUsers, FaChartLine, 
  FaDesktop, FaQuestionCircle, FaAward, FaBolt, FaRocket,
  FaEye, FaMousePointer, FaGraduationCap, FaComment
} from 'react-icons/fa';
import InteractiveContent from './content/InteractiveContent';
import InfographicContent from './content/InfographicContent';
import LiveDemoPlaceholder from './content/LiveDemoPlaceholder';
import QuizComponent from './content/QuizComponent';

const WorkshopModule = ({ module, progress, onSectionComplete, currentUser, isCompletingSection }) => {
  const [activeSection, setActiveSection] = useState(0);
  const [completedSections, setCompletedSections] = useState(
    progress.completedSections?.[module.id] || []
  );

  // Sync local state with props when progress updates from API
  // Only sync if the prop data is different from local state
  useEffect(() => {
    const updatedSections = progress.completedSections?.[module.id] || [];
    
    // Only update if the sections are actually different
    const isDifferent = updatedSections.length !== completedSections.length ||
      updatedSections.some(sec => !completedSections.includes(sec));
    
    if (isDifferent) {
      setCompletedSections(updatedSections);
    }
  }, [progress.completedSections, module.id, completedSections]);

  const handleSectionComplete = (sectionIndex, sectionTitle) => {
    if (!completedSections.includes(sectionIndex)) {
      setCompletedSections([...completedSections, sectionIndex]);
      onSectionComplete(module.id, sectionIndex, sectionTitle);
    }
  };

  const isSectionCompleted = (sectionIndex) => {
    return completedSections.includes(sectionIndex);
  };

  const getModuleProgress = () => {
    const progressPercent = Math.round((completedSections.length / module.sections.length) * 100);
    return Math.min(progressPercent, 100); // Cap at 100%
  };

  const ModuleIcon = module.icon;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
      
      {/* Module Header */}
      <div className={`bg-gradient-to-r ${module.color} p-6`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/20 p-3 rounded-full">
            <ModuleIcon className="text-2xl text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {module.title}
            </h2>
            <p className="text-white/80">
              {module.subtitle}
            </p>
          </div>
        </div>
        
        {/* Module Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white/20 rounded-lg p-2 sm:p-3 text-center">
            <FaGraduationCap className="text-white text-base sm:text-lg mx-auto mb-1" />
            <p className="text-white text-xs sm:text-sm font-medium">{module.duration}</p>
            <p className="text-white/70 text-xs">Duration</p>
          </div>

          <div className="bg-white/20 rounded-lg p-2 sm:p-3 text-center">
            <FaBolt className="text-white text-base sm:text-lg mx-auto mb-1" />
            <p className="text-white text-xs sm:text-sm font-medium">{getModuleProgress()}%</p>
            <p className="text-white/70 text-xs">Progress</p>
          </div>
          <div className="bg-white/20 rounded-lg p-2 sm:p-3 text-center">
            <FaRocket className="text-white text-base sm:text-lg mx-auto mb-1" />
            <p className="text-white text-xs sm:text-sm font-medium">{module.sections.length}</p>
            <p className="text-white/70 text-xs">Sections</p>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="p-4 sm:p-6 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {module.sections.map((section, index) => (
            <button
              key={index}
              onClick={() => setActiveSection(index)}
              className={`
                flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all
                ${activeSection === index
                  ? 'bg-blue-600 text-white'
                  : isSectionCompleted(index)
                  ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              {isSectionCompleted(index) ? (
                <FaCheckCircle className="text-sm flex-shrink-0" />
              ) : activeSection === index ? (
                <FaPlay className="text-sm flex-shrink-0" />
              ) : (
                <FaQuestionCircle className="text-sm opacity-50 flex-shrink-0" />
              )}
              <span className="text-center sm:text-left">{section.title}</span>

            </button>
          ))}
        </div>
      </div>

      {/* Active Section Content */}
      <div className="p-4 sm:p-6">
        {module.sections.map((section, index) => {
          if (index !== activeSection) return null;

          const sectionProps = {
            section,
            sectionIndex: index,
            module,
            onComplete: handleSectionComplete,
            isCompleted: isSectionCompleted(index),
            currentUser,
            isCompletingSection
          };

          return (
            <div key={index} className="space-y-6">
              
              {/* Section Header */}
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">{section.title}</h3>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-4 text-sm text-gray-400">
                  <span>Section {index + 1} of {module.sections.length}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Interactive section</span>
                </div>
              </div>

              {/* Content Based on Type */}
              {section.type === 'interactive' && (
                <InteractiveContent {...sectionProps} />
              )}
              
              {section.type === 'infographic' && (
                <InfographicContent {...sectionProps} />
              )}
              
              {section.type === 'live-demo' && (
                <LiveDemoPlaceholder {...sectionProps} />
              )}
              
              {section.type === 'quiz' && (
                <QuizComponent {...sectionProps} />
              )}

              {/* Section Navigation */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-700">
                <button
                  onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                  disabled={activeSection === 0}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-lg transition-all w-full sm:w-auto
                    ${activeSection === 0 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }
                  `}
                >
                  Previous Section
                </button>
                
                <div className="text-center order-first sm:order-none">
                  <p className="text-sm text-gray-400">
                    {completedSections.length} of {module.sections.length} sections completed
                  </p>
                  <div className="w-32 bg-gray-700 rounded-full h-2 mt-1 mx-auto">
                    <div 
                      className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${getModuleProgress()}%` }}
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => setActiveSection(Math.min(module.sections.length - 1, activeSection + 1))}
                  disabled={activeSection === module.sections.length - 1}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-lg transition-all w-full sm:w-auto
                    ${activeSection === module.sections.length - 1 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                  `}
                >
                  Next Section
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Completion Badge */}
      {completedSections.length === module.sections.length && (
        <div className="p-6 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-t border-green-600/30">
          <div className="text-center">
            <FaAward className="text-4xl text-yellow-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-400 mb-2">
              Module Complete! 🎉
            </h3>
            <p className="text-gray-300 mb-3">
              You've earned the <strong>{module.badge.name}</strong> badge!
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full">
              {module.badge.icon} {module.badge.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopModule;
