import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { 
  FaPlay, FaCheckCircle, FaTrophy, FaStar, FaCoins, FaRocket, 
  FaUsers, FaChartLine, FaGraduationCap, FaCertificate, FaLightbulb,
  FaArrowRight, FaClock, FaTarget, FaBolt, FaGem, FaCrown
} from 'react-icons/fa';
import WorkshopProgress from './workshop/WorkshopProgress';
import WorkshopModule from './workshop/WorkshopModule';
import WorkshopGameification from './workshop/WorkshopGameification';
import WorkshopStats from './workshop/WorkshopStats';
import { getWorkshopProgress, completeWorkshopSection, awardAchievement, getWorkshopProgressFallback } from '../services/workshopApi';

const FreelancerWorkshop = ({ currentUser }) => {
  const [currentModule, setCurrentModule] = useState(0);
  const [workshopProgress, setWorkshopProgress] = useState({
    totalPoints: 0,
    totalWorkshopPoints: 0,
    completedSections: [],
    workshopHistory: [],
    badges: [],
    completedModules: [],
    currentStreak: 0,
    timeSpent: 0
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  // Workshop modules configuration
  const modules = [
    {
      id: 'welcome',
      title: 'Welcome to the Aquads Ecosystem',
      subtitle: 'Your Journey to Web3 Freelancing Success Starts Here',
      duration: '45 min',

      icon: FaRocket,
      color: 'from-blue-500 to-purple-600',
      badge: { name: 'Explorer', icon: '🗺️', description: 'Completed platform orientation' },
      sections: [
        { 
          title: 'Platform Overview', 
          type: 'interactive', 
          content: 'platform-tour',

        },
        { 
          title: 'Web3 vs Traditional Freelancing', 
          type: 'interactive', 
          content: 'comparison-chart'
        },

        { 
          title: 'Community Connection', 
          type: 'live-demo', 
          content: 'telegram-setup',

        }
      ]
    },
    {
      id: 'foundation',
      title: 'Building Your Professional Foundation',
      subtitle: 'Create a Profile That Attracts High-Value Clients',
      duration: '90 min',

      icon: FaUsers,
      color: 'from-purple-500 to-pink-600',
      badge: { name: 'Foundation Builder', icon: '🏗️', description: 'Mastered profile optimization' },
      sections: [
        { 
          title: 'Service Categories Deep Dive', 
          type: 'interactive', 
          content: 'categories-explorer'
        },
        { 
          title: 'Profile Optimization Strategy', 
          type: 'interactive', 
          content: 'profile-builder',

        },
        { 
          title: 'CV Builder Workshop', 
          type: 'live-demo', 
          content: 'cv-creation',

        },
        { 
          title: 'Competitive Analysis', 
          type: 'interactive', 
          content: 'market-research',

        }
      ]
    },
    {
      id: 'skills',
      title: 'Skill Validation & Competitive Advantage',
      subtitle: 'Prove Your Expertise with Certified Skill Tests',
      duration: '60 min',

      icon: FaTrophy,
      color: 'from-yellow-400 to-orange-500',
      badge: { name: 'Skill Master', icon: '🎯', description: 'Completed skill validations' },
      sections: [
        { 
          title: 'Skill Test Strategy', 
          type: 'interactive', 
          content: 'test-strategy',

        },
        { 
          title: 'Trust Score Algorithm', 
          type: 'infographic', 
          content: 'trust-calculator',

        },
        { 
          title: 'Live Skill Testing', 
          type: 'live-demo', 
          content: 'skill-tests',

        }
      ]
    },
    {
      id: 'services',
      title: 'Creating Your First Service Listing',
      subtitle: 'Turn Your Skills Into Profitable Service Offerings',
      duration: '75 min',

      icon: FaGem,
      color: 'from-green-400 to-blue-500',
      badge: { name: 'Service Creator', icon: '💼', description: 'Created first service listing' },
      sections: [
        { 
          title: 'Service Creation Strategy', 
          type: 'interactive', 
          content: 'service-strategy',

        },
        { 
          title: 'Pricing Psychology', 
          type: 'infographic', 
          content: 'pricing-guide',

        },
        { 
          title: 'Optimization Tips', 
          type: 'interactive', 
          content: 'optimization',

        },
        { 
          title: 'Live Service Creation', 
          type: 'live-demo', 
          content: 'service-creation',

        }
      ]
    },
    {
      id: 'clients',
      title: 'Client Acquisition & Lead Management',
      subtitle: 'Master the Art of Converting Leads to Paying Clients',
      duration: '90 min',

      icon: FaChartLine,
      color: 'from-indigo-500 to-purple-600',
      badge: { name: 'Client Magnet', icon: '🧲', description: 'Mastered client acquisition' },
      sections: [
        { 
          title: 'Token Economy Deep Dive', 
          type: 'infographic', 
          content: 'token-system',

        },
        { 
          title: 'Booking System Mastery', 
          type: 'interactive', 
          content: 'booking-flow',

        },
        { 
          title: 'Client Communication', 
          type: 'live-demo', 
          content: 'client-demo',

        },
        { 
          title: 'ROI Optimization', 
          type: 'interactive', 
          content: 'roi-calculator',

        }
      ]
    },
    {
      id: 'scaling',
      title: 'Reputation Building & Scaling Success',
      subtitle: 'Transform From Freelancer to Successful Business Owner',
      duration: '75 min',

      icon: FaCrown,
      color: 'from-yellow-400 to-red-500',
      badge: { name: 'Scale Master', icon: '👑', description: 'Achieved freelancer mastery' },
      sections: [
        { 
          title: 'Review System Strategy', 
          type: 'interactive', 
          content: 'review-mastery',

        },
        { 
          title: 'Scaling Framework', 
          type: 'infographic', 
          content: 'scaling-guide',

        },
        { 
          title: 'Advanced Features', 
          type: 'live-demo', 
          content: 'advanced-demo',

        },
        { 
          title: 'Success Planning', 
          type: 'interactive', 
          content: 'success-plan',

        }
      ]
    }
  ];

  useEffect(() => {
    loadWorkshopProgress();
  }, [currentUser]);

  const loadWorkshopProgress = async () => {
    if (!currentUser || !currentUser.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const progress = await getWorkshopProgress();
      
      // Convert completed sections array to the format expected by components
      const completedSectionsMap = {};
      if (Array.isArray(progress.completedSections)) {
        progress.completedSections.forEach(sectionKey => {
          const [moduleId, , sectionIndex] = sectionKey.split('-');
          if (!completedSectionsMap[moduleId]) {
            completedSectionsMap[moduleId] = [];
          }
          completedSectionsMap[moduleId].push(parseInt(sectionIndex));
        });
      } else if (progress.completedSections && typeof progress.completedSections === 'object') {
        // Already in the right format from localStorage fallback
        Object.assign(completedSectionsMap, progress.completedSections);
      }

      // Calculate completed modules and badges
      const completedModules = [];
      const badges = [];
      
      modules.forEach(module => {
        const moduleCompletedSections = completedSectionsMap[module.id] || [];
        // Only mark as completed if we have exactly the right sections completed
        // and no more than the total sections for this module
        const validCompletedSections = moduleCompletedSections.filter(
          sectionIndex => sectionIndex < module.sections.length
        );
        if (validCompletedSections.length === module.sections.length && 
            validCompletedSections.length > 0) {
          completedModules.push(module.id);
          badges.push(module.badge);
        }
        // Update the cleaned sections back to the map
        completedSectionsMap[module.id] = validCompletedSections;
      });

      // Debug logging
      console.log('Workshop Progress Debug:', {
        completedModules,
        completedSectionsMap,
        currentModule: currentModule
      });

      // Set current module to the first uncompleted module
      const firstUncompletedModuleIndex = modules.findIndex(module => 
        !completedModules.includes(module.id)
      );
      const newCurrentModule = firstUncompletedModuleIndex >= 0 ? firstUncompletedModuleIndex : 0;
      
      if (newCurrentModule !== currentModule) {
        setCurrentModule(newCurrentModule);
      }

      setWorkshopProgress({
        totalPoints: progress.totalPoints || 0,
        completedSections: completedSectionsMap,
        workshopHistory: progress.workshopHistory || [],
        completedModules,
        badges,
        currentStreak: calculateStreak(progress.workshopHistory || []),
        timeSpent: calculateTimeSpent(progress.workshopHistory || [])
      });
      
    } catch (err) {
      console.error('Error loading workshop progress:', err);
      // Use fallback data if API fails
      const fallbackProgress = getWorkshopProgressFallback();
      setWorkshopProgress({
        ...fallbackProgress,
        badges: [],
        completedModules: [],
        currentStreak: 0,
        timeSpent: 0,
        completedSections: {}
      });
      // Don't show error - localStorage fallback will work
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (history) => {
    // Simple streak calculation based on recent activity
    const recentDays = 7;
    const now = new Date();
    const recentActivity = history.filter(entry => {
      const entryDate = new Date(entry.date);
      const daysDiff = (now - entryDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= recentDays;
    });
    return Math.min(recentActivity.length, recentDays);
  };

  const calculateTimeSpent = (history) => {
    // Estimate time spent based on completed sections (rough calculation)
    return history.length * 10; // 10 minutes per section average
  };

  const completeSection = async (moduleId, sectionIndex, sectionTitle) => {
    if (!currentUser || !currentUser.token) {
      setError('Please log in to save your progress');
      return;
    }

    try {
      const result = await completeWorkshopSection(moduleId, sectionIndex, sectionTitle);
      // Reload progress to get updated data
      await loadWorkshopProgress();
      
      // Check if module is now complete for celebration
      const module = modules.find(m => m.id === moduleId);
      const moduleCompletedSections = workshopProgress.completedSections[moduleId] || [];
      
      if (moduleCompletedSections.length + 1 === module.sections.length) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
      
    } catch (err) {
      console.error('Error completing section:', err);
      setError(err.message || 'Failed to save progress');
    }
  };

  const getTotalProgress = () => {
    const totalModules = modules.length;
    const completedModules = workshopProgress.completedModules.length;
    return Math.round((completedModules / totalModules) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading your workshop progress...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <FaGraduationCap className="text-6xl text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Join the Workshop</h2>
          <p className="text-gray-300 mb-6">
            Please log in or create an account to access the Freelancer Workshop and track your progress.
          </p>
          <div className="space-y-3">
            <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
              Log In
            </button>
            <button className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors">
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <Helmet>
        <title>Freelancer Workshop - Aquads.xyz</title>
        <meta name="description" content="Master Web3 freelancing with our comprehensive interactive workshop course" />
      </Helmet>

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-4 text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-full shadow-2xl animate-bounce">
            <div className="flex items-center gap-3">
              <FaTrophy className="text-2xl" />
              <span className="text-xl font-bold">Module Complete! Badge Earned!</span>
              <FaTrophy className="text-2xl" />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full">
                <FaGraduationCap className="text-4xl text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Freelancer Mastery
              </span>
              <br />
              Workshop
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto">
              Your complete guide to becoming a successful Web3 freelancer on Aquads.xyz. 
              Interactive lessons, real-world practice, and guaranteed results.
            </p>
            
            {/* Workshop Stats */}
            <WorkshopStats 
              progress={workshopProgress} 
              modules={modules}
              totalProgress={getTotalProgress()}
            />
            

          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <WorkshopProgress 
          modules={modules}
          currentModule={currentModule}
          progress={workshopProgress}
          onModuleSelect={setCurrentModule}
        />
      </div>

      {/* Gamification Panel */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        <WorkshopGameification progress={workshopProgress} />
      </div>

      {/* Current Module Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <WorkshopModule 
          module={modules[currentModule]}
          progress={workshopProgress}
          onSectionComplete={completeSection}
          currentUser={currentUser}
        />
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={() => setCurrentModule(Math.max(0, currentModule - 1))}
            disabled={currentModule === 0}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg transition-all w-full sm:w-auto ${
              currentModule === 0 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Previous Module
          </button>
          
          <div className="text-center order-first sm:order-none">
            <p className="text-gray-400">
              Module {currentModule + 1} of {modules.length}
            </p>
          </div>
          
          <button
            onClick={() => setCurrentModule(Math.min(modules.length - 1, currentModule + 1))}
            disabled={currentModule === modules.length - 1}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg transition-all w-full sm:w-auto ${
              currentModule === modules.length - 1 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            Next Module
            <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreelancerWorkshop;
